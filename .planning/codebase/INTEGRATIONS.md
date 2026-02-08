# External Integrations

**Analysis Date:** 2026-02-08

## APIs & External Services

**Music Data:**
- Spotify Web API - User top artists, tracks, recently played data
  - SDK: NextAuth Spotify provider (built-in)
  - Auth: OAuth 2.0 with scope: `user-read-email user-top-read user-read-recently-played`
  - Client: `lib/spotify-data.ts` for API calls
  - Token storage: Encrypted in DynamoDB via KMS
  - Implementation: `lib/spotify.ts` (token refresh), `app/actions/spotify.ts` (fetch music data)
  - Rate limiting: Handled with 429 status detection and Retry-After header

- Last.fm API - Alternative music data source (public, no OAuth)
  - Auth: API key only (env var: `LASTFM_API_KEY`)
  - Endpoint: `https://ws.audioscrobbler.com/2.0/`
  - Client: `lib/lastfm.ts`
  - Methods: `user.getTopArtists`, `user.getTopAlbums`, `user.getTopTracks`, `user.getInfo`
  - No approval required for read operations

**AI/Content Generation:**
- AWS Bedrock - Music analysis, profile bio generation, age guessing
  - SDK: @aws-sdk/client-bedrock-runtime
  - Client: `lib/bedrock/client.ts`
  - Auth: AWS IAM credentials (same as DynamoDB: ACCESS_KEY, SECRET_KEY, REGION)
  - Models: Claude (via Converse API)
  - Usage: `app/actions/taste-analysis.ts`, `app/actions/ai-content.ts`, `app/actions/age-guess.ts`
  - System prompts in `lib/bedrock/prompts.ts` - strict output requirements (JSON or plain text only)

**Email Service:**
- Resend - Transactional email delivery
  - SDK: resend package (6.9.1)
  - Auth: API key (env var: `AUTH_RESEND_KEY`)
  - From address: `Anchor <noreply@anchor.band>`
  - Usage: `app/actions/publish.ts` for sending profile notifications
  - Integration: Also used as NextAuth email provider for magic link authentication

**OAuth Providers:**
- Google OAuth - User authentication and sign-up
  - SDK: NextAuth Google provider
  - Client ID: env var `GOOGLE_CLIENT_ID`
  - Client Secret: env var `GOOGLE_CLIENT_SECRET`
  - Config: `auth.ts` lines 32-36
  - Dangerous email linking enabled

- Spotify OAuth - User authentication and music data access
  - SDK: NextAuth Spotify provider
  - Client ID: env var `SPOTIFY_CLIENT_ID`
  - Client Secret: env var `SPOTIFY_CLIENT_SECRET`
  - Config: `auth.ts` lines 41-52
  - Scopes: user-read-email, user-top-read, user-read-recently-played
  - Token storage: On sign-in, access and refresh tokens are encrypted and stored in DynamoDB
  - Refresh mechanism: `lib/spotify.ts` handles token refresh before expiry

## Data Storage

**Databases:**
- AWS DynamoDB (Primary)
  - Connection: AWS IAM credentials (ACCESS_KEY, SECRET_KEY, REGION)
  - Client: @aws-sdk/client-dynamodb and @aws-sdk/lib-dynamodb
  - Initialization: `lib/dynamodb.ts`
  - Table name: `AUTH_DYNAMODB_TABLE_NAME` (defaults to "anchor-auth")
  - Session strategy: Database-backed (required for magic links)
  - Data stored:
    - Session data (NextAuth DynamoDB adapter)
    - User accounts and auth metadata
    - Spotify tokens (encrypted with KMS)
    - Music data (top artists, albums, tracks)
    - Featured artists selections
    - View counters
    - Last.fm data
    - Public profile information
    - Content (bios, captions)
  - DynamoDB operations in `lib/dynamodb/` subdirectory:
    - `schema.ts` - Type definitions
    - `music-data.ts` - Store/retrieve Spotify music data
    - `public-profile.ts` - Public profile data
    - `spotify.ts` - Token encryption/storage (via kms.ts)
    - `featured-artists.ts` - User's selected featured artists
    - `view-counter.ts` - Track profile views
    - `recent-profiles.ts` - Recently viewed profiles
    - `lastfm-data.ts` - Last.fm music data
    - `content.ts` - Generated bios and captions

**File Storage:**
- Not detected - Application uses DynamoDB for all persistent data

**Caching:**
- Next.js built-in caching - `.next/cache` directory
- No explicit caching layer (Redis, Memcached) detected

## Authentication & Identity

**Auth Provider:**
- NextAuth.js v5 (database session strategy)
  - Configuration: `auth.ts`
  - Base path: `/api/auth`
  - Session strategy: Database (required for "sign out everywhere" capability)
  - Callback: Custom session enhancement adds user ID, handle, displayName, spotifyConnected

**Providers Configured:**
- Google (OAuth 2.0)
- Spotify (OAuth 2.0)
- Email (via Resend for magic link authentication)

**Auth Pages:**
- Sign in: `/signin` (server component)
- Email verification: `/verify-email` (for magic link verification)

**Protected Routes:**
- `/profile` - User profile dashboard
- `/settings` - User settings page
- Enforcement via `middleware.ts` using NextAuth middleware

**Session Management:**
- Token strategy: Database (DynamoDB)
- Custom JWT fields: User ID, handle, display name, Spotify connection status
- Spotify token storage: Encrypted in DynamoDB with KMS

## Encryption & Security

**Key Management:**
- AWS KMS (Key Management Service)
  - Service: AWS SDK @aws-sdk/client-kms
  - Client: `lib/kms.ts`
  - Key ID: env var `KMS_KEY_ID`
  - Purpose: Encrypts Spotify access and refresh tokens before DynamoDB storage
  - Encryption context: `{purpose: "spotify-token", app: "anchor"}`
  - Operations: `encryptToken()` and `decryptToken()` helper functions
  - Uses same IAM credentials as DynamoDB

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service (Sentry, etc.) integrated

**Logging:**
- Console-based logging throughout the codebase
- Notable logs:
  - Auth config validation: `[Auth Config] AUTH_URL`, `NODE_ENV`
  - Spotify errors: Token refresh failures, token storage failures
  - KMS errors: Encryption/decryption failures
  - API errors: Spotify rate limiting, Last.fm API errors, Bedrock errors
  - Last.fm warnings: Missing API key

**Metrics:**
- Not detected - No metrics/analytics service configured

## CI/CD & Deployment

**Hosting:**
- AWS Amplify (primary deployment platform)
  - Deployment config: `amplify.yml`
  - Frontend framework: Next.js with static export
  - Build command: npm ci → build environment setup → npm run build

**CI Pipeline:**
- GitHub Actions - Not detected
- AWS Amplify built-in CI/CD via `amplify.yml`
  - Pre-build: npm ci, environment variable setup
  - Build: npm run build
  - Artifacts: `.next` directory

**Infrastructure as Code:**
- AWS CloudFormation/CDK templates in `infrastructure/` directory:
  - `dynamodb-table.json` - DynamoDB table definition
  - `kms-key.json` - KMS key configuration
  - `anchor-app-policy.json` - IAM policy for app execution

## Environment Configuration

**Required Environment Variables:**
- `AUTH_SECRET` - NextAuth session secret
- `AUTH_URL` - Production domain (e.g., https://anchor.band)
- `AUTH_TRUST_HOST` - Set to true for Amplify
- `AUTH_DYNAMODB_ID` - AWS access key
- `AUTH_DYNAMODB_SECRET` - AWS secret key
- `AUTH_DYNAMODB_REGION` - AWS region
- `KMS_KEY_ID` - AWS KMS key ARN
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` - Google OAuth
- `AUTH_RESEND_KEY` - Resend API key
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` - Spotify OAuth
- `LASTFM_API_KEY` - Last.fm API key (optional)

**Secrets Location:**
- Development: `.env.local` (git-ignored)
- Production (AWS Amplify): Environment variables configured in Amplify console
- Reference: `.env.example` shows required variables structure

## Webhooks & Callbacks

**Incoming Webhooks:**
- Resend email delivery webhooks - Not explicitly handled
- OAuth provider callbacks - Handled via NextAuth `/api/auth/callback/*` routes

**OAuth Callback Handling:**
- NextAuth handles OAuth callbacks automatically
- Base path: `/api/auth`
- Route: `/app/api/auth/[...nextauth]/route.ts`
- Custom callback in `auth.ts`:
  - `signIn` callback: Encrypts and stores Spotify tokens when Spotify OAuth completes
  - `session` callback: Enriches session with user metadata

**Outgoing Webhooks:**
- Not detected - No outgoing webhook integrations

## API Rate Limiting

**Spotify Web API:**
- Rate limit awareness: `lib/spotify-data.ts` detects 429 status code
- Retry-After header parsing implemented
- Client-side handling: Error message surfaces Retry-After value to UI

**Last.fm API:**
- No explicit rate limit handling in code
- API is public and typically generous on rate limits

**AWS Services:**
- Bedrock, DynamoDB, KMS - Rate limiting handled by AWS SDK with exponential backoff
- No custom rate limiting logic detected

## Data Flow

**Spotify Data Fetch:**
1. User signs in with Spotify OAuth
2. `auth.ts` signIn callback triggers
3. Access token + refresh token encrypted via `lib/kms.ts`
4. Tokens stored in DynamoDB via `lib/spotify.ts`
5. On profile load, `app/actions/spotify.ts` retrieves stored tokens
6. Tokens used to call Spotify API via `lib/spotify-data.ts`
7. Response normalized and cached in DynamoDB

**AI Content Generation:**
1. User triggers music analysis, bio generation, or age guess
2. Server action calls Bedrock via `lib/bedrock/client.ts`
3. System prompt from `lib/bedrock/prompts.ts` provides context
4. Music data formatted and sent to Claude model
5. Response processed and stored in DynamoDB
6. Results returned to client

---

*Integration audit: 2026-02-08*
