# Requirements: Anchor.band

**Defined:** 2026-02-04
**Core Value:** Non-cringe, tasteful representation of your music taste that you can confidently share anywhere

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: User can sign in with Google
- [ ] **AUTH-02**: User can sign in with magic link email (passwordless)
- [ ] **AUTH-03**: User can connect Spotify account via OAuth
- [ ] **AUTH-04**: Spotify tokens are encrypted at rest with KMS
- [ ] **AUTH-05**: Spotify tokens automatically refresh when expired

### Profile

- [ ] **PROF-01**: User can claim unique handle (anchor.band/username)
- [ ] **PROF-02**: User can set display name
- [ ] **PROF-03**: User can edit profile information

### Spotify Data

- [ ] **DATA-01**: System fetches top artists (5-6) from Spotify
- [ ] **DATA-02**: System fetches top albums (3-5) derived from top tracks
- [ ] **DATA-03**: System fetches top tracks (3) from Spotify
- [ ] **DATA-04**: System caches all Spotify data in DynamoDB
- [ ] **DATA-05**: User can manually refresh Spotify data with cooldown

### AI Content

- [ ] **AI-01**: System generates tasteful bio using Bedrock (anti-cringe rules)
- [ ] **AI-02**: System generates album captions using Bedrock (anti-cringe rules)
- [ ] **AI-03**: User can regenerate AI content if unsatisfied
- [ ] **AI-04**: User can manually edit bio and captions before publishing

### Public Pages

- [ ] **PAGE-01**: Public page displays at anchor.band/handle when published
- [ ] **PAGE-02**: Page shows bio, top artists (circular images), albums (square covers with captions), tracks (text list)
- [ ] **PAGE-03**: Page is mobile-responsive
- [ ] **PAGE-04**: Page uses SSR for proper social preview metadata (OG tags)
- [ ] **PAGE-05**: Page uses generic Anchor.band OG image for all shares
- [ ] **PAGE-06**: Public pages never call Spotify API (read from cached data)

### Publishing

- [ ] **PUB-01**: User can publish page (make public)
- [ ] **PUB-02**: User can unpublish page (make private)

### Landing Page

- [ ] **LAND-01**: Landing page at anchor.band explains what Anchor is
- [ ] **LAND-02**: Landing page shows 2-3 example profile pages
- [ ] **LAND-03**: Landing page has "Get Started" button leading to signup

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Scheduled Refresh

- **REFRESH-01**: Pages auto-refresh from Spotify every 7 days
- **REFRESH-02**: User can lock refresh (disable auto-refresh)
- **REFRESH-03**: EventBridge scheduler triggers refresh jobs
- **REFRESH-04**: Refresh jobs use idempotency to prevent duplicates

### Enhanced Images

- **IMG-01**: Custom per-handle OG images showing user's albums
- **IMG-02**: OG images stored in S3 with CloudFront CDN
- **IMG-03**: OG images regenerated on manual refresh

### Profile Enhancements

- **PROF-04**: User can add social links (Instagram, Twitter, etc.)
- **PROF-05**: User can fully delete account and all data

### Discovery

- **DISC-01**: SEO optimization (sitemap, meta descriptions)
- **DISC-02**: View counter on profile pages
- **DISC-03**: Multiple streaming platform links (Apple Music, YouTube Music)

### Analytics

- **ANLY-01**: Aggregate view statistics
- **ANLY-02**: Click tracking for streaming links

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Social engagement (likes/follows/comments) | Creates moderation burden, shifts focus from music to metrics |
| Monetization/payments in v1 | Complexity explosion (compliance, support), distracts from core value |
| Heavy customization/themes | Choice paralysis, ugly pages, contradicts opinionated design philosophy |
| Real-time Spotify sync | Privacy concerns, rate limit issues, unnecessary complexity |
| Multiple Spotify accounts | UX/data model complexity, focus on solo artists first |
| Custom domain support in v1 | DNS complexity, support burden for MVP |
| Email capture/newsletter | GDPR compliance, infrastructure overhead |
| Playlist embedding | Album-first philosophy, playlists too casual |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| PROF-01 | Phase 1 | Pending |
| PROF-02 | Phase 1 | Pending |
| PROF-03 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 2 | Pending |
| DATA-03 | Phase 2 | Pending |
| DATA-04 | Phase 2 | Pending |
| DATA-05 | Phase 2 | Pending |
| AI-01 | Phase 2 | Pending |
| AI-02 | Phase 2 | Pending |
| AI-03 | Phase 2 | Pending |
| AI-04 | Phase 2 | Pending |
| PAGE-01 | Phase 3 | Pending |
| PAGE-02 | Phase 3 | Pending |
| PAGE-03 | Phase 3 | Pending |
| PAGE-04 | Phase 3 | Pending |
| PAGE-05 | Phase 3 | Pending |
| PAGE-06 | Phase 3 | Pending |
| PUB-01 | Phase 3 | Pending |
| PUB-02 | Phase 3 | Pending |
| LAND-01 | Phase 4 | Pending |
| LAND-02 | Phase 4 | Pending |
| LAND-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28/28 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after roadmap creation*
