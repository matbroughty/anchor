# Coding Conventions

**Analysis Date:** 2026-02-08

## Naming Patterns

**Files:**
- **Server actions:** `src/app/actions/*.ts` - PascalCase example: `publish.ts`, `spotify.ts`
- **Components:** `src/app/components/*.tsx` - PascalCase: `ProfileForm.tsx`, `BioEditor.tsx`, `ArtistSearchInput.tsx`
- **Library functions:** `src/lib/*.ts` - lowercase with hyphens: `spotify.ts`, `spotify-data.ts`, `lastfm.ts`, `handle.ts`
- **Database modules:** `src/lib/dynamodb/*.ts` - specific to entity: `music-data.ts`, `public-profile.ts`, `featured-artists.ts`
- **Type files:** `src/types/*.ts` - domain-based: `music.ts`, `content.ts`, `env.d.ts`

**Functions:**
- **Async functions:** camelCase, prefixed with verb: `refreshSpotifyToken`, `getSpotifyTokens`, `getMusicData`, `putMusicData`, `validateHandle`, `isHandleAvailable`, `claimHandle`, `fetchSpotifyData`, `searchArtists`
- **Component functions:** camelCase, non-exported helpers prefixed with underscore: `_doRefresh` in `spotify.ts` (line 111), internal handlers in components like `handleSubmit`, `handleSelect`, `handleSave`
- **Utility functions:** pure functions describe data transformation: `deriveTopAlbums`, `validateHandle`

**Variables:**
- **State:** camelCase: `displayName`, `isLoading`, `message`, `featured`, `isEditing`, `results`
- **Constants (module-level):** SCREAMING_SNAKE_CASE for environment vars, camelCase for other constants: `TABLE_NAME`, `MUSIC_SK`, `METADATA_SK`, `RESERVED_HANDLES`
- **Boolean flags:** `is*` or `has*` prefix: `isLoading`, `isEditing`, `isPublic`, `hasChanges`, `isSearching`
- **Collection variables:** plural: `results`, `artists`, `albums`, `tracks`, `responses`

**Types:**
- **Interfaces:** PascalCase, suffixed with `Props` for component props: `ProfileFormProps`, `ArtistSearchInputProps`, `FeaturedArtistsEditorProps`, `BioEditorProps`
- **Type aliases:** PascalCase: `MusicData`, `Artist`, `Album`, `Track`, `SpotifyImage`, `ArtistRef`, `Bio`
- **Response types:** suffixed with `Result`: `FetchSpotifyDataResult`, `RefreshSpotifyDataResult`

## Code Style

**Formatting:**
- **Tool:** ESLint with Next.js config (`eslint-config-next`)
- **No explicit prettier config** - relies on Next.js ESLint defaults
- **Line length:** Appears to wrap around 100 characters
- **Indentation:** 2 spaces (Next.js standard)
- **Semicolons:** Always included
- **Trailing commas:** Used in multiline structures

**Linting:**
- **Tool:** ESLint ^8 with `eslint-config-next` 15.1.6
- **Run command:** `npm run lint` (maps to `next lint`)
- **No custom ESLint rules found** - uses Next.js recommended config

**Example (from `spotify.ts`, lines 15-55):**
```typescript
export async function refreshSpotifyToken(token: JWT): Promise<JWT> {
  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64")

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.spotifyRefreshToken!,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error("Spotify token refresh failed:", refreshedTokens)
      throw refreshedTokens
    }

    return {
      ...token,
      spotifyAccessToken: refreshedTokens.access_token,
      spotifyTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      spotifyRefreshToken: refreshedTokens.refresh_token ?? token.spotifyRefreshToken,
    }
  } catch (error) {
    console.error("Error refreshing Spotify token:", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}
```

## Import Organization

**Order:**
1. External libraries and framework imports (React, Next.js, AWS SDK)
2. Type imports (`import type { ... }`)
3. Relative imports from `@/` path alias
4. Component/module imports

**Path Aliases:**
- `@/*` maps to repository root (configured in `tsconfig.json` line 22)
- Used consistently across all files: `@/lib/*`, `@/app/*`, `@/types/*`, `@/auth`

**Example (from `spotify.ts`, lines 1-4):**
```typescript
import { JWT } from "next-auth/jwt"
import { encryptToken, decryptToken } from "./kms"
import { dynamoDocumentClient, TABLE_NAME } from "./dynamodb"
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
```

**Example (from `ProfileForm.tsx`, lines 1-8):**
```typescript
"use client";

import { useState } from "react";

interface ProfileFormProps {
  initialDisplayName: string;
  onSave: (displayName: string) => Promise<void>;
}
```

## Error Handling

**Patterns:**
- **Try-catch blocks:** Consistently wrap async operations, convert errors to readable messages
- **Error messages:** Descriptive and user-facing: `"Not authenticated"`, `"Failed to save profile"`, `"Rate limited. Retry after X seconds"`
- **Error discrimination:** Check `error instanceof Error` before accessing `.message`
- **Fallback messages:** Provide generic fallback for unknown error types

**Return-based error handling (Server Actions):**
- Server actions don't throw; instead return `{ data: T | null, error?: string }` objects
- Used in `spotify.ts` with `FetchSpotifyDataResult` and `RefreshSpotifyDataResult` interfaces (lines 14-24)
- Component handlers catch errors and set UI state: `setMessage({ type: "error", text: ... })`

**Example (from `spotify.ts`, lines 47-54):**
```typescript
try {
  await onSave(displayName);
  setMessage({ type: "success", text: "Profile updated successfully" });
} catch (error) {
  setMessage({
    type: "error",
    text: error instanceof Error ? error.message : "Failed to save profile",
  });
}
```

**Example (from `handle.ts`, lines 159-166):**
```typescript
} catch (error: any) {
  // Transaction cancelled means the handle already exists
  if (error.name === "TransactionCanceledException") {
    return { success: false, error: "Handle already taken" };
  }
  console.error("Error claiming handle:", error);
  throw error;
}
```

## Logging

**Framework:** Native `console` methods

**Patterns:**
- **console.error():** For exceptions and failures: `console.error("Spotify token refresh failed:", refreshedTokens)`
- **console.log():** For startup/debug info: `console.log("[Auth Config] AUTH_URL:", process.env.AUTH_URL || "NOT SET")`
- **Prefix convention:** Debug logs prefixed with context in brackets: `[Auth Config]`
- **No structured logging library** - plain console calls only

**Example (from `auth.ts`, lines 19-21):**
```typescript
// Debug: Log AUTH_URL to verify it's set correctly
console.log("[Auth Config] AUTH_URL:", process.env.AUTH_URL || "NOT SET")
console.log("[Auth Config] NODE_ENV:", process.env.NODE_ENV)
```

**Example (from `spotify.ts`, line 36):**
```typescript
console.error("Spotify token refresh failed:", refreshedTokens)
```

## Comments

**When to Comment:**
- **JSDoc blocks:** Used for exported functions and their parameters/return values
- **Section comments:** Horizontal rule dividers (`// -----------...`) separate logical sections within files
- **Inline clarifications:** Rare; only when logic is non-obvious or has important side effects

**JSDoc/TSDoc Format:**
- Used consistently for public functions
- Documents parameters with `@param`, return with `@returns`
- Includes important behavioral notes (e.g., critical timing constraints)

**Example (from `spotify.ts`, lines 6-14):**
```typescript
/**
 * Refreshes an expired Spotify access token using the refresh token
 *
 * CRITICAL: Only call when token is actually expired (Date.now() > token.spotifyTokenExpires)
 * to avoid race conditions from multiple callback invocations
 *
 * @param token - JWT token containing Spotify refresh token
 * @returns Updated token with new access token and expiry, or error token on failure
 */
```

**Example (from `spotify-data.ts`, lines 14-20):**
```typescript
/**
 * Performs a GET against the Spotify Web API.
 * If the server returns 429 (rate limit), throws a descriptive error that
 * includes the Retry-After value so callers can surface it to the UI.
 */
async function spotifyGet<T>(url: string, accessToken: string): Promise<T> {
```

**Section dividers (from `ArtistSearchInput.tsx`, lines 7, 102, 112):**
```typescript
// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ArtistSearchInputProps {
  // ...
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------
```

## Function Design

**Size:** Functions typically 10-60 lines; longer functions broken into helper functions or extracted

**Parameters:**
- **Positional:** Limited to 2-3 parameters for public functions
- **Objects for multiple params:** Not used; functions prefer single parameters with clear types
- **Type annotations:** Always explicit, no `any` except in error handling (`error: any` for exceptions)

**Return Values:**
- **Async functions:** Return typed Promises: `Promise<JWT>`, `Promise<void>`, `Promise<MusicData | null>`
- **Server actions:** Return result objects with nullable data and optional error string
- **Pure functions:** Return the transformed/derived value directly: `Album[]` from `deriveTopAlbums`
- **Null returns:** Used to signal "not found" or "no data": `return null` for missing profiles or music data

**Example (from `handle.ts`, lines 31-74):**
```typescript
export function validateHandle(handle: string): {
  valid: boolean;
  error?: string;
} {
  // ... validations ...
  return { valid: true };
}
```

## Module Design

**Exports:**
- **Named exports:** Standard for functions and types: `export async function getMusicData(...)`
- **Default exports:** Used only for React components: `export default async function HandlePage(...)`
- **Type exports:** Marked with `export type` or `import type` for clarity

**Barrel Files:**
- **Not used** - modules export their own functionality directly
- Components import specific files: `import { ProfileForm } from "@/app/components/ProfileForm"`

**Module organization (example from `dynamodb/music-data.ts`):**
- Grouped by operation type (Read, Write, Cooldown)
- Sections marked with dividers
- Related functions grouped together

**Example (from `dynamodb/music-data.ts`, lines 10-62):**
```typescript
// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetches all three music-data items for a user in a single BatchGet call.
 * ...
 */
export async function getMusicData(userId: string): Promise<MusicData | null> {
  // ...
}
```

---

*Convention analysis: 2026-02-08*
