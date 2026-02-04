# Anchor.band

## What This Is

A calm, album-first personal music taste page where users claim a handle, connect Spotify, auto-generate tasteful AI copy, and publish to `anchor.band/<handle>`. Think Letterboxd aesthetic applied to music - minimal, opinionated, shareable.

## Core Value

Non-cringe, tasteful representation of your music taste that you can confidently share anywhere - social bios, WhatsApp, as a landing page.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can claim unique handle and display name
- [ ] User can connect Spotify account via OAuth (secure token storage)
- [ ] User can generate AI bio and album captions from Spotify data (Bedrock)
- [ ] User can publish page to public URL (anchor.band/handle)
- [ ] Public page renders server-side with proper social preview metadata
- [ ] Public page displays: bio, top artists (5-6), albums (3-5 with captions), tracks (3)
- [ ] User can manually refresh their Spotify data (with cooldown)
- [ ] User's page auto-refreshes every 7 days from Spotify
- [ ] User can unpublish page (toggle isPublic to false)
- [ ] Public pages load fast on mobile and desktop
- [ ] AI-generated copy follows strict anti-cringe rules (no emojis, hype words, clichés)

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

## Constraints

- **Tech stack**: AWS (Amplify Hosting, Lambda, API Gateway, DynamoDB, Bedrock, KMS) — locked in, builder is AWS-proficient
- **Budget**: Keep costs minimal (free tier where possible) — solo project
- **Timeline**: Ship soon (weeks, not months) — solo builder, MVP definition of done
- **Domain**: anchor.band (Route 53 managed)
- **Security**: Spotify tokens must be KMS encrypted at rest

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| AWS stack over simpler alternatives (Vercel + Supabase) | Builder proficient in AWS, wants full control over architecture, learning opportunity | — Pending |
| No deletion in v1 | Simplify MVP, unpublish covers immediate privacy need, hard delete adds complexity | — Pending |
| Album captions included | AI-generated personality distinguishes Anchor from generic "link in bio" tools | — Pending |
| Custom OG images deferred | Nice-to-have but adds S3/image generation complexity, generic OG acceptable for launch | — Pending |
| Single opinionated layout | Avoids template marketplace scope creep, maintains tasteful aesthetic control | — Pending |
| No social links in v1 | Reduces data collection, simplifies UI, focus on music content only | — Pending |

---
*Last updated: 2026-02-04 after initialization*
