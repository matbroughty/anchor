---
phase: 02-content-pipeline
plan: 01
subsystem: api
tags: [spotify, dynamodb, server-actions, caching, cooldown]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: DynamoDB single-table (dynamoDocumentClient, TABLE_NAME), KMS token encryption/decryption, Spotify OAuth token storage (getSpotifyTokens), NextAuth v5 session with user.id
provides:
  - Spotify API client (getTopArtists, getTopTracks) with rate-limit handling
  - Album derivation from tracks with weighted popularity scoring
  - DynamoDB caching layer for music data (BatchGet read, TransactWrite write)
  - 24-hour refresh cooldown enforcement
  - Server actions (fetchSpotifyData, refreshSpotifyData) as the single entry point for all music data
affects: [02-02-ai-content-generation, 02-03-content-dashboard, 03-publishing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action pattern: typed response objects that never throw -- errors returned as { data: null, error: string }"
    - "Single-table DynamoDB: music entities keyed under USER#id with MUSIC#ARTISTS / MUSIC#ALBUMS / MUSIC#TRACKS sort keys"
    - "Parallel fetch: independent Spotify endpoints fetched via Promise.all"
    - "Cache-first read: fetchSpotifyData returns DynamoDB cache; Spotify API called only on first load or explicit refresh"

key-files:
  created:
    - types/music.ts
    - lib/spotify-data.ts
    - lib/dynamodb/schema.ts
    - lib/dynamodb/music-data.ts
    - app/actions/spotify.ts
  modified: []

key-decisions:
  - "Store full 50-track pool in DynamoDB but return only top 3 to the UI -- preserves rich data for future album re-derivation without bloating the response"
  - "Use PROFILE#METADATA sort key for lastRefresh so cooldown checks need only a single GetCommand, not a scan of music items"
  - "lib/dynamodb/ subdirectory coexists with lib/dynamodb.ts; bundler resolution routes @/lib/dynamodb to the file and @/lib/dynamodb/schema to the subdirectory"

patterns-established:
  - "Pattern: DynamoDB schema constants in lib/dynamodb/schema.ts -- sort keys and pk helpers in one place"
  - "Pattern: Server actions return typed result objects; callers never see uncaught errors"

# Metrics
duration: 3min
completed: 2026-02-05
---

# Phase 2 Plan 1: Spotify Data Fetching and DynamoDB Caching Summary

**Spotify top-artists/tracks fetched in parallel, albums derived via weighted popularity scoring, all cached atomically in DynamoDB with 24-hour cooldown enforced at the server action layer**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-05T06:56:08Z
- **Completed:** 2026-02-05T06:59:12Z
- **Tasks:** 3
- **Files created:** 5

## Accomplishments

- Spotify API client with rate-limit handling (parses Retry-After header) for top artists and top tracks endpoints using medium_term time range
- Album derivation algorithm: groups tracks by album, skips singles, scores by average popularity, returns top 5
- DynamoDB layer uses BatchGetCommand for single-round reads and TransactWriteCommand for atomic 4-item writes (artists, albums, tracks, metadata)
- Server actions enforce 24-hour cooldown with precise remaining-time calculation; fetchSpotifyData is cache-first and only hits Spotify on the very first load

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Spotify API client and music types** - `d175918` (feat)
2. **Task 2: Create DynamoDB operations for music data and cooldown** - `5d07d75` (feat)
3. **Task 3: Create Server Actions for Spotify data operations** - `1228711` (feat)

## Files Created/Modified

- `types/music.ts` - Artist, Track, Album, MusicData types and Spotify API response shapes
- `lib/spotify-data.ts` - getTopArtists, getTopTracks (rate-limit aware), deriveTopAlbums
- `lib/dynamodb/schema.ts` - MUSIC_SK sort-key constants, METADATA_SK, userPK helper
- `lib/dynamodb/music-data.ts` - getMusicData, putMusicData, getLastRefresh, canRefresh
- `app/actions/spotify.ts` - fetchSpotifyData and refreshSpotifyData server actions

## Decisions Made

- Store all 50 fetched tracks in DynamoDB but slice to 3 in the returned MusicData. The full pool stays available for album derivation if the algorithm is tuned later.
- lastRefresh lives on the PROFILE#METADATA item (not on the music items themselves) so a cooldown check is a single GetCommand.
- `lib/dynamodb/` subdirectory coexists with `lib/dynamodb.ts`. With `moduleResolution: "bundler"` the file wins for `@/lib/dynamodb` imports; the subdirectory is reached via `@/lib/dynamodb/schema` and `@/lib/dynamodb/music-data`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected BatchGetCommand input property name**
- **Found during:** Task 2 (DynamoDB operations)
- **Issue:** Initial implementation used `RequestMap` which is a runtime-only property on the BatchGetCommand. The typed input requires `RequestItems` with a nested `Keys` array, matching the `BatchGetCommandInput` type definition.
- **Fix:** Changed to `RequestItems: { [TABLE_NAME]: { Keys: [...] } }` structure
- **Files modified:** lib/dynamodb/music-data.ts
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** 5d07d75 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was necessary for type safety; the runtime would have worked with either property name but the typed SDK interface requires RequestItems for correctness and IDE support.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required by this plan. Spotify OAuth credentials and AWS infrastructure were configured during Phase 1.

## Next Phase Readiness

- Music data layer is complete and ready for 02-02 (AI content generation with Bedrock Claude)
- Server actions provide the typed MusicData that AI prompts will consume
- DynamoDB caching means AI generation can read from local storage without hitting Spotify
- No blockers identified

---
*Phase: 02-content-pipeline*
*Completed: 2026-02-05*
