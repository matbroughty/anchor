# Roadmap: Anchor.band

## Overview

Anchor.band is a tasteful music profile platform where users claim handles, connect Spotify, generate AI-powered content, and publish shareable pages. This roadmap progresses from authentication foundation through content generation, public page publishing with SSR social sharing, and landing page experience. Each phase builds on the previous, ensuring security (KMS encryption), cost controls (prompt caching), and core value proposition (anti-cringe AI) are built-in from day one.

## Phases

- [ ] **Phase 1: Foundation** - Authentication, profiles, and secure token storage (UAT gap closure)
- [x] **Phase 2: Content Pipeline** - Spotify data fetching and AI content generation
- [x] **Phase 3: Publishing** - Public pages with SSR and social metadata
- [x] **Phase 4: Landing Experience** - Marketing site and onboarding

## Phase Details

### Phase 1: Foundation
**Goal**: Users can authenticate securely and claim their unique handles
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03
**Success Criteria** (what must be TRUE):
  1. User can sign in with Google account and stay authenticated across sessions
  2. User can sign in with magic link email without passwords
  3. User can connect Spotify account and tokens are encrypted at rest with KMS
  4. User can claim unique handle and it appears in URL format (anchor.band/handle)
  5. User can set and edit display name and profile information
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Infrastructure setup (Next.js 15, DynamoDB, KMS)
- [x] 01-02-PLAN.md — Auth system (NextAuth v5 with Google, Resend, Spotify)
- [x] 01-03-PLAN.md — Profile system (handle claiming, profile management)
- [ ] 01-04-PLAN.md — UAT gap closure (OAuth account linking, sign out button)

### Phase 2: Content Pipeline
**Goal**: System generates tasteful music content from Spotify data
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, AI-01, AI-02, AI-03, AI-04
**Success Criteria** (what must be TRUE):
  1. User's top artists (5-6), albums (3-5), and tracks (3) appear after connecting Spotify
  2. AI generates bio and album captions that follow anti-cringe rules (no emojis, hype words, cliches)
  3. User can regenerate AI content if unsatisfied with initial output
  4. User can manually edit bio and captions before publishing
  5. User can manually refresh Spotify data with cooldown enforcement
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Spotify data fetching and DynamoDB caching
- [x] 02-02-PLAN.md — AI content generation with Bedrock Claude
- [x] 02-03-PLAN.md — Content management dashboard UI

### Phase 3: Publishing
**Goal**: Public pages render with proper social sharing metadata
**Depends on**: Phase 2
**Requirements**: PAGE-01, PAGE-02, PAGE-03, PAGE-04, PAGE-05, PAGE-06, PUB-01, PUB-02
**Success Criteria** (what must be TRUE):
  1. Published page displays at anchor.band/handle with all content visible (bio, artists, albums, tracks)
  2. Page renders correctly on both mobile and desktop devices
  3. Page shows rich preview when shared on WhatsApp, Twitter, or LinkedIn (Open Graph metadata)
  4. Public page loads from cached data without calling Spotify API
  5. User can toggle page between published (public) and unpublished (private) states
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Data layer and publish/unpublish actions
- [x] 03-02-PLAN.md — Public profile page with ISR and OG metadata
- [x] 03-03-PLAN.md — Dashboard publish controls and verification

### Phase 4: Landing Experience
**Goal**: New users understand Anchor and can start signup flow
**Depends on**: Phase 3
**Requirements**: LAND-01, LAND-02, LAND-03
**Success Criteria** (what must be TRUE):
  1. Landing page at anchor.band clearly explains what Anchor is and why it exists
  2. Landing page shows 2-3 example profile pages demonstrating the experience
  3. "Get Started" button leads to signup flow from Phase 1
**Plans**: 2 plans

Plans:
- [x] 04-01-PLAN.md — Landing page components and assembly
- [x] 04-02-PLAN.md — Example screenshots and visual verification

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/4 | UAT Gap Closure | - |
| 2. Content Pipeline | 3/3 | Complete | 2026-02-06 |
| 3. Publishing | 3/3 | Complete | 2026-02-07 |
| 4. Landing Experience | 2/2 | Complete | 2026-02-07 |

---
*Roadmap created: 2026-02-04*
*Last updated: 2026-02-07*
