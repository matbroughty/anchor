---
phase: "03"
plan: "01"
subsystem: "data-layer"
completed: "2026-02-07"
duration: "4 min"
tags:
  - dynamodb
  - server-actions
  - react-cache
  - publishing
tech-stack:
  added: []
  patterns:
    - "React cache() for request deduplication"
    - "Typed server action responses"
key-files:
  created:
    - lib/dynamodb/public-profile.ts
    - app/actions/publish.ts
  modified:
    - lib/dynamodb/schema.ts
decisions:
  - key: isPublic-on-user-record
    choice: "Store isPublic directly on USER#{userId} record"
    rationale: "No separate sort key needed, simple boolean flag"
metrics:
  tasks: 3
  commits: 3
---

# Phase 03 Plan 01: Publish Data Layer Summary

**One-liner:** Public profile query with React cache() and publish/unpublish server actions with auth + path revalidation.

## Completed Tasks

| # | Task | Commit | Key Changes |
|---|------|--------|-------------|
| 1 | Create public profile query function | ae54803 | `lib/dynamodb/public-profile.ts` - getPublicProfile with cache() |
| 2 | Create publish/unpublish server actions | 76fa4cf | `app/actions/publish.ts` - publishPage/unpublishPage actions |
| 3 | Add isPublic type to schema constants | b9b8587 | `lib/dynamodb/schema.ts` - documentation of USER record fields |

## Implementation Details

### Public Profile Query (`getPublicProfile`)

```typescript
export const getPublicProfile = cache(
  async (handle: string): Promise<PublicProfile | null> => {
    // 1. Query HANDLE#{handle} to get userId
    // 2. Query USER#{userId} to check isPublic flag
    // 3. Return null if !isPublic
    // 4. Fetch music + content in parallel
    // 5. Return combined PublicProfile
  }
);
```

Key behaviors:
- Returns `null` for non-existent handles
- Returns `null` for unpublished users (isPublic !== true)
- Returns complete profile data for published users
- Wrapped in React `cache()` for request-level deduplication

### Publish/Unpublish Actions

Both actions follow the same pattern:
1. Check `auth()` session - return error if not authenticated
2. `UpdateCommand` to set `isPublic` = true/false
3. Also set `updatedAt` timestamp
4. Get user's handle and call `revalidatePath(\`/${handle}\`)`
5. Return `{ success: true }` or `{ success: false, error: string }`

### Schema Documentation

Updated `lib/dynamodb/schema.ts` with comment documenting USER record fields:
- `handle`: string
- `displayName`: string | null
- `isPublic`: boolean (default false)
- `updatedAt`: string (ISO timestamp)

## Deviations from Plan

None - plan executed exactly as written.

## Technical Notes

- **React cache()**: Imported from 'react' (not next/cache) - this is the React 19 cache() for request deduplication
- **Path revalidation**: After publish/unpublish, we revalidate the public page path to bust ISR cache
- **Parallel fetches**: getPublicProfile fetches music data and content in parallel after confirming user is published

## Artifacts Delivered

| Artifact | Purpose | Exports |
|----------|---------|---------|
| `lib/dynamodb/public-profile.ts` | Public profile query with React cache() | `getPublicProfile`, `PublicProfile` (type) |
| `app/actions/publish.ts` | Publish/unpublish server actions | `publishPage`, `unpublishPage`, `PublishResult` (type) |

## Next Phase Readiness

Ready for Plan 03-02 (Public Page Route):
- `getPublicProfile(handle)` is available for the dynamic route page
- Returns null for unpublished users (route can show 404)
- Returns complete profile data for rendering

No blockers for next plan.
