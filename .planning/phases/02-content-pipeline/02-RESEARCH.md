# Phase 2: Content Pipeline - Research

**Researched:** 2026-02-05
**Domain:** Spotify API integration, AWS Bedrock AI content generation, DynamoDB caching
**Confidence:** HIGH

## Summary

Phase 2 requires integrating the Spotify Web API to fetch user listening data (top artists, albums, tracks), caching it in DynamoDB with efficient access patterns, and generating tasteful AI-powered bios and captions using AWS Bedrock Claude models. The standard approach uses Next.js 15 Server Actions for data mutations, AWS SDK v3 for Bedrock and DynamoDB operations, and explicit system prompts to control Claude's tone and avoid marketing language.

The key technical challenges are: (1) respecting Spotify's rate limits and implementing cooldown enforcement, (2) deriving top albums from top tracks since Spotify doesn't provide a direct albums endpoint, (3) structuring DynamoDB for both data caching and cooldown tracking, (4) managing AI content lifecycle with regeneration and manual editing capabilities, and (5) ensuring prompt engineering produces consistently tasteful, anti-cringe content.

**Primary recommendation:** Use Server Actions for all Spotify fetches and AI generation with proper revalidation, store data in DynamoDB with composite sort keys for timestamp-based queries, and use explicit tone constraints in Claude system prompts with example-driven few-shot prompting to enforce anti-cringe rules.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-dynamodb` | Latest (v3) | DynamoDB client | AWS official SDK, modular imports, TypeScript support |
| `@aws-sdk/lib-dynamodb` | Latest (v3) | DynamoDB Document Client | High-level API, auto marshalling, cleaner syntax |
| `@aws-sdk/client-bedrock-runtime` | Latest (v3) | Bedrock model invocation | Official runtime for invoking Claude, supports streaming |
| Next.js Server Actions | 15.x | Data mutations | Built-in, type-safe, automatic revalidation support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@aws-sdk/client-kms` | Latest (v3) | KMS encryption | Already required for Spotify tokens (Phase 1) |
| `zod` | Latest | Input validation | Validate server action inputs, API responses |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Actions | API Routes | API Routes less ergonomic, Server Actions have better DX and auto-revalidation |
| DynamoDB Document Client | Raw DynamoDB Client | Document Client handles marshalling automatically vs manual attribute value objects |
| Bedrock Converse API | InvokeModel API | Converse API recommended by AWS (unified interface), InvokeModel lower-level |

**Installation:**
```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-bedrock-runtime zod
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── actions/
│       ├── spotify.ts          # fetchTopData, refreshSpotifyData server actions
│       ├── ai-content.ts       # generateBio, generateCaption, regenerateContent
│       └── content-edit.ts     # updateBio, updateCaption (manual edits)
├── lib/
│   ├── spotify/
│   │   ├── client.ts           # Spotify API wrapper
│   │   └── aggregators.ts      # Derive albums from tracks
│   ├── bedrock/
│   │   ├── client.ts           # BedrockRuntimeClient setup
│   │   └── prompts.ts          # System prompts, anti-cringe rules
│   └── dynamodb/
│       ├── client.ts           # DynamoDB Document Client
│       ├── queries.ts          # Get/Put operations
│       └── schema.ts           # Key structures, type definitions
└── types/
    └── content.ts              # TypeScript types for music data, AI content
```

### Pattern 1: Server Actions for Spotify Data with Cooldown
**What:** Server Actions that fetch Spotify data, check cooldown, update cache, and revalidate UI
**When to use:** User-initiated data refresh (button click), initial profile load

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
'use server'

import { revalidatePath } from 'next/cache'
import { getSpotifyClient } from '@/lib/spotify/client'
import { putMusicData, getLastRefresh } from '@/lib/dynamodb/queries'

export async function refreshSpotifyData(userId: string) {
  // Check cooldown (e.g., 24 hours)
  const lastRefresh = await getLastRefresh(userId)
  const cooldownMs = 24 * 60 * 60 * 1000

  if (lastRefresh && Date.now() - lastRefresh < cooldownMs) {
    throw new Error('Cooldown period not elapsed')
  }

  const spotify = await getSpotifyClient(userId)

  // Fetch in parallel
  const [artists, tracks] = await Promise.all([
    spotify.getMyTopArtists({ limit: 6, time_range: 'medium_term' }),
    spotify.getMyTopTracks({ limit: 50, time_range: 'medium_term' })
  ])

  // Derive albums from tracks
  const albums = deriveTopAlbums(tracks.items, 5)

  // Cache in DynamoDB
  await putMusicData(userId, { artists, albums, tracks: tracks.items.slice(0, 3) })

  // Revalidate UI
  revalidatePath(`/profile/${userId}`)

  return { artists, albums, tracks }
}
```

### Pattern 2: AI Content Generation with Claude via Bedrock
**What:** Generate bio and captions using Bedrock Converse API with explicit tone controls
**When to use:** Initial content generation, user-requested regeneration

**Example:**
```typescript
// Source: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: 'us-east-1' })

export async function generateBio(artists: Artist[], tracks: Track[]) {
  const systemPrompt = `You are a music bio writer. Create tasteful, authentic bios about users' music taste.

ANTI-CRINGE RULES:
- NO emojis (🚫)
- NO hype words (amazing, incredible, obsessed)
- NO cliches ("music is life", "can't live without")
- NO superlatives (best, greatest, most)
- Use factual, conversational tone
- Focus on patterns and connections in listening habits

Write 2-3 sentences maximum. Be specific about artists/genres, not generic.`

  const userMessage = `Top artists: ${artists.map(a => a.name).join(', ')}
Top tracks: ${tracks.map(t => `${t.name} by ${t.artists[0].name}`).join(', ')}

Write a bio about this user's music taste.`

  const response = await client.send(
    new ConverseCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      messages: [{ role: 'user', content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 200,  // Keep bio short
        temperature: 0.7  // Some creativity, not too random
      }
    })
  )

  return response.output.message.content[0].text
}
```

### Pattern 3: DynamoDB Single Table Design for Music Data + Metadata
**What:** Store user music data and metadata (last refresh timestamp, AI content status) in one table
**When to use:** Caching Spotify data, tracking cooldowns, storing AI-generated and user-edited content

**Key structure:**
```typescript
// PK = USER#{userId}
// SK patterns:
//   - PROFILE#METADATA        -> { lastRefresh: timestamp, bioEdited: boolean }
//   - MUSIC#ARTISTS           -> { items: [...], cachedAt: timestamp }
//   - MUSIC#ALBUMS            -> { items: [...], cachedAt: timestamp }
//   - MUSIC#TRACKS            -> { items: [...], cachedAt: timestamp }
//   - CONTENT#BIO             -> { text: string, generated: timestamp, edited: timestamp? }
//   - CONTENT#CAPTION#{albumId} -> { text: string, generated: timestamp, edited: timestamp? }

// Example item:
{
  PK: 'USER#user_abc123',
  SK: 'PROFILE#METADATA',
  lastRefresh: 1707115200000,  // Unix timestamp
  bioEdited: false,
  GSI1PK: 'REFRESH#2026-02-05', // Optional: query all users who refreshed on a date
  GSI1SK: 'USER#user_abc123'
}
```

### Pattern 4: Content Regeneration with Optimistic Updates
**What:** Allow users to regenerate AI content with immediate UI feedback and rollback on error
**When to use:** Regenerate button clicks

**Example:**
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
'use client'

import { useActionState, useOptimistic } from 'react'
import { regenerateBio } from '@/app/actions/ai-content'

export function BioSection({ initialBio, userId }) {
  const [optimisticBio, setOptimisticBio] = useOptimistic(initialBio)
  const [state, action, pending] = useActionState(regenerateBio, { bio: initialBio })

  return (
    <div>
      <p>{optimisticBio}</p>
      <button
        onClick={async () => {
          setOptimisticBio('Generating new bio...')
          await action(userId)
        }}
        disabled={pending}
      >
        {pending ? 'Regenerating...' : 'Regenerate'}
      </button>
    </div>
  )
}
```

### Anti-Patterns to Avoid

- **Fetching Spotify data on every page load:** Use cached DynamoDB data; only refresh on explicit user action
- **Storing raw Spotify API responses:** Normalize and select only needed fields to stay under DynamoDB 400KB item limit
- **Calling Bedrock for every caption simultaneously:** Generate sequentially or in small batches to avoid throttling
- **Using redirect() in try-catch with Server Actions:** Redirect throws internally; call it outside try-catch or use a separate error handling pattern
- **Treating DynamoDB like SQL:** Don't create separate tables for artists/albums/tracks; use single table with composite sort keys
- **Allowing unlimited regeneration:** Implement client-side debouncing and consider usage caps to prevent abuse

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deriving top albums from tracks | Custom aggregation with naive counting | Aggregate by album ID with track popularity weighting | Tracks from same album may have vastly different play counts; need weighted scoring |
| Rate limit detection | Catching 429 and retrying immediately | Exponential backoff with `Retry-After` header parsing | Spotify provides exact retry timing in header; respect it to avoid longer bans |
| Cooldown enforcement | Client-side timestamp checks | DynamoDB conditional writes with timestamp queries | Client can be manipulated; server-side timestamp comparison is authoritative |
| AI prompt injection prevention | Manual string sanitization | Zod validation + XML tag wrapping for user data | Claude trained on XML tags; wrap user data in `<user_data></user_data>` tags per Anthropic docs |
| Content editing state management | Custom draft/published flags | Timestamp-based approach (generated, edited, published timestamps) | Timestamps provide audit trail and enable "revert to AI version" feature |

**Key insight:** Spotify and Bedrock have built-in mechanisms (headers, XML tags, conditional writes) that handle these edge cases better than custom solutions. Use the platform features.

## Common Pitfalls

### Pitfall 1: Spotify API Rate Limit Ambiguity
**What goes wrong:** Developers assume specific per-endpoint limits exist, leading to over-optimistic request patterns
**Why it happens:** Spotify doesn't publish specific numeric limits; rate limit is calculated on rolling 30-second window across all endpoints
**How to avoid:**
- Always implement 429 error handling with `Retry-After` header parsing
- Use batch APIs where possible (e.g., Get Multiple Albums instead of individual album requests)
- In development mode, expect much lower limits than production (extended quota mode)
**Warning signs:** Frequent 429 errors during development, especially when fetching data for multiple users

### Pitfall 2: Albums from Tracks - Incorrect Aggregation
**What goes wrong:** Naively taking "first N unique albums" from top 50 tracks results in albums with one popular track overshadowing consistently strong albums
**Why it happens:** Top tracks API returns tracks sorted by play count, not album significance
**How to avoid:**
- Extract all unique albums from top tracks
- For each album, calculate aggregate score: `sum(track.popularity) / trackCount`
- Sort albums by aggregate score, take top 3-5
- Filter out singles (album.album_type === 'single') if desired
**Warning signs:** User's top albums list includes albums they only liked one song from

### Pitfall 3: DynamoDB Hot Partitions with Single Table
**What goes wrong:** All music data for a user stored under same partition key causes read/write throttling
**Why it happens:** DynamoDB distributes data by partition key; single user = single partition
**How to avoid:**
- For this use case (low traffic per user, infrequent writes), single partition per user is FINE
- Only becomes a problem at >1000 RCU or >1000 WCU per partition per second
- Music data fetch is infrequent (24hr cooldown), not real-time
- If scaling to millions of concurrent users, consider sharding by `USER#{userId}#{shardId}` but YAGNI for v1
**Warning signs:** ProvisionedThroughputExceededException errors in CloudWatch

### Pitfall 4: Claude Generating Cringe Content Despite System Prompts
**What goes wrong:** Even with "no emojis, no hype" instructions, Claude occasionally generates marketing-style text
**Why it happens:** System prompts are guidelines, not hard constraints; probabilistic model behavior
**How to avoid:**
- Use few-shot examples in system prompt showing good vs bad bios
- Implement client-side regex validation as safety net (detect emojis, flag hype words)
- Set temperature lower (0.5-0.7 instead of 0.9+) for more consistent tone
- Use explicit XML tags: `<output_rules>NO emojis</output_rules>` and reference in prompt
**Warning signs:** QA testing reveals inconsistent tone; some bios sound like Instagram captions

### Pitfall 5: Race Conditions with Server Actions (Duplicate Submissions)
**What goes wrong:** User clicks "Regenerate" multiple times quickly, causing duplicate Bedrock API calls and cost
**Why it happens:** Server Actions can be invoked multiple times if not guarded; React doesn't prevent this automatically
**How to avoid:**
- Use `useActionState` hook which provides `pending` state
- Disable buttons when `pending === true`
- Consider debouncing with `useTransition` for user-triggered actions
- Server-side: implement idempotency with request IDs stored in DynamoDB
**Warning signs:** CloudWatch shows duplicate Lambda invocations, unexpected Bedrock usage costs

### Pitfall 6: Stale Spotify Data After Cache
**What goes wrong:** User's listening habits change, but profile shows outdated artists/tracks
**Why it happens:** Aggressive caching without clear UX about data freshness
**How to avoid:**
- Display "Last updated: {timestamp}" on profile
- Enforce 24-hour minimum cooldown but allow manual refresh
- Show loading state during refresh, not just after
- Consider `time_range` parameter: `short_term` (4 weeks) updates faster than `medium_term` (6 months)
**Warning signs:** User complaints about inaccurate "top" data; support requests to force refresh

### Pitfall 7: Bedrock Timeout on Long Content Generation
**What goes wrong:** Generating bio + 5 album captions sequentially takes >30s, Lambda times out
**Why it happens:** Each Bedrock call has latency; sequential = cumulative delay
**How to avoid:**
- Generate bio and captions in parallel using `Promise.all()` where possible
- Use streaming API (`ConverseStreamCommand`) for real-time UI updates
- Set Lambda timeout to 60s minimum for Bedrock-calling functions
- Consider generating only bio on initial load, captions on-demand
**Warning signs:** Lambda timeout errors in CloudWatch, incomplete content generation

## Code Examples

Verified patterns from official sources:

### Spotify: Fetching Top Artists and Tracks with Time Range
```typescript
// Source: https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks
async function getTopData(accessToken: string) {
  const headers = { Authorization: `Bearer ${accessToken}` }

  // Fetch top artists (medium_term = last 6 months)
  const artistsRes = await fetch(
    'https://api.spotify.com/v1/me/top/artists?limit=6&time_range=medium_term',
    { headers }
  )

  // Check for rate limit
  if (artistsRes.status === 429) {
    const retryAfter = artistsRes.headers.get('Retry-After')
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`)
  }

  const artists = await artistsRes.json()

  // Fetch top tracks
  const tracksRes = await fetch(
    'https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=medium_term',
    { headers }
  )
  const tracks = await tracksRes.json()

  return { artists: artists.items, tracks: tracks.items }
}
```

### DynamoDB: Conditional Write with Cooldown Check
```typescript
// Source: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

async function updateMusicDataWithCooldown(userId: string, data: MusicData) {
  const now = Date.now()
  const cooldownMs = 24 * 60 * 60 * 1000 // 24 hours

  const command = new PutCommand({
    TableName: 'anchor-users',
    Item: {
      PK: `USER#${userId}`,
      SK: 'MUSIC#ARTISTS',
      items: data.artists,
      cachedAt: now,
      expiresAt: now + cooldownMs
    },
    ConditionExpression: 'attribute_not_exists(cachedAt) OR cachedAt < :cooldownThreshold',
    ExpressionAttributeValues: {
      ':cooldownThreshold': now - cooldownMs
    }
  })

  try {
    await docClient.send(command)
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      throw new Error('Cooldown period has not elapsed')
    }
    throw error
  }
}
```

### Bedrock: Claude with System Prompt for Tone Control
```typescript
// Source: https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/system-prompts
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({ region: 'us-east-1' })

async function generateAlbumCaption(album: Album, context: string) {
  const systemPrompt = `You are a music caption writer. Write one sentence about an album based on user's listening patterns.

STRICT RULES:
- NO emojis
- NO hype words: amazing, incredible, awesome, obsessed, vibes
- NO cliches: "soundtrack to my life", "this hits different"
- NO superlatives: best, greatest, favorite
- Use factual, conversational language
- Maximum 15 words

Examples:
GOOD: "This album's moody production matches your late-night listening habits."
BAD: "This incredible album is absolutely amazing! 🔥 Total vibes!"
GOOD: "You've played every track from this release multiple times."
BAD: "You're literally obsessed with this masterpiece! Best album ever!"
`

  const userMessage = `Album: ${album.name} by ${album.artists[0].name}
Context: ${context}

Write a one-sentence caption.`

  const response = await client.send(
    new ConverseCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      messages: [{ role: 'user', content: [{ text: userMessage }] }],
      system: [{ text: systemPrompt }],
      inferenceConfig: {
        maxTokens: 50,
        temperature: 0.6
      }
    })
  )

  return response.output.message.content[0].text
}
```

### Next.js 15: Server Action with Revalidation
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations
'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateBio(userId: string, newBio: string) {
  // Validate input
  if (!newBio || newBio.length > 500) {
    throw new Error('Invalid bio length')
  }

  // Update in DynamoDB
  await updateUserContent(userId, 'bio', {
    text: newBio,
    edited: Date.now()
  })

  // Revalidate the profile page
  revalidatePath(`/profile/${userId}`)

  // Or revalidate by tag if using fetch with next: { tags: ['user-bio'] }
  revalidateTag('user-bio')

  // Optional: redirect to updated profile
  // NOTE: Call redirect OUTSIDE try-catch to avoid catching its internal error
  redirect(`/profile/${userId}`)
}
```

### Albums from Tracks Aggregation
```typescript
// Source: Pattern derived from Spotify API best practices
interface Album {
  id: string
  name: string
  artists: { name: string }[]
  albumType: string
  images: { url: string }[]
  score?: number
}

function deriveTopAlbums(tracks: SpotifyTrack[], limit: number = 5): Album[] {
  // Group tracks by album
  const albumMap = new Map<string, { album: Album; trackPopularities: number[] }>()

  tracks.forEach(track => {
    const album = track.album
    if (album.album_type === 'single') return // Skip singles

    if (!albumMap.has(album.id)) {
      albumMap.set(album.id, {
        album: {
          id: album.id,
          name: album.name,
          artists: album.artists,
          albumType: album.album_type,
          images: album.images
        },
        trackPopularities: []
      })
    }

    albumMap.get(album.id)!.trackPopularities.push(track.popularity)
  })

  // Calculate aggregate score for each album
  const albumsWithScores = Array.from(albumMap.values()).map(({ album, trackPopularities }) => ({
    ...album,
    score: trackPopularities.reduce((sum, p) => sum + p, 0) / trackPopularities.length
  }))

  // Sort by score and take top N
  return albumsWithScores
    .sort((a, b) => b.score! - a.score!)
    .slice(0, limit)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Next.js API Routes for mutations | Server Actions with `'use server'` | Next.js 13+ (stable in 15) | Simpler DX, automatic revalidation, type-safe |
| AWS SDK v2 | AWS SDK v3 with modular imports | 2020+ | Smaller bundle size, better tree-shaking, native TypeScript |
| Bedrock InvokeModel API | Bedrock Converse API | 2024+ | Unified interface across models, simpler multi-turn conversations |
| Multi-table DynamoDB | Single-table design with composite keys | 2019+ (popularized by Alex DeBrie) | Fewer tables, atomic transactions, but higher complexity |
| Client-side form state | `useActionState` hook | React 19 / Next.js 15 | Automatic pending state, optimistic updates built-in |

**Deprecated/outdated:**
- **Spotify SDK for Web API:** Official JS SDK is outdated; use direct fetch calls to REST API
- **AWS Amplify for Bedrock:** Amplify v5 doesn't fully support Bedrock; use raw SDK v3
- **DynamoDB batch operations for single-user data:** BatchGetItem/BatchWriteItem unnecessary for single partition queries; use Query/GetItem

## Open Questions

Things that couldn't be fully resolved:

1. **Spotify rate limit specifics**
   - What we know: Rolling 30-second window, development vs extended quota differs significantly, 429 errors with Retry-After headers
   - What's unclear: Exact numeric limits per mode, whether /me/top/* endpoints have custom limits
   - Recommendation: Implement conservative backoff (start with 1 request/second), monitor CloudWatch for 429 patterns, apply for extended quota before launch

2. **DynamoDB cost at scale**
   - What we know: Single table design efficient, infrequent writes (24hr cooldown), small item sizes
   - What's unclear: On-demand vs provisioned pricing for projected user base, whether DAX caching beneficial
   - Recommendation: Start with on-demand pricing, monitor in production, revisit if predictable traffic emerges

3. **Claude model selection (Haiku vs Sonnet vs Opus)**
   - What we know: Haiku fastest/cheapest, Opus most capable, Sonnet balanced
   - What's unclear: Whether Haiku quality sufficient for anti-cringe bio generation or if Sonnet needed
   - Recommendation: Start with Haiku (cost-effective), A/B test against Sonnet with real user feedback, monitor regeneration frequency as quality signal

4. **Content regeneration abuse prevention**
   - What we know: Users may spam regenerate button, Bedrock charges per request
   - What's unclear: Acceptable regeneration limit (per hour? per day?), whether to implement usage quotas in v1
   - Recommendation: Client-side debouncing (1 request/5 seconds) for v1, add usage tracking if costs spike in production

## Sources

### Primary (HIGH confidence)
- Spotify Web API Reference: [Get User's Top Items](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks)
- Spotify Rate Limits: [Rate Limits Concepts](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- AWS Bedrock Claude Messages API: [Anthropic Claude Messages API](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html)
- AWS SDK v3 Bedrock Examples: [JavaScript Bedrock Runtime Examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html)
- Anthropic System Prompts: [Give Claude a Role](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-engineering/system-prompts)
- Next.js Server Actions: [Server Actions and Mutations](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- DynamoDB Sort Keys Best Practices: [Using Sort Keys](https://aws.amazon.com/blogs/database/using-sort-keys-to-organize-data-in-amazon-dynamodb/)

### Secondary (MEDIUM confidence)
- Next.js Server Actions Best Practices (2026): [Complete Guide](https://medium.com/@saad.minhas.codes/next-js-15-server-actions-complete-guide-with-real-examples-2026-6320fbfa01c3)
- DynamoDB Single Table Design: [The What, Why, and When](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- Prompt Engineering with Claude 3 on Bedrock: [AWS Blog](https://aws.amazon.com/blogs/machine-learning/prompt-engineering-techniques-and-best-practices-learn-by-doing-with-anthropics-claude-3-on-amazon-bedrock/)

### Tertiary (LOW confidence - requires validation)
- Spotify API caching discussions: [Community Forum](https://community.spotify.com/t5/Spotify-for-Developers/bd-p/Spotify_Developer)
- DynamoDB anti-patterns: [Problems with Single Table Design](https://nordcloud.com/tech-community/problems-with-dynamodb-single-table-design/) - Critical view, not official AWS guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official AWS SDK v3 and Next.js 15 documentation, stable releases
- Architecture: HIGH - Patterns verified with official docs and code examples
- Pitfalls: MEDIUM-HIGH - Mix of official docs (rate limits, cooldowns) and community-reported issues (cringe content, race conditions)
- Spotify albums aggregation: MEDIUM - No official "top albums" endpoint; aggregation approach inferred from API structure and community practices

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable domain, but Bedrock and Next.js evolving rapidly)
