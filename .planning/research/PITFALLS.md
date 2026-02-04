# Pitfalls Research

**Domain:** Music profile pages with Spotify OAuth, AI content generation, and auto-refresh scheduling
**Researched:** 2026-02-04
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Spotify OAuth Token Refresh Logic Failures

**What goes wrong:**
Refresh tokens become invalid unexpectedly, breaking auto-refresh jobs and leaving users with expired profiles. The Spotify API response MAY include a new refresh token when refreshing - if it does, you must store it. For standard Authorization Code flow (recommended for server-side), the same refresh token usually persists, but responses can include updated tokens. Developers often only update the access token, causing "invalid_grant" errors later.

**Why it happens:**
- Not storing updated refresh tokens when returned in response (sometimes new token provided)
- Missing required Authorization header with Base64-encoded `client_id:client_secret` for Authorization Code flow
- Mixing PKCE flow patterns (single-use refresh tokens) with Authorization Code flow (reusable refresh tokens)
- Authorization codes expire in 10 minutes, causing failures if exchange is delayed
- As of November 27, 2025, Spotify requires HTTPS redirect URIs in production (http:// fails)
- Not setting `Content-Type: application/x-www-form-urlencoded` header correctly

**How to avoid:**
```typescript
// CORRECT: Standard Authorization Code flow token refresh
const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

const response = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${authHeader}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken
  })
});

const data = await response.json();

// CRITICAL: Store new refresh token if provided, otherwise keep current
await db.update({
  accessToken: data.access_token,
  refreshToken: data.refresh_token || currentRefreshToken,
  expiresAt: Date.now() + (data.expires_in * 1000)
});
```

Integration test pattern:
```typescript
// Test token refresh survival
test('token refresh preserves authentication', async () => {
  const initialTokens = await connectSpotify(userId);

  // Wait for expiration, trigger refresh
  await waitForExpiration(initialTokens.expiresAt);
  const refreshedTokens = await refreshSpotifyToken(initialTokens.refreshToken);

  // Verify we can still make API calls
  const profile = await spotifyApi.getMe(refreshedTokens.accessToken);
  expect(profile).toBeDefined();
});
```

**Warning signs:**
- `invalid_grant` errors with "Invalid refresh token" description in CloudWatch logs
- Users reporting "Connect Spotify" button reappearing after initial connection
- 401 Unauthorized responses from Spotify token endpoint
- Refresh jobs failing silently without updating profile content
- Error rate spike exactly 1 hour after user connects (when first refresh happens)

**Phase to address:**
Phase 1 (OAuth Foundation) - This MUST be bulletproof before auto-refresh scheduling. Add integration tests that mock token expiration and verify refresh works, test Authorization header format matches Spotify spec exactly.

---

### Pitfall 2: Spotify Rate Limiting Breaking Refresh Jobs

**What goes wrong:**
Auto-refresh jobs for multiple users hit Spotify's rate limits (calculated on rolling 30-second windows), causing 429 errors. Jobs fail, profiles go stale, and users see outdated content. Rate limits are undocumented and vary by quota mode - Development mode has severe restrictions, Extended mode is much higher but requires organization status (not available to solo developers as of May 2025).

**Why it happens:**
- Batch refreshing all users simultaneously at top of hour instead of staggering
- Not respecting `Retry-After` header in 429 responses (can trigger 24-hour bans)
- Making redundant API calls without caching (fetching same artist data repeatedly)
- Not using `snapshot_id` for playlists, causing unnecessary refetches of unchanged playlists
- Some endpoints (like playlist image upload) have custom lower rate limits than app-wide limit
- Solo developers stuck in development mode with restrictive limits (Extended Quota requires organization)

**How to avoid:**
**Rate limit handling:**
```typescript
async function spotifyAPICall(url, options) {
  const response = await fetch(url, options);

  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;

    console.warn(`Rate limited. Retry-After: ${waitSeconds}s`);

    // Queue for delayed processing, don't retry immediately
    await sqsQueue.sendMessage({
      body: { url, options, retryAfter: waitSeconds },
      delaySeconds: waitSeconds
    });

    throw new RateLimitError(`Retry after ${waitSeconds}s`);
  }

  return response;
}
```

**Batch optimization:**
```typescript
// Use batch endpoints to reduce request count
const trackIds = profile.topTracks.map(t => t.id);
const audioFeatures = await spotify.getAudioFeaturesForTracks(trackIds); // 1 call vs N calls

// Cache playlist data with snapshot_id
const playlist = await spotify.getPlaylist(playlistId);
const cachedSnapshotId = await cache.get(`playlist:${playlistId}:snapshot`);

if (playlist.snapshot_id === cachedSnapshotId) {
  console.log('Playlist unchanged, using cached data');
  return cache.get(`playlist:${playlistId}:data`);
}
```

**Request staggering:**
```typescript
// Add jitter to prevent thundering herd
const scheduleRefresh = (userId) => {
  const baseSchedule = '0 */6 * * *'; // Every 6 hours
  const jitterMinutes = Math.floor(Math.random() * 30); // 0-30 min offset

  return scheduleWithJitter(baseSchedule, jitterMinutes, userId);
};
```

**Warning signs:**
- 429 error responses in CloudWatch logs (especially clusters of them)
- Scheduled refresh jobs timing out or failing in batches
- Increased API latency during peak refresh windows
- Spike in API request volume at :00 minutes in Spotify Developer Dashboard
- Users reporting profiles updated hours after scheduled refresh time

**Phase to address:**
Phase 2 (Scheduled Refresh) - Design refresh scheduler with rate limiting from day 1:
- Add jitter to EventBridge scheduled times (scatter across 30-min window)
- Implement SQS retry queue for rate-limited requests
- Add CloudWatch metric for 429 response rate
- Create alarm threshold for sustained rate limiting (>5% of requests = problem)
- Apply for Extended Quota Mode immediately (even if denied as solo dev, shows good faith)

**Development mode workaround:**
If stuck in development mode limits:
- Limit to 5-10 refreshes per 30-second window maximum
- Show users "last updated" timestamp prominently
- Add manual "Refresh now" button as fallback
- Consider refresh-on-demand rather than scheduled for MVP
- Monitor Spotify Developer Dashboard for usage patterns

---

### Pitfall 3: AI-Generated Copy Being Cringe

**What goes wrong:**
Bedrock generates generic, cliche, or embarrassing descriptions that defeat the core value proposition. Common failures: "This artist's music takes you on a journey", "A rising star in the music scene", "Blending genres to create a unique sound". Users are too embarrassed to share these profiles publicly. Research shows 58% of organizations struggle with quality degradation when scaling AI content production beyond 100 pieces per month (McKinsey).

**Why it happens:**
- No quality control between AI generation and publishing
- Prompts too generic, not constrained to avoid cliches
- No examples of good vs bad copy in prompts (few-shot learning missing)
- Letting AI generate full paragraphs without structural constraints
- Not incorporating actual Spotify data (genres, popularity, similar artists, top tracks) into prompts
- Treating all artist types the same (indie band vs classical pianist needs different tone)
- Not implementing output validation to catch AI artifacts ("as an AI language model")

**How to avoid:**
**Prompt engineering with constraints:**
```typescript
const generateBioPrompt = (artistData) => `
Write a concise 2-3 sentence biography for ${artistData.name}, a ${artistData.genres[0]} artist.

SPOTIFY DATA TO INCORPORATE:
- Genres: ${artistData.genres.join(', ')}
- Monthly listeners: ${artistData.monthlyListeners}
- Top track: "${artistData.topTracks[0].name}"
- Similar to: ${artistData.similarArtists.slice(0, 2).join(', ')}

STYLE REQUIREMENTS:
- Write as if for a music magazine (Rolling Stone, Pitchfork style)
- Focus on musical style and specific tracks/albums, not vague descriptions
- Be specific and factual, avoid generic praise
- Use active voice only
- Maximum 3 sentences, 150 words
- NO buzzwords: journey, rising star, unique sound, cutting-edge, revolutionary, game-changing
- NO meta-commentary about being an AI or language model
- If data is sparse, write: "${artistData.name} is a ${artistData.genres[0]} artist with ${artistData.monthlyListeners} monthly listeners on Spotify."

GOOD EXAMPLES:
"${artistData.name} blends ${artistData.genres[0]} with electronic production, earning ${artistData.monthlyListeners} monthly listeners. Their breakout track '${artistData.topTracks[0].name}' showcases layered vocals over minimalist beats. Fans of ${artistData.similarArtists[0]} will recognize similar atmospheric textures."

BAD EXAMPLES (DO NOT WRITE LIKE THIS):
"${artistData.name} is a rising star taking listeners on a musical journey. Their unique sound blends genres in revolutionary ways. This game-changing artist is definitely one to watch."

Output only the biography text, nothing else.
`;
```

**Output validation:**
```typescript
const validateBioOutput = (bio, artistData) => {
  // Reject AI artifacts
  const bannedPhrases = [
    'as an ai', 'language model', 'i cannot', 'i apologize',
    'journey', 'rising star', 'unique sound', 'cutting-edge',
    'revolutionary', 'game-changing', 'one to watch', 'definitely check out'
  ];

  const foundBanned = bannedPhrases.filter(phrase =>
    bio.toLowerCase().includes(phrase)
  );

  if (foundBanned.length > 0) {
    throw new AIValidationError(`Banned phrases: ${foundBanned.join(', ')}`);
  }

  // Length constraints
  if (bio.length < 50 || bio.length > 500) {
    throw new AIValidationError(`Bio length ${bio.length} out of bounds (50-500)`);
  }

  // Must mention artist name
  if (!bio.toLowerCase().includes(artistData.name.toLowerCase())) {
    throw new AIValidationError('Bio does not mention artist name');
  }

  // Must mention at least one genre
  const mentionsGenre = artistData.genres.some(genre =>
    bio.toLowerCase().includes(genre.toLowerCase())
  );
  if (!mentionsGenre) {
    throw new AIValidationError('Bio does not mention any genre');
  }

  return true;
};
```

**Cost optimization with caching:**
```typescript
// Enable prompt caching for repeated system instructions
const prompt = {
  system: [
    {
      type: "text",
      text: STYLE_GUIDELINES, // Cached prefix (system prompt)
      cache_control: { type: "ephemeral" }
    }
  ],
  messages: [
    {
      role: "user",
      content: `Write bio for ${artistData.name}...` // Variable content
    }
  ]
};

// This reduces input token costs by up to 85% for repeated prefix
```

**Warning signs:**
- Users clicking "regenerate" more than 30% of the time
- Users manually editing AI copy immediately after generation
- Low share rates on social media (<10% of profiles shared)
- Generic phrases appearing across multiple profiles (search CloudWatch logs)
- User feedback mentioning "sounds robotic", "generic", "not me"

**Phase to address:**
Phase 1 (MVP Profile Generation) with planned iteration:
- Start with conservative, factual prompts (less creative, more descriptive)
- Ship with "regenerate" button from day 1
- Enable manual editing before publish
- Add CloudWatch metric tracking regeneration rate (>30% = prompt needs tuning)
- Plan Phase 3 for prompt refinement based on first 100-500 generated profiles
- Implement prompt caching immediately (85% cost savings, minimal code)

---

### Pitfall 4: Social Preview Metadata Not Rendering on WhatsApp/Twitter

**What goes wrong:**
Users share their profile link on WhatsApp, Twitter, or LinkedIn, but the preview shows broken image, missing title, or generic site description instead of artist-specific preview. This defeats viral sharing mechanism and makes profiles look unprofessional. Research shows social crawlers from platforms like LinkedIn, Facebook, Twitter/X, Discord, and Slack don't execute JavaScript, so client-side rendered tags are invisible.

**Why it happens:**
- Open Graph meta tags generated client-side (CSR) instead of server-side (SSR) - crawlers don't execute JS
- Images not matching platform requirements (WhatsApp: <300KB, Twitter: 1200x630px, LinkedIn: 1200x627px 1.91:1 ratio)
- Platform caches stale metadata even after fixing tags (Facebook can take hours to update)
- Missing or incorrect og:image absolute URLs (relative URLs don't work for external crawlers)
- Not testing with all platform-specific debuggers before shipping
- Image format issues (WhatsApp prefers but doesn't require specific formats)

**How to avoid:**
**Server-side metadata with Next.js Metadata API:**
```typescript
// CORRECT: Server Component with Metadata API (SSR)
// app/[username]/page.tsx

export async function generateMetadata({ params }) {
  const profile = await getProfile(params.username);

  if (!profile || !profile.isPublished) {
    return {
      title: 'Profile Not Found',
      robots: 'noindex'
    };
  }

  // Generate unique OG image URL for this profile
  const ogImageUrl = `https://anchor.band/api/og/${profile.slug}.png`;

  return {
    title: `${profile.name} - Anchor`,
    description: profile.bio.substring(0, 155), // Twitter truncates at 200 chars
    openGraph: {
      title: profile.name,
      description: profile.bio,
      url: `https://anchor.band/${profile.slug}`,
      siteName: 'Anchor',
      images: [
        {
          url: ogImageUrl, // Must be absolute HTTPS URL
          width: 1200,
          height: 630,
          alt: `${profile.name} profile`
        }
      ],
      locale: 'en_US',
      type: 'profile'
    },
    twitter: {
      card: 'summary_large_image',
      title: profile.name,
      description: profile.bio,
      images: [ogImageUrl],
      creator: '@anchorband'
    }
  };
}
```

**Dynamic OG image generation:**
```typescript
// app/api/og/[slug]/route.tsx
import { ImageResponse } from 'next/og';

export async function GET(req: Request, { params }) {
  const profile = await getProfile(params.slug);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
          padding: '60px'
        }}
      >
        <img src={profile.spotifyImage} width={300} height={300} />
        <div style={{ marginLeft: '40px', color: 'white' }}>
          <h1 style={{ fontSize: '72px' }}>{profile.name}</h1>
          <p style={{ fontSize: '32px' }}>{profile.genres.join(' · ')}</p>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
```

**Testing checklist before shipping:**
```bash
# 1. Verify SSR (meta tags in raw HTML)
curl https://anchor.band/artistname | grep 'og:image'
# Should return meta tags in HTML, not empty or JS-rendered

# 2. Test all platforms
# Facebook: https://developers.facebook.com/tools/debug/
# Twitter: https://cards-dev.twitter.com/validator
# LinkedIn: https://www.linkedin.com/post-inspector/
# WhatsApp: Share link in actual WhatsApp (no official debugger)

# 3. Clear cached previews after any metadata changes
```

**Warning signs:**
- OG validators (Facebook, Twitter) show correct preview but WhatsApp doesn't
- Users report "link preview not working" specifically on WhatsApp or LinkedIn
- Meta tags visible in browser "view source" but `curl` shows different HTML
- 404 errors in CloudWatch for /api/og/[slug].png paths
- Facebook Sharing Debugger shows "Could not retrieve data from URL"

**Phase to address:**
Phase 1 (Public Profile Pages) - Social previews are table stakes for viral sharing:
- Implement SSR metadata in same PR as profile pages (not a later optimization)
- Add OG image generation endpoint before public launch
- Create test checklist with links to all platform validators
- Add automated E2E test: fetch HTML as bot user-agent, verify OG tags present

**Platform-specific requirements:**

| Platform | Image Dimensions | Max Size | Format | Cache Behavior |
|----------|-----------------|----------|--------|----------------|
| WhatsApp | Any (1200x630 recommended) | 300KB | JPG/PNG/WebP | Updates within minutes |
| Twitter | 1200x630px (2:1 ratio) | 5MB | JPG/PNG/WebP/GIF | Use Card Validator to clear |
| Facebook | 1200x630px (1.91:1 ratio) | 8MB | JPG/PNG | Use Sharing Debugger (can take hours) |
| LinkedIn | 1200x627px (1.91:1 ratio) | 5MB | JPG/PNG | Use Post Inspector (can take hours) |
| Discord | 1200x630px recommended | 8MB | JPG/PNG/WebP/GIF | Updates quickly |

---

### Pitfall 5: DynamoDB Hot Partitions Throttling Requests

**What goes wrong:**
DynamoDB throttles reads/writes with ProvisionedThroughputExceededException because too many requests hit the same partition key. In single-table design, this commonly happens with GSIs where many items share the same secondary key (e.g., GSI PK="PROFILE" for all profiles). Profile loads fail, auto-refresh jobs break, users see errors. Research shows hot partition problems are a leading cause of DynamoDB single-table design failures.

**Why it happens:**
- GSI partition key groups all similar entities together (e.g., GSI with PK="PROFILE" for listing all profiles)
- All auto-refresh jobs writing to same partition simultaneously during scheduled runs
- Not distributing load across partition key space
- Single-table design complexity hiding the hot partition risk from developers
- Querying GSI for paginated lists hits same partition repeatedly
- 400KB item size limit can be hit when denormalizing too much data

**How to avoid:**
**Use multi-table design with user-based partition keys:**
```typescript
// WRONG: Single table with hot GSI
Table: AnchorData
PK: USER#{userId}
SK: PROFILE
GSI1PK: "PROFILE" // ALL profiles share same partition = hot partition
GSI1SK: createdAt

// CORRECT: Separate tables with distributed keys
Table: Users
PK: userId (good distribution - each user is unique partition)
Attributes: email, spotifyId, createdAt

Table: Profiles
PK: userId (good distribution - each user is unique partition)
Attributes: slug, bio, spotifyData, ogImageUrl, isPublished, updatedAt

Table: PublishedProfiles (for discovery/listing)
PK: genre#{genre} (distributes across genres, not single partition)
SK: userId
Attributes: name, slug, bio, previewImage, monthlyListeners
```

**If you need "list all profiles" query, use sharded GSI:**
```typescript
// Add sharding to distribute load
const shard = userId.charCodeAt(0) % 10; // Distribute across 10 partitions

// GSI design with sharding
GSI1PK: `PROFILES#${shard}` // e.g., "PROFILES#0" through "PROFILES#9"
GSI1SK: createdAt

// Query across all shards when needed (fan-out pattern)
const queryAllProfiles = async (limit = 100) => {
  const shardQueries = Array.from({ length: 10 }, (_, shard) =>
    dynamodb.query({
      TableName: 'Profiles',
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `PROFILES#${shard}`
      },
      Limit: Math.ceil(limit / 10)
    })
  );

  const results = await Promise.all(shardQueries);
  return results.flatMap(r => r.Items).slice(0, limit);
};
```

**Use DynamoDB on-demand mode for MVP:**
```typescript
// On-demand mode: pay per request, no throttling
// Good for unpredictable traffic during MVP phase

const tableConfig = {
  TableName: 'Profiles',
  BillingMode: 'PAY_PER_REQUEST', // vs 'PROVISIONED'
  AttributeDefinitions: [
    { AttributeName: 'userId', AttributeType: 'S' }
  ],
  KeySchema: [
    { AttributeName: 'userId', KeyType: 'HASH' }
  ]
};
```

**Warning signs:**
- ProvisionedThroughputExceededException in CloudWatch logs
- Increased read/write latency during refresh job windows
- CloudWatch metrics: WriteThrottleEvents or ReadThrottleEvents >0
- Some profiles load quickly (<100ms), others timeout (indicates hot vs cold partitions)
- GSI consumed capacity much higher than base table capacity

**Phase to address:**
Phase 1 (Data Model Design) - Hot partitions are architectural, not fixable later without data migration:
- Review all access patterns before creating table schema
- Choose partition keys that distribute load (userId, not entity type like "PROFILE")
- Enable on-demand billing mode for MVP (eliminates throttling risk)
- Add CloudWatch dashboard monitoring partition-level metrics
- Plan to migrate to provisioned mode with auto-scaling after traffic patterns emerge (3-6 months)

---

### Pitfall 6: Auto-Refresh Jobs Executing Twice (Duplicate Runs)

**What goes wrong:**
EventBridge Scheduler has at-least-once delivery semantics, meaning refresh jobs can execute multiple times for the same scheduled time. Without idempotency, this causes duplicate Spotify API calls (wasting rate limit quota), duplicate AI generations (wasting Bedrock budget), and race conditions where the last write wins, potentially saving stale data over fresh data.

**Why it happens:**
- EventBridge guarantees at-least-once delivery, not exactly-once (by design for reliability)
- Lambda retries on failure can cause duplicate executions
- No idempotency token checking in Lambda function logic
- DynamoDB writes not using conditional expressions to prevent overwrites
- EventBridge Scheduler's ClientToken idempotency field exists in API but not implemented as of May 2025
- Network issues can cause retries that create duplicate invocations

**How to avoid:**
**Implement idempotency with Powertools:**
```typescript
import { makeIdempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';

// Create idempotency table
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: 'IdempotencyTable',
  keyAttr: 'idempotencyKey',
  expiryAttr: 'expiration',
  statusAttr: 'status',
  dataAttr: 'data'
});

// Idempotency table schema:
// - idempotencyKey (PK): String - unique key per operation
// - expiration (TTL): Number - auto-delete after 24 hours
// - status: String - INPROGRESS | COMPLETED
// - data: String - cached response

const refreshProfileHandler = async (event) => {
  // Use EventBridge execution ID as idempotency key
  const executionId = event.detail['aws.scheduler.execution-id'];
  const userId = event.detail.userId;

  console.log(`Refreshing profile for ${userId}, execution: ${executionId}`);

  // Check last refresh time to avoid refreshing too frequently
  const profile = await getProfile(userId);
  const hoursSinceRefresh = (Date.now() - profile.lastRefreshedAt) / (1000 * 60 * 60);

  if (hoursSinceRefresh < 1) {
    console.log(`Profile refreshed ${hoursSinceRefresh}h ago, skipping`);
    return { status: 'skipped', reason: 'too_soon' };
  }

  // Perform refresh operations
  const spotifyData = await fetchSpotifyData(userId);
  const newBio = await generateBio(spotifyData);

  // Use conditional write to prevent race conditions
  await dynamodb.update({
    TableName: 'Profiles',
    Key: { userId },
    UpdateExpression: 'SET spotifyData = :data, bio = :bio, lastRefreshedAt = :time, version = :newVer',
    ConditionExpression: 'attribute_not_exists(version) OR version = :curVer',
    ExpressionAttributeValues: {
      ':data': spotifyData,
      ':bio': newBio,
      ':time': Date.now(),
      ':curVer': profile.version || 0,
      ':newVer': (profile.version || 0) + 1
    }
  });

  return { status: 'completed', userId, executionId };
};

// Wrap handler with idempotency
export const handler = makeIdempotent(refreshProfileHandler, {
  persistenceStore,
  eventKeyJmesPath: "detail['aws.scheduler.execution-id']", // Use execution ID as key
  throwOnNoIdempotencyKey: true
});
```

**Add execution guard for extra safety:**
```typescript
// Use DynamoDB TTL-based lock
const acquireRefreshLock = async (userId, ttlSeconds = 300) => {
  try {
    await dynamodb.put({
      TableName: 'RefreshLocks',
      Item: {
        userId,
        lockedAt: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000),
        ttl: Math.floor(Date.now() / 1000) + ttlSeconds // DynamoDB TTL attribute
      },
      ConditionExpression: 'attribute_not_exists(userId) OR expiresAt < :now',
      ExpressionAttributeValues: {
        ':now': Date.now()
      }
    });
    return true;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      console.log(`Refresh already in progress for ${userId}`);
      return false;
    }
    throw err;
  }
};
```

**Warning signs:**
- CloudWatch logs showing duplicate execution IDs for same scheduled event
- Duplicate Spotify API calls within seconds (same artist data, same timestamp)
- Bedrock costs higher than expected (2x predictions = duplicate generations)
- DynamoDB ConditionalCheckFailedException errors (indicates concurrent writes)
- Profile data reverting to older state after refresh completes (race condition)

**Phase to address:**
Phase 2 (Scheduled Refresh) - Idempotency must be built-in from first scheduled job:
- Add Powertools idempotency decorator to refresh Lambda handler from day 1
- Create DynamoDB IdempotencyTable with TTL enabled (auto-cleanup after 24h)
- Add integration test: invoke Lambda twice with same event, verify second call is no-op
- Add CloudWatch metric tracking idempotency cache hits (should be >0 if duplicates occurring)
- Monitor ConditionalCheckFailed errors as indicator of prevented race conditions

---

### Pitfall 7: AWS Bedrock Costs Spiraling Out of Control

**What goes wrong:**
Bedrock costs balloon from expected $20/month to $200+/month due to redundant generations, inefficient prompts, or using expensive models for simple tasks. Solo dev project becomes financially unsustainable. Real-world audit showed 40% of API calls were duplicates (no caching), 65% used expensive model when cheaper would work, and prompts averaged 3200 tokens when 1100 sufficient.

**Why it happens:**
- No prompt caching, causing redundant prefix reprocessing (repeated system prompts cost full price)
- Using most expensive model (Claude Opus: $0.015/1K input, $0.075/1K output) for all generations
- Duplicate generations from idempotency failures (see Pitfall 6)
- Verbose prompts with repeated instructions (3000+ tokens) when 1000 tokens sufficient
- Regenerating AI content on every profile view instead of caching results in database
- No cost monitoring, budget alerts, or per-profile cost tracking
- Not using batch inference (50% cheaper) for scheduled refreshes

**How to avoid:**
**Enable prompt caching (85% cost reduction):**
```typescript
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

// System prompt with caching
const STYLE_GUIDELINES = `You are a music journalist writing artist biographies...
(long system prompt with examples, constraints, etc.)`;

const generateBioWithCaching = async (artistData) => {
  const command = new ConverseCommand({
    modelId: 'anthropic.claude-3-haiku-20240307-v1:0', // Cheapest model
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: STYLE_GUIDELINES,
            cacheControl: { type: 'ephemeral' } // Cache this prefix
          },
          {
            type: 'text',
            text: `Write bio for ${artistData.name}...` // Variable content
          }
        ]
      }
    ],
    inferenceConfig: {
      maxTokens: 300, // Limit output tokens
      temperature: 0.7
    }
  });

  const response = await client.send(command);

  // Log token usage for cost tracking
  console.log({
    inputTokens: response.usage.inputTokens,
    cachedTokens: response.usage.cacheReadInputTokens,
    outputTokens: response.usage.outputTokens,
    estimatedCost: calculateCost(response.usage)
  });

  return response.output.message.content[0].text;
};
```

**Intelligent model routing:**
```typescript
// Route to cheapest model that can handle the task
const selectModel = (taskComplexity) => {
  // Haiku: $0.00025 input, $0.00125 output per 1K tokens
  // Sonnet: $0.003 input, $0.015 output per 1K tokens
  // Opus: $0.015 input, $0.075 output per 1K tokens

  if (taskComplexity === 'simple') {
    return 'anthropic.claude-3-haiku-20240307-v1:0'; // Short bios, tag generation
  } else if (taskComplexity === 'standard') {
    return 'anthropic.claude-3-sonnet-20240229-v1:0'; // Standard bios
  } else {
    return 'anthropic.claude-3-opus-20240229-v1:0'; // Complex content (rarely needed)
  }
};

// Most artist bios can use Haiku (60x cheaper than Opus for input, 60x for output)
```

**Cost monitoring and budgets:**
```typescript
// CloudWatch custom metric for cost tracking
const trackBedrockCost = async (usage) => {
  const cost = calculateCost(usage);

  await cloudwatch.putMetricData({
    Namespace: 'Anchor/Bedrock',
    MetricData: [
      {
        MetricName: 'GenerationCost',
        Value: cost,
        Unit: 'None',
        Dimensions: [
          { Name: 'ModelId', Value: usage.modelId },
          { Name: 'UserId', Value: usage.userId }
        ]
      }
    ]
  });

  // Alert if single generation costs >$0.10 (indicates problem)
  if (cost > 0.10) {
    console.error(`High Bedrock cost: $${cost} for ${usage.userId}`);
  }
};

// Set billing alarm
const createBillingAlarm = async () => {
  await cloudwatch.putMetricAlarm({
    AlarmName: 'BedrockMonthlyBudget',
    ComparisonOperator: 'GreaterThanThreshold',
    EvaluationPeriods: 1,
    MetricName: 'EstimatedCharges',
    Namespace: 'AWS/Billing',
    Period: 86400, // Daily check
    Statistic: 'Maximum',
    Threshold: 50.0, // Alert at $50/month
    ActionsEnabled: true,
    AlarmActions: [SNS_TOPIC_ARN]
  });
};
```

**Cache generated content:**
```typescript
// Store AI-generated bio in database, don't regenerate on every view
await dynamodb.update({
  TableName: 'Profiles',
  Key: { userId },
  UpdateExpression: 'SET bio = :bio, bioGeneratedAt = :time',
  ExpressionAttributeValues: {
    ':bio': generatedBio,
    ':time': Date.now()
  }
});

// Only regenerate when user explicitly requests or on scheduled refresh
```

**Warning signs:**
- AWS Cost Explorer showing Bedrock spend increasing week-over-week without user growth
- Average prompt length >2000 tokens (check CloudWatch logs)
- Regeneration rate >30% (users frequently dissatisfied with first generation)
- Cost per profile >$0.10 (should be <$0.02 with caching and Haiku model)
- Multiple generations for same profile within short time window

**Phase to address:**
Phase 1 (MVP) - Cost control must be built-in from first generation:
- Implement prompt caching in initial Bedrock integration (saves 85% on repeated prefixes)
- Use Haiku model by default (60x cheaper than Opus for most tasks)
- Add token counting before API call, enforce max 1500 input tokens, 300 output tokens
- Create CloudWatch dashboard with daily Bedrock spend tracking
- Set billing alarm at $50/month (conservative for solo project MVP)
- Store generated content in DB, only regenerate on explicit user action

**Cost breakdown (2026 Bedrock pricing):**

| Model | Input (per 1K tokens) | Output (per 1K tokens) | Example Use Case | Cost per 200-word bio |
|-------|----------------------|------------------------|------------------|----------------------|
| Haiku | $0.00025 | $0.00125 | Short bios, tags | ~$0.001 (1500 input, 300 output) |
| Sonnet | $0.003 | $0.015 | Standard bios | ~$0.010 |
| Opus | $0.015 | $0.075 | Complex content | ~$0.045 |

**With prompt caching (85% reduction on cached prefix):**
- 1000-token system prompt cached: $0.00025 → $0.0000375
- Generating 1000 profiles with Haiku: ~$1-2 vs ~$10-15 without caching
- Generating 1000 profiles with Opus: ~$45 without caching, ~$8 with caching

---

### Pitfall 8: Token Security Failures (Encryption at Rest)

**What goes wrong:**
Spotify refresh tokens stored in plaintext in DynamoDB are leaked through CloudWatch logs, database exports, or compromised IAM credentials. Attacker gains access to users' Spotify accounts, creating PR disaster, potential legal liability, and platform ban. This is a GDPR/privacy violation that can result in fines.

**Why it happens:**
- Not encrypting refresh tokens before storing in DynamoDB
- Logging full DynamoDB items containing tokens in CloudWatch
- Using DynamoDB default encryption (AWS-managed) instead of customer-managed KMS key
- Not implementing encryption context for additional authenticated data
- Giving overly permissive KMS decrypt permissions (kms:* to multiple roles)
- Not rotating KMS keys or tokens
- Using long-lived IAM access keys instead of temporary role credentials

**How to avoid:**
**Use DynamoDB encryption with customer-managed KMS key:**
```typescript
// CDK/Terraform: Configure DynamoDB table with CMK
const table = new dynamodb.Table(this, 'UsersTable', {
  tableName: 'Users',
  partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: kmsKey, // Customer-managed KMS key
  pointInTimeRecovery: true
});

// KMS key policy: Restrict to specific Lambda roles
const kmsKey = new kms.Key(this, 'TokenEncryptionKey', {
  enableKeyRotation: true, // Annual automatic rotation
  description: 'Encrypts Spotify refresh tokens',
  policy: new iam.PolicyDocument({
    statements: [
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('dynamodb.amazonaws.com')],
        actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:ViaService': `dynamodb.${AWS_REGION}.amazonaws.com`
          }
        }
      }),
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [refreshLambdaRole], // Specific Lambda only
        actions: ['kms:Decrypt'],
        resources: ['*']
      })
    ]
  })
});
```

**Client-side encryption with AWS Encryption SDK (additional layer):**
```typescript
import { KmsKeyringNode, buildClient, CommitmentPolicy } from '@aws-crypto/client-node';

const { encrypt, decrypt } = buildClient(
  CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
);

const keyring = new KmsKeyringNode({
  generatorKeyId: KMS_KEY_ARN,
  keyIds: [KMS_KEY_ARN]
});

// Encrypt before storing
const storeRefreshToken = async (userId, refreshToken) => {
  const { result } = await encrypt(keyring, Buffer.from(refreshToken), {
    encryptionContext: {
      userId,
      purpose: 'spotify-refresh-token',
      environment: 'production'
    }
  });

  await dynamodb.put({
    TableName: 'Users',
    Item: {
      userId,
      encryptedRefreshToken: result.toString('base64'),
      tokenEncryptedAt: Date.now()
    }
  });
};

// Decrypt when retrieving
const getRefreshToken = async (userId) => {
  const item = await dynamodb.get({
    TableName: 'Users',
    Key: { userId }
  });

  const { plaintext } = await decrypt(
    keyring,
    Buffer.from(item.encryptedRefreshToken, 'base64')
  );

  return plaintext.toString('utf8');
};
```

**IAM roles instead of access keys:**
```typescript
// WRONG: Lambda with hardcoded credentials
const lambda = new lambda.Function(this, 'RefreshFunction', {
  environment: {
    AWS_ACCESS_KEY_ID: 'AKIA...', // NEVER DO THIS
    AWS_SECRET_ACCESS_KEY: '...' // NEVER DO THIS
  }
});

// CORRECT: Lambda with execution role
const lambda = new lambda.Function(this, 'RefreshFunction', {
  role: lambdaExecutionRole, // IAM role with minimal permissions
  environment: {
    KMS_KEY_ID: kmsKey.keyId, // Reference only, not credentials
    DYNAMO_TABLE: table.tableName
  }
});

// Grant specific permissions only
table.grantReadWriteData(lambda);
kmsKey.grantDecrypt(lambda);
```

**Log sanitization:**
```typescript
// Create logger that redacts sensitive fields
import pino from 'pino';

const sensitiveFields = ['refreshToken', 'accessToken', 'encryptedRefreshToken', 'clientSecret'];

const logger = pino({
  redact: {
    paths: sensitiveFields,
    remove: true // Completely remove fields
  }
});

// Now this is safe
logger.info({ userId, refreshToken, spotifyData }, 'Refreshing token');
// Logs: { userId: 'abc123', spotifyData: {...} }
// refreshToken is removed
```

**Warning signs:**
- Refresh tokens visible in CloudWatch logs (search logs for "spotify" or regex pattern)
- DynamoDB table using default AWS-managed encryption (check table settings)
- IAM roles with kms:* permission (overly broad, violates least privilege)
- Lambda environment variables containing AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY
- Token decryption failures after KMS key rotation (indicates no retry logic)
- CloudWatch Insights queries returning full token values

**Phase to address:**
Phase 1 (OAuth Foundation) - Token security is non-negotiable from day 1:
- Set up customer-managed KMS key before storing first token
- Configure DynamoDB table with KMS encryption in infrastructure code
- Use IAM execution roles for Lambda, never access keys
- Add log sanitization to Lambda logger configuration before first deployment
- Create integration test verifying tokens are encrypted at rest (decrypt test)
- Add CloudWatch Insights query to audit logs for accidental token exposure

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping prompt caching for MVP | Faster initial implementation | 85% higher Bedrock costs (unsustainable at scale) | Never - caching is ~10 lines of code |
| Using DynamoDB default encryption | No KMS setup required | Security risk, no audit trail, compliance issues | Never - security non-negotiable |
| Client-side OG tags (CSR) | Easier Next.js setup | Social previews broken on WhatsApp/LinkedIn | Never - breaks core value proposition |
| No idempotency on refresh jobs | Simpler Lambda code | Duplicate API calls, wasted budget, race conditions | Never - EventBridge at-least-once delivery guaranteed |
| Development mode Spotify API | No extended quota application | Severe rate limiting, frequent 429 errors | MVP only if <10 test users |
| Hardcoded prompts in Lambda | Fast to ship | Hard to iterate, no A/B testing | MVP only, move to DynamoDB config in Phase 2 |
| Manual cache invalidation | No automated pipeline | Stale social previews, user complaints | MVP only if <50 profiles |
| Single DynamoDB table design | Follows "best practice" blog posts | Hot partitions, higher costs, complex debugging | Never - multi-table is simpler and scales better |
| Using Opus model for all content | Highest quality output | 60x cost vs Haiku for same task | Never - use model routing |
| No rate limiting on AI generation | Trust users won't abuse | Cost attacks, budget blown | Never - implement from day 1 |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Spotify OAuth | Mixing PKCE flow (single-use refresh tokens) with Authorization Code flow (reusable tokens) | Use Authorization Code flow for server-side, always include client_secret in Authorization header |
| Spotify token refresh | Not storing updated refresh token when provided in response | Always persist refresh_token from response, fallback to old if not provided |
| Spotify API rate limits | Ignoring 429 Retry-After header, retrying immediately | Parse Retry-After, queue for delayed retry, use exponential backoff |
| Spotify rate limits | Assuming Development mode works for production | Apply for Extended Quota Mode before launch (requires organization status) |
| Spotify playlists | Refetching full playlist data on every refresh | Use snapshot_id to check if changed, skip if unchanged |
| AWS Bedrock | Calling from client-side code with exposed credentials | Always proxy through backend API with authentication and rate limiting |
| Bedrock cost control | Not caching repeated prompt prefixes | Enable prompt caching (85% cost reduction on repeated system prompts) |
| Bedrock model selection | Using Opus for everything | Route to cheapest model: Haiku for simple tasks (60x cheaper than Opus) |
| DynamoDB encryption | Using AWS-managed key with hardcoded IAM credentials | Use customer-managed CMK + IAM execution roles |
| DynamoDB schema | Creating GSI with single partition key for all items (e.g., "PROFILE") | Shard GSI partition keys or use multi-table design with natural distribution |
| DynamoDB queries | Scanning entire table to find items | Create GSI with appropriate partition keys for access patterns |
| Next.js metadata | Defining og:image in useEffect (CSR) | Use generateMetadata export for SSR |
| WhatsApp previews | Only testing with Facebook Sharing Debugger | Test actual WhatsApp share, verify 1200x630 image <300KB |
| CloudWatch Logs | Logging full API responses containing tokens | Redact sensitive fields before logging |
| EventBridge scheduling | Assuming exactly-once execution | Implement idempotency with Powertools and execution-id |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Synchronous refresh for all users | Scheduled job takes >1 hour, Lambda timeouts | Batch processing with delays, use SQS queue, respect rate limits | >100 active users |
| Storing OG images in Lambda /tmp | Intermittent failures, images lost on cold start | Upload to S3, serve via CloudFront with caching | >1000 profile views/hour |
| On-demand AI generation per view | High Bedrock costs, slow page loads | Generate once on profile update, cache in DB, serve cached version | >100 views/day |
| Querying all users to find refresh candidates | Lambda timeout, high DynamoDB scan costs | Create GSI with nextRefreshAt timestamp for efficient queries | >1000 users |
| Inline token refresh during request | Concurrent refresh races, user sees slow responses | Async refresh via SQS, scheduled background jobs | >50 concurrent users |
| Missing DynamoDB pagination | Memory errors, Lambda timeout, incomplete results | Use LastEvaluatedKey for pagination in all queries | >1MB query result |
| No CloudFront for public profiles | High origin load, slow international access | Cache public profiles with 5-min TTL via CloudFront | >100 requests/min |
| Embedding full Spotify response | DynamoDB item >400KB errors | Store only needed fields, compress large data | Artists with >100 albums |
| All refresh jobs at same time | Rate limiting, DynamoDB throttling | Add jitter (random offset 0-30min) to scheduled times | >50 scheduled refreshes |
| Regenerating OG images per request | Slow social crawls, high CPU usage | Generate once, cache in S3, regenerate only on profile update | >100 shares/day |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Bedrock credentials client-side | Unlimited AI generation costs, credential theft, account ban | Always proxy through authenticated backend, never embed AWS credentials in frontend |
| Storing refresh tokens in plaintext | Account takeover, GDPR violation, PR disaster | Use DynamoDB CMK encryption + client-side encryption with AWS Encryption SDK |
| Missing rate limiting on AI generation | Cost attack: malicious users spam generation to drain budget | Implement per-user rate limits (e.g., 10 generations/hour, 50/day) |
| Logging Spotify tokens in CloudWatch | Token leakage via log export or search | Redact token fields before logging with structured logging library |
| Using AWS access keys in Lambda | Credential exposure if config leaked, no rotation | Use IAM execution roles exclusively, never environment variable credentials |
| No CORS restrictions on API routes | CSRF attacks, unauthorized access from other domains | Restrict CORS to your domain only, validate Origin header |
| Publishing profiles without user confirmation | Privacy violation, user surprise, GDPR issue | Require explicit "Publish" action, default to private/draft state |
| Allowing arbitrary URLs in OG image generation | SSRF vulnerability, resource exhaustion, credential theft | Validate URLs, only allow whitelisted origins (S3, CDN) |
| Missing CSP headers on public profiles | XSS vulnerability, script injection | Add Content-Security-Policy header restricting script sources |
| No input validation on AI prompts | Prompt injection, inappropriate content generation | Validate and sanitize all user inputs, implement output validation |
| Overly permissive KMS decrypt | Any compromised role can decrypt all tokens | Scope kms:Decrypt to specific Lambda execution roles only, use encryption context |
| Not rotating KMS keys | Long-term key exposure increases risk | Enable automatic KMS key rotation (annual) |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing "Token expired" or "invalid_grant" error | Users don't understand OAuth internals, feels broken | Silently refresh tokens, show generic "Reconnect Spotify" only if refresh fails permanently |
| AI generation without preview | Users publish cringe content they haven't reviewed | Always show preview modal before publishing, allow edits or regeneration |
| No loading state during AI generation | Users think app is frozen or broken | Show animated loader with estimated time (5-10 seconds for bio generation) |
| Requiring re-auth every hour | Interrupts user flow, feels unreliable and broken | Implement automatic token refresh behind the scenes, transparent to user |
| "Profile not found" for unpublished profiles | 404 confuses profile owners who see their own content | Show "This profile is private" with edit link if owner is viewing |
| No way to delete account/data | GDPR violation, erodes trust, legal liability | Provide "Delete my data" button, actually delete tokens and profile from all tables |
| Automatic bio generation without opt-in | Creepy, removes user agency, feels invasive | Make AI generation opt-in, emphasize it's optional, show manual input option |
| Social preview shows outdated data | Users share link showing stale content, looks unprofessional | Regenerate OG images when profile updates, invalidate cache |
| No feedback when share link copied | Users unsure if action worked, might try multiple times | Show toast notification: "Link copied to clipboard!" |
| Profile URL contains database IDs | Ugly URLs, not memorable, not shareable | Use vanity URLs: anchor.band/artistname not anchor.band/user-123abc |
| No "last updated" timestamp | Users don't trust data freshness | Show "Updated 2 hours ago" on profile, "Last refreshed from Spotify: 1 hour ago" |
| Error messages with technical jargon | Users confused, can't self-resolve | User-friendly: "Couldn't connect to Spotify. Try reconnecting." not "Grant type invalid: refresh_token" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **OAuth Flow:** Works on happy path, but missing automatic token refresh - verify scheduled Lambda runs and updates tokens successfully
- [ ] **OAuth Flow:** Stores access token but not refresh token updates - verify new refresh tokens are persisted when provided in response
- [ ] **OAuth Flow:** Missing Authorization header format - verify Base64-encoded client_id:client_secret included in refresh requests
- [ ] **Rate Limiting:** Catches 429 errors but doesn't parse Retry-After header - verify responses are queued with appropriate delay
- [ ] **Rate Limiting:** No request batching or delays - verify scheduled refreshes use batching and staggered timing
- [ ] **AI Generation:** No output validation - verify banned phrases filtered, length constraints enforced, quality thresholds checked
- [ ] **AI Generation:** No cost controls - verify per-user rate limits, prompt caching enabled, token usage monitored, billing alarms set
- [ ] **AI Generation:** Using expensive model - verify model routing selects cheapest model for task complexity (Haiku for most tasks)
- [ ] **Social Previews:** Meta tags defined but CSR not SSR - verify curl shows OG tags in HTML source, not just browser DevTools
- [ ] **Social Previews:** Only tested with one validator - verify actual WhatsApp share, Twitter preview, LinkedIn preview all work
- [ ] **Social Previews:** OG images not optimized - verify images meet platform requirements (WhatsApp <300KB, 1200x630 dimensions)
- [ ] **DynamoDB:** GSI created but no partition analysis - verify partition cardinality calculation, not all items in single partition
- [ ] **DynamoDB:** Using provisioned mode - verify on-demand mode enabled for MVP to prevent throttling during unpredictable traffic
- [ ] **Security:** Tokens stored but not encrypted - verify customer-managed KMS key configured, client-side encryption implemented
- [ ] **Security:** IAM roles have broad permissions - verify least privilege: specific kms:Decrypt scope, no kms:* wildcard
- [ ] **Security:** Sensitive data in logs - verify CloudWatch logs don't contain tokens, API keys, or encrypted values
- [ ] **Scheduled Jobs:** EventBridge rule created but no idempotency - verify Powertools idempotency layer, execution-id used as key
- [ ] **Scheduled Jobs:** All users refreshed simultaneously - verify jitter added to scheduled times (0-30 min random offset)
- [ ] **Public Profiles:** Published but no unpublish - verify users can make profiles private after publishing
- [ ] **Error Handling:** Try-catch exists but messages too technical - verify user-friendly error messages, no internal details exposed
- [ ] **Cost Monitoring:** Bedrock integrated but no tracking - verify CloudWatch custom metrics, billing alarms, cost per profile logged

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Refresh token failures | MEDIUM | 1. Add logging to identify failure mode (missing header, wrong flow) 2. Fix auth implementation 3. Force users to reconnect (email notification) 4. Monitor success rate |
| 24-hour rate limit ban | HIGH | 1. Wait out ban period (no way to expedite) 2. Apply for Extended Quota Mode (if eligible) 3. Implement request queuing with proper delays 4. Add Retry-After respect |
| Hot GSI partition throttling | HIGH | 1. Enable on-demand mode immediately (stop bleeding) 2. Create new GSI with sharded partition keys 3. Backfill data to new GSI 4. Update queries to use new GSI 5. Delete old GSI |
| Exposed AWS credentials | CRITICAL | 1. Rotate credentials immediately (within minutes) 2. Audit CloudTrail for unauthorized usage 3. Implement IAM roles in code 4. Re-deploy with roles 5. Set up billing alerts |
| Cringe AI content published | LOW | 1. Add regenerate button to UI 2. Implement output validation filters 3. Update prompts with negative examples 4. Notify affected users of "improved bios" feature |
| WhatsApp previews broken | MEDIUM | 1. Verify SSR vs CSR (curl test) 2. Convert to SSR if needed 3. Regenerate OG images at 1200x630 <300KB 4. Test actual WhatsApp share 5. Notify users to re-share |
| Plaintext tokens in database | HIGH | 1. Rotate all tokens (force reconnect for security) 2. Create new table with KMS encryption 3. Migrate data with encryption 4. Update app to use new table 5. Audit logs for leaks |
| Missing Retry-After logic causing bans | MEDIUM | 1. Wait out current ban 2. Implement exponential backoff with Retry-After parsing 3. Add SQS queue for delayed retries 4. Test with mock 429 responses |
| Client-side Bedrock calls discovered | CRITICAL | 1. Rotate AWS credentials immediately 2. Implement backend proxy API 3. Add authentication and rate limiting 4. Audit bills for unauthorized usage 5. Review all client-side code |
| DynamoDB scanning performance issues | MEDIUM | 1. Identify scanning queries in CloudWatch Logs 2. Create GSI with appropriate partition keys 3. Update queries to use GSI 4. Add pagination to all queries 5. Monitor query performance |
| Bedrock costs >$200/month | LOW-MEDIUM | 1. Enable prompt caching immediately 2. Switch to Haiku model 3. Add token limits to prompts 4. Implement per-user rate limits 5. Set billing alarm 6. Review historical usage |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OAuth token refresh failures | Phase 1: OAuth Implementation | Test: Mock token expiration, verify refresh updates both access and refresh tokens, check Authorization header format |
| Spotify rate limiting | Phase 2: Scheduled Refresh | Test: CloudWatch metric shows 429 error rate <1%, Retry-After header respected in logs, requests queued on limit |
| AI content being cringe | Phase 1: AI Generation + Phase 3: Iteration | Test: Generate 100 bios, manual review shows >80% acceptable, banned phrases filtered, regeneration rate <30% |
| Social preview metadata broken | Phase 1: Public Profiles | Test: curl shows OG tags in raw HTML, all platform validators pass, actual WhatsApp share works |
| DynamoDB hot partitions | Phase 1: Data Model Design | Test: Calculate partition cardinality for expected load, CloudWatch shows WriteThrottleEvents = 0, on-demand mode enabled |
| Duplicate refresh runs | Phase 2: Scheduled Refresh | Test: Idempotency cache hit rate >0%, invoke Lambda twice with same event verifies second is no-op, no race conditions |
| Bedrock cost overruns | Phase 1: MVP + ongoing monitoring | Test: Prompt caching enabled, cost <$0.02 per profile, billing alarm set at $50/month, token usage logged |
| Token security failures | Phase 1: OAuth Implementation | Test: Tokens encrypted at rest, customer-managed KMS key configured, IAM roles used (no access keys), logs redacted |
| Synchronous refresh performance | Phase 2: Scheduled Refresh | Test: 100 concurrent refreshes complete in <5 minutes, no Lambda timeouts, SQS queue used for batching |
| Rate limits on AI generation | Phase 1: AI Generation | Test: Attempt 50 generations in 1 minute, verify rate limit enforced after 10, appropriate error message shown |

## Sources

### Spotify OAuth & API (HIGH confidence - official docs)
- [Refreshing tokens | Spotify for Developers](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)
- [Authorization Code Flow | Spotify for Developers](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [Rate Limits | Spotify for Developers](https://developer.spotify.com/documentation/web-api/concepts/rate-limits)
- [Spotify OAuth Migration - November 2025](https://developer.spotify.com/blog/2025-10-14-reminder-oauth-migration-27-nov-2025)
- [Spotify Community: Invalid Refresh Token Discussion](https://community.spotify.com/t5/Spotify-for-Developers/Invalid-refresh-token/td-p/5483508)
- [NextAuth Spotify Refresh Token Issues](https://github.com/nextauthjs/next-auth/discussions/6925)
- [Spotify Community: 24-Hour Rate Limiting](https://community.spotify.com/t5/Spotify-for-Developers/Constantly-getting-24-hour-Rate-Limited-during-development/td-p/5814282)

### AWS Bedrock (HIGH confidence - official AWS)
- [Amazon Bedrock Cost Optimization](https://aws.amazon.com/bedrock/cost-optimization/)
- [Amazon Bedrock Advanced Operations Playbook](https://repost.aws/articles/ARD6jc9NNrQQ-FAvEpBOWiwA/amazon-bedrock-advanced-operations-playbook-optimizing-performance-cost-and-availability)
- [How We Reduced AI Infrastructure Costs by 47%](https://medium.com/@aiengineeringonaws/how-we-reduced-ai-infrastructure-costs-by-47-using-aws-bedrock-optimization-3ec0dd466f6a)
- [AWS Bedrock Pricing Explained (2026)](https://www.truefoundry.com/blog/aws-bedrock-pricing)
- [Optimizing Generative AI with Bedrock Tokenizer](https://www.cloudthat.com/resources/blog/optimizing-generative-ai-workloads-with-amazon-bedrock-tokenizer)

### DynamoDB Design (HIGH confidence - AWS and experts)
- [The What, Why, and When of Single-Table Design with DynamoDB](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [Problems with DynamoDB Single Table Design - Nordcloud](https://nordcloud.com/tech-community/problems-with-dynamodb-single-table-design/)
- [Lessons Learned Using Single-Table Design](https://www.rwilinski.me/blog/dynamodb-single-table-design-lessons/)
- [Single-table vs. multi-table design | Amazon Web Services](https://aws.amazon.com/blogs/database/single-table-vs-multi-table-design-in-amazon-dynamodb/)
- [DynamoDB Single Table Design: Strategic Key Design and GSI Optimization](https://pravin.dev/posts/dynamodb-single-table-design/)

### EventBridge & Idempotency (HIGH confidence - AWS)
- [EventBridge duplicate events due to at-least-once delivery | AWS re:Post](https://repost.aws/questions/QUEi1t0HGeTVakJB2VKl-Q3g/eventbridge-duplicate-events-due-to-at-least-once-delivery)
- [Handle duplicate delivery with AWS EventBridge](https://jbcodeforce.github.io/eda-studies/solutions/autonomous-car/es-duplicate-evt/)
- [Idempotency | Event-driven Architecture on AWS](https://aws-samples.github.io/eda-on-aws/concepts/idempotency/)
- [9 Surprises using AWS EventBridge Scheduler](https://dev.to/slsbytheodo/9-surprises-using-aws-eventbridge-scheduler-13b6)

### Social Previews & Metadata (MEDIUM confidence - platform docs + guides)
- [OpenGraph - Preview Social Media Share](https://www.opengraph.xyz/)
- [Open Graph Meta Tags Guide](https://svaerm.com/en/blog/open-graph-meta-tags/)
- [Debugging OG Image Issues for Social Media](https://blog.sathwikreddygv.com/debugging-og-image-issues-for-social-media)
- [How to Fix Link Previews on LinkedIn](https://kinsta.com/blog/linkedin-debugger/)
- [WhatsApp Link Preview Fix Guide](https://linkpreview.eu/en/blog/fix-link-preview-whatsapp)
- [How to Fix Your Social Sharing Link Previews](https://prerender.io/blog/how-to-fix-link-previews/)

### Next.js & SEO (HIGH confidence - official Next.js)
- [How to Configure SEO in Next.js 16](https://jsdevspace.substack.com/p/how-to-configure-seo-in-nextjs-16)
- [Next.js SEO Optimization Guide (2026)](https://www.djamware.com/post/697a19b07c935b6bb054313e/next-js-seo-optimization-guide--2026-edition)
- [Next.js Metadata Generation Issues](https://github.com/vercel/next.js/discussions/54939)
- [How to Fix Metadata Generation Errors in Next.js](https://oneuptime.com/blog/post/2026-01-24-fix-nextjs-metadata-generation-errors/view)

### AWS Security & KMS (HIGH confidence - official AWS)
- [AWS KMS Best Practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/kms.html)
- [How to Securely Store OAuth Tokens | AWS re:Post](https://repost.aws/questions/QU_u51s2nbQnOV9XDTBJa-7g/how-to-securely-store-oauth-tokens-for-multiple-users-and-apps)
- [Best practices for the AWS Encryption SDK](https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/best-practices.html)
- [DynamoDB Encryption at Rest](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html)

### AI Content Quality (MEDIUM confidence - industry guides)
- [AI Content Quality Control: Complete Guide for 2026](https://koanthic.com/en/ai-content-quality-control-complete-guide-for-2026-2/)
- [The 2026 Guide to Prompt Engineering | IBM](https://www.ibm.com/think/prompt-engineering)
- [Prompt Engineering Mastery 2026](https://aitoolhub.cloud/blog/prompt-engineering-mastery.html)
- [AI Content Workflow: Scale Quality Production in 2026](https://koanthic.com/en/ai-content-workflow-scale-quality-production-in-2026/)

### Caching & Performance (MEDIUM confidence - best practices)
- [The CloudFront Catastrophes: 3 Caching Mistakes](https://medium.com/@avanbecelaere/the-cloudfront-catastrophes-3-caching-mistakes-burning-your-budget-b101dcb75ce1)
- [Top 10 Common Caching Mistakes to Avoid](https://moldstud.com/articles/p-top-10-common-caching-mistakes-to-avoid-for-enhanced-performance)
- [Cache Invalidation vs. Expiration: Best Practices](https://daily.dev/blog/cache-invalidation-vs-expiration-best-practices)
- [The Cache That Destroyed Our Data Integrity](https://medium.com/@aniruddhasonawane/the-cache-that-saved-our-database-and-slowly-destroyed-our-data-integrity-5578dc2132b9)

---

*Pitfalls research for: Anchor.band - Music profile pages with Spotify OAuth, AI generation, and auto-refresh*
*Researched: 2026-02-04*
*Confidence: HIGH (verified with official Spotify, AWS, and platform documentation)*
