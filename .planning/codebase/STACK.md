# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**
- TypeScript 5.x - Used for all source code (frontend and backend)
- JavaScript (ESM modules) - Configuration files (postcss.config.mjs)

**Secondary:**
- JSX/TSX - React components throughout `app/` directory

## Runtime

**Environment:**
- Node.js (version not specified in package.json, no engine constraint)

**Package Manager:**
- npm (with package-lock.json lockfile present)

## Frameworks

**Core:**
- Next.js 15.1.6 - Full-stack React framework with App Router
  - Configured for static export (AWS Amplify compatibility) via `next.config.ts`
  - Authentication middleware in `middleware.ts`
  - Server Actions and API routes
  - Image optimization disabled (`unoptimized: true`)

**UI & Styling:**
- React 19.0.0 - Component library
- React DOM 19.0.0 - DOM rendering
- Tailwind CSS 3.4.1 - Utility-first CSS framework
- PostCSS 8.x - CSS processing pipeline

**Authentication:**
- NextAuth 5.0.0-beta.30 - Session and OAuth management
  - Configured in `auth.ts`
  - DynamoDB adapter for session storage
  - Supports multiple providers: Google OAuth, Spotify OAuth, Email (Resend)
  - Database strategy for sessions

**Email:**
- Resend 6.9.1 - Email delivery service
  - Used in `app/actions/publish.ts`

**AI/LLM:**
- AWS Bedrock Runtime (via @aws-sdk/client-bedrock-runtime 3.983.0)
  - Used for music taste analysis, content generation, and age guessing
  - Integrates via `lib/bedrock/client.ts` and prompts in `lib/bedrock/prompts.ts`

## Key Dependencies

**Critical (Business Logic):**
- @auth/dynamodb-adapter 2.11.1 - Session persistence for NextAuth in DynamoDB
- @aws-sdk/client-bedrock-runtime 3.983.0 - AI model invocation (music analysis)
- next-auth 5.0.0-beta.30 - Authentication framework (Google, Spotify, Email)
- resend 6.9.1 - Email delivery service

**Infrastructure (AWS SDKs):**
- @aws-sdk/client-dynamodb 3.983.0 - DynamoDB table operations
- @aws-sdk/client-kms 3.983.0 - Encryption/decryption of sensitive tokens
- @aws-sdk/lib-dynamodb 3.983.0 - DynamoDB document client with marshalling

**Development:**
- TypeScript 5.x - Static type checking
- ESLint 8.x - Linting (configured via eslint-config-next)
- tsx 4.21.0 - TypeScript execution in scripts
- dotenv 17.2.4 - Environment variable loading
- @types/node @20, @types/react @19, @types/react-dom @19 - Type definitions

## Configuration

**Environment Variables:**
Required at runtime (see `.env.example`):
- `AUTH_SECRET` - NextAuth session secret (required)
- `AUTH_URL` - Production domain for OAuth redirects (e.g., https://anchor.band)
- `AUTH_TRUST_HOST` - Required for AWS Amplify deployments
- `AUTH_DYNAMODB_ID` - AWS IAM access key ID
- `AUTH_DYNAMODB_SECRET` - AWS IAM secret access key
- `AUTH_DYNAMODB_REGION` - AWS region for DynamoDB/KMS (e.g., us-east-1)
- `AUTH_DYNAMODB_TABLE_NAME` - DynamoDB table for sessions (defaults to "anchor-auth")
- `KMS_KEY_ID` - AWS KMS key ARN for token encryption
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `AUTH_RESEND_KEY` - Resend API key for email authentication
- `SPOTIFY_CLIENT_ID` - Spotify OAuth client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify OAuth client secret
- `LASTFM_API_KEY` - Last.fm API key (optional, for Last.fm data alternative)

**TypeScript:**
- `tsconfig.json` - Configured with:
  - Target: ES2017
  - Module resolution: bundler
  - Path aliases: `@/*` maps to root directory
  - Strict mode enabled
  - Incremental compilation

**Build:**
- `next.config.ts` - Next.js configuration
  - Images: Unoptimized for Amplify static export compatibility
- `postcss.config.mjs` - PostCSS configuration
  - Tailwind CSS plugin integration
- `amplify.yml` - AWS Amplify deployment configuration
  - Build phase: npm ci, environment variable setup, npm run build
  - Artifacts: `.next` directory
  - Caching: `.next/cache` and `.npm` directories

**Package Manager Config:**
- `.npmrc` - Not detected

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- Environment variables from `.env.local` or `.env.production`

**Production:**
- AWS Amplify (primary deployment target)
- AWS DynamoDB (sessions, user data, Spotify tokens)
- AWS KMS (token encryption)
- AWS Bedrock (AI features)
- AWS IAM user with permissions for DynamoDB, KMS, Bedrock

## Deployment

**Hosting Platform:**
- AWS Amplify (configured in `amplify.yml`)
- Uses static export capability for frontend
- Server-side rendering via Next.js

**Build Output:**
- `.next` directory (server and static assets)
- Static export compatible with AWS Amplify

---

*Stack analysis: 2026-02-08*
