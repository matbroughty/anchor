---
phase: 02-content-pipeline
plan: 02
subsystem: api
tags: [bedrock, dynamodb, claude, server-actions, ai-content]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Music data types, DynamoDB schema helpers, getMusicData"
  - phase: 01-01
    provides: "dynamoDocumentClient, TABLE_NAME, single-table DynamoDB layout"
provides:
  - "BedrockRuntimeClient configured with shared IAM credentials"
  - "Anti-cringe system prompts (bio + caption) with few-shot examples"
  - "DynamoDB CRUD for Bio and Caption content items"
  - "Server Actions: generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption"
affects: [02-03, 03-publishing]

# Tech tracking
tech-stack:
  added: ["@aws-sdk/client-bedrock-runtime"]
  patterns:
    - "Bedrock Converse API (not InvokeModel) for Claude inference"
    - "Sequential Bedrock calls per album to avoid throttling"
    - "CONTENT#BIO / CONTENT#CAPTION#{albumId} sort-key namespace in single table"
    - "Typed error responses from Server Actions (never throw)"

key-files:
  created:
    - types/content.ts
    - lib/bedrock/client.ts
    - lib/bedrock/prompts.ts
    - lib/dynamodb/content.ts
    - app/actions/ai-content.ts
  modified: []

key-decisions:
  - "Bedrock client reuses AUTH_DYNAMODB_ID/SECRET/REGION (single IAM user for all AWS services)"
  - "Bio temperature 0.6 for slight variation; caption temperature 0.5 for consistency"
  - "Sequential album caption loop to stay within Bedrock per-account rate limits"
  - "ANTI_CRINGE_RULES exported as standalone constant for reuse in tests or linting"

patterns-established:
  - "Content sort keys follow CONTENT#<type> namespace, parallel to MUSIC#<type> from 02-01"
  - "callBedrock helper centralises ConverseCommand invocation and response extraction"
  - "buildBioUserMessage / buildCaptionUserMessage keep prompt construction testable and separate from I/O"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 2 Plan 2: AI Content Generation Summary

**Bedrock Claude Converse integration generating anti-cringe bios and album captions, stored in DynamoDB with per-item timestamps**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T07:02:16Z
- **Completed:** 2026-02-05T07:05:40Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments

- Configured BedrockRuntimeClient with project-standard AUTH_DYNAMODB_* credentials (single IAM user)
- Implemented comprehensive anti-cringe system prompts: explicit forbidden word lists (emojis, hype words, cliches, superlatives, marketing language), plus two good and two bad few-shot examples for both bio and caption prompts
- Created DynamoDB content layer with bio and caption CRUD, prefix-scan for all captions, and a parallel-fetch getContent helper
- Delivered four Server Actions (generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption) that pull music data, call Bedrock sequentially, persist results, and revalidate Next.js cache

## Task Commits

Each task was committed atomically:

1. **Task 1: Bedrock client and anti-cringe prompts** - `20e54ec` (feat)
2. **Task 2: DynamoDB operations for AI content** - `127f240` (feat)
3. **Task 3: Server Actions for AI content generation** - `3ac225e` (feat, committed as 02-03 prerequisite by prior session)
4. **Fix: Restore AUTH_DYNAMODB_* credentials** - `02ae1a2` (fix, auto-fix Rule 1)

## Files Created/Modified

- `types/content.ts` - Bio, Caption, ContentData interfaces with generatedAt/editedAt timestamps
- `lib/bedrock/client.ts` - BedrockRuntimeClient singleton using AUTH_DYNAMODB_* env vars
- `lib/bedrock/prompts.ts` - ANTI_CRINGE_RULES, BIO_SYSTEM_PROMPT, CAPTION_SYSTEM_PROMPT with few-shot examples
- `lib/dynamodb/content.ts` - getBio, putBio, getCaption, putCaption, getAllCaptions, getContent with CONTENT_SK constants
- `app/actions/ai-content.ts` - generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption Server Actions

## Decisions Made

- Bedrock client uses AUTH_DYNAMODB_ID / AUTH_DYNAMODB_SECRET / AUTH_DYNAMODB_REGION to match the project-wide single-IAM-user pattern established in Phase 1
- Bio generation uses temperature 0.6 (enough variation for authentic tone, not so much it drifts off-topic); caption generation uses 0.5 (short outputs need less creativity)
- Caption generation loops sequentially over albums (max 5) rather than firing in parallel, to stay within Bedrock per-account request rate limits
- ANTI_CRINGE_RULES exported as a standalone constant so it can be referenced in unit tests or future prompt validation tooling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored AUTH_DYNAMODB_* credentials in lib/bedrock/client.ts**

- **Found during:** Post-task verification
- **Issue:** A prerequisite commit from a prior 02-03 session reverted the Bedrock client to generic AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION env vars. Project decision requires AUTH_DYNAMODB_* for all AWS services (single IAM user).
- **Fix:** Replaced env var references with AUTH_DYNAMODB_ID, AUTH_DYNAMODB_SECRET, AUTH_DYNAMODB_REGION to match lib/dynamodb.ts
- **Files modified:** lib/bedrock/client.ts
- **Verification:** tsc passes; env var names match dynamodb.ts pattern
- **Committed in:** 02ae1a2

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Credential fix ensures Bedrock and DynamoDB share the same IAM identity at runtime. No scope creep.

## Issues Encountered

- Pre-existing tsc errors in app/(protected)/dashboard/DashboardClient.tsx from partial 02-03 work (missing UI components). These errors pre-date 02-02 execution and are out of scope; they will be resolved when 02-03 completes.

## Next Phase Readiness

- All 02-02 exports are in place and type-correct
- 02-03 (Content Management Dashboard UI) imports generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption -- all available
- Blocker: three dashboard UI components (MusicDataSection, BioEditor, AlbumCaptions) do not yet exist; these are the deliverable of 02-03

---
*Phase: 02-content-pipeline*
*Completed: 2026-02-05*
