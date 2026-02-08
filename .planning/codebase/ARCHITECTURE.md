# Architecture

**Analysis Date:** 2026-02-08

## Pattern Overview

**Overall:** Server-driven full-stack Next.js application with a music profile publishing system

**Key Characteristics:**
- Server components (RSC) for data fetching and rendering public/protected pages
- Server actions (Server Functions) for mutations and expensive computations
- Client components for interactive UI and form handling
- Single-table DynamoDB schema for all user data with partition/sort key design
- AWS Bedrock for AI content generation (bios, captions, analysis)
- NextAuth v5 with multi-provider support (Spotify, Google, Resend email)
- Middleware-based route protection with clear auth vs protected separation

## Layers

**Presentation Layer:**
- Purpose: React components for user interaction and data display
- Location: `app/components/`, `app/(auth)/`, `app/(protected)/`, `app/[handle]/`
- Contains: Client components (ProfileForm, PublicProfile, BioEditor), page templates, layouts
- Depends on: Server actions, auth session, type definitions
- Used by: Next.js router; browser client

**Server Action Layer:**
- Purpose: Encapsulate mutations and expensive operations callable from client components
- Location: `app/actions/`
- Contains: 9 server action files (spotify.ts, ai-content.ts, publish.ts, taste-analysis.ts, age-guess.ts, featured-artists.ts, content-edit.ts, lastfm.ts, disconnect-spotify.ts)
- Depends on: Data access layer, auth, external APIs (Spotify, Bedrock, Last.fm)
- Used by: Client components via direct import; marked with "use server"

**Route Handler Layer:**
- Purpose: API routes for NextAuth callbacks and profile management
- Location: `app/api/auth/[...nextauth]/route.ts`, `app/api/profile/`
- Contains: NextAuth route delegation, handle validation/CRUD operations
- Depends on: Auth configuration, data access layer
- Used by: Browser fetch calls, NextAuth flow

**Data Access Layer:**
- Purpose: Abstract DynamoDB read/write operations with typed responses
- Location: `lib/dynamodb/`
- Contains: 8 modules (music-data.ts, content.ts, public-profile.ts, featured-artists.ts, recent-profiles.ts, view-counter.ts, schema.ts, lastfm-data.ts)
- Depends on: AWS SDK DynamoDB client, type definitions
- Used by: Server actions, page components, route handlers

**Authentication Layer:**
- Purpose: NextAuth configuration and session management
- Location: `auth.ts`, `middleware.ts`
- Contains: Provider setup (Spotify, Google, Resend), session callbacks, token storage, middleware rules
- Depends on: NextAuth, AWS DynamoDB/KMS, external providers
- Used by: Route handlers, server actions, page components

**Integration Layer:**
- Purpose: External API clients and utilities
- Location: `lib/spotify.ts`, `lib/spotify-data.ts`, `lib/bedrock/`, `lib/lastfm.ts`, `lib/handle.ts`
- Contains: Spotify OAuth token management, Spotify API fetching, Bedrock inference, Last.fm API
- Depends on: AWS SDK, external API clients, encryption utilities
- Used by: Server actions

**Infrastructure Layer:**
- Purpose: AWS SDK initialization and encryption utilities
- Location: `lib/dynamodb.ts`, `lib/kms.ts`, `lib/bedrock/client.ts`
- Contains: DynamoDB document client, KMS encryption/decryption, Bedrock runtime client
- Depends on: AWS SDK packages, environment configuration
- Used by: Data access layer, integration layer

## Data Flow

**Spotify Data Fetch & Publish Flow:**

1. User visits `/profile` (protected route)
2. `app/(protected)/profile/page.tsx` calls `fetchSpotifyData()` server action via `RefreshButton`
3. Server action checks session, retrieves cached data or triggers `_doRefresh()`
4. `_doRefresh()` retrieves encrypted Spotify tokens from DynamoDB via `getSpotifyTokens()`
5. Calls `getTopArtists()` and `getTopTracks()` from `lib/spotify-data.ts` against Spotify API
6. `deriveTopAlbums()` aggregates tracks into albums by score
7. Atomic `TransactWrite` to DynamoDB persists artists, albums, tracks, and metadata (lastRefresh) via `putMusicData()`
8. Next.js cache revalidated via `revalidatePath()`
9. Client receives typed `MusicData` response

**AI Content Generation Flow:**

1. User clicks "Generate Bio" on dashboard
2. `generateBio()` server action executes
3. Fetches music data and featured artists from DynamoDB in parallel
4. Constructs user message from artists/tracks/featured context
5. Calls `bedrockClient.send()` with BIO_SYSTEM_PROMPT
6. Claude Haiku responds with bio text
7. `putBio()` persists to DynamoDB with generatedAt timestamp
8. Paths revalidated; client receives `GenerateBioResult`

**Public Profile Rendering Flow:**

1. Request arrives for `/[handle]` (public route, ISR-enabled)
2. `app/[handle]/page.tsx` calls `getPublicProfile(handle)` in parallel with `generateMetadata()`
3. `getPublicProfile()` queries DynamoDB by handle index (GSI)
4. Returns profile with artists, albums, captions, featured artists, view count
5. `PublicProfile` component renders full page with music grid
6. If authenticated user matches owner, edit controls displayed
7. Page is cached for 1 hour (revalidate = 3600)

**State Management:**
- Session state: NextAuth session stored in DynamoDB (strategy: database)
- User state: DynamoDB items partitioned by `USER#{userId}`
- Music cache: Stored atomically with lastRefresh metadata for cooldown checks
- No client-side state containers; all state sourced from server

## Key Abstractions

**MusicData:**
- Purpose: Represents user's top artists, albums, and tracks from Spotify
- Examples: `types/music.ts` defines Artist, Album, Track, MusicData interfaces
- Pattern: Fetched from Spotify API via `spotify-data.ts`, persisted and cached in DynamoDB

**ContentData (Bio + Captions):**
- Purpose: User-generated or AI-generated textual descriptions of their music taste
- Examples: `types/content.ts` defines Bio, Caption, TasteAnalysis, AgeGuess
- Pattern: Generated by Bedrock, persisted per user in DynamoDB, editable by user

**Profile (Public View):**
- Purpose: Snapshot of a user's public information returned by `getPublicProfile()`
- Contains: displayName, bio, featuredArtists, artists, albums, captions, viewCount, handle
- Pattern: Assembled from multiple DynamoDB queries, filtered by isPublic flag

**Server Action Response Types:**
- Purpose: Return errors inline rather than throwing (Firebase pattern)
- Examples: `FetchSpotifyDataResult`, `GenerateBioResult`, `PublishResult`
- Pattern: All return `{ data/bio/success, error?: string }` tuple-like structure

## Entry Points

**Web Paths:**
- Location: `app/layout.tsx` (root), `app/page.tsx` (landing)
- Triggers: Browser navigation
- Responsibilities: Render LandingHero, RecentProfiles, metadata

**Authenticated Dashboard:**
- Location: `app/(protected)/dashboard/page.tsx`
- Triggers: Logged-in users navigating to `/profile` or `/dashboard`
- Responsibilities: Display music data, AI content, refresh buttons, publish UI

**Public Profile:**
- Location: `app/[handle]/page.tsx`
- Triggers: Anonymous or authenticated users visiting `/username`
- Responsibilities: Render profile card, music grid, captions, view counter

**Auth Endpoints:**
- Location: `app/api/auth/[...nextauth]/route.ts`
- Triggers: NextAuth OAuth flow, sign-in/sign-out callbacks
- Responsibilities: Delegate to NextAuth handlers, persist tokens

**API Routes:**
- Location: `app/api/profile/` subdirs
- Triggers: POST/GET from client or dashboard actions
- Responsibilities: Handle validation, deletion, checking of user handles

**Middleware:**
- Location: `middleware.ts`
- Triggers: Every request matching `/((?!api|_next/static|_next/image|favicon.ico).*)`
- Responsibilities: Redirect unauthenticated users from protected routes; redirect authenticated users away from auth pages

## Error Handling

**Strategy:** Explicit error returns from server actions; no thrown exceptions surface to UI

**Patterns:**
- Server actions catch try-catch and return `{ data: null, error: "message" }`
- Route handlers use HTTP status codes; data layer throws on AWS SDK errors
- Bedrock rate limit errors include Retry-After header in thrown error message
- Spotify token refresh failures return error token rather than breaking auth
- Missing DynamoDB items trigger null returns; higher layers decide what to do

## Cross-Cutting Concerns

**Logging:** Console.log used for auth config debug, token operations, error tracking; no structured logging framework detected

**Validation:**
- Form inputs validated in components (maxLength, trim checks)
- Handles validated via regex in `lib/handle.ts` (alphanumeric + hyphen)
- API routes may validate existence (e.g., handle check endpoint)

**Authentication:**
- NextAuth middleware redirects unauthenticated requests to `/signin`
- All server actions check `session?.user?.id` before proceeding
- Spotify token refresh is automatic via NextAuth JWT callback

**Rate Limiting / Cooldown:**
- Spotify refresh limited to once per 24 hours via `canRefresh()` check
- Cooldown window returned to client as `cooldownRemaining` ms
- Bedrock calls are sequential (not parallel) to avoid throttling

**Cache Invalidation:**
- `revalidatePath()` called after data mutations (publish, bio gen, etc.)
- Public profile pages cached for 1 hour (ISR)
- Landing page revalidates every 5 minutes to show recent profiles

---

*Architecture analysis: 2026-02-08*
