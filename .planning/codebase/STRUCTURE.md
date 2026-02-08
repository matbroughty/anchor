# Codebase Structure

**Analysis Date:** 2026-02-08

## Directory Layout

```
/Users/mathewbroughton/claude-gsd/anchor/
├── app/                           # Next.js app directory (pages, components, routes)
│   ├── (auth)/                    # Auth-only route group
│   │   ├── signin/
│   │   │   └── page.tsx          # Sign-in page
│   │   ├── verify-email/
│   │   │   └── page.tsx          # Email verification page
│   │   └── layout.tsx            # Auth layout (dark mode, centered)
│   ├── (protected)/              # Authentication-required route group
│   │   ├── dashboard/
│   │   │   ├── page.tsx          # Dashboard server component
│   │   │   └── DashboardClient.tsx # Dashboard client component (music display)
│   │   ├── profile/
│   │   │   ├── page.tsx          # Profile page (checks handle, loads user data)
│   │   │   ├── ProfilePageClient.tsx # Profile client component (form + actions)
│   │   │   └── claim-handle/
│   │   │       └── page.tsx      # Handle claiming page
│   │   └── layout.tsx            # Protected layout (adds header, checks auth)
│   ├── [handle]/                 # Public profile (dynamic catch-all)
│   │   ├── page.tsx              # Public profile page (ISR, OG meta)
│   │   └── not-found.tsx         # 404 for unpublished profiles
│   ├── api/                       # Route handlers
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # NextAuth catch-all (GET/POST)
│   │   └── profile/
│   │       ├── route.ts          # Profile CRUD endpoint
│   │       └── handle/
│   │           ├── route.ts      # Handle claim endpoint
│   │           ├── check/
│   │           │   └── route.ts  # Handle availability check
│   │           └── delete/
│   │               └── route.ts  # Handle deletion
│   ├── actions/                  # Server actions (9 files)
│   │   ├── spotify.ts            # Fetch/refresh Spotify data
│   │   ├── ai-content.ts         # Generate bios, captions via Bedrock
│   │   ├── taste-analysis.ts     # Generate taste analysis
│   │   ├── age-guess.ts          # Generate age guess
│   │   ├── featured-artists.ts   # Manage featured artist selections
│   │   ├── content-edit.ts       # Manual bio/caption edits
│   │   ├── publish.ts            # Publish/unpublish profile
│   │   ├── lastfm.ts             # Last.fm integration
│   │   └── disconnect-spotify.ts # Spotify disconnection
│   ├── components/               # React components (client + server)
│   │   ├── ProfileForm.tsx       # Form for editing display name
│   │   ├── PublicProfile.tsx     # Public profile page layout
│   │   ├── DashboardClient.tsx   # Dashboard interactive UI
│   │   ├── BioEditor.tsx         # Bio edit/display
│   │   ├── AlbumCaptions.tsx     # Album caption grid
│   │   ├── ArtistSearchInput.tsx # Featured artist search
│   │   ├── FeaturedArtistsEditor.tsx # Featured artist selection UI
│   │   ├── RefreshButton.tsx     # Spotify data refresh button
│   │   ├── PublishToggle.tsx     # Publish/unpublish toggle
│   │   ├── TasteAnalysis.tsx     # Display taste analysis
│   │   ├── AgeGuess.tsx          # Display age guess
│   │   ├── LandingHero.tsx       # Landing page hero section
│   │   ├── LandingCTA.tsx        # Landing CTA section
│   │   ├── LandingFooter.tsx     # Landing footer
│   │   ├── RecentProfiles.tsx    # Recent profiles carousel
│   │   ├── MusicDataSection.tsx  # Music data display
│   │   ├── ExampleShowcase.tsx   # Example profiles showcase
│   │   └── SignOutButton.tsx     # Sign out button
│   ├── layout.tsx                # Root layout (fonts, Providers)
│   ├── page.tsx                  # Landing page
│   ├── globals.css               # Global Tailwind styles
│   └── providers.tsx             # NextAuth SessionProvider (likely)
├── lib/                          # Shared utilities and data access
│   ├── dynamodb/                 # DynamoDB data layer (8 files)
│   │   ├── schema.ts             # Sort key constants, userPK()
│   │   ├── music-data.ts         # getMusicData(), putMusicData(), cooldown checks
│   │   ├── content.ts            # getBio(), putBio(), putCaption(), getContent()
│   │   ├── public-profile.ts     # getPublicProfile() with all related data
│   │   ├── featured-artists.ts   # getFeaturedArtists(), putFeaturedArtists()
│   │   ├── recent-profiles.ts    # getRecentProfiles() for landing page
│   │   ├── view-counter.ts       # incrementViewCount() for analytics
│   │   └── lastfm-data.ts        # Last.fm user data storage
│   ├── bedrock/                  # Bedrock AI client and prompts
│   │   ├── client.ts             # BedrockRuntimeClient initialization
│   │   └── prompts.ts            # System prompts for bio, caption, analysis, age-guess
│   ├── spotify.ts                # Spotify token management (refresh, encrypt, retrieve)
│   ├── spotify-data.ts           # Spotify API fetching (artists, tracks, albums, search)
│   ├── lastfm.ts                 # Last.fm API client
│   ├── handle.ts                 # Handle utilities (validation, reservation)
│   ├── kms.ts                    # AWS KMS encryption/decryption for tokens
│   └── dynamodb.ts               # DynamoDB client initialization
├── types/                        # TypeScript type definitions
│   ├── music.ts                  # Artist, Track, Album, MusicData, Spotify API types
│   ├── content.ts                # Bio, Caption, TasteAnalysis, AgeGuess types
│   ├── next-auth.d.ts            # NextAuth User, Session, JWT augmentation
│   └── env.d.ts                  # Environment variable types
├── public/                       # Static assets
│   └── examples/                 # Example profile images
├── auth.ts                       # NextAuth configuration (providers, callbacks, session)
├── middleware.ts                 # Route protection middleware
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies (Next.js 15, NextAuth v5, AWS SDK, etc.)
└── .env.example                  # Environment variable template
```

## Directory Purposes

**app/**
- Purpose: Next.js 13+ App Router pages, layouts, components, and API routes
- Contains: Page components, client components, route handlers, server actions, middleware

**app/(auth)/**
- Purpose: Public authentication pages grouped with route protection
- Contains: Sign-in page, email verification page, auth layout (dark mode)
- Key files: `signin/page.tsx`, `verify-email/page.tsx`

**app/(protected)/**
- Purpose: Routes requiring authentication
- Contains: Dashboard, profile editor, claim handle flow
- Key files: `dashboard/page.tsx`, `profile/page.tsx`, layout with auth check

**app/[handle]/**
- Purpose: Dynamic public profile rendering (ISR, OG meta generation)
- Contains: Public profile page, 404 handler
- Key files: `[handle]/page.tsx` (1-hour ISR), metadata generation

**app/api/**
- Purpose: REST API routes and callback handlers
- Contains: NextAuth delegation, handle CRUD, profile operations
- Key files: `auth/[...nextauth]/route.ts`, `profile/handle/route.ts`, `profile/handle/check/route.ts`

**app/actions/**
- Purpose: Server-side business logic callable from client components via "use server"
- Contains: 9 server action modules handling Spotify, AI, publishing, editing
- Key files: `spotify.ts`, `ai-content.ts`, `publish.ts`

**app/components/**
- Purpose: React components (mix of client and server)
- Contains: UI components, forms, interactive sections
- Key files: `ProfileForm.tsx`, `PublicProfile.tsx`, `DashboardClient.tsx`, `BioEditor.tsx`

**lib/dynamodb/**
- Purpose: Single-table DynamoDB data access layer with typed responses
- Contains: Read/write operations for music data, content, profiles, metadata
- Pattern: Each file exports domain-specific functions; no class constructors
- Key files: `music-data.ts`, `content.ts`, `public-profile.ts`, `schema.ts`

**lib/bedrock/**
- Purpose: AWS Bedrock Claude integration for AI content generation
- Contains: Client initialization, system prompts for different content types
- Key files: `client.ts` (initialized once), `prompts.ts` (5+ prompts)

**lib/**
- Purpose: Shared utilities and external API clients
- Contains: Spotify OAuth, Spotify API fetching, Last.fm client, KMS encryption, DynamoDB client
- Key files: `spotify.ts` (token ops), `spotify-data.ts` (API calls), `handle.ts` (validation)

**types/**
- Purpose: TypeScript interfaces and types
- Contains: Domain types (Artist, Album, Track, Bio, Caption), API response shapes
- Key files: `music.ts`, `content.ts`, `next-auth.d.ts`

**public/**
- Purpose: Static assets and images
- Contains: Favicon, OG images, example profile images
- Key files: `og-image.png`, example profiles in `examples/`

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with fonts, Providers wrapper
- `app/page.tsx`: Landing page (LandingHero, RecentProfiles, Footer)
- `app/providers.tsx`: SessionProvider setup (if using NextAuth SessionProvider)

**Authentication:**
- `auth.ts`: NextAuth configuration (Google, Spotify, Resend providers; DynamoDB adapter; callbacks)
- `middleware.ts`: Route-level auth checks (protect /profile, /settings; redirect if logged in from /signin)
- `app/api/auth/[...nextauth]/route.ts`: NextAuth HTTP handlers

**Core Logic:**
- `app/actions/spotify.ts`: Fetch and refresh cached Spotify data
- `app/actions/ai-content.ts`: Generate bios and captions via Bedrock
- `lib/dynamodb/music-data.ts`: Atomic music data persistence and cooldown
- `lib/dynamodb/public-profile.ts`: Assemble public profile from multiple tables
- `lib/spotify-data.ts`: Spotify API integration (top artists, tracks, albums)

**Data Access:**
- `lib/dynamodb/schema.ts`: DynamoDB schema constants (partition/sort keys)
- `lib/dynamodb/music-data.ts`: Music CRUD
- `lib/dynamodb/content.ts`: Bio and caption CRUD
- `lib/dynamodb/featured-artists.ts`: Featured artist selection persistence

**External Integrations:**
- `lib/spotify.ts`: Spotify OAuth token storage, encryption, retrieval
- `lib/lastfm.ts`: Last.fm API client
- `lib/kms.ts`: AWS KMS encryption/decryption
- `lib/bedrock/client.ts`: Bedrock runtime client
- `lib/bedrock/prompts.ts`: System prompts for AI generation

**UI Components:**
- `app/components/PublicProfile.tsx`: Public profile page layout
- `app/components/DashboardClient.tsx`: Dashboard interactive UI
- `app/components/ProfileForm.tsx`: Display name editor
- `app/components/BioEditor.tsx`: Bio display and edit
- `app/components/AlbumCaptions.tsx`: Album grid with captions
- `app/components/FeaturedArtistsEditor.tsx`: Featured artist selection UI

**Tests:**
- Not detected in codebase

## Naming Conventions

**Files:**
- Server actions: lowercase with hyphens (`spotify.ts`, `ai-content.ts`, `featured-artists.ts`)
- Components: PascalCase (`ProfileForm.tsx`, `PublicProfile.tsx`, `DashboardClient.tsx`)
- Utilities/data access: lowercase with hyphens (`spotify-data.ts`, `music-data.ts`, `public-profile.ts`)
- Types: lowercase (`music.ts`, `content.ts`, `env.d.ts`)

**Directories:**
- Route groups: parentheses for logical grouping (`(auth)`, `(protected)`)
- Dynamic segments: square brackets (`[handle]`, `[...nextauth]`)
- API directories: `api/` prefix with resource names (`api/auth/`, `api/profile/`)
- Logical groupings: lowercase with hyphens (`app/actions/`, `lib/bedrock/`, `lib/dynamodb/`)

**Components:**
- Client components: either export name matches file or include "Client" suffix (e.g., `DashboardClient.tsx`)
- Server components: no suffix

**Functions:**
- Server actions: action verb + noun (`fetchSpotifyData`, `generateBio`, `publishPage`, `refreshSpotifyData`)
- Data access: get/put + domain (`getMusicData`, `putMusicData`, `getPublicProfile`, `getFeaturedArtists`)
- Utilities: snake_case or camelCase depending on domain

## Where to Add New Code

**New Feature (e.g., TikTok Integration):**
- Primary code: `lib/tiktok.ts` for OAuth token management + `lib/tiktok-data.ts` for API calls
- Server action: `app/actions/tiktok.ts` for server-side mutations
- Data access: `lib/dynamodb/tiktok-data.ts` for persistence
- Component: `app/components/TikTokSection.tsx` for UI display
- Types: Add to `types/music.ts` or new `types/tiktok.ts`

**New Server Action:**
- Place in: `app/actions/{feature-name}.ts`
- Pattern: Mark with "use server", define response type interface, use try-catch with explicit error returns
- Auth check: Always call `const session = await auth()` first
- DynamoDB: Use data access layer from `lib/dynamodb/`
- Cache: Call `revalidatePath()` after mutations

**New Component:**
- Client component: Place in `app/components/{ComponentName}.tsx`, mark with "use client"
- Server component: Place in `app/components/{ComponentName}.tsx`, use async if data-fetching
- Props: Define interface before component
- Form handling: Use server actions passed as props, follow ProfileForm pattern

**Utilities/Helpers:**
- General utilities: `lib/{feature}.ts` (e.g., `lib/handle.ts` for handle validation)
- External API wrappers: `lib/{service}.ts` (e.g., `lib/spotify.ts`)
- Data models: `types/{domain}.ts` (e.g., `types/music.ts`)

**Database Operations:**
- DynamoDB queries: `lib/dynamodb/{entity}.ts`
- Schema changes: Update `lib/dynamodb/schema.ts` sort key constants
- Multi-table operations: Wrap in `TransactWrite` for atomicity

**API Routes:**
- Public endpoints: `app/api/{resource}/route.ts`
- Nested resource: `app/api/{resource}/{id}/{action}/route.ts`
- Auth-protected: Check `session` from `auth()` first

## Special Directories

**app/api/auth/[...nextauth]/**
- Purpose: NextAuth catch-all route handler
- Generated: No (manually maintained)
- Committed: Yes
- Contains: Single file (`route.ts`) that exports GET/POST from NextAuth handlers

**lib/dynamodb/**
- Purpose: Single-table DynamoDB abstraction
- Generated: No
- Committed: Yes
- Pattern: Each entity gets a module; no exports of raw client

**lib/bedrock/**
- Purpose: Bedrock client and prompt library
- Generated: No (prompts manually crafted)
- Committed: Yes
- Pattern: Separate client initialization and prompt definitions

**.next/**
- Purpose: Next.js build output
- Generated: Yes (during build)
- Committed: No
- Note: In .gitignore; regenerated on each build

**node_modules/**
- Purpose: npm dependencies
- Generated: Yes (by npm install)
- Committed: No
- Note: In .gitignore; use package-lock.json for version pinning

**public/**
- Purpose: Static assets served at root
- Generated: No (manually maintained)
- Committed: Yes
- Note: Images are hand-placed here; public/og-image.png is critical for social sharing

---

*Structure analysis: 2026-02-08*
