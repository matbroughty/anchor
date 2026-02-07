# Anchor.band

## What This Is

A calm, album-first personal music taste page where users claim a handle, connect Spotify, auto-generate tasteful AI copy, and publish to `anchor.band/<handle>`. Think Letterboxd aesthetic applied to music - minimal, opinionated, shareable.

## Core Value

Non-cringe, tasteful representation of your music taste that you can confidently share anywhere - social bios, WhatsApp, as a landing page.

## Requirements

### Validated

- ✓ User can claim unique handle and display name — v1.0
- ✓ User can connect Spotify account via OAuth (secure token storage with KMS) — v1.0
- ✓ User can sign in with Google OAuth and magic link email — v1.0
- ✓ User can generate AI bio and album captions from Spotify data (Bedrock) — v1.0
- ✓ User can edit AI-generated content before publishing — v1.0
- ✓ User can regenerate AI content if unsatisfied — v1.0
- ✓ User can publish page to public URL (anchor.band/handle) — v1.0
- ✓ Public page renders server-side with proper social preview metadata — v1.0
- ✓ Public page displays: bio, top artists (5-6), albums (3-5 with captions), tracks (3) — v1.0
- ✓ User can manually refresh their Spotify data (with 24-hour cooldown) — v1.0
- ✓ User can unpublish page (toggle isPublic to false) — v1.0
- ✓ Public pages load fast on mobile and desktop (ISR caching) — v1.0
- ✓ AI-generated copy follows strict anti-cringe rules (no emojis, hype words, clichés) — v1.0
- ✓ Landing page explains Anchor value proposition with example profiles — v1.0

### Active

- [ ] Profile → Dashboard navigation (integration gap from v1.0 audit)
- [ ] Complete new user onboarding flow at profile page
- [ ] Middleware protection for /dashboard route (consistency fix)
- [ ] User's page auto-refreshes every 7 days from Spotify (deferred to v2)

### Out of Scope

- Social links ("Elsewhere" section) — v2, adds complexity without core value
- Lock refresh toggle — v2, auto-refresh is good default for MVP
- Delete functionality — v2, unpublish covers privacy concern for launch
- Custom per-handle OG images — nice-to-have but not blocking (generic image acceptable for v1)
- Ratings, reviews, comments, likes, follows, feeds — explicitly never (product philosophy)
- Monetization, billing, ads — not in v1 scope
- Template marketplace / heavy theming — not aligned with "opinionated aesthetic" approach

## Context

**Target audience:** Music enthusiasts who care about their taste and want a clean, shareable way to represent it.

**Primary use cases:**
- Social media bio link replacement (Instagram, Twitter)
- Personal landing page
- Shareable on messaging apps (WhatsApp, iMessage)
- Discoverable by search engines

**Critical success factors:**
- AI-generated copy must be consistently tasteful (anti-cringe is a feature, not nice-to-have)
- Social preview metadata must work perfectly (WhatsApp/Twitter/Slack unfurls)
- Mobile-first, fast page loads
- Spotify data never fetched during public page views

**Design philosophy:**
- Calm, minimal, album-first aesthetic
- Opinionated layout (one design, no templates)
- Anti-features are explicit (no engagement mechanics)

### Current State (as of v1.0)

**Shipped:** v1.0 MVP (2026-02-07) - 4 phases, 12 plans, 3 days
**Codebase:** 13,462 LOC TypeScript/TSX, 55 source files, Next.js 15 with App Router
**Tech stack:** Next.js 15, NextAuth v5, AWS (DynamoDB, KMS, Bedrock), Spotify API, Resend
**Infrastructure:** CloudFormation templates for DynamoDB single-table and KMS key rotation

**Known technical debt from v1.0 audit:**
- Profile → Dashboard navigation missing (integration gap)
- New user onboarding flow incomplete at profile page
- Middleware doesn't protect /dashboard route consistently
- Phase 1-2 requirements need formal verification docs

**User feedback themes:** None yet - pre-launch

## Constraints

- **Tech stack**: AWS (Amplify Hosting, Lambda, API Gateway, DynamoDB, Bedrock, KMS) — locked in, builder is AWS-proficient
- **Budget**: Keep costs minimal (free tier where possible) — solo project
- **Timeline**: Ship soon (weeks, not months) — solo builder, MVP definition of done
- **Domain**: anchor.band (Route 53 managed)
- **Security**: Spotify tokens must be KMS encrypted at rest

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AWS stack over simpler alternatives (Vercel + Supabase) | Builder proficient in AWS, wants full control over architecture, learning opportunity | ✓ Good - CloudFormation IaC works well, single-table DynamoDB efficient |
| No deletion in v1 | Simplify MVP, unpublish covers immediate privacy need, hard delete adds complexity | ✓ Good - Simplified implementation, no user complaints |
| Album captions included | AI-generated personality distinguishes Anchor from generic "link in bio" tools | ✓ Good - Anti-cringe rules working, captions add character |
| Custom OG images deferred | Nice-to-have but adds S3/image generation complexity, generic OG acceptable for launch | ✓ Good - Generic OG sufficient for v1.0, can enhance in v1.1+ |
| Single opinionated layout | Avoids template marketplace scope creep, maintains tasteful aesthetic control | ✓ Good - Consistent design, no choice paralysis |
| No social links in v1 | Reduces data collection, simplifies UI, focus on music content only | ✓ Good - MVP stayed focused on core value |
| KMS encryption for Spotify tokens | Security-first approach from day one | ✓ Good - Implemented with consistent encryption context |
| NextAuth v5 database sessions | Support magic link and "sign out everywhere" | ✓ Good - Flexible auth, proper session management |
| Transaction-based handle claiming | Prevent race conditions at scale | ✓ Good - Atomic uniqueness enforcement working |
| 24-hour Spotify refresh cooldown | Respect API rate limits, reduce costs | ✓ Good - Prevents abuse, reasonable for user needs |

---
*Last updated: 2026-02-07 after v1.0 milestone*
