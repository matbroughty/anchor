# Phase 3: Publishing - Research

**Researched:** 2026-02-06
**Domain:** Next.js 15 App Router public pages with SSR and Open Graph metadata
**Confidence:** HIGH

## Summary

Phase 3 requires implementing public pages at `/[handle]` routes with server-side rendering (SSR) for proper social preview metadata on WhatsApp, Twitter, and LinkedIn. The standard approach uses Next.js 15 dynamic routes with the `generateMetadata` function for Open Graph tags, `notFound()` for unpublished pages, and DynamoDB queries for cached music/content data.

Next.js 15 introduced breaking changes where `params` is now a Promise that must be awaited. The App Router provides built-in support for dynamic metadata generation, automatic request deduplication, and file-based or programmatic Open Graph images. Public pages should use ISR (Incremental Static Regeneration) rather than force-dynamic SSR for better performance, since content changes infrequently and real-time data isn't required.

**Primary recommendation:** Use ISR with `export const revalidate = 3600` (1 hour) for public pages, `generateMetadata` for dynamic OG tags, and React's `cache()` for deduplicating DynamoDB queries within render passes.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 15.1.6+ | Dynamic routes with SSR | Built-in metadata API, automatic deduplication, streaming support |
| React | 19.0.0+ | Server Components | cache() function for request memoization |
| next/og | Built-in | Open Graph image generation | Official Next.js library for dynamic OG images |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| DOMPurify | Latest | XSS protection | If user-generated content rendered as HTML (not needed if text-only) |
| sharp | Built-in via Next.js | Image optimization | Automatic for static images in public folder |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ISR (revalidate) | force-dynamic SSR | SSR regenerates every request (slower), ISR serves cached instantly |
| generateMetadata | Static metadata export | Dynamic metadata allows per-handle customization |
| Generic OG image | Per-handle OG images | Custom images require S3 + image generation complexity (deferred to v2) |

**Installation:**
```bash
# No new packages required
# next/og and React cache() are built into Next.js 15 and React 19
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── [handle]/
│   ├── page.tsx          # Public profile page
│   └── not-found.tsx     # Custom 404 for this route
├── (protected)/          # Existing authenticated routes
├── actions/
│   └── publish.ts        # Server actions for publish/unpublish
└── layout.tsx

lib/
├── dynamodb/
│   ├── public-profile.ts # Query functions for public data
│   └── schema.ts         # Add isPublic flag constants
└── og-image-config.ts    # OG metadata constants

public/
└── og-image.png          # Generic 1200x630 OG image
```

### Pattern 1: Dynamic Route with ISR and generateMetadata
**What:** Public page at `/[handle]` with ISR caching and dynamic metadata
**When to use:** Public pages with infrequent updates, need social preview metadata
**Example:**
```typescript
// app/[handle]/page.tsx
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 3600 // ISR: revalidate every 1 hour

type Props = {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const profile = await getPublicProfile(handle)

  if (!profile || !profile.isPublic) {
    return {} // Return empty metadata for 404s
  }

  return {
    title: `${profile.displayName} on Anchor.band`,
    description: profile.bio || `Check out ${profile.displayName}'s music taste`,
    openGraph: {
      title: `${profile.displayName} on Anchor.band`,
      description: profile.bio || `Check out ${profile.displayName}'s music taste`,
      url: `https://anchor.band/${handle}`,
      siteName: 'Anchor.band',
      images: [
        {
          url: 'https://anchor.band/og-image.png',
          width: 1200,
          height: 630,
          alt: 'Anchor.band'
        }
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.displayName} on Anchor.band`,
      description: profile.bio || `Check out ${profile.displayName}'s music taste`,
      images: ['https://anchor.band/og-image.png'],
    }
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params
  const profile = await getPublicProfile(handle)

  if (!profile || !profile.isPublic) {
    notFound() // Triggers app/[handle]/not-found.tsx
  }

  return (
    <div>
      <h1>{profile.displayName}</h1>
      <p>{profile.bio}</p>
      {/* Render artists, albums, tracks */}
    </div>
  )
}
```

### Pattern 2: React cache() for DynamoDB Deduplication
**What:** Wrap DynamoDB queries with React's cache() to prevent duplicate fetches
**When to use:** When same data needed in both generateMetadata and page component
**Example:**
```typescript
// lib/dynamodb/public-profile.ts
import { cache } from 'react'
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocumentClient, TABLE_NAME } from '@/lib/dynamodb'

// Cache wrapper prevents duplicate DynamoDB calls in same render
export const getPublicProfile = cache(async (handle: string) => {
  // 1. Get userId from HANDLE#{handle} record
  const handleResult = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `HANDLE#${handle}`, sk: `HANDLE#${handle}` }
    })
  )

  if (!handleResult.Item) return null
  const userId = handleResult.Item.userId

  // 2. Get user profile with isPublic flag
  const userResult = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk: `USER#${userId}`, sk: `USER#${userId}` }
    })
  )

  // Return null if user doesn't exist or isn't published
  if (!userResult.Item || !userResult.Item.isPublic) return null

  // 3. Batch get music data and content
  const [musicData, bio, captions] = await Promise.all([
    getMusicData(userId),
    getBio(userId),
    getCaptions(userId)
  ])

  return {
    displayName: userResult.Item.displayName,
    handle: userResult.Item.handle,
    isPublic: userResult.Item.isPublic,
    bio: bio?.text,
    artists: musicData.artists,
    albums: musicData.albums,
    tracks: musicData.tracks,
    captions
  }
})
```

### Pattern 3: Publish/Unpublish Server Actions
**What:** Toggle isPublic flag with server actions
**When to use:** Dashboard UI needs to publish/unpublish pages
**Example:**
```typescript
// app/actions/publish.ts
'use server'

import { auth } from '@/lib/auth'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { dynamoDocumentClient, TABLE_NAME } from '@/lib/dynamodb'
import { revalidatePath } from 'next/cache'

export async function publishPage(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${session.user.id}`, sk: `USER#${session.user.id}` },
        UpdateExpression: 'SET isPublic = :true, updatedAt = :time',
        ExpressionAttributeValues: {
          ':true': true,
          ':time': new Date().toISOString()
        }
      })
    )

    // Get user's handle and revalidate their public page
    const user = await getUser(session.user.id)
    if (user?.handle) {
      revalidatePath(`/${user.handle}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error publishing page:', error)
    return { success: false, error: 'Failed to publish page' }
  }
}

export async function unpublishPage(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk: `USER#${session.user.id}`, sk: `USER#${session.user.id}` },
        UpdateExpression: 'SET isPublic = :false, updatedAt = :time',
        ExpressionAttributeValues: {
          ':false': false,
          ':time': new Date().toISOString()
        }
      })
    )

    const user = await getUser(session.user.id)
    if (user?.handle) {
      revalidatePath(`/${user.handle}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Error unpublishing page:', error)
    return { success: false, error: 'Failed to unpublish page' }
  }
}
```

### Anti-Patterns to Avoid
- **Using force-dynamic for public pages:** Public pages don't need per-request rendering. Use ISR with revalidate instead.
- **Not wrapping DynamoDB queries with cache():** Leads to duplicate database calls in generateMetadata and page component.
- **Using dynamicParams = false:** This returns 404 for non-prerendered handles. Keep default (true) for on-demand rendering.
- **Calling notFound() after returning JSX:** notFound() must be called before any rendering starts.
- **Not revalidating after publish/unpublish:** Changes won't reflect until cache expires naturally.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Request deduplication | Custom query cache | React cache() | Built-in memoization, automatic cleanup after render |
| Open Graph images | Custom image generation | Generic static image in /public | Custom per-handle images add S3/Lambda complexity |
| Metadata management | Manual meta tags | generateMetadata | Automatic deduplication, type-safe, integrates with streaming |
| ISR cache invalidation | Custom cache logic | revalidatePath() | Built-in Next.js ISR invalidation |
| Content sanitization | Custom HTML escaping | React's automatic escaping | React escapes by default, no dangerouslySetInnerHTML needed |

**Key insight:** Next.js 15 App Router provides comprehensive caching and metadata infrastructure. Building custom solutions duplicates built-in features and misses optimizations like automatic request deduplication and streaming support.

## Common Pitfalls

### Pitfall 1: Not Awaiting params Promise in Next.js 15
**What goes wrong:** Accessing params.handle directly causes TypeScript errors or runtime failures
**Why it happens:** Next.js 15 changed params from synchronous object to Promise for better streaming support
**How to avoid:** Always await params at the start of generateMetadata and page components
**Warning signs:** TypeScript errors about "Property 'handle' does not exist on type 'Promise'", runtime errors accessing undefined

### Pitfall 2: Fetching Data Twice (generateMetadata + page)
**What goes wrong:** Same DynamoDB queries run twice per request, doubling latency and costs
**Why it happens:** generateMetadata and page component both call getPublicProfile() without memoization
**How to avoid:** Wrap data fetching functions with React's cache() function
**Warning signs:** CloudWatch logs show duplicate DynamoDB queries with same parameters, slow page loads

### Pitfall 3: Using force-dynamic Instead of ISR
**What goes wrong:** Public pages render slowly, high server load, poor user experience
**Why it happens:** Developer assumes public pages need real-time data like dashboards
**How to avoid:** Use ISR with revalidate (1 hour is good default), reserve force-dynamic for truly dynamic content
**Warning signs:** Slow TTFB (Time To First Byte), high server CPU usage, user complaints about slow loads

### Pitfall 4: Wrong Open Graph Image Size
**What goes wrong:** Images don't display on WhatsApp or get cropped on Twitter/LinkedIn
**Why it happens:** Using non-standard dimensions or file size over 300KB (WhatsApp limit)
**How to avoid:** Use 1200x630 pixels, compress to under 300KB for WhatsApp compatibility
**Warning signs:** Social preview missing or cropped when testing with sharing debugger tools

### Pitfall 5: Not Handling Unpublished Pages Properly
**What goes wrong:** Unpublished pages show "page not found" but return 200 status, or show private data
**Why it happens:** Missing isPublic check or checking after data fetch
**How to avoid:** Check isPublic early in getPublicProfile, return null if false, call notFound() in page
**Warning signs:** Private pages visible, SEO indexing unpublished pages, wrong HTTP status codes

### Pitfall 6: Forgetting to Revalidate After Publish/Unpublish
**What goes wrong:** User publishes page but sees no change, or unpublishes but page still visible
**Why it happens:** ISR cache not invalidated after database update
**How to avoid:** Call revalidatePath(`/${handle}`) in publish/unpublish server actions
**Warning signs:** User reports changes not reflecting, cache expires hours later and "fixes itself"

### Pitfall 7: Not Testing Social Preview Metadata
**What goes wrong:** WhatsApp/Twitter previews don't show correct title/description/image
**Why it happens:** Developer tested page visually but didn't use social debugger tools
**How to avoid:** Test with Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector
**Warning signs:** Users report "link looks broken" when shared, no preview thumbnail

## Code Examples

Verified patterns from official sources:

### Dynamic Route Page with Next.js 15 Params
```typescript
// Source: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ handle: string }> // Next.js 15: params is Promise
}

export default async function Page({ params }: Props) {
  const { handle } = await params // Must await
  const profile = await getPublicProfile(handle)

  if (!profile || !profile.isPublic) {
    notFound()
  }

  return <div>{profile.displayName}</div>
}
```

### generateMetadata with Open Graph
```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
import type { Metadata } from 'next'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  const profile = await getPublicProfile(handle)

  if (!profile) return {}

  return {
    title: profile.displayName,
    openGraph: {
      title: profile.displayName,
      description: profile.bio,
      url: `https://anchor.band/${handle}`,
      siteName: 'Anchor.band',
      images: [{ url: '/og-image.png', width: 1200, height: 630 }],
      type: 'profile',
    }
  }
}
```

### ISR Configuration
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config
export const revalidate = 3600 // Revalidate every hour (ISR)
```

### React cache() for Deduplication
```typescript
// Source: https://nextjs.org/docs/app/getting-started/fetching-data
import { cache } from 'react'

export const getPublicProfile = cache(async (handle: string) => {
  // DynamoDB queries here
  // Called once per render pass, even if invoked multiple times
})
```

### notFound with Custom 404 Page
```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
// app/[handle]/not-found.tsx
import Link from 'next/link'

export default function NotFound() {
  return (
    <div>
      <h2>Profile Not Found</h2>
      <p>This page doesn't exist or is not published.</p>
      <Link href="/">Return Home</Link>
    </div>
  )
}
```

### Responsive Grid (Existing Pattern)
```typescript
// Source: Current codebase (AlbumCaptions.tsx)
// Mobile-first responsive grid: 1 col → 2 cols (sm) → 3 cols (lg)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {albums.map(album => (
    <AlbumCard key={album.id} album={album} />
  ))}
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getStaticProps + getStaticPaths | generateMetadata + ISR | Next.js 13+ | Simpler API, better streaming support |
| params as object | params as Promise | Next.js 15 | Must await params before use |
| Custom fetch deduplication | Automatic with fetch/cache() | Next.js 13+ | Less code, automatic optimization |
| Manual meta tags | generateMetadata | Next.js 13+ | Type-safe, integrated with streaming |
| revalidate: false (default) | No caching by default | Next.js 15 | Must explicitly opt into caching |

**Deprecated/outdated:**
- **getStaticProps/getServerSideProps:** App Router uses Server Components and generateMetadata instead
- **Pages Router dynamic routes:** Use app/[handle]/page.tsx instead of pages/[handle].tsx
- **Synchronous params:** Next.js 15 changed params to Promise, synchronous access will be removed
- **next-seo package:** Built-in generateMetadata replaces third-party SEO libraries

## Open Questions

Things that couldn't be fully resolved:

1. **DynamoDB Query Optimization for Public Pages**
   - What we know: Need to query HANDLE → USER → MUSIC/CONTENT data (3-4 DynamoDB calls)
   - What's unclear: Whether to use BatchGetCommand or individual GetCommands, caching strategy
   - Recommendation: Use individual GetCommands wrapped in Promise.all for parallelization, React cache() handles deduplication. Monitor CloudWatch metrics to optimize later.

2. **Generic OG Image Design**
   - What we know: 1200x630 PNG/JPG, under 300KB for WhatsApp
   - What's unclear: Exact design (logo, colors, text)
   - Recommendation: Simple design with "Anchor.band" logo/text, neutral colors. Design task in implementation phase.

3. **Revalidate Interval**
   - What we know: ISR with revalidate is better than force-dynamic
   - What's unclear: Optimal interval (1 hour? 24 hours?)
   - Recommendation: Start with 3600 (1 hour). User can manually refresh Spotify data, so public page doesn't need real-time updates. Adjust based on usage patterns post-launch.

4. **isPublic Default Value**
   - What we know: Need isPublic boolean flag on USER record
   - What's unclear: Default to true or false for new users?
   - Recommendation: Default to false (unpublished). User explicitly publishes when ready. Safer for privacy.

## Sources

### Primary (HIGH confidence)
- [Next.js generateMetadata Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) - Official API reference, Next.js 15 params Promise changes
- [Next.js Dynamic Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) - Dynamic segments, params handling
- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config) - ISR revalidate options
- [Next.js notFound Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/not-found) - 404 handling patterns
- [Next.js Open Graph Images Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) - Image specifications, dimensions
- [Next.js Data Fetching Guide](https://nextjs.org/docs/app/getting-started/fetching-data) - React cache() usage
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Mobile-first breakpoints

### Secondary (MEDIUM confidence)
- [When to Use SSR, SSG, or ISR in Next.js | 2026](https://bitskingdom.com/blog/nextjs-when-to-use-ssr-vs-ssg-vs-isr/) - ISR vs SSR performance comparison
- [Caching & Revalidation in Next.js (Feb 2026)](https://medium.com/@chandansingh73718/caching-revalidation-in-next-js-isr-fetch-cache-real-production-patterns-7433354a2591) - Real production ISR patterns
- [OG Image Size Guide 2026](https://myogimage.com/blog/og-image-size-meta-tags-complete-guide) - Platform-specific requirements (WhatsApp 300KB limit)
- [Next.js 15 App Router Complete Guide](https://medium.com/@livenapps/next-js-15-app-router-a-complete-senior-level-guide-0554a2b820f7) - Comprehensive Next.js 15 patterns
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/) - XSS protection best practices
- [XSS Attacks in Next.js: How to Secure Your App](https://medium.com/@kayahuseyin/xss-attacks-in-next-js-how-to-secure-your-app-like-a-pro-9a81d3513d62) - React escaping patterns

### Tertiary (LOW confidence)
- [Advanced Single Table Design Patterns With DynamoDB](https://dev.to/urielbitton/advanced-single-table-design-patterns-with-dynamodb-4g26) - General single-table patterns (not specific to isPublic flag)
- [GitHub Discussion: not-found not working with dynamic routing](https://github.com/vercel/next.js/discussions/57938) - Community troubleshooting

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Next.js 15 documentation, current project dependencies
- Architecture: HIGH - Verified patterns from Next.js docs, existing codebase patterns
- Pitfalls: MEDIUM - Based on community discussions (GitHub, dev.to) and documented breaking changes
- Open Graph specs: HIGH - Multiple 2026 sources confirm 1200x630 and 300KB WhatsApp limit
- Security: MEDIUM - React escaping is documented, but XSS patterns based on blog posts

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable domain, Next.js 15 is current stable release)
