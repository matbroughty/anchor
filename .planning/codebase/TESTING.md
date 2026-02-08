# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Status:** Not configured

**Runner:**
- No test runner installed (neither Jest, Vitest, Mocha, nor Playwright)
- No test configuration files present
- `package.json` contains no testing dependencies

**Assertion Library:**
- Not applicable - no testing infrastructure

**Run Commands:**
- No test commands defined in `package.json`
- Project currently has no automated testing setup

```bash
npm run dev              # Development server (no tests)
npm run build            # Build (no tests)
npm run start            # Production server
npm run lint             # ESLint via Next.js (code quality only)
```

## Test File Organization

**Status:** No test files in codebase

**Observations:**
- No `*.test.ts`, `*.test.tsx`, `*.spec.ts`, or `*.spec.tsx` files in `app/` or `lib/` directories
- Testing infrastructure is completely absent
- Only test files present are in `node_modules/` (from dependencies)

**Where tests would belong (if added):**
- Co-located pattern recommended: `lib/spotify.test.ts` alongside `lib/spotify.ts`
- Component tests: `app/components/ProfileForm.test.tsx` alongside `app/components/ProfileForm.tsx`
- Action tests: `app/actions/spotify.test.ts` alongside `app/actions/spotify.ts`

## Test Structure

**Not applicable** - no testing framework configured

**Potential structure (recommended for future implementation):**
```typescript
// Example pattern for unit tests of pure functions
describe('validateHandle', () => {
  it('validates correct handles', () => {
    expect(validateHandle('valid-handle')).toEqual({ valid: true })
  })

  it('rejects short handles', () => {
    const result = validateHandle('ab')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least 3 characters')
  })
})
```

## Mocking

**Not applicable** - no testing framework

**What would need mocking (if tests were added):**
- AWS SDK clients (`DynamoDBDocument`, `BedrockRuntimeClient`)
- Spotify API calls (already isolated in `lib/spotify-data.ts` via `spotifyGet` helper)
- NextAuth session data
- Environment variables

**Current testing gaps:**
- No way to test KMS encryption/decryption (`lib/kms.ts`)
- No way to test database operations without live DynamoDB connection
- No way to test API integrations (Spotify, Bedrock)

## Fixtures and Factories

**Status:** No test fixtures

**Observations:**
- Type definitions exist (`types/music.ts`, `types/content.ts`) but no corresponding test fixtures
- No factory functions for generating mock data
- No test utilities or test helpers directory

**What would be useful (if tests were added):**
```typescript
// lib/test-fixtures.ts
export const mockArtist = (): Artist => ({
  id: 'artist-123',
  name: 'Test Artist',
  images: [{ url: 'https://example.com/image.jpg', width: 300, height: 300 }],
  genres: ['rock', 'indie'],
})

export const mockTrack = (): Track => ({
  id: 'track-123',
  name: 'Test Track',
  artists: [{ id: 'artist-123', name: 'Test Artist' }],
  album: { /* ... */ },
  popularity: 75,
})
```

## Coverage

**Requirements:** None enforced

**Status:** No coverage measurement tooling installed

**Files without tests (everything):**
- `lib/spotify.ts` - Token management, critical for authentication
- `lib/spotify-data.ts` - Spotify API integration, rate-limit handling
- `lib/handle.ts` - Handle validation and claiming, uses transactions
- `lib/kms.ts` - Token encryption, security-critical
- `lib/bedrock/client.ts` - LLM client configuration
- `app/actions/spotify.ts` - Main data refresh logic, server action
- `app/components/*.tsx` - All UI components
- `lib/dynamodb/*.ts` - All database operations

## Test Types

**Not implemented**

**Unit Tests (would cover):**
- Pure functions: `validateHandle`, `deriveTopAlbums`, `isHandleAvailable`
- Request parsing: Spotify API response normalization in `spotifyGet<T>`
- Error handling: Token refresh fallback paths, rate limit responses

**Integration Tests (would cover):**
- DynamoDB transactions: `claimHandle` (transactional writes)
- Music data flow: `fetchSpotifyData` → Spotify API → cache → database
- Auth flow: Token storage, retrieval, encryption/decryption
- Featured artists: Search, update, persist

**E2E Tests:**
- Not configured
- Would require: Playwright or Cypress
- Could test: Full user flows (sign in, set profile, publish)

## Common Patterns

**Not applicable** - no tests exist

**Async Testing (pattern for future):**
```typescript
// If using Vitest or Jest
it('should refresh Spotify data with cooldown', async () => {
  const result = await refreshSpotifyData()
  expect(result.data).toEqual({ artists: [...], albums: [...], tracks: [...] })
})

it('should return cooldown remaining when rate limited', async () => {
  // First refresh
  await refreshSpotifyData()

  // Second refresh immediately should fail
  const result = await refreshSpotifyData()
  expect(result.error).toBe('Cooldown active')
  expect(result.cooldownRemaining).toBeGreaterThan(0)
})
```

**Error Testing (pattern for future):**
```typescript
it('handles Spotify token expiry', async () => {
  const expiredToken = {
    spotifyAccessToken: 'old',
    spotifyTokenExpires: Date.now() - 1000 // Expired
  }

  const result = await refreshSpotifyToken(expiredToken)
  expect(result.spotifyAccessToken).not.toBe('old')
  expect(result.spotifyTokenExpires).toBeGreaterThan(Date.now())
})

it('returns error token on refresh failure', async () => {
  // Mock Spotify returning 401
  const result = await refreshSpotifyToken(invalidToken)
  expect(result.error).toBe('RefreshAccessTokenError')
})
```

## Critical Untested Areas

**High Priority:**
1. `lib/handle.ts` - Handle validation and claiming with race condition protection
   - Complex transaction logic at lines 106-167
   - Multiple validation rules that could fail

2. `lib/spotify-data.ts` - Spotify API integration
   - Rate limiting logic (line 26-28)
   - Error handling for 429 responses
   - Album derivation algorithm (lines 131-173)

3. `app/actions/spotify.ts` - Main server action logic
   - Cooldown enforcement (lines 68-100)
   - Cache miss behavior (implicit first refresh)
   - Parallel Spotify API calls (Promise.all, lines 119-122)

**Medium Priority:**
1. `lib/dynamodb/music-data.ts` - Database operations
   - Atomic transaction writes (lines 74-130)
   - Partial data detection (lines 49-52)

2. `auth.ts` - Authentication configuration
   - Token storage on sign-in (lines 54-70)
   - Session enrichment (lines 71-80)

**Lower Priority:**
1. React components - integration tested via E2E
2. UI validation and error messages
3. Middleware routing logic

## Recommendations for Future Testing Implementation

**Phase 1: Setup**
- Add Vitest for unit testing (lighter than Jest)
- Configure test files co-located with source
- Add `npm run test` and `npm run test:watch` scripts

**Phase 2: Core Coverage**
- Test pure utilities: `validateHandle`, `deriveTopAlbums`
- Test error paths in API interactions
- Test DynamoDB transaction logic with mocked client

**Phase 3: Integration**
- Add database integration tests with test DynamoDB container
- Test server action result objects and error handling
- Test authentication flows

**Phase 4: E2E**
- Add Playwright for user flows
- Test profile creation, data refresh, publishing

---

*Testing analysis: 2026-02-08*
