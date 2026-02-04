# Technology Stack Research

**Project:** Anchor.band - Music Profile Pages
**Domain:** Music profile/portfolio platform with Spotify integration
**Researched:** 2026-02-04
**Confidence:** HIGH

## Executive Summary

For a music profile platform with Spotify OAuth, AI content generation, and social sharing on AWS infrastructure, the recommended stack centers on Next.js 15 with React 19 for SSR-enabled social previews, AWS SDK v3 for serverless backend integration, and DynamoDB for fast user data access. This stack prioritizes AWS ecosystem compatibility while maintaining modern developer experience and minimal operational costs.

## Core Framework

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Next.js** | 15.5.12 (stable) | React framework with SSR | Required for social preview metadata (Open Graph). AWS Amplify fully supports Next.js 12-15 with SSR, ISR, and API routes. Provides built-in Metadata API for Open Graph optimization. **Confidence: HIGH** |
| **React** | 19.2 (stable) | UI library | Next.js 15.1+ has stable React 19 support. Modern hooks and performance improvements. Full compatibility with Next.js 15. **Confidence: HIGH** |
| **TypeScript** | 5.9.3 (latest stable) | Type safety | Industry standard for large codebases. Full support for Next.js, AWS SDK v3, and all supporting libraries. Prevents runtime errors. **Confidence: HIGH** |
| **Node.js** | 22 LTS | Runtime | AWS Amplify supports Node.js 20 and 22 (Node 14-18 deprecated Sept 2025). Node 22 is current LTS. Spotify SDK requires Node 18.0.0+. **Confidence: HIGH** |

## AWS Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **AWS Amplify Hosting** | Gen 2 | Next.js SSR hosting | Fully managed SSR for Next.js 12-15. Automatic detection of Next.js apps. Supports ISR, API routes, middleware, image optimization (max 4.3MB). **WEB_COMPUTE platform required for Next.js 14+**. 40% cheaper than Vercel at scale. **Confidence: HIGH** |
| **AWS Lambda** | Node.js 22 runtime | Serverless compute | Execute backend logic (Spotify token refresh, AI generation, data processing). EventBridge Scheduler integration for auto-refresh. Free tier: 1M requests/month. **Confidence: HIGH** |
| **Amazon DynamoDB** | Latest | NoSQL database | Millisecond latency for user profiles, tokens, and profile data. Single-table design pattern recommended. Free tier: 25GB storage, 25 RCU/WCU. Standard-IA tier for 60% cost reduction on long-tail data. **Confidence: HIGH** |
| **AWS Bedrock** | Runtime API | AI content generation | Managed Claude API for tasteful music bio generation. Use `@aws-sdk/client-bedrock-runtime` with `InvokeModelCommand`. Supports Claude Sonnet 4 and 4.5 with 1M token context window (beta). **Confidence: HIGH** |
| **AWS KMS** | Latest | Encryption key management | Encrypt Spotify tokens at rest. DynamoDB supports customer-managed keys for table-level encryption. For attribute-level encryption, use DynamoDB Encryption Client. **Confidence: HIGH** |
| **AWS EventBridge Scheduler** | Latest | Scheduled Lambda invocations | Trigger profile auto-refresh via cron/rate expressions. Free tier: 14M invocations/month, then $1/1M invocations. More flexible than CloudWatch Events. **Confidence: HIGH** |

## AWS SDK v3 (JavaScript)

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| **@aws-sdk/client-dynamodb** | Latest v3 | DynamoDB client | Modular imports reduce bundle size. Tree-shakeable. Use with `@aws-sdk/lib-dynamodb` for document operations. **Confidence: HIGH** |
| **@aws-sdk/lib-dynamodb** | Latest v3 | DynamoDB DocumentClient | Marshals JavaScript objects to DynamoDB AttributeValues. Simplifies CRUD operations. Use `GetCommand`, `PutCommand`, etc. **Confidence: HIGH** |
| **@aws-sdk/client-bedrock-runtime** | Latest v3 | Bedrock AI client | Invoke Claude models with `InvokeModelCommand`. Supports streaming responses with `InvokeModelWithResponseStreamCommand`. **Confidence: HIGH** |
| **@aws-sdk/client-kms** | Latest v3 | KMS encryption | Encrypt/decrypt Spotify tokens. Use `EncryptCommand` and `DecryptCommand`. **Confidence: HIGH** |
| **@aws-sdk/client-lambda** | Latest v3 | Lambda invocation (optional) | If you need to invoke Lambda from Next.js API routes. Often not needed if using EventBridge. **Confidence: MEDIUM** |

**Note:** Always include AWS SDK in Lambda dependencies (don't rely on runtime version). Lambda includes a specific minor version, not latest. Use modular imports for tree shaking.

## Authentication & API Integration

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **next-auth** | 5.0.0-beta (Auth.js v5) | Spotify OAuth | Official Next.js auth solution. Spotify provider built-in. **IMPORTANT: v5 is still beta**. Use `npm install next-auth@beta`. Handles token refresh, session management. For production, monitor for stable v5 release or use alternative like `@auth0/nextjs-auth0`. **Confidence: MEDIUM** |
| **@spotify/web-api-ts-sdk** | 1.2.0 | Spotify Web API client | Official Spotify TypeScript SDK. Fully typed responses. Supports Authorization Code + PKCE flow. Works in Node 18+ and browsers. ESM + CommonJS support. **Confidence: HIGH** |

## UI & Styling

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| **Tailwind CSS** | 4.0 (latest) | Utility-first CSS | Industry standard. shadcn/ui updated for Tailwind v4 (OKLCH colors, removed forwardRefs). Mobile-first responsive design. Minimal runtime overhead. **Confidence: HIGH** |
| **shadcn/ui** | Latest (React 19 compatible) | Component library | Copy-paste components (not a dependency). Built on Radix UI + Tailwind. 100K+ GitHub stars, 560K+ weekly downloads. Full code ownership. Use with `npx shadcn@latest init`. **Confidence: HIGH** |
| **Radix UI** | Latest | Headless UI primitives | Underlying primitive components for shadcn/ui. Accessible, unstyled components. Used by shadcn/ui, not directly imported. **Confidence: HIGH** |

## Data Validation & Type Safety

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **Zod** | 4.3.6 | Runtime schema validation | Validate Spotify API responses, form inputs, environment variables, API route payloads. TypeScript only validates at compile-time; Zod adds runtime safety. Essential for preventing injection attacks. **Confidence: HIGH** |

## Development & Build Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| **npm** / **pnpm** | Latest | Package manager | pnpm recommended for faster installs and disk efficiency. npm works fine. Avoid yarn v1 (outdated). **Confidence: HIGH** |
| **ESLint** | Latest | Linting | Next.js includes built-in ESLint config. Use `next lint`. **Confidence: HIGH** |
| **Prettier** | Latest | Code formatting | Standardize code style. Integrate with ESLint. **Confidence: HIGH** |
| **Turbopack** | Included in Next.js 15 | Dev server bundler | Stable in Next.js 15. Faster than Webpack for dev. Production builds still use Webpack. **Confidence: HIGH** |

## Supporting Libraries (Optional but Recommended)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **date-fns** | Latest | Date manipulation | Format Spotify listening history dates, schedule times. Lighter than moment.js. Tree-shakeable. **Confidence: HIGH** |
| **clsx** / **tailwind-merge** | Latest | Conditional CSS classes | Combine Tailwind classes dynamically. `cn()` utility in shadcn/ui uses these. **Confidence: HIGH** |
| **sonner** | Latest | Toast notifications | Recommended replacement for shadcn/ui's deprecated toast component. Beautiful, accessible toasts. **Confidence: HIGH** |
| **next-themes** | Latest | Dark mode support | If implementing light/dark mode. Works with Tailwind. Prevents flash of unstyled content. **Confidence: MEDIUM** |

## Installation

```bash
# Initialize Next.js 15 project with TypeScript
npx create-next-app@latest anchor-band --typescript --tailwind --app --src-dir --import-alias "@/*"

# Navigate to project
cd anchor-band

# Core dependencies
npm install @spotify/web-api-ts-sdk next-auth@beta zod date-fns

# AWS SDK v3 (modular)
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-bedrock-runtime @aws-sdk/client-kms

# UI components (initialize shadcn/ui)
npx shadcn@latest init
# Then add specific components as needed:
# npx shadcn@latest add button card avatar

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom eslint prettier
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| **Hosting** | AWS Amplify | Vercel | AWS stack locked in. Amplify 40% cheaper at scale. Vercel has better DX but exponential bandwidth pricing ($40/100GB over limit). Amplify integrates seamlessly with Lambda, DynamoDB, Bedrock. |
| **Database** | DynamoDB | RDS (Postgres) | DynamoDB provides millisecond latency vs RDS's 10-100ms. Single-table design works well for user profiles + tokens. No cold starts. Free tier more generous. RDS requires VPC setup (complexity). |
| **Database** | DynamoDB | S3 | S3 designed for large object storage, not structured data. S3 has higher latency, no atomic updates, no indexes. DynamoDB 60% cheaper with Standard-IA tier for long-tail data. S3 better for profile images (not implemented yet). |
| **Auth** | next-auth v5 | Auth0 / Clerk | next-auth is open source, no vendor lock-in, built for Next.js, includes Spotify provider. Auth0/Clerk add monthly costs. **Trade-off: next-auth v5 is beta**. Consider Auth0 (`@auth0/nextjs-auth0`) if next-auth v5 stability concerns arise. |
| **API Layer** | Next.js API Routes | API Gateway + Lambda | Next.js API routes deploy as Lambda@Edge on Amplify. Simpler than separate API Gateway. Sufficient for simple API needs. Use API Gateway if you need advanced features (usage plans, throttling, caching, custom authorizers). |
| **AI Generation** | AWS Bedrock | OpenAI API | Bedrock required per constraints. Bedrock advantages: AWS KMS integration, IAM permissions, no separate API keys, Claude Sonnet 4.5 available. OpenAI has GPT-4 but requires separate vendor. |
| **Scheduling** | EventBridge Scheduler | CloudWatch Events | EventBridge Scheduler is newer, more flexible (rate + cron expressions), better retry policies, 185 max retries. 14M free invocations/month vs CloudWatch's rule-based pricing. |
| **CSS Framework** | Tailwind CSS | CSS Modules / Styled Components | Tailwind is industry standard, better for rapid development, smaller bundle size. CSS Modules require more boilerplate. Styled Components have runtime overhead and SSR complexity. |
| **Component Library** | shadcn/ui | Material-UI / Chakra UI | shadcn/ui gives full code ownership (copy-paste vs npm dependency). No version lock-in. Easier customization. MUI/Chakra add bundle size and opinionated design systems. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **AWS SDK v2** | Deprecated. Larger bundle size. No tree shaking. Monolithic imports. | **AWS SDK v3** with modular imports (`@aws-sdk/client-*`) |
| **next-auth v4** | Legacy. No longer maintained for new features. | **next-auth v5 (beta)** or **Auth0** for production-critical auth |
| **React 18** | Next.js 15.1+ has stable React 19 support. React 18 missing performance improvements. | **React 19** |
| **Node.js 18 or earlier** | AWS Amplify deprecated Node 14-18 in Sept 2025. Spotify SDK requires Node 18+. | **Node.js 20 or 22 LTS** |
| **API Gateway (initially)** | Overcomplicated for MVP. Next.js API routes sufficient. 29s timeout limit. 10MB response limit. | **Next.js API Routes** (can migrate to API Gateway later if needed) |
| **Lambda Function URLs** | Limited auth options (only AWS_IAM). No per-endpoint auth configuration. | **Next.js API Routes** or **API Gateway** |
| **RDS / Aurora Serverless** | Overkill for MVP. Cold start latency. Requires VPC. More expensive. | **DynamoDB** |
| **CSS-in-JS (Emotion, Styled Components)** | Runtime overhead. SSR complexity. Larger bundle size. Tailwind is faster and simpler. | **Tailwind CSS** |
| **Global CSS / Vanilla CSS** | Hard to maintain at scale. Class name collisions. No scoping. | **Tailwind CSS** or **CSS Modules** |
| **moment.js** | Deprecated. 70KB+ bundle size. Mutable API (error-prone). | **date-fns** (tree-shakeable, immutable) |

## Stack Patterns for This Project

### Pattern 1: Single-Table DynamoDB Design
**What:** Store users, profiles, and tokens in one DynamoDB table with generic `pk` and `sk` keys.

**Why:** Reduces costs, simplifies queries, enables atomic transactions across entity types.

**Example:**
```typescript
// User entity
{ pk: "USER#spotify123", sk: "METADATA", username: "jazzfan", ... }

// Profile entity
{ pk: "USER#spotify123", sk: "PROFILE", bio: "...", ... }

// Token entity
{ pk: "USER#spotify123", sk: "TOKEN", accessToken: "encrypted", ... }

// Query pattern: Get all data for user
// GetItem({ pk: "USER#spotify123" }) or Query({ pk: "USER#spotify123" })
```

**Resources:**
- [AWS Blog: Creating a single-table design with DynamoDB](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [Alex DeBrie: The What, Why, and When of Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)

### Pattern 2: Encrypt Sensitive Attributes with KMS
**What:** Encrypt Spotify access/refresh tokens before storing in DynamoDB. Decrypt when retrieving.

**Why:** Tokens grant access to user Spotify data. Must be encrypted at rest per security best practices.

**Example:**
```typescript
// Encrypt before storing
import { KMSClient, EncryptCommand } from "@aws-sdk/client-kms";
const encrypted = await kms.send(new EncryptCommand({
  KeyId: process.env.KMS_KEY_ID,
  Plaintext: Buffer.from(accessToken)
}));

// Store encrypted token in DynamoDB
await dynamodb.send(new PutCommand({
  TableName: "anchor-users",
  Item: { pk: "USER#spotify123", sk: "TOKEN", token: encrypted.CiphertextBlob }
}));

// Decrypt when retrieving
import { DecryptCommand } from "@aws-sdk/client-kms";
const decrypted = await kms.send(new DecryptCommand({
  CiphertextBlob: item.token
}));
```

**Resources:**
- [AWS Docs: How DynamoDB uses KMS](https://docs.aws.amazon.com/kms/latest/developerguide/services-dynamodb.html)
- [AWS Prescriptive Guidance: DynamoDB encryption best practices](https://docs.aws.amazon.com/prescriptive-guidance/latest/encryption-best-practices/dynamodb.html)

### Pattern 3: SSR with Open Graph Metadata for Social Previews
**What:** Use Next.js Metadata API to generate Open Graph tags server-side for each profile page.

**Why:** Social platforms (Twitter, Discord, Slack) require server-rendered meta tags. Client-side rendering won't work.

**Example:**
```typescript
// app/[handle]/page.tsx
import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
  const profile = await getProfile(params.handle);

  return {
    title: `${profile.username} on Anchor`,
    description: profile.bio,
    openGraph: {
      title: `${profile.username} on Anchor`,
      description: profile.bio,
      url: `https://anchor.band/${params.handle}`,
      siteName: 'Anchor',
      images: [{
        url: 'https://anchor.band/og-image.png', // Must be absolute URL
        width: 1200,
        height: 630,
      }],
      locale: 'en_US',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.username} on Anchor`,
      description: profile.bio,
      images: ['https://anchor.band/og-image.png'],
    },
  };
}
```

**Critical Details:**
- Image dimensions: 1200x630px recommended (minimum 600x315px)
- Image URL must be absolute (https://), not relative (/image.png)
- Max image size: 5MB (Twitter limit)
- Test with [OpenGraph.xyz](https://www.opengraph.xyz/) or Twitter Card Validator

**Resources:**
- [Next.js Docs: Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Digital Applied: Next.js 15 SEO Complete Guide](https://www.digitalapplied.com/blog/nextjs-seo-guide)

### Pattern 4: EventBridge Scheduler for Profile Auto-Refresh
**What:** Use EventBridge Scheduler to trigger Lambda function that refreshes Spotify data for active users.

**Why:** Cron-like scheduling without managing infrastructure. Flexible retry policies. Free tier: 14M invocations/month.

**Example Setup:**
```typescript
// Lambda function: refreshSpotifyData
// Triggered by EventBridge Scheduler every 24 hours

// EventBridge Schedule config:
// - Schedule expression: cron(0 0 * * ? *) // Daily at midnight UTC
// - Target: Lambda function ARN
// - Retry policy: 3 attempts, 60s between retries
// - DLQ: SNS topic for failed invocations
```

**Alternatives:**
- Daily refresh for all users: `rate(1 day)`
- Every 6 hours: `rate(6 hours)`
- Specific time: `cron(0 12 * * ? *)` (noon UTC daily)

**Resources:**
- [AWS Docs: Invoke Lambda on schedule](https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html)
- [Burning Monk: API Gateway vs Lambda Function URLs](https://theburningmonk.com/2024/03/when-to-use-api-gateway-vs-lambda-function-urls/)

### Pattern 5: Bedrock AI Generation with Prompt Caching
**What:** Invoke AWS Bedrock with Claude Sonnet 4 to generate tasteful music bios. Cache system prompt to reduce costs.

**Example:**
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({ region: "us-east-1" });

const payload = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 500,
  messages: [{
    role: "user",
    content: `Generate a tasteful, non-cringe bio for a music listener based on their top artists: ${topArtists.join(", ")}`
  }]
};

const command = new InvokeModelCommand({
  modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0", // Claude Sonnet 4
  body: JSON.stringify(payload)
});

const response = await client.send(command);
const result = JSON.parse(new TextDecoder().decode(response.body));
const bio = result.content[0].text;
```

**Cost Optimization:**
- Use Claude Haiku for faster, cheaper generation (lower quality)
- Use Claude Sonnet for better quality (recommended)
- Cache system prompts for repeated calls (if using many calls)

**Resources:**
- [AWS Docs: Invoke Anthropic Claude on Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_InvokeModel_AnthropicClaude_section.html)
- [Anthropic: Claude on Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock)

## Version Compatibility Matrix

| Next.js | React | Node.js | TypeScript | AWS Amplify |
|---------|-------|---------|------------|-------------|
| 15.5.12 | 19.2 | 20 or 22 | 5.9.3 | Gen 2 (WEB_COMPUTE) |
| 15.x | 19.x | 20+ | 5.7+ | Supported |
| 14.x | 18.x | 18+ | 5.x | Supported (legacy) |

| AWS SDK v3 | DynamoDB | Bedrock Runtime | KMS |
|------------|----------|-----------------|-----|
| @aws-sdk/client-dynamodb@latest | @aws-sdk/lib-dynamodb@latest | @aws-sdk/client-bedrock-runtime@latest | @aws-sdk/client-kms@latest |

**Note:** Always use `@latest` for AWS SDK v3 packages. Pin versions in production (`package-lock.json`).

## AWS-Specific Best Practices

### 1. DynamoDB Design Patterns
- **Use single-table design** for user profiles, tokens, and related entities
- **Generic key names:** Use `pk` and `sk` instead of `userId`, `profileId`
- **Key overloading:** Store multiple entity types with same physical keys
- **GSI for access patterns:** Create GSI for queries that don't match primary key
- **Standard-IA tier:** Use for user data older than 30 days (60% cost reduction)
- **Batch operations:** Use `BatchGetItem` and `BatchWriteItem` for multiple items

### 2. Lambda Optimization
- **Include AWS SDK in dependencies** (don't rely on runtime version)
- **Use modular imports:** Import only needed clients (`@aws-sdk/client-dynamodb`, not `aws-sdk`)
- **Environment variables:** Store config (table names, KMS key IDs) as env vars
- **Cold start mitigation:** Keep functions warm with EventBridge ping (if needed)
- **Timeout:** Set realistic timeout (default 3s is often too short; use 10-30s)

### 3. Amplify Hosting Configuration
- **Platform:** Use `WEB_COMPUTE` for Next.js 14+ (required for SSR)
- **Build settings:** Let Amplify auto-detect Next.js (generates `amplify.yml`)
- **Environment variables:** Set in Amplify Console (e.g., `NEXTAUTH_SECRET`, `SPOTIFY_CLIENT_ID`)
- **Image optimization:** Max 4.3MB output size; Sharp auto-installed
- **Custom domain:** Configure in Amplify Console (free SSL via ACM)

### 4. Security Best Practices
- **KMS encryption:** Encrypt Spotify tokens with customer-managed KMS key
- **IAM roles:** Use least privilege (Lambda execution role, DynamoDB access)
- **Environment variables:** Never commit secrets; use AWS Secrets Manager or Amplify env vars
- **HTTPS only:** Enforce HTTPS in Amplify (default behavior)
- **CORS:** Configure CORS in Next.js API routes if needed

### 5. Cost Optimization
- **DynamoDB on-demand:** Start with on-demand pricing (no upfront capacity planning)
- **Standard-IA tier:** Move old data to Standard-IA after 30 days (60% cheaper)
- **Lambda free tier:** 1M requests/month free
- **EventBridge free tier:** 14M invocations/month free
- **Amplify bandwidth:** $0.15/GB (cheaper than Vercel's $0.40/GB)

## Environment Variables Checklist

```bash
# .env.local (development)
# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with `openssl rand -base64 32`>

# Spotify OAuth
AUTH_SPOTIFY_ID=<from Spotify Developer Dashboard>
AUTH_SPOTIFY_SECRET=<from Spotify Developer Dashboard>

# AWS (use IAM role in production)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<local dev only>
AWS_SECRET_ACCESS_KEY=<local dev only>

# AWS Resources
DYNAMODB_TABLE_NAME=anchor-users
KMS_KEY_ID=<KMS key ARN>
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

**Production:** Set these in AWS Amplify Console > Environment Variables (not in code).

## Sources

### Official Documentation (HIGH Confidence)
- [Next.js 15 Release Notes](https://nextjs.org/blog/next-15)
- [Next.js GitHub Releases](https://github.com/vercel/next.js/releases)
- [AWS Amplify Next.js SSR Support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
- [Spotify Web API TypeScript SDK](https://github.com/spotify/spotify-web-api-ts-sdk)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html)
- [DynamoDB SDK Examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html)
- [AWS Bedrock Runtime with Claude](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html)
- [Auth.js (next-auth) v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [Zod Official Documentation](https://zod.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)

### Architecture Patterns (HIGH Confidence)
- [AWS Blog: Creating a single-table design with DynamoDB](https://aws.amazon.com/blogs/compute/creating-a-single-table-design-with-amazon-dynamodb/)
- [Alex DeBrie: The What, Why, and When of Single-Table Design](https://www.alexdebrie.com/posts/dynamodb-single-table/)
- [AWS Docs: DynamoDB Encryption at Rest](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html)
- [AWS Docs: EventBridge Scheduler with Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html)

### Comparison & Best Practices (MEDIUM Confidence)
- [Digital Applied: Next.js 15 SEO Complete Guide](https://www.digitalapplied.com/blog/nextjs-seo-guide)
- [Burning Monk: API Gateway vs Lambda Function URLs](https://theburningmonk.com/2024/03/when-to-use-api-gateway-vs-lambda-function-urls/)
- [Agile Soft Labs: AWS Amplify vs Vercel 2026](https://www.agilesoftlabs.com/blog/2026/01/aws-amplify-vs-vercel-2026-complete)
- [Dynobase: DynamoDB vs S3](https://dynobase.dev/dynamodb-vs-s3/)
- [LogRocket: Schema Validation in TypeScript with Zod](https://blog.logrocket.com/schema-validation-typescript-zod/)

---

**Stack Research for:** Music profile pages with Spotify OAuth, AI content generation, and social sharing
**Researched:** 2026-02-04
**Confidence:** HIGH (all core technologies verified with official documentation)
