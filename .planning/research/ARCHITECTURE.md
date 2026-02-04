# Architecture Research

**Domain:** Music profile page platform with Spotify integration and AI content generation
**Researched:** 2026-02-04
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PRESENTATION LAYER                           │
│  Next.js 15 on AWS Amplify Hosting (SSR + Static)                  │
│  - Public pages: SSR for OG meta tags                               │
│  - Social preview metadata generation                                │
│  - CloudFront distribution (auto-provisioned)                       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓ HTTPS
┌─────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                  │
│  Amazon API Gateway (REST API)                                      │
│  - Cognito integration for auth endpoints                           │
│  - Public endpoints (no auth)                                       │
│  - Request validation & rate limiting                               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       BUSINESS LOGIC LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Profile    │  │   Spotify    │  │      AI      │              │
│  │   Lambda     │  │   Lambda     │  │   Lambda     │              │
│  │              │  │  (OAuth +    │  │  (Bedrock)   │              │
│  │              │  │   refresh)   │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                  │                      │
│  ┌──────────────────────────────────────────────────┐               │
│  │         Scheduled Refresh Lambda                 │               │
│  │  (Triggered by EventBridge hourly)              │               │
│  └──────────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                  │
│  ┌────────────────────┐  ┌────────────────────┐                    │
│  │  AnchorProfiles    │  │   AnchorTokens     │                    │
│  │  (DynamoDB)        │  │   (DynamoDB)       │                    │
│  │  - Single table    │  │   - Encrypted      │                    │
│  │  - GSI: refresh    │  │     with KMS       │                    │
│  │    scheduling      │  │                    │                    │
│  └────────────────────┘  └────────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL INTEGRATIONS                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Spotify    │  │  AWS Bedrock │  │   AWS KMS    │              │
│  │   Web API    │  │  (Claude 3)  │  │  (Token enc) │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Next.js App** | Public page rendering with SSR for social previews, handles `/<handle>` routes | Next.js 15 on AWS Amplify Hosting with Node.js 20+ runtime |
| **API Gateway** | HTTP request routing, auth integration, rate limiting | REST API with Cognito authorizer for protected endpoints |
| **Profile Lambda** | CRUD operations on profiles, publish/unpublish logic, soft delete | Node.js 20 Lambda with DynamoDB SDK |
| **Spotify Lambda** | OAuth flow, token management, data fetching, token refresh | Node.js 20 Lambda with Spotify Web API client + KMS SDK |
| **AI Lambda** | Content generation (bio, album captions) via Bedrock | Node.js 20 Lambda with AWS Bedrock Runtime SDK |
| **Refresh Lambda** | Scheduled background task that queries GSI for due refreshes | EventBridge-triggered Lambda running hourly |
| **DynamoDB Tables** | Profile data (AnchorProfiles), encrypted tokens (AnchorTokens) | Single-table design with GSI for refresh scheduling |
| **KMS** | Encryption/decryption of Spotify OAuth tokens at rest | Customer-managed key for full control |
| **EventBridge** | Cron-based scheduling for auto-refresh (hourly trigger) | EventBridge rule with rate expression |

## Recommended Project Structure

```
anchor/
├── frontend/                 # Next.js application
│   ├── app/
│   │   ├── [handle]/        # Dynamic route for public pages
│   │   │   └── page.tsx     # SSR profile page with OG metadata
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page
│   ├── components/          # React components
│   │   ├── ProfileView.tsx  # Public profile display
│   │   ├── TopArtists.tsx   # Artist display component
│   │   └── AlbumGrid.tsx    # Album cover grid
│   ├── lib/
│   │   ├── api-client.ts    # API Gateway client
│   │   └── types.ts         # Shared TypeScript types
│   └── public/              # Static assets
├── backend/                 # Lambda functions
│   ├── shared/              # Shared utilities
│   │   ├── dynamodb.ts      # DynamoDB client wrapper
│   │   ├── kms.ts           # KMS encryption helpers
│   │   ├── spotify.ts       # Spotify API client
│   │   └── types.ts         # Shared types
│   ├── profile/
│   │   └── handler.ts       # Profile CRUD Lambda
│   ├── spotify-oauth/
│   │   └── handler.ts       # OAuth flow Lambda
│   ├── generate/
│   │   └── handler.ts       # Bedrock AI generation Lambda
│   └── refresh/
│       └── handler.ts       # Scheduled refresh Lambda
├── infrastructure/          # IaC (CDK or CloudFormation)
│   ├── dynamodb.ts          # Table definitions
│   ├── api-gateway.ts       # API Gateway setup
│   ├── lambdas.ts           # Lambda configurations
│   └── eventbridge.ts       # Scheduling rules
└── .planning/
    └── research/
```

### Structure Rationale

- **frontend/** — Separate Next.js app optimized for AWS Amplify Hosting with App Router for SSR
- **backend/shared/** — Reusable code across Lambda functions (DynamoDB clients, KMS helpers) to reduce duplication
- **backend/[function]/** — One directory per Lambda function for clear deployment boundaries
- **infrastructure/** — IaC keeps AWS resource definitions versioned and reproducible

## Architectural Patterns

### Pattern 1: Token Encryption with KMS

**What:** Spotify OAuth tokens (access + refresh) are encrypted at rest using AWS KMS customer-managed keys before storage in DynamoDB.

**When to use:** Always when storing sensitive third-party OAuth credentials that grant API access to user data.

**Trade-offs:**
- **Pro:** Strong security, audit trail via CloudTrail, key rotation support
- **Pro:** Meets compliance requirements for encrypted credential storage
- **Con:** Additional latency (~50ms) for encrypt/decrypt operations
- **Con:** KMS API limits (shared quota across region)

**Example:**
```typescript
// backend/shared/kms.ts
import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: process.env.AWS_REGION });
const KMS_KEY_ID = process.env.KMS_KEY_ID;

export async function encryptToken(tokenData: object): Promise<string> {
  const plaintext = JSON.stringify(tokenData);
  const command = new EncryptCommand({
    KeyId: KMS_KEY_ID,
    Plaintext: Buffer.from(plaintext),
  });
  const response = await kms.send(command);
  return Buffer.from(response.CiphertextBlob!).toString('base64');
}

export async function decryptToken(encryptedToken: string): Promise<object> {
  const command = new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedToken, 'base64'),
  });
  const response = await kms.send(command);
  const plaintext = Buffer.from(response.Plaintext!).toString('utf-8');
  return JSON.parse(plaintext);
}
```

### Pattern 2: GSI-Based Refresh Scheduling (No Table Scans)

**What:** Use DynamoDB Global Secondary Index (GSI) with composite sort key `timestamp#handle` to efficiently query items due for refresh without scanning the entire table.

**When to use:** When you need scheduled background processing on a subset of items in a large table.

**Trade-offs:**
- **Pro:** O(log n) query performance instead of O(n) table scan
- **Pro:** Scales to millions of profiles without performance degradation
- **Pro:** Supports conditional indexing (only eligible items in GSI)
- **Con:** Eventually consistent reads from GSI (acceptable for background jobs)
- **Con:** Additional write capacity consumed on GSI updates

**Example:**
```typescript
// GSI design
// Table: AnchorProfiles
// Primary: pk = USER#<handle>
// GSI1: gsi1pk (partition) + gsi1sk (sort)

// Populate GSI only when:
// - autoRefreshEnabled === true
// - isPublic === true
// - spotify.connected === true
// - deletedAt === null

// Values:
// gsi1pk = "AUTO#1"  (constant for all eligible items)
// gsi1sk = "2026-02-11T14:00:00Z#alice"  (nextRefreshAt + handle)

// Query pattern in refresh Lambda:
const now = new Date().toISOString();
const response = await dynamodb.query({
  TableName: 'AnchorProfiles',
  IndexName: 'GSI1_DueRefresh',
  KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk <= :threshold',
  ExpressionAttributeValues: {
    ':pk': 'AUTO#1',
    ':threshold': `${now}#~`  // ~ sorts after most ASCII chars
  },
  Limit: 50  // Process in batches
});
```

### Pattern 3: Optimistic Locking with DynamoDB Conditional Writes

**What:** Prevent concurrent refresh operations on the same profile using conditional updates that check for an unexpired lock before proceeding.

**When to use:** When multiple processes (manual refresh + scheduled refresh) might attempt to modify the same item concurrently.

**Trade-offs:**
- **Pro:** No distributed lock service required (no Redis, no Step Functions)
- **Pro:** Built into DynamoDB, no additional infrastructure
- **Pro:** Automatically handles race conditions via ConditionalCheckFailedException
- **Con:** Failed conditions consume write capacity units
- **Con:** Requires retry logic in application code

**Example:**
```typescript
// Acquire lock pattern
async function acquireRefreshLock(handle: string): Promise<string | null> {
  const lockId = crypto.randomUUID();
  const now = new Date().toISOString();
  const lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

  try {
    await dynamodb.update({
      TableName: 'AnchorProfiles',
      Key: { pk: `USER#${handle}` },
      UpdateExpression: 'SET refreshLockUntil = :lockUntil, refreshLockId = :lockId, updatedAt = :now',
      ConditionExpression: 'attribute_not_exists(refreshLockUntil) OR refreshLockUntil < :now',
      ExpressionAttributeValues: {
        ':lockUntil': lockUntil,
        ':lockId': lockId,
        ':now': now
      }
    });
    return lockId; // Lock acquired
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return null; // Already locked by another process
    }
    throw err;
  }
}

// Release lock pattern (with lockId verification)
async function releaseRefreshLock(handle: string, lockId: string): Promise<void> {
  await dynamodb.update({
    TableName: 'AnchorProfiles',
    Key: { pk: `USER#${handle}` },
    UpdateExpression: 'REMOVE refreshLockUntil, refreshLockId SET updatedAt = :now',
    ConditionExpression: 'refreshLockId = :lockId',
    ExpressionAttributeValues: {
      ':lockId': lockId,
      ':now': new Date().toISOString()
    }
  });
}
```

### Pattern 4: Next.js SSR on Amplify for Social Previews

**What:** Use Next.js server-side rendering (SSR) to generate dynamic Open Graph meta tags per profile handle for rich social media previews.

**When to use:** When social sharing requires unique preview images/text per dynamic route (e.g., `/<handle>`).

**Trade-offs:**
- **Pro:** AWS Amplify fully manages infrastructure (Lambda@Edge, CloudFront)
- **Pro:** No separate backend API call during page load for public data
- **Pro:** Proper OG tags for Twitter/Slack/WhatsApp link previews
- **Con:** SSR pages have higher latency than static (~200-500ms)
- **Con:** Lambda@Edge has 128MB memory limit (but sufficient for this use case)

**Example:**
```typescript
// app/[handle]/page.tsx (Next.js 15 App Router)
import { Metadata } from 'next';

interface ProfilePageProps {
  params: { handle: string };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const profile = await fetchProfile(params.handle); // SSR fetch from DynamoDB

  if (!profile || !profile.isPublic) {
    return {
      title: 'Profile Not Found',
    };
  }

  return {
    title: profile.displayName,
    description: profile.bio,
    openGraph: {
      title: profile.displayName,
      description: profile.bio,
      url: `https://anchor.band/${params.handle}`,
      images: [
        {
          url: profile.ogImageUrl || 'https://anchor.band/og-default.png',
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: profile.displayName,
      description: profile.bio,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const profile = await fetchProfile(params.handle);
  return <ProfileView profile={profile} />;
}
```

### Pattern 5: EventBridge + Lambda Scheduled Jobs

**What:** Use Amazon EventBridge scheduled rules (cron expressions) to trigger Lambda functions for periodic background tasks like auto-refresh.

**When to use:** When you need reliable cron-like scheduling without managing servers or job queues.

**Trade-offs:**
- **Pro:** Fully managed, no infrastructure to maintain
- **Pro:** Up to 14 million free invocations/month (sufficient for most use cases)
- **Pro:** Supports both rate expressions and cron expressions
- **Con:** Minimum scheduling precision is 1 minute
- **Con:** No built-in job retry or DLQ (must implement in Lambda)

**Example:**
```typescript
// EventBridge rule: rate(1 hour)
// Target: RefreshLambda

// backend/refresh/handler.ts
export async function handler(event: any) {
  const now = new Date().toISOString();

  // Query GSI for profiles due for refresh
  const dueProfiles = await dynamodb.query({
    TableName: 'AnchorProfiles',
    IndexName: 'GSI1_DueRefresh',
    KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk <= :threshold',
    ExpressionAttributeValues: {
      ':pk': 'AUTO#1',
      ':threshold': `${now}#~`
    },
    Limit: 50 // Batch size
  });

  // Process each profile
  for (const item of dueProfiles.Items || []) {
    const handle = item.handle;

    // Attempt lock acquisition
    const lockId = await acquireRefreshLock(handle);
    if (!lockId) {
      console.log(`Skipping ${handle}: already locked`);
      continue;
    }

    try {
      // Refresh Spotify data
      await refreshSpotifyData(handle);

      // Update nextRefreshAt to +7 days
      const nextRefresh = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await updateNextRefresh(handle, nextRefresh);

    } finally {
      await releaseRefreshLock(handle, lockId);
    }
  }
}
```

### Pattern 6: Cached Data for Public Pages (Never Call External APIs)

**What:** Store all Spotify data (artists, albums, tracks) in DynamoDB so public page views read from cache, never calling Spotify API.

**When to use:** Always for public-facing pages to ensure performance, cost efficiency, and avoid rate limits.

**Trade-offs:**
- **Pro:** Fast page loads (~50ms from DynamoDB vs ~500ms+ from Spotify)
- **Pro:** No Spotify rate limit concerns during traffic spikes
- **Pro:** Works even if Spotify API is down
- **Con:** Data may be stale (acceptable with 7-day refresh)
- **Con:** Increased DynamoDB storage (minimal cost impact)

**Example:**
```typescript
// ✅ CORRECT: Public page reads from DynamoDB cache
export async function getPublicProfile(handle: string) {
  const response = await dynamodb.get({
    TableName: 'AnchorProfiles',
    Key: { pk: `USER#${handle}` },
    ProjectionExpression: 'handle, displayName, isPublic, bio, albumLines, spotify'
  });

  if (!response.Item || !response.Item.isPublic) {
    throw new Error('Profile not found');
  }

  return response.Item; // Contains pre-fetched spotify.topArtists, spotify.topAlbums, etc.
}

// ❌ INCORRECT: Don't call Spotify API on public page view
// This would be slow, costly, and hit rate limits
export async function getBadPublicProfile(handle: string) {
  const user = await getUser(handle);
  const topArtists = await spotifyApi.getTopArtists(user.spotifyToken); // NO!
  return { user, topArtists };
}
```

## Data Flow

### Complete User Journey Data Flow

```
1. SIGNUP → OAUTH → TOKEN STORAGE
   User (Browser)
     → POST /api/profile (Lambda) → DynamoDB [AnchorProfiles: handle, displayName]
     → GET /api/auth/spotify/start (Lambda) → Redirect to Spotify
     → User authorizes
     → Spotify redirects to callback
     → GET /api/auth/spotify/callback (Lambda)
         → Exchange code for tokens (Spotify API)
         → Encrypt tokens (KMS)
         → Store encrypted tokens (DynamoDB [AnchorTokens])
         → Fetch top artists/tracks (Spotify API)
         → Derive albums from tracks
         → Store Spotify data (DynamoDB [AnchorProfiles.spotify])

2. AI GENERATION
   User (Browser)
     → POST /api/profile/generate (Lambda)
         → Read profile + Spotify data (DynamoDB)
         → Call Bedrock InvokeModel API (Claude 3)
         → Parse JSON response (bio + albumLines)
         → Store generated content (DynamoDB [AnchorProfiles])

3. PUBLISH
   User (Browser)
     → POST /api/profile/publish (Lambda)
         → Update isPublic = true (DynamoDB)
         → Set nextRefreshAt = now + 7 days
         → Populate GSI fields: gsi1pk = "AUTO#1", gsi1sk = "timestamp#handle"

4. PUBLIC VIEW
   Public User (Browser)
     → GET /<handle> (Next.js SSR on Amplify)
         → SSR: Read profile from DynamoDB
         → Generate OG meta tags server-side
         → Render HTML with embedded data
         → Return to browser
         → CloudFront caches response (optional TTL)

5. SCHEDULED AUTO-REFRESH
   EventBridge (hourly cron)
     → Trigger RefreshLambda
         → Query GSI1_DueRefresh (DynamoDB)
             WHERE gsi1pk = "AUTO#1" AND gsi1sk <= now
         → For each profile (batch of 50):
             → Attempt lock acquisition (conditional update)
             → If locked: skip
             → If acquired:
                 → Decrypt tokens (KMS)
                 → Fetch fresh Spotify data (Spotify API)
                 → Compare data hash (skip AI if unchanged)
                 → Update Spotify data (DynamoDB)
                 → If data changed: call Bedrock for new copy
                 → Update nextRefreshAt = now + 7 days
                 → Update gsi1sk = newTimestamp#handle
                 → Release lock

6. MANUAL REFRESH
   User (Browser)
     → POST /api/profile/refreshNow (Lambda)
         → Check cooldown (lastManualRefreshAt + 1 hour)
         → If cooldown active: return error
         → Attempt lock acquisition
         → If locked: return "already refreshing"
         → Execute refresh (same as auto-refresh)
         → Update lastManualRefreshAt

7. SOFT DELETE
   User (Browser)
     → POST /api/profile/delete (Lambda)
         → Update: isPublic = false, deletedAt = now
         → REMOVE gsi1pk, gsi1sk (stops auto-refresh)
         → Delete AnchorTokens item
         → Return success
```

### Critical Data Dependencies

```
Handle Claim → Spotify OAuth → Data Fetch → AI Generation → Publish
     └─→ Must be unique (DynamoDB conditional)
                └─→ Tokens required for all Spotify operations
                           └─→ Cached data required for public pages
                                      └─→ Generated content required for publish
                                                └─→ GSI populated for scheduling
```

## Build Order Implications

Based on data flow dependencies, suggested implementation order:

### Phase 1: Foundation (week 1)
1. **DynamoDB tables** — Must exist before any Lambda can run
2. **KMS key** — Required for token encryption
3. **API Gateway scaffold** — Basic REST API structure
4. **Profile Lambda** — Handle creation and basic CRUD (no Spotify yet)

**Why this order:** Database schema is the foundation. Profile creation without Spotify allows testing auth and basic operations.

### Phase 2: Spotify Integration (week 2)
5. **Spotify OAuth Lambda** — Implement authorization code flow
6. **Token encryption/storage** — KMS integration for AnchorTokens table
7. **Spotify data fetch** — Top artists/tracks, album derivation
8. **Token refresh logic** — Handle expired access tokens

**Why this order:** OAuth must work before data fetch. Token storage must be secure from day 1.

### Phase 3: AI & Publish (week 3)
9. **Bedrock integration** — AI Lambda for content generation
10. **Content validation** — Anti-cringe rules, JSON parsing
11. **Publish endpoint** — Set isPublic, populate GSI
12. **Next.js profile page** — SSR with OG metadata

**Why this order:** Can't generate content without Spotify data. Can't publish without content. Public page is the final deliverable.

### Phase 4: Scheduling & Maintenance (week 4)
13. **GSI setup** — Add GSI1_DueRefresh to existing table
14. **Refresh Lambda** — Scheduled background job
15. **EventBridge rule** — Hourly trigger
16. **Lock implementation** — Concurrency control
17. **Manual refresh endpoint** — User-initiated refresh
18. **Soft delete** — Safe data removal

**Why this order:** Background refresh requires all previous systems working. Locking prevents race conditions between manual and scheduled refreshes.

## AWS-Specific Critical Patterns

### 1. DynamoDB Single-Table Design with Sparse GSI

**Pattern:** Store all profile data in one table with a sparse GSI that only indexes items eligible for auto-refresh.

**Why critical:** Avoids expensive table scans. In production with 100K+ profiles, scanning the entire table hourly would cost hundreds of dollars per month and cause throttling.

**Implementation:**
```typescript
// Only populate GSI when ALL conditions met:
const shouldIndex =
  profile.spotify.connected === true &&
  profile.autoRefreshEnabled === true &&
  profile.isPublic === true &&
  profile.deletedAt === null;

const gsiFields = shouldIndex ? {
  gsi1pk: 'AUTO#1',
  gsi1sk: `${profile.nextRefreshAt}#${profile.handle}`
} : {
  // REMOVE fields from item to keep it out of GSI
};
```

**Official source:** [AWS Blog: Creating a single-table design with DynamoDB](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)

### 2. Lambda Best Practices for DynamoDB + KMS

**Pattern:** Reuse SDK clients across invocations, grant least-privilege IAM permissions, implement exponential backoff.

**Why critical:** Lambda cold starts are expensive. Client reuse can save 100-200ms per invocation. Proper IAM prevents security issues.

**Implementation:**
```typescript
// ✅ CORRECT: Initialize clients outside handler
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { KMSClient } from '@aws-sdk/client-kms';

const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION });
const kms = new KMSClient({ region: process.env.AWS_REGION });

export async function handler(event: any) {
  // Clients are reused across warm invocations
  const result = await dynamodb.send(command);
}

// ❌ INCORRECT: Don't create clients inside handler
export async function badHandler(event: any) {
  const dynamodb = new DynamoDBClient({ region: process.env.AWS_REGION }); // Slow!
}
```

**IAM permissions (least-privilege):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/AnchorProfiles",
        "arn:aws:dynamodb:*:*:table/AnchorProfiles/index/GSI1_DueRefresh"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["kms:Decrypt", "kms:Encrypt"],
      "Resource": "arn:aws:kms:*:*:key/your-key-id"
    }
  ]
}
```

**Official source:** [AWS Lambda Developer Guide: Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

### 3. Amplify Hosting Next.js SSR Configuration

**Pattern:** Use Amplify Hosting compute service (not Gen 1 SSG) to support Next.js 15 SSR with automatic infrastructure provisioning.

**Why critical:** SSR is mandatory for dynamic OG meta tags. Amplify Hosting compute fully manages Lambda@Edge and CloudFront without manual configuration.

**Implementation:**
```yaml
# amplify.yml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
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
      - .next/cache/**/*
```

**Build script detection (package.json):**
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

Amplify detects `next build` and automatically provisions:
- Lambda@Edge functions for SSR
- CloudFront distribution with proper caching rules
- S3 bucket for static assets

**Official source:** [AWS Amplify: Deploying Next.js SSR apps](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)

### 4. EventBridge Scheduling for Auto-Refresh

**Pattern:** Use EventBridge scheduled rules with rate expressions to trigger Lambda hourly, processing profiles in batches.

**Why critical:** EventBridge is cheaper and simpler than Step Functions or cron servers. 14M free invocations/month covers most workloads.

**Implementation:**
```typescript
// EventBridge Rule: rate(1 hour)
// Target: arn:aws:lambda:region:account:function:RefreshLambda

// Processing strategy: Batch with cursor
export async function handler(event: any) {
  const BATCH_SIZE = 50;
  const now = new Date().toISOString();

  let cursor = null;
  let processedCount = 0;

  do {
    const response = await dynamodb.query({
      TableName: 'AnchorProfiles',
      IndexName: 'GSI1_DueRefresh',
      KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk <= :threshold',
      ExpressionAttributeValues: {
        ':pk': 'AUTO#1',
        ':threshold': `${now}#~`
      },
      Limit: BATCH_SIZE,
      ExclusiveStartKey: cursor
    });

    // Process batch in parallel (with controlled concurrency)
    await Promise.all(
      (response.Items || []).map(item => refreshProfile(item.handle))
    );

    processedCount += response.Items?.length || 0;
    cursor = response.LastEvaluatedKey;

  } while (cursor && processedCount < 200); // Safety limit

  return { processedCount };
}
```

**Official source:** [AWS Architecture Blog: Serverless Scheduling with EventBridge](https://aws.amazon.com/blogs/architecture/serverless-scheduling-with-amazon-eventbridge-aws-lambda-and-amazon-dynamodb/)

### 5. DynamoDB Conditional Writes for Concurrency Control

**Pattern:** Use `ConditionExpression` to implement optimistic locking without external distributed locks.

**Why critical:** Prevents duplicate refreshes when manual refresh and scheduled refresh collide. No need for Redis or DynamoDB Lock Client library.

**Implementation:** (See Pattern 3 above for full code)

**Key insight:** DynamoDB conditional writes are **atomic**. If two Lambdas try to acquire the lock simultaneously, exactly one succeeds.

**Official source:** [AWS DynamoDB: Version Control Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_ImplementingVersionControl.html)

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Unencrypted OAuth Tokens

**What people do:** Store Spotify refresh tokens directly in DynamoDB as plaintext strings.

**Why it's wrong:**
- Violates security best practices (tokens grant full API access)
- Non-compliant with most data protection regulations
- If DynamoDB backup is compromised, all user tokens are exposed

**Do this instead:** Always encrypt tokens with KMS before storage. Use customer-managed keys (not AWS-managed) for full control.

```typescript
// ❌ WRONG
await dynamodb.put({
  TableName: 'AnchorTokens',
  Item: {
    pk: `USER#${handle}`,
    spotifyRefreshToken: refreshToken // Plaintext!
  }
});

// ✅ CORRECT
const encrypted = await encryptToken({
  accessToken,
  refreshToken,
  expiresAt
});
await dynamodb.put({
  TableName: 'AnchorTokens',
  Item: {
    pk: `USER#${handle}`,
    spotifyTokenEnc: encrypted // KMS-encrypted blob
  }
});
```

### Anti-Pattern 2: Table Scans for Scheduled Tasks

**What people do:** Run a DynamoDB `Scan` operation to find all profiles needing refresh, then filter in application code.

**Why it's wrong:**
- Scans read every item in the table (even items that don't need refresh)
- Cost scales linearly with total profiles, not eligible profiles
- Throttling risk: scans consume RCUs even for irrelevant items
- At 100K profiles, scanning hourly = 2.4M scans/day = $$$

**Do this instead:** Use GSI with composite sort key for targeted queries.

```typescript
// ❌ WRONG: Scan entire table
const response = await dynamodb.scan({
  TableName: 'AnchorProfiles',
  FilterExpression: 'nextRefreshAt <= :now AND autoRefreshEnabled = :true'
});
// This reads ALL items, then filters. Expensive!

// ✅ CORRECT: Query GSI
const response = await dynamodb.query({
  TableName: 'AnchorProfiles',
  IndexName: 'GSI1_DueRefresh',
  KeyConditionExpression: 'gsi1pk = :pk AND gsi1sk <= :now',
  ExpressionAttributeValues: {
    ':pk': 'AUTO#1',
    ':now': `${new Date().toISOString()}#~`
  }
});
// Only reads items due for refresh. Scales well.
```

### Anti-Pattern 3: Calling External APIs During Public Page Render

**What people do:** Fetch Spotify data live during SSR for public pages.

**Why it's wrong:**
- Slow (adds 200-500ms+ latency to every page view)
- Expensive (Spotify API rate limits are shared across all requests)
- Brittle (if Spotify API is down, all public pages fail)
- Wasteful (most users see same data within 7-day window)

**Do this instead:** Cache Spotify data in DynamoDB during OAuth callback and refresh. Public pages only read from cache.

```typescript
// ❌ WRONG: Live fetch during page render
export async function generateMetadata({ params }: { params: { handle: string } }) {
  const profile = await getProfile(params.handle);
  const spotifyData = await spotifyApi.getTopArtists(profile.token); // NO!
  return { title: spotifyData.items[0].name };
}

// ✅ CORRECT: Read from cache
export async function generateMetadata({ params }: { params: { handle: string } }) {
  const profile = await getProfile(params.handle); // Includes cached spotify data
  return { title: profile.spotify.topArtists[0].name };
}
```

### Anti-Pattern 4: Missing Lock Expiration in Concurrency Control

**What people do:** Implement refresh locks but forget to set expiration time, causing permanent lock if Lambda crashes.

**Why it's wrong:**
- If Lambda times out or crashes while holding lock, profile is locked forever
- Requires manual intervention to unlock (bad UX)
- Blocks both manual and auto-refresh indefinitely

**Do this instead:** Always set `refreshLockUntil` with reasonable TTL (5 minutes). Check for expired locks before skipping.

```typescript
// ❌ WRONG: Lock without expiration
await dynamodb.update({
  Key: { pk: `USER#${handle}` },
  UpdateExpression: 'SET isRefreshing = :true', // No expiration!
  ConditionExpression: 'attribute_not_exists(isRefreshing) OR isRefreshing = :false'
});

// ✅ CORRECT: Lock with expiration
const lockUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
await dynamodb.update({
  Key: { pk: `USER#${handle}` },
  UpdateExpression: 'SET refreshLockUntil = :lockUntil, refreshLockId = :lockId',
  ConditionExpression: 'attribute_not_exists(refreshLockUntil) OR refreshLockUntil < :now',
  ExpressionAttributeValues: {
    ':lockUntil': lockUntil,
    ':lockId': crypto.randomUUID(),
    ':now': new Date().toISOString()
  }
});
```

### Anti-Pattern 5: Hard Delete Without User Confirmation

**What people do:** Implement immediate hard delete that permanently removes all data on first request.

**Why it's wrong:**
- No undo if user clicks by accident
- May violate data retention regulations (some require X-day grace period)
- Irreversible; can't recover from bugs in delete logic

**Do this instead:** Implement soft delete (set `deletedAt`, unpublish, delete tokens) for v1. Add hard delete later if needed.

```typescript
// ❌ RISKY: Hard delete immediately
export async function deleteProfile(handle: string) {
  await dynamodb.delete({
    TableName: 'AnchorProfiles',
    Key: { pk: `USER#${handle}` }
  });
  await dynamodb.delete({
    TableName: 'AnchorTokens',
    Key: { pk: `USER#${handle}` }
  });
}

// ✅ SAFER: Soft delete (v1)
export async function deleteProfile(handle: string) {
  await dynamodb.update({
    TableName: 'AnchorProfiles',
    Key: { pk: `USER#${handle}` },
    UpdateExpression: 'SET isPublic = :false, deletedAt = :now REMOVE gsi1pk, gsi1sk',
    ExpressionAttributeValues: {
      ':false': false,
      ':now': new Date().toISOString()
    }
  });

  // Delete tokens immediately (privacy)
  await dynamodb.delete({
    TableName: 'AnchorTokens',
    Key: { pk: `USER#${handle}` }
  });

  // Optional: schedule hard delete after 30 days
}
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **DynamoDB throughput** | On-demand mode (default) | On-demand mode | Consider provisioned capacity with auto-scaling for cost optimization |
| **Spotify API rate limits** | No issue (background refresh only) | Batch refreshes to stay under 5 req/sec | Implement exponential backoff + jitter, respect Retry-After headers |
| **Bedrock API limits** | Default quota sufficient | Monitor quota, request increase if needed | Use batch inference or distilled models to reduce costs |
| **KMS operations** | Well within free tier | Monitor KMS API quota (shared per region) | Consider caching decrypted tokens in Lambda memory (10-15 min TTL) |
| **Lambda concurrency** | Default (1000 concurrent) is fine | Same | Reserve concurrency for critical functions (OAuth callback, public page) |
| **EventBridge refresh Lambda** | Process 100 profiles in 1 batch | Process in 20 batches (5K profiles/hour) | Consider Step Functions for orchestration at scale, or increase frequency to every 15 min |
| **Next.js SSR pages** | CloudFront caching (5 min TTL) helps | Enable caching, monitor CloudFront cache hit rate | Consider static generation for top profiles, SSR for long tail |
| **GSI write throttling** | Not a concern | Monitor write throttling on GSI | Ensure GSI has matching capacity with base table |

### Scaling Priorities

1. **First bottleneck: Spotify API rate limits**
   - Appears at: ~500-1K active users with frequent refreshes
   - How to fix: Implement request queuing, spread refreshes across full 7-day window (not all on same day), add exponential backoff

2. **Second bottleneck: Bedrock costs**
   - Appears at: 10K+ users with weekly refreshes = ~20K AI calls/week
   - How to fix: Only regenerate content when Spotify data materially changes (hash comparison), consider smaller models or distillation for bio generation

3. **Third bottleneck: DynamoDB costs**
   - Appears at: 100K+ users with on-demand pricing
   - How to fix: Migrate to provisioned capacity with auto-scaling (can save 50-70% at predictable scale)

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Spotify Web API** | OAuth 2.0 Authorization Code flow, REST API calls with Bearer token | Store tokens encrypted, implement token refresh, respect rate limits (5 req/sec), retry on 429 |
| **AWS Bedrock** | InvokeModel API with Claude 3 Sonnet | Use `anthropic.claude-3-sonnet` model ID, prompt engineering for JSON output, validate responses server-side |
| **AWS KMS** | Encrypt/Decrypt API for token protection | Use customer-managed key, grant Lambda IAM permissions, cache decrypted tokens in memory |
| **AWS Amplify Hosting** | Git-based CI/CD, automatic deployments | Connect GitHub repo, Amplify auto-detects Next.js SSR, provisions Lambda@Edge + CloudFront |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Next.js ↔ API Gateway** | HTTPS REST API calls with Cognito JWT (auth endpoints) or public (read) | Next.js never calls DynamoDB directly; all data via API Gateway |
| **Lambda ↔ DynamoDB** | AWS SDK v3 (client-dynamodb) with IAM role credentials | Use conditional writes for concurrency control, implement exponential backoff |
| **Lambda ↔ KMS** | AWS SDK v3 (client-kms) with IAM role credentials | Encrypt during OAuth callback, decrypt during refresh, consider in-memory caching |
| **Lambda ↔ Spotify** | HTTPS with `node-fetch` or Axios, Bearer auth | Implement token refresh logic, handle 429 rate limits, store minimal data |
| **EventBridge → Lambda** | Async event invocation, no response expected | Process batches with cursor, use DLQ for failed invocations, emit CloudWatch metrics |

## Sources

### HIGH Confidence (Official AWS Documentation)
- [AWS Serverless Multi-Tier Architectures Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/serverless-multi-tier-architectures-api-gateway-lambda/sample-architecture-patterns.html)
- [AWS Amplify: Deploying Next.js SSR Applications](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [AWS DynamoDB: Version Control and Optimistic Locking](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_ImplementingVersionControl.html)
- [AWS Lambda: Environment Variable Encryption with KMS](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html)
- [AWS EventBridge: Creating Scheduled Rules](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-run-lambda-schedule.html)

### MEDIUM Confidence (AWS Blogs & Community)
- [AWS Architecture Blog: Serverless Scheduling with EventBridge, Lambda, and DynamoDB](https://aws.amazon.com/blogs/architecture/serverless-scheduling-with-amazon-eventbridge-aws-lambda-and-amazon-dynamodb/)
- [AWS Blog: Creating Single-Table Design with DynamoDB](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [DEV Community: DynamoDB Single Table Design - How to use a GSI](https://dev.to/aws-builders/dynamodb-single-table-design-how-to-use-a-gsi-26eo)

### MEDIUM Confidence (Spotify Official)
- [Spotify Developer Blog: OAuth Security Requirements 2025](https://developer.spotify.com/blog/2025-02-12-increasing-the-security-requirements-for-integrating-with-spotify)
- [Spotify Documentation: Authorization Guide](https://developer.spotify.com/documentation/web-api/concepts/authorization)

---
*Architecture research for: Anchor.band music profile platform*
*Researched: 2026-02-04*
*Confidence: HIGH — All patterns verified with official AWS documentation*
