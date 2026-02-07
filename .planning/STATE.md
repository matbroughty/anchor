# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-07)

**Core value:** Non-cringe, tasteful representation of your music taste that you can confidently share anywhere
**Current focus:** v1.0 MVP shipped - ready for next milestone planning

## Current Position

Milestone: v1.0 MVP complete (2026-02-07)
Phases: 1-4 shipped (12 plans total)
Status: Archived to milestones/v1.0-ROADMAP.md
Last activity: 2026-02-07 — v1.0 milestone completion and archival
Next action: Plan v1.1 milestone (/gsd:new-milestone)

Progress: [████████████] 100% v1.0 complete

## Performance Metrics

**Velocity:**
- Total plans completed: 12
- Average duration: 12.3 min
- Total execution time: 2.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 4 | 19 min | 4.8 min |
| 2. Content Pipeline | 3 | 9 min | 3 min |
| 3. Publishing | 3 | 14 min | 4.7 min |
| 4. Landing Experience | 2 | 108 min | 54 min |

**Recent Trend:**
- Last 5 plans: 03-03 (5 min), 04-01 (3 min), 04-02 (105 min), 01-04 (2 min)
- Trend: Gap closure plan 01-04 very efficient (2 min) - targeted fixes only

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- AWS stack locked in (builder proficient, full control)
- No deletion in v1 (unpublish covers privacy need)
- Single opinionated layout (avoids template complexity)
- KMS encryption required for Spotify tokens (security from day one)

**From Plan 01-01:**
- Use Next.js 15 with App Router (not Pages Router) for modern React Server Components
- Install next-auth@beta for NextAuth v5 with native App Router support
- Configure DynamoDB adapter with specific marshalling options required by Auth.js
- Use consistent encryption context for KMS (purpose: spotify-token, app: anchor)
- Enable KMS key rotation from day one for security best practices
- Use CloudFormation for infrastructure-as-code rather than manual AWS console setup

**From Plan 01-02:**
- Database session strategy chosen over JWT for magic link support and "sign out everywhere" capability
- Spotify tokens encrypted with KMS in signIn callback before DynamoDB storage
- Middleware handles route protection rather than layout components (layouts don't re-render on navigation)
- Three authentication options: Google (primary social), email magic link (passwordless), Spotify (music service)
- AUTH_SECRET required for NextAuth v5 - added to .env.local for development

**From Plan 01-03:**
- Use DynamoDB transactions (TransactWriteCommand) for atomic handle claiming to prevent race conditions
- No handle changes after initial claim in v1 (simplifies uniqueness logic)
- Reserved handle list includes common paths to prevent conflicts with application routes
- Handle validation: 3-30 chars, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens
- Debounced availability check (500ms) to reduce API calls during typing
- Protected route group redirects to /signin if not authenticated

**From Plan 02-01:**
- Store full 50-track pool in DynamoDB but return only top 3 to the UI (preserves data for album re-derivation)
- lastRefresh on PROFILE#METADATA sort key -- cooldown check is a single GetCommand
- lib/dynamodb/ subdirectory coexists with lib/dynamodb.ts (bundler resolution: file wins for @/lib/dynamodb)
- Server actions use typed response objects that never throw -- errors returned as { data: null, error: string }

**From Plan 02-02:**
- Bedrock client reuses AUTH_DYNAMODB_ID/SECRET/REGION (single IAM user for all AWS services)
- Bio temperature 0.6, caption temperature 0.5 for consistent but not robotic tone
- Sequential album caption generation to respect Bedrock per-account rate limits
- CONTENT#BIO / CONTENT#CAPTION#{albumId} sort-key namespace in single table
- ANTI_CRINGE_RULES exported standalone for reuse in tests/linting
- IAM user will need Bedrock InvokeModel permission added (pending Todos updated)

**From Plan 02-03:**
- Character limits: 500 for bio, 150 for captions (enforced UI and server-side)
- Preserve generatedAt timestamp when editing (enables future "revert to AI" feature)
- Empty state shows "Connect Spotify to get started" message
- Loading states on all async operations (regenerate, save, refresh)
- Responsive album grid: 3 columns → 2 columns → 1 column

**From Plan 03-01:**
- Store isPublic directly on USER#{userId} record (no separate sort key)
- React cache() from 'react' (not next/cache) for request-level deduplication
- Path revalidation after publish/unpublish to bust ISR cache

**From Plan 03-02:**
- 1-hour ISR revalidation (3600s) balances freshness vs performance
- Generic OG image sufficient for v1 (per-handle images deferred)
- Next.js 15 params must be awaited (breaking change from v14)
- Album-first layout with horizontal artist scroll, responsive album grid

**From Plan 03-03:**
- PublishToggle placed prominently at top of dashboard in "Your Page" card
- Toggle only visible when user has claimed a handle
- Inline error display for failed publish/unpublish actions
- Status indicator: green dot = published, gray dot = unpublished

**From Plan 04-01:**
- Light background aesthetic for landing page (neutral-50/100) differentiates from dark profile pages (neutral-950)
- Bottom CTA repeats Get Started button per user decision for conversion optimization
- Example profiles displayed as placeholders (not actual clickable profiles) with era labels
- All landing page components are server components (no client-side JS) for optimal performance

**From Plan 04-02:**
- Removed "Show your taste without the cringe" subheading per user feedback for cleaner, more minimal hero section
- Example profile placeholders (400x600 PNG) sufficient for landing page - real screenshots optional
- Landing page verified by user: responsive layout, both CTAs working, SEO metadata present, visual differentiation confirmed

**From Plan 04-02:**
- Placeholder profile images (400x600px) created using ImageMagick for example showcase until real profiles exist
- Landing hero subheading removed per user feedback for cleaner aesthetic
- Visual verification confirmed landing page production-ready (responsive, CTAs working, SEO metadata present)

**From Plan 01-04 (Gap Closure):**
- Enabled allowDangerousEmailAccountLinking for both Google and Spotify OAuth providers to support multi-provider sign-in with same email
- Placed sign out functionality in protected layout header for visibility across all protected pages
- Used header navigation pattern with Anchor branding and consistent styling

### Pending Todos

**From Plan 01-01:**
- Deploy DynamoDB table using CloudFormation template (infrastructure/dynamodb-table.json)
- Deploy KMS encryption key using CloudFormation template (infrastructure/kms-key.json)
- Create IAM user with DynamoDB, KMS, and Bedrock permissions
- Configure environment variables in .env.local (AUTH_DYNAMODB_*, KMS_KEY_ID)

**From Plan 01-02:**
- Set up Google OAuth in Google Cloud Console (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Set up Resend for magic link emails (AUTH_RESEND_KEY)
- Set up Spotify OAuth in Spotify Developer Dashboard (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET)
- Generate production AUTH_SECRET for deployment

### Blockers/Concerns

**For v1.1 milestone (from v1.0 audit):**
- Profile → Dashboard navigation missing (integration gap)
- New user onboarding flow incomplete at profile page
- Middleware doesn't protect /dashboard route consistently
- Formal verification docs needed for Phase 1-2 requirements

**Infrastructure (pre-deployment):**
- External service configuration required (Google OAuth, Resend, Spotify, AWS)
- CloudFormation templates ready but not yet deployed

## Session Continuity

Last session: 2026-02-07T13:37:00Z
Stopped at: v1.0 milestone complete and archived
Resume file: None

**Next action:** Plan v1.1 milestone to address integration gaps and complete formal verification

---
*State initialized: 2026-02-04*
*Last updated: 2026-02-07 after v1.0 milestone completion*
