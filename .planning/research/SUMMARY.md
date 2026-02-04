# Project Research Summary

**Project:** Anchor.band - Music Profile Pages
**Domain:** Music profile/portfolio platform with Spotify integration
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

Anchor.band is a music profile platform designed to showcase users' music taste through Spotify-powered pages with AI-generated content. Research shows the optimal approach is Next.js 15 with SSR on AWS Amplify Hosting, paired with DynamoDB for user data, AWS Bedrock for AI generation, and EventBridge for scheduled refreshes. The architecture must prioritize social sharing with proper Open Graph metadata (SSR is non-negotiable), secure OAuth token management with KMS encryption, and cost-effective AI content generation with prompt caching.

The recommended approach is to build incrementally: start with OAuth + profile storage, then add AI generation with strict output validation, enable publishing with SSR metadata, and finally implement scheduled auto-refresh with rate limiting safeguards. This order respects critical dependencies (can't generate content without Spotify data, can't share pages without SSR metadata) while building security and cost controls from day one.

Key risks center on OAuth token refresh failures (breaking auto-refresh), Spotify rate limiting (429 errors causing stale profiles), AI-generated cringe (defeating core value proposition), and broken social previews (killing viral sharing). All are preventable with proper implementation: use Authorization Code flow with correct header format, implement request batching with Retry-After respect, validate AI output against banned phrases, and use Next.js SSR with platform-specific image requirements.

## Key Findings

### Recommended Stack

The research identifies a serverless AWS stack optimized for SSR, social sharing, and minimal operational costs. Next.js 15 with React 19 provides the required server-side rendering for Open Graph metadata (essential for WhatsApp/Twitter previews). AWS Amplify Hosting fully manages Lambda@Edge and CloudFront without manual configuration, costing 40% less than Vercel at scale. DynamoDB with single-table design enables millisecond latency for profile data while supporting scheduled refresh queries via GSI. AWS Bedrock with Claude Sonnet 4 generates tasteful music bios, with prompt caching reducing costs by 85%.

**Core technologies:**
- **Next.js 15 + React 19**: SSR for social preview metadata, App Router for dynamic routes, Metadata API for Open Graph optimization
- **AWS Amplify Hosting (Gen 2)**: Fully managed Next.js SSR with automatic Lambda@Edge provisioning, 40% cheaper than Vercel
- **DynamoDB**: Millisecond latency for profiles and encrypted tokens, single-table design with GSI for scheduled refresh queries
- **AWS Bedrock (Claude Sonnet 4)**: AI content generation with prompt caching (85% cost reduction), `@aws-sdk/client-bedrock-runtime` for API calls
- **AWS KMS**: Customer-managed key for encrypting Spotify refresh tokens at rest, integrated with DynamoDB and Lambda
- **EventBridge Scheduler**: Cron-based scheduling for profile auto-refresh, 14M free invocations/month, rate expressions for flexibility

**Critical version requirements:**
- Node.js 22 LTS (AWS Amplify deprecated Node 14-18 in Sept 2025)
- next-auth v5 beta (v4 no longer maintained, includes Spotify provider)
- @spotify/web-api-ts-sdk 1.2.0 (official TypeScript SDK, supports Node 18+)
- AWS SDK v3 with modular imports (tree-shakeable, required for Lambda bundle size optimization)

### Expected Features

Research from competitors (Linktree, Carrd, ToneDen, Beacons) and music industry best practices reveals a clear feature hierarchy. The MVP must deliver handle claiming, Spotify OAuth, album-first public pages, mobile-responsive design, social sharing previews, and basic edit mode. These are table stakes—without them, the product feels incomplete or broken.

**Must have (table stakes):**
- **Handle claiming** (anchor.band/username) — every link-in-bio platform has this, vanity URLs are baseline
- **Spotify OAuth + data fetch** — musicians expect Spotify as primary music source, enables all downstream features
- **Album-first public page** — visual identity for musicians, differentiates from track-first competitors
- **Mobile-responsive design** — 55% of web traffic is mobile, music fans share on phones
- **Social sharing preview (Open Graph)** — when shared on WhatsApp/Twitter, needs rich preview (1200x630px image, proper meta tags)
- **Spotify streaming links** — click album → go to Spotify (add Apple Music, YouTube later)
- **Basic edit mode** — edit bio, refresh Spotify data, toggle page visibility

**Should have (competitive):**
- **AI-generated tasteful copy** — anti-cringe positioning, solves "what do I write?" problem with strict prompt constraints
- **Multiple streaming platform links** — Apple Music, YouTube Music, Tidal alongside Spotify (via Songlink/Odesli API or ISRC lookup)
- **SEO optimization** — sitemap, structured data, meta descriptions for Google discoverability
- **View counter** — simple aggregate count (not per-visitor), optional validation for users
- **Manual Spotify refresh** — button to re-fetch Spotify data when tastes change

**Defer (v2+):**
- **Apple Music integration** — as alternative to Spotify (API more limited than Spotify)
- **Custom domain support** — DNS complexity, support burden (myband.com pointing to anchor.band page)
- **Analytics dashboard** — aggregate stats (views, clicks, geography) raise privacy considerations
- **Collaborative pages** — multiple Spotify accounts for bands (complex auth, UX, data model)
- **Pre-save campaigns** — album pre-save landing pages (specialized feature, platforms like ToneDen already do this)

### Architecture Approach

The architecture follows AWS serverless patterns with Next.js SSR frontend and Lambda-based backend. Key architectural decisions include using multi-table DynamoDB design (not single-table) to avoid hot partition throttling, implementing token encryption with customer-managed KMS keys, caching Spotify data to avoid API calls during public page views, and using EventBridge Scheduler with idempotency controls for auto-refresh jobs.

**Major components:**
1. **Next.js App on Amplify Hosting** — Public page rendering with SSR for social previews, handles `/<handle>` routes, generates dynamic OG meta tags per profile
2. **Lambda Functions (Business Logic)** — Profile CRUD, Spotify OAuth callback with token refresh, Bedrock AI generation, scheduled refresh jobs triggered by EventBridge
3. **DynamoDB Tables** — Separate tables for Users, Profiles, and PublishedProfiles to avoid hot partition issues; GSI with timestamp-based sort keys for efficient refresh queries
4. **KMS + Token Encryption** — Customer-managed key encrypts Spotify refresh tokens before storage, decrypts during API calls, uses encryption context for additional security
5. **EventBridge Scheduler** — Hourly trigger for refresh Lambda, processes batches of 50 profiles at a time, respects rate limits with jitter and request queuing

**Critical patterns:**
- **Token encryption with KMS**: Always encrypt OAuth tokens at rest using customer-managed keys, never store plaintext
- **GSI-based refresh scheduling**: Use sparse GSI with timestamp sort keys to efficiently query profiles due for refresh, avoiding expensive table scans
- **Cached data for public pages**: Store Spotify data in DynamoDB during OAuth callback and refresh, never call Spotify API during page views
- **SSR metadata for social previews**: Use Next.js `generateMetadata` export to create server-rendered OG tags, required for WhatsApp/Twitter/LinkedIn previews
- **Idempotency for scheduled jobs**: EventBridge guarantees at-least-once delivery, use AWS Powertools idempotency layer to prevent duplicate executions

### Critical Pitfalls

Research identified eight critical pitfalls that can break core functionality or cause financial/security issues. The top five must be addressed in Phase 1 to avoid launching with broken OAuth, cringe AI content, or unusable social sharing.

1. **Spotify OAuth token refresh failures** — Refresh tokens become invalid due to not storing updated refresh tokens when provided in response, missing Authorization header with Base64-encoded client_id:client_secret, or mixing PKCE flow patterns with Authorization Code flow. Prevention: Use Authorization Code flow with correct header format, always persist refresh_token from response, add integration tests that mock token expiration.

2. **Spotify rate limiting breaking refresh jobs** — Development mode has severe restrictions (Extended Quota requires organization status, not available to solo developers as of May 2025). Auto-refresh jobs hit 429 errors causing stale profiles. Prevention: Implement request batching with staggered timing (jitter), respect Retry-After header, use SQS queue for delayed retries, apply for Extended Quota Mode before launch.

3. **AI-generated copy being cringe** — Bedrock generates generic cliches ("takes you on a journey", "rising star", "unique sound") defeating core value proposition. Prevention: Implement strict prompt engineering with negative examples, output validation against banned phrases, use prompt caching (85% cost reduction), enable regeneration button, allow manual editing before publish.

4. **Social preview metadata not rendering** — WhatsApp/Twitter/LinkedIn crawlers don't execute JavaScript, so client-side rendered OG tags are invisible. Prevention: Use Next.js SSR with `generateMetadata` export, verify with curl test (not just browser DevTools), test actual WhatsApp share, generate dynamic OG images at 1200x630px <300KB.

5. **DynamoDB hot partitions throttling requests** — Single-table design with GSI where all items share same partition key (e.g., GSI PK="PROFILE") causes throttling. Prevention: Use multi-table design with user-based partition keys (userId, not entity type), enable on-demand billing mode for MVP, add sharding to GSIs if needed, monitor CloudWatch for WriteThrottleEvents.

6. **Auto-refresh jobs executing twice** — EventBridge at-least-once delivery semantics cause duplicate executions without idempotency, wasting Spotify rate limit quota and Bedrock budget. Prevention: Implement AWS Powertools idempotency layer using EventBridge execution-id as key, add conditional DynamoDB writes to prevent race conditions.

7. **AWS Bedrock costs spiraling out of control** — No prompt caching causes 85% higher costs, using expensive model (Claude Opus: $0.015/1K input vs Haiku: $0.00025/1K input) for all tasks. Prevention: Enable prompt caching from day one, use Haiku model for simple tasks (60x cheaper), set billing alarms at $50/month, enforce token limits (1500 input, 300 output).

8. **Token security failures** — Storing unencrypted refresh tokens in DynamoDB violates security best practices and GDPR, risks account takeover if database compromised. Prevention: Use customer-managed KMS key from day one, configure DynamoDB table with customer-managed encryption, use IAM execution roles (never access keys), redact tokens in logs.

## Implications for Roadmap

Based on research, the recommended phase structure follows dependency chains and risk mitigation priorities. The critical path is: handle claiming → Spotify OAuth → data caching → AI generation → SSR publishing → scheduled refresh. This order ensures each phase builds on previous work while addressing security, cost controls, and core value proposition from the start.

### Phase 1: Foundation (OAuth + Profile Storage)
**Rationale:** Must establish secure authentication and data model before any feature work. OAuth with proper token refresh is the foundation for all Spotify integrations. Security (KMS encryption) must be built-in from first token storage, not added later.

**Delivers:** Handle claiming with uniqueness validation, Spotify OAuth with Authorization Code flow and token refresh, encrypted token storage with customer-managed KMS key, basic profile CRUD operations, DynamoDB tables with on-demand billing.

**Addresses features:**
- Handle claiming (table stakes)
- Spotify OAuth + data fetch (table stakes)
- Basic edit mode (table stakes)

**Avoids pitfalls:**
- Pitfall 1 (OAuth token refresh failures) — implement correct Authorization Code flow from day one
- Pitfall 8 (Token security failures) — KMS encryption built-in from first token storage
- Pitfall 5 (DynamoDB hot partitions) — multi-table design with user-based partition keys

**Research flag:** STANDARD PATTERNS — OAuth flows and DynamoDB encryption are well-documented, no research-phase needed.

### Phase 2: Content Generation (Spotify Data + AI)
**Rationale:** Can't generate content without Spotify data cached. Can't publish pages without content. AI generation must include output validation and cost controls from day one to avoid cringe content and budget overruns.

**Delivers:** Spotify data fetch (top albums, artists, tracks) with caching in DynamoDB, Bedrock AI integration with Claude Haiku model, prompt engineering with anti-cringe constraints and negative examples, output validation against banned phrases, prompt caching for 85% cost reduction, billing alarms and token usage monitoring, regeneration button and manual editing.

**Addresses features:**
- AI-generated tasteful copy (differentiator)
- Spotify streaming links (table stakes)

**Avoids pitfalls:**
- Pitfall 3 (AI-generated cringe) — strict output validation, regeneration option, manual editing
- Pitfall 7 (Bedrock cost overruns) — prompt caching, Haiku model selection, billing alarms, token limits

**Research flag:** NEEDS RESEARCH — Prompt engineering for "tasteful" music bios is domain-specific, may need iteration based on first 100 profiles.

### Phase 3: Public Pages (SSR + Social Sharing)
**Rationale:** SSR metadata is non-negotiable for social sharing (core viral mechanism). Must be implemented before public launch, not as later optimization. Public pages consume cached Spotify data, never call external APIs during page views.

**Delivers:** Next.js dynamic routes for `/<handle>`, SSR with `generateMetadata` export for Open Graph tags, dynamic OG image generation (1200x630px optimized for WhatsApp <300KB), CloudFront caching for public pages, publish/unpublish toggle, profile visibility controls.

**Addresses features:**
- Album-first public page (table stakes)
- Mobile-responsive design (table stakes)
- Social sharing preview (table stakes)

**Avoids pitfalls:**
- Pitfall 4 (Social preview metadata broken) — SSR from day one, test with curl and actual WhatsApp share
- Architecture pattern (Cached data for public pages) — public pages read from DynamoDB, never call Spotify API

**Research flag:** STANDARD PATTERNS — Next.js SSR and OG metadata are well-documented, platform-specific image requirements are known.

### Phase 4: Auto-Refresh (Scheduled Jobs)
**Rationale:** Background refresh requires all previous systems working (OAuth, data caching, AI generation, publishing). Idempotency and rate limiting must be built-in from first scheduled job to avoid duplicate executions and Spotify rate limit bans.

**Delivers:** EventBridge Scheduler with hourly trigger, GSI with timestamp-based sort keys for efficient refresh queries, Lambda refresh handler with batch processing (50 profiles at a time), idempotency layer using AWS Powertools with execution-id as key, request batching and staggered timing (jitter), Retry-After header respect with SQS queue for delayed retries, manual refresh endpoint with cooldown (1 hour minimum), CloudWatch metrics for 429 error rate and idempotency cache hits.

**Addresses features:**
- Manual Spotify refresh (should have)
- Auto-refresh scheduling (enables long-term freshness)

**Avoids pitfalls:**
- Pitfall 2 (Spotify rate limiting) — request batching, jitter, Retry-After respect, SQS queue
- Pitfall 6 (Duplicate refresh runs) — AWS Powertools idempotency, conditional DynamoDB writes
- Pitfall 5 (Hot partitions) — GSI with sparse index, batch processing with cursor pagination

**Research flag:** NEEDS RESEARCH — Rate limiting strategies and batch processing patterns for Spotify API may need adjustment based on actual quota limits (Development mode vs Extended mode).

### Phase Ordering Rationale

- **OAuth before everything**: Can't fetch Spotify data without authentication, can't generate AI content without data, can't publish pages without content
- **Security from day one**: KMS encryption built-in from first token storage (Pitfall 8), not added later as migration
- **Cost controls with features**: Prompt caching and billing alarms shipped with AI generation (Phase 2), not added after costs spiral (Pitfall 7)
- **SSR before public launch**: Social metadata must work on day one (Pitfall 4), not fixable as post-launch optimization
- **Idempotency with scheduling**: EventBridge at-least-once delivery guarantees duplicates, idempotency layer required from first scheduled job (Pitfall 6)

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 2 (AI Generation):** Prompt engineering for "tasteful" music bios is domain-specific and may require iteration. Plan to analyze first 100 generated profiles and tune prompts based on patterns. Consider `/gsd:research-phase` for prompt optimization after initial launch.
- **Phase 4 (Auto-Refresh):** Spotify rate limits vary dramatically between Development mode (severe restrictions) and Extended Quota Mode (requires organization status, not available to solo devs). May need `/gsd:research-phase` for rate limiting strategies based on actual quota tier.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (OAuth Foundation):** OAuth 2.0 Authorization Code flow is well-documented with official Spotify guides, AWS KMS encryption has established patterns
- **Phase 3 (Public Pages):** Next.js SSR and Open Graph metadata are industry-standard with comprehensive documentation, image requirements for social platforms are well-known

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All core technologies verified with official documentation (Next.js 15, AWS Amplify Hosting, DynamoDB, Bedrock, KMS). Version requirements confirmed from AWS deprecation schedules and Spotify SDK requirements. |
| Features | HIGH | Feature hierarchy validated against major competitors (Linktree, Carrd, ToneDen, Beacons) and music industry best practices from Spotify, Bandzoogle, music marketing blogs. Clear distinction between table stakes and differentiators. |
| Architecture | HIGH | Architectural patterns verified with official AWS whitepapers and documentation (serverless multi-tier architectures, DynamoDB single-table design, EventBridge scheduling). Critical patterns like token encryption and SSR metadata have established implementations. |
| Pitfalls | HIGH | All critical pitfalls verified with official sources (Spotify OAuth docs, AWS EventBridge at-least-once delivery semantics, Next.js SSR requirements for social crawlers, DynamoDB hot partition issues). Real-world examples from community discussions and GitHub issues. |

**Overall confidence:** HIGH

### Gaps to Address

**Spotify rate limit tier uncertainty:** Solo developers are stuck in Development mode with severe restrictions as of May 2025 (Extended Quota requires organization status). This could significantly impact auto-refresh functionality. **Mitigation:** Design Phase 4 refresh scheduler with conservative rate limits (5 requests per 30-second window), implement robust request queuing with Retry-After respect, apply for Extended Quota Mode even if denied (shows good faith), consider refresh-on-demand rather than scheduled for MVP if rate limits prove too restrictive.

**AI prompt engineering iteration:** "Tasteful" is subjective and initial prompts may not produce desired quality. Research provides constraints (avoid buzzwords, use negative examples, validate output) but actual results need validation with first 100-500 generated profiles. **Mitigation:** Ship with conservative factual prompts (less creative, more descriptive), enable regeneration button from day one, allow manual editing before publish, plan Phase 3 iteration based on regeneration rate metric (>30% regeneration = prompt needs tuning).

**Social preview image optimization:** Platform requirements vary (WhatsApp <300KB, Twitter/LinkedIn different aspect ratios, Discord has different caching behavior). Research provides specifications but actual rendering across platforms needs testing. **Mitigation:** Create test checklist with links to all platform validators (Facebook Sharing Debugger, Twitter Card Validator, LinkedIn Post Inspector, actual WhatsApp share), add automated E2E test that verifies OG tags present in raw HTML via curl, monitor 404 errors for OG image paths in CloudWatch.

## Sources

### Primary (HIGH confidence)
- **Official Documentation:** Next.js 15 Release Notes, AWS Amplify Next.js SSR Support, Spotify Web API Authorization Guide, AWS SDK v3 for JavaScript, DynamoDB Developer Guide, AWS Bedrock Runtime with Claude, Auth.js (next-auth) v5 Migration Guide
- **AWS Whitepapers:** Serverless Multi-Tier Architectures with API Gateway and Lambda, Creating Single-Table Design with DynamoDB, DynamoDB Encryption at Rest, EventBridge Scheduled Rules
- **Spotify Developer:** OAuth Security Requirements 2025, Rate Limits, Token Refresh Tutorial, Authorization Code Flow, Developer Community discussions on refresh token issues and rate limiting

### Secondary (MEDIUM confidence)
- **AWS Blogs:** Serverless Scheduling with EventBridge Lambda and DynamoDB, Creating Single-Table Design with DynamoDB
- **Domain Experts:** Alex DeBrie on single-table vs multi-table design, Burning Monk on API Gateway vs Lambda Function URLs
- **Music Industry:** Musicians Guide to Using Linktree (Cyber PR Music), Spotify Artist Profile Best Practices, Album Cover Size Guide (Musosoup), Landing Page Mistakes (Linkfire)
- **Technical Guides:** Next.js 15 SEO Complete Guide (Digital Applied), Open Graph Sharable Social Media Previews (LogRocket), DynamoDB Single-Table Design How to use GSI (DEV Community)

### Tertiary (LOW confidence)
- **Cost Optimization:** Community reports on Bedrock cost reductions with prompt caching (Medium articles), AWS Amplify vs Vercel 2026 pricing comparisons (Agile Soft Labs)
- **Performance Tuning:** CloudFront caching mistakes and best practices (Medium), cache invalidation patterns (daily.dev)

---
*Research completed: 2026-02-04*
*Ready for roadmap: yes*
