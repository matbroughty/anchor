# Phase 1: Foundation - Research

**Researched:** 2026-02-04
**Domain:** Authentication and user profile management with Next.js 15, NextAuth v5, DynamoDB, and AWS
**Confidence:** HIGH

## Summary

Phase 1 implements a comprehensive authentication system using NextAuth v5 (Auth.js) with multiple providers (Google OAuth, magic link email, and Spotify OAuth) on Next.js 15 with AWS Amplify Hosting. The foundation includes secure token management with AWS KMS encryption and unique handle validation with DynamoDB.

**Key Technical Stack:** NextAuth v5 is a major rewrite prioritizing App Router compatibility with a unified `auth()` function. It requires Next.js 14+ and uses strict OAuth/OIDC compliance. DynamoDB adapter uses single-table design with specific schema requirements (pk/sk keys + GSI1 index). AWS KMS provides encryption for sensitive tokens with sub-4KB data suitable for direct encryption.

**Critical Considerations:** Database session strategy is required for magic link authentication and enables "sign out everywhere" functionality. Spotify token refresh requires careful callback implementation to avoid race conditions from multiple callback invocations. Unique handle validation in DynamoDB requires transaction-based approach to prevent race conditions.

**Primary recommendation:** Use database session strategy with DynamoDB adapter, implement Spotify token refresh in JWT callback with proper expiration checking, encrypt Spotify tokens with AWS KMS using direct encryption (tokens < 4KB), and enforce unique handles using DynamoDB transactions with conditional puts.

## Standard Stack

The established libraries/tools for this authentication domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-auth | 5.x (beta) | Authentication framework | Official Auth.js for Next.js, App Router-first, unified auth() function |
| @auth/dynamodb-adapter | latest | Database adapter for sessions | Official adapter, single-table design, built for Auth.js v5 |
| @aws-sdk/client-kms | 3.966+ | Token encryption | Official AWS SDK v3, modular, tree-shakeable |
| @aws-sdk/client-dynamodb | 3.966+ | Database client | Required by DynamoDB adapter, AWS SDK v3 |
| @aws-sdk/lib-dynamodb | 3.966+ | DynamoDB document client | High-level API for DynamoDB, required by adapter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next-auth/providers/google | 5.x | Google OAuth | Primary social login |
| next-auth/providers/resend | 5.x | Magic link email | Modern API-based email service |
| next-auth/providers/spotify | 5.x | Spotify OAuth | Third-party service integration |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | Nodemailer | Nodemailer requires SMTP config vs Resend's API-first approach; Resend simpler for Amplify |
| Database sessions | JWT sessions | JWT = no DB required but can't revoke sessions; Database = full control, needed for magic links |
| KMS encryption | Client-side only | KMS = server-side security, key rotation, audit trail; Client = simpler but less secure |

**Installation:**
```bash
npm install next-auth@beta @auth/dynamodb-adapter @aws-sdk/client-kms @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Architecture Patterns

### Recommended Project Structure
```
app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts         # Auth.js route handlers
├── (auth)/                       # Auth-related pages group
│   ├── signin/
│   └── verify-email/
├── (protected)/                  # Protected routes group
│   ├── layout.tsx               # Auth wrapper with middleware
│   ├── profile/
│   └── settings/
└── middleware.ts                # Global auth middleware

src/
├── auth.ts                      # NextAuth config (root level)
├── lib/
│   ├── dynamodb.ts             # DynamoDB client setup
│   ├── kms.ts                  # KMS encryption utilities
│   └── spotify.ts              # Spotify token refresh logic
└── types/
    └── next-auth.d.ts          # Type augmentation for custom fields
```

### Pattern 1: NextAuth v5 Configuration with Database Sessions
**What:** Root-level auth.ts configuration with DynamoDB adapter
**When to use:** All NextAuth v5 implementations; required for magic link auth
**Example:**
```typescript
// Source: https://authjs.dev/getting-started/adapters/dynamodb
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import Spotify from "next-auth/providers/spotify"
import { DynamoDB } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"

const config = {
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
  region: process.env.AUTH_DYNAMODB_REGION!,
}

const client = DynamoDBDocument.from(new DynamoDB(config), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DynamoDBAdapter(client),
  session: { strategy: "database" }, // Required for magic links
  providers: [
    Google,
    Resend({ from: "noreply@yourdomain.com" }),
    Spotify({
      authorization: {
        params: {
          scope: "user-read-email user-top-read user-read-recently-played",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Handle Spotify token refresh
      if (account?.provider === "spotify") {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at! * 1000,
        }
      }

      // Refresh Spotify token if expired
      if (token.accessTokenExpires && Date.now() > token.accessTokenExpires) {
        return await refreshSpotifyToken(token)
      }

      return token
    },
  },
})
```

### Pattern 2: Spotify Token Refresh Implementation
**What:** Token refresh logic with expiration checking to avoid race conditions
**When to use:** When integrating Spotify OAuth with token persistence
**Example:**
```typescript
// Source: https://github.com/nextauthjs/next-auth/discussions/1053
// lib/spotify.ts
async function refreshSpotifyToken(token: any) {
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
        refresh_token: token.refreshToken,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}
```

### Pattern 3: AWS KMS Token Encryption
**What:** Direct encryption for tokens under 4KB with proper key policies
**When to use:** Encrypting OAuth tokens at rest in DynamoDB
**Example:**
```typescript
// Source: https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
// lib/kms.ts
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms"

const client = new KMSClient({ region: process.env.AWS_REGION })

export async function encryptToken(plaintext: string, keyId: string) {
  const command = new EncryptCommand({
    KeyId: keyId,
    Plaintext: Buffer.from(plaintext),
    EncryptionContext: {
      purpose: "spotify-token",
      app: "anchor",
    },
  })

  const response = await client.send(command)
  return Buffer.from(response.CiphertextBlob!).toString("base64")
}

export async function decryptToken(ciphertext: string, keyId: string) {
  const command = new DecryptCommand({
    KeyId: keyId,
    CiphertextBlob: Buffer.from(ciphertext, "base64"),
    EncryptionContext: {
      purpose: "spotify-token",
      app: "anchor",
    },
  })

  const response = await client.send(command)
  return Buffer.from(response.Plaintext!).toString("utf-8")
}
```

### Pattern 4: DynamoDB Unique Handle Validation
**What:** Transaction-based unique constraint enforcement for usernames
**When to use:** Claiming unique handles without race conditions
**Example:**
```typescript
// Source: https://aws.amazon.com/blogs/database/simulating-amazon-dynamodb-unique-constraints-using-transactions/
// lib/dynamodb.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import {
  DynamoDBDocumentClient,
  TransactWriteCommand
} from "@aws-sdk/lib-dynamodb"

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}))

export async function claimHandle(userId: string, handle: string) {
  const handleKey = `HANDLE#${handle.toLowerCase()}`

  try {
    await client.send(new TransactWriteCommand({
      TransactItems: [
        {
          // Reserve the handle
          Put: {
            TableName: "next-auth",
            Item: {
              pk: handleKey,
              sk: handleKey,
              userId: userId,
              claimedAt: new Date().toISOString(),
            },
            ConditionExpression: "attribute_not_exists(pk)",
          },
        },
        {
          // Update user with handle
          Update: {
            TableName: "next-auth",
            Key: { pk: `USER#${userId}`, sk: `USER#${userId}` },
            UpdateExpression: "SET handle = :handle",
            ExpressionAttributeValues: {
              ":handle": handle,
            },
          },
        },
      ],
    }))

    return { success: true }
  } catch (error: any) {
    if (error.name === "TransactionCanceledException") {
      return { success: false, error: "Handle already taken" }
    }
    throw error
  }
}
```

### Pattern 5: Middleware-Based Route Protection
**What:** Multi-layer authentication with middleware and data access layer
**When to use:** Protecting routes and verifying sessions at multiple layers
**Example:**
```typescript
// Source: https://authjs.dev/getting-started/session-management/protecting
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isProtected = req.nextUrl.pathname.startsWith("/profile")

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/signin", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Anti-Patterns to Avoid
- **Callback Race Conditions:** Don't call Spotify refresh on every callback invocation; check expiration first (callbacks fire 6+ times per render)
- **JWT for Magic Links:** Don't use JWT session strategy with email provider; database sessions required for magic link verification
- **Layout Authentication Checks:** Don't implement auth checks in layout components; they don't re-render on navigation, leaving routes unprotected
- **Direct Token Storage:** Don't store OAuth tokens in plain text; always encrypt with KMS before persisting
- **Environment Variable Misuse:** Don't use `NEXTAUTH_` prefix in v5; use `AUTH_` prefix (except AUTH_SECRET which is auto-detected)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email magic links | Custom token generation + email sending | NextAuth Resend/Nodemailer provider | Handles token generation, expiry, rate limiting, email templates, verification flow |
| OAuth token refresh | Manual refresh logic | NextAuth JWT callback pattern | Handles expiration checking, refresh token rotation, error handling, concurrent request deduplication |
| Session management | Custom JWT/cookie handling | NextAuth session strategies | Handles encryption, HttpOnly cookies, CSRF protection, session rotation, database sync |
| Unique constraint validation | Application-level checking | DynamoDB transactions with conditional puts | Prevents race conditions at database level; atomic operation guaranteed |
| Password reset flow | Custom token + email | NextAuth password reset provider | Built-in security, expiry, one-time use tokens |
| KMS key rotation | Manual re-encryption | AWS KMS automatic rotation | Transparent re-encryption, maintains old keys for decryption |

**Key insight:** Authentication is deceptively complex. NextAuth abstracts OAuth flows, CSRF protection, token rotation, session management, and adapter patterns that took years to mature. Custom implementations miss edge cases around race conditions, token expiry, concurrent requests, and security vulnerabilities. DynamoDB transactions are the only way to guarantee uniqueness at scale without application-level locks.

## Common Pitfalls

### Pitfall 1: Environment Variable Configuration Errors
**What goes wrong:** Authentication fails with cryptic errors about missing secrets or wrong URLs
**Why it happens:** NextAuth v5 changed from `NEXTAUTH_*` to `AUTH_*` prefix; AWS Amplify requires special handling for runtime env vars
**How to avoid:**
- Use `AUTH_SECRET` (auto-detected), not `NEXTAUTH_SECRET`
- Use `AUTH_DYNAMODB_ID`, `AUTH_DYNAMODB_SECRET`, `AUTH_DYNAMODB_REGION`
- In Amplify's amplify.yml, add: `env | grep -e AUTH_ >> .env.production` to make vars available at runtime
- Never use `AWS_` prefix for custom environment variables (reserved by AWS)
**Warning signs:** "JWT encryption failed", "Missing AUTH_SECRET", "Cannot connect to database"

### Pitfall 2: Spotify Token Refresh Race Conditions
**What goes wrong:** Spotify returns expired tokens or "invalid refresh token" errors after a few refreshes
**Why it happens:** NextAuth callbacks fire 6+ times per render; Spotify invalidates refresh token after each use; parallel refresh attempts fail
**How to avoid:**
- Check `token.accessTokenExpires` before attempting refresh
- Only refresh if `Date.now() > token.accessTokenExpires`
- Use 50-minute threshold (Spotify tokens valid 60 minutes) to account for clock drift
- Return existing token if not expired
**Warning signs:** "Invalid refresh token", tokens expire immediately, users logged out after brief usage
**Code example:**
```typescript
// WRONG - refreshes on every callback
async jwt({ token, account }) {
  if (account?.provider === "spotify") {
    return await refreshSpotifyToken(token) // Called 6x per render!
  }
}

// CORRECT - checks expiration first
async jwt({ token, account }) {
  if (token.accessTokenExpires && Date.now() > token.accessTokenExpires) {
    return await refreshSpotifyToken(token) // Only when needed
  }
  return token
}
```

### Pitfall 3: DynamoDB Table Schema Mismatch
**What goes wrong:** Adapter fails with "GSI1 not found" or "Cannot query by user" errors
**Why it happens:** DynamoDB adapter requires specific schema: partition key `pk`, sort key `sk`, GSI named `GSI1` with `GSI1PK` and `GSI1SK`
**How to avoid:**
- Create table with exact key names: `pk` (partition) and `sk` (sort)
- Create GSI named exactly `GSI1` with partition key `GSI1PK` and sort key `GSI1SK`
- Enable TTL on `expires` attribute for automatic session cleanup
- Use single-table design; don't create separate tables for users/sessions/accounts
**Warning signs:** "ValidationException", "Cannot query", "Index not found", sessions don't persist

### Pitfall 4: Magic Link Database Requirement Confusion
**What goes wrong:** Magic link emails sent but clicking link shows "Invalid token" or doesn't authenticate
**Why it happens:** Developers use JWT session strategy (default if no adapter) but email provider requires database to store verification tokens
**How to avoid:**
- Always use `adapter: DynamoDBAdapter(client)` when using email provider
- Set `session: { strategy: "database" }` explicitly
- Verify DynamoDB table has verification token entries after email sent
**Warning signs:** Email arrives but clicking link fails, no verification tokens in database, "Token not found" errors

### Pitfall 5: KMS Encryption Context Misuse
**What goes wrong:** Decryption fails with "InvalidCiphertextException" even with correct key
**Why it happens:** Encryption context (optional metadata) must match exactly between encrypt and decrypt operations
**How to avoid:**
- Always use encryption context for additional security (strongly recommended)
- Use consistent key-value pairs: `{ purpose: "spotify-token", app: "anchor" }`
- Store encryption context values or use deterministic values (don't use timestamps)
- Pass same context to both `EncryptCommand` and `DecryptCommand`
**Warning signs:** "InvalidCiphertextException", decryption fails intermittently, works in dev but fails in prod
**Code example:**
```typescript
// WRONG - different contexts
await encrypt(token, keyId, { purpose: "token" })
await decrypt(token, keyId, { purpose: "spotify" }) // FAILS

// CORRECT - matching contexts
const context = { purpose: "spotify-token", app: "anchor" }
await encrypt(token, keyId, context)
await decrypt(token, keyId, context) // Works
```

### Pitfall 6: AWS Amplify Next.js 15 Build Configuration
**What goes wrong:** Local dev works but Amplify deployment fails or uses wrong output directory
**Why it happens:** Next.js 14+ requires `.next` directory for both SSG and SSR; Amplify auto-detection may misconfigure
**How to avoid:**
- Set `baseDirectory: .next` in amplify.yml (not "out")
- Set platform to `WEB_COMPUTE` even for static sites
- Verify `next build` script in package.json
- Don't manually specify output: "standalone" in next.config.js for Amplify
**Warning signs:** Build succeeds but 404 on all routes, "No server handler found", static files missing
**Correct amplify.yml:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
        - env | grep -e AUTH_ >> .env.production
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Pitfall 7: Custom User Fields Without Type Augmentation
**What goes wrong:** TypeScript errors when accessing custom fields like `user.handle` or `session.user.spotifyId`
**Why it happens:** NextAuth provides base types; custom fields must be declared via module augmentation
**How to avoid:**
- Create `types/next-auth.d.ts` with module augmentation
- Extend `User`, `Session`, and `JWT` interfaces
- Add custom fields to profile callback return value
- Pass custom fields through JWT and session callbacks
**Warning signs:** "Property 'handle' does not exist on type 'User'", TypeScript errors in callbacks
**Code example:**
```typescript
// types/next-auth.d.ts
declare module "next-auth" {
  interface User {
    handle?: string
    spotifyId?: string
  }

  interface Session {
    user: User
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    handle?: string
    spotifyId?: string
  }
}
```

## Code Examples

Verified patterns from official sources:

### Complete Auth Configuration with All Providers
```typescript
// Source: https://authjs.dev/getting-started/migrating-to-v5
// auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import Spotify from "next-auth/providers/spotify"
import { DynamoDB } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"

const dynamoConfig = {
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
  region: process.env.AUTH_DYNAMODB_REGION!,
}

const client = DynamoDBDocument.from(new DynamoDB(dynamoConfig), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DynamoDBAdapter(client),
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Resend({
      from: "noreply@anchor.band",
    }),
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user-read-email user-top-read user-read-recently-played",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add custom fields to session
      if (user) {
        session.user.id = user.id
        session.user.handle = user.handle
      }
      return session
    },
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-email",
  },
})
```

### API Route Handler
```typescript
// Source: https://authjs.dev/getting-started/migrating-to-v5
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"

export const { GET, POST } = handlers
```

### Protected Server Component
```typescript
// Source: https://authjs.dev/getting-started/session-management/protecting
// app/(protected)/profile/page.tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const session = await auth()

  if (!session) {
    redirect("/signin")
  }

  return (
    <div>
      <h1>Profile: {session.user.name}</h1>
      <p>Handle: @{session.user.handle}</p>
    </div>
  )
}
```

### Client Component with Session
```typescript
// Source: https://authjs.dev/getting-started/session-management/protecting
// app/components/UserMenu.tsx
"use client"

import { useSession } from "next-auth/react"

export function UserMenu() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return <div>Loading...</div>
  }

  if (!session) {
    return <a href="/signin">Sign In</a>
  }

  return (
    <div>
      <p>Welcome, {session.user.name}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}
```

### Encrypting Spotify Tokens Before Storage
```typescript
// Source: https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
// lib/spotify-storage.ts
import { encryptToken, decryptToken } from "@/lib/kms"
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb"

const KMS_KEY_ID = process.env.KMS_KEY_ID!

export async function storeSpotifyTokens(
  client: DynamoDBDocumentClient,
  userId: string,
  accessToken: string,
  refreshToken: string
) {
  const encryptedAccess = await encryptToken(accessToken, KMS_KEY_ID)
  const encryptedRefresh = await encryptToken(refreshToken, KMS_KEY_ID)

  await client.send(new UpdateCommand({
    TableName: "next-auth",
    Key: {
      pk: `USER#${userId}`,
      sk: `SPOTIFY`,
    },
    UpdateExpression: "SET accessToken = :access, refreshToken = :refresh, updatedAt = :time",
    ExpressionAttributeValues: {
      ":access": encryptedAccess,
      ":refresh": encryptedRefresh,
      ":time": new Date().toISOString(),
    },
  }))
}

export async function getSpotifyTokens(
  client: DynamoDBDocumentClient,
  userId: string
) {
  const response = await client.send(new GetCommand({
    TableName: "next-auth",
    Key: {
      pk: `USER#${userId}`,
      sk: `SPOTIFY`,
    },
  }))

  if (!response.Item) {
    return null
  }

  return {
    accessToken: await decryptToken(response.Item.accessToken, KMS_KEY_ID),
    refreshToken: await decryptToken(response.Item.refreshToken, KMS_KEY_ID),
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 `getServerSession()` | NextAuth v5 unified `auth()` | v5.0 (2024) | Single function for all contexts; simpler API, less imports |
| `NEXTAUTH_*` env vars | `AUTH_*` prefix | v5.0 (2024) | Breaking change; must update all env vars |
| `@next-auth/*-adapter` packages | `@auth/*-adapter` scope | v5.0 (2024) | New package scope; update imports |
| OAuth 1.0 support | OAuth 2.0 / OIDC only | v5.0 (2024) | Stricter compliance; OAuth 1.0 providers unsupported |
| Nodemailer as default email | Resend as recommended | 2025 | API-first vs SMTP; Resend simpler for serverless |
| JWT session default | Database session for email provider | v5.0 (2024) | Magic links require database; explicitly set strategy |
| Multi-table DynamoDB design | Single-table design | 2023+ | Better performance, fewer requests, standard for NoSQL |
| AWS SDK v2 | AWS SDK v3 | 2023+ | Modular, tree-shakeable, smaller bundles |
| Envelope encryption for all data | Direct KMS encrypt for <4KB | Always | Tokens are small; direct encryption simpler, fewer API calls |

**Deprecated/outdated:**
- **OAuth 1.0 Providers**: Removed in NextAuth v5; use OAuth 2.0 only
- **`pages/` directory priority**: App Router is now primary; `pages/` still supported but secondary
- **`getServerSession()` function**: Replaced by unified `auth()` in all contexts
- **Manual environment variable setup in config**: v5 auto-infers `AUTH_*` env vars
- **AWS SDK v2**: Use v3 with modular imports (`@aws-sdk/client-*`)

## Open Questions

Things that couldn't be fully resolved:

1. **Spotify Token Refresh Timing**
   - What we know: Tokens expire in 60 minutes; Spotify invalidates refresh tokens after use; callbacks fire multiple times
   - What's unclear: Optimal refresh timing (50 minutes? 55 minutes?); whether to pre-emptively refresh before API calls
   - Recommendation: Use 50-minute threshold (3000000ms) for safety margin; implement retry logic in API calls for expired token errors

2. **KMS Key Rotation Strategy**
   - What we know: AWS KMS supports automatic key rotation; old keys remain for decryption
   - What's unclear: Whether to enable automatic rotation immediately or wait until MVP; impact on performance with many key versions
   - Recommendation: Enable automatic rotation from day 1 for security; monitor CloudWatch metrics for performance impact; KMS handles old key versions transparently

3. **Handle Validation Rules**
   - What we know: Handles must be unique; displayed as anchor.band/handle
   - What's unclear: Character restrictions (alphanumeric only? hyphens? underscores?); length limits; reserved handles (admin, api, etc.); case sensitivity
   - Recommendation: Define validation rules: 3-30 characters, lowercase alphanumeric + hyphens, no leading/trailing hyphens, reserved list for system routes; validate on client and server

4. **Profile Edit Permissions**
   - What we know: Users can set display name and edit profile information
   - What's unclear: Whether handle can be changed after initial claim; frequency limits on changes; verification requirements for sensitive changes
   - Recommendation: Allow handle changes but implement rate limiting (e.g., once per 30 days); require re-authentication for email changes; log all changes for audit

5. **Session Duration and Renewal**
   - What we know: Database sessions enable server-side control; JWT sessions have fixed expiry
   - What's unclear: Optimal session duration (7 days? 30 days? 90 days?); idle timeout vs absolute timeout; whether to implement "remember me" option
   - Recommendation: Start with 30-day absolute expiry + 7-day idle timeout; implement session extension on activity; add "remember me" for 90-day sessions

## Sources

### Primary (HIGH confidence)
- [Auth.js Migration to v5](https://authjs.dev/getting-started/migrating-to-v5) - Core breaking changes and new features
- [Auth.js DynamoDB Adapter](https://authjs.dev/getting-started/adapters/dynamodb) - Schema requirements and setup
- [Auth.js Configuring Resend](https://authjs.dev/guides/configuring-resend) - Magic link setup
- [Auth.js Session Strategies](https://authjs.dev/concepts/session-strategies) - JWT vs database comparison
- [AWS KMS Cryptography Essentials](https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html) - Encryption best practices
- [AWS Amplify Next.js Deployment](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html) - Official deployment guide
- [AWS DynamoDB Unique Constraints](https://aws.amazon.com/blogs/database/simulating-amazon-dynamodb-unique-constraints-using-transactions/) - Transaction-based uniqueness

### Secondary (MEDIUM confidence)
- [NextAuth Spotify Provider](https://next-auth.js.org/providers/spotify) - Basic configuration (v4 docs but patterns apply)
- [Spotify Authorization Scopes](https://developer.spotify.com/documentation/web-api/concepts/scopes) - OAuth scope definitions
- [AWS SDK v3 KMS Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kms/) - Official API reference
- [Next.js 15 Middleware Authentication](https://nextjs.org/docs/app/guides/authentication) - Official Next.js patterns
- [AWS Amplify Environment Variables](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html) - Runtime variable access

### Tertiary (LOW confidence - marked for validation)
- [NextAuth and Spotify API 2025 Guide](https://dev.to/ctrossat/nextauth-and-spotify-api-a-2025-devs-guide-4p95) - Community implementation
- [Goodbye Nodemailer - Switching to Resend](https://devdiwan.medium.com/goodbye-nodemailer-why-i-switched-to-resend-for-sending-emails-in-node-js-55e5a0dba899) - Developer experience comparison
- [Stop Crying Over Auth: Next.js 15 & Auth.js v5](https://javascript.plainenglish.io/stop-crying-over-auth-a-senior-devs-guide-to-next-js-15-auth-js-v5-42a57bc5b4ce) - Implementation guide
- GitHub Discussions: [Token Refresh #1053](https://github.com/nextauthjs/next-auth/discussions/1053), [Spotify Refresh #6925](https://github.com/nextauthjs/next-auth/discussions/6925), [v5 Discussion #8487](https://github.com/nextauthjs/next-auth/discussions/8487)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages from Auth.js and AWS with clear version requirements
- Architecture: HIGH - Official documentation and established patterns for NextAuth v5, DynamoDB adapter, KMS integration
- Pitfalls: HIGH - Documented in official sources, GitHub issues, and AWS best practices; cross-verified with multiple sources
- Token refresh: MEDIUM - Community-documented patterns with known issues; requires careful implementation and testing
- Unique handle validation: HIGH - Official AWS blog post with transaction-based approach

**Research date:** 2026-02-04
**Valid until:** ~2026-03-04 (30 days) - NextAuth v5 is in beta; expect stable release soon but core patterns established
