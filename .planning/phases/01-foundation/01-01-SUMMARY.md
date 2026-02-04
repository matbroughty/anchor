---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [next.js, next-auth, aws, dynamodb, kms, cloudformation, typescript]

# Dependency graph
requires:
  - phase: initialization
    provides: Project structure and roadmap
provides:
  - Next.js 15 application with App Router and TypeScript
  - Auth.js (NextAuth v5) beta installation with AWS adapters
  - CloudFormation templates for DynamoDB table and KMS key
  - DynamoDB document client configured for Auth.js adapter
  - KMS encryption utilities for Spotify token security
affects: [01-02, authentication, oauth, spotify-integration]

# Tech tracking
tech-stack:
  added: [next@15.1.6, next-auth@5.0.0-beta.30, @auth/dynamodb-adapter@2.11.1, @aws-sdk/client-kms@3.983.0, @aws-sdk/client-dynamodb@3.983.0, @aws-sdk/lib-dynamodb@3.983.0, tailwindcss@3.4.1]
  patterns: [App Router structure, CloudFormation IaC, KMS encryption context, DynamoDB document client marshalling]

key-files:
  created: [package.json, next.config.ts, tsconfig.json, app/layout.tsx, app/page.tsx, lib/dynamodb.ts, lib/kms.ts, types/env.d.ts, infrastructure/dynamodb-table.json, infrastructure/kms-key.json, infrastructure/README.md, .env.example, .gitignore]
  modified: []

key-decisions:
  - "Use Next.js 15 with App Router (not Pages Router) for modern React Server Components"
  - "Install next-auth@beta for NextAuth v5 with native App Router support"
  - "Configure DynamoDB adapter with specific marshalling options required by Auth.js"
  - "Use consistent encryption context for KMS (purpose: spotify-token, app: anchor)"
  - "Enable KMS key rotation from day one for security best practices"
  - "Use CloudFormation for infrastructure-as-code rather than manual AWS console setup"

patterns-established:
  - "Environment variables use AUTH_ prefix (NextAuth v5 convention)"
  - "CloudFormation templates with comprehensive outputs and exports"
  - "TypeScript type definitions for environment variables in types/env.d.ts"
  - "Error handling with typed responses in KMS utilities"

# Metrics
duration: 5min
completed: 2026-02-04
---

# Phase 1 Plan 01: Foundation Infrastructure Summary

**Next.js 15 with Auth.js beta, DynamoDB adapter configuration, and KMS token encryption ready for NextAuth integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-04T20:48:52Z
- **Completed:** 2026-02-04T20:54:32Z
- **Tasks:** 3
- **Files modified:** 14

## Accomplishments
- Next.js 15 application scaffolded with App Router, TypeScript, and Tailwind CSS
- All authentication dependencies installed (next-auth@beta, DynamoDB adapter, AWS SDK v3)
- Production-ready CloudFormation templates for DynamoDB table (with GSI1) and KMS key
- Type-safe AWS client utilities configured per Auth.js adapter requirements

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15 Project** - `8763d4f` (feat)
2. **Task 2: Create AWS Infrastructure Templates** - `5cf6b5e` (feat)
3. **Task 3: Create DynamoDB and KMS Client Utilities** - `bd650b0` (feat)

## Files Created/Modified
- `package.json` - Next.js 15 with authentication and AWS dependencies
- `next.config.ts` - Next.js configuration
- `tsconfig.json` - TypeScript configuration with path aliases
- `tailwind.config.ts` - Tailwind CSS configuration
- `app/layout.tsx` - Root layout with metadata
- `app/page.tsx` - Homepage placeholder
- `app/globals.css` - Global styles with Tailwind
- `lib/dynamodb.ts` - DynamoDB document client with Auth.js marshalling options
- `lib/kms.ts` - KMS encrypt/decrypt utilities with consistent encryption context
- `types/env.d.ts` - TypeScript environment variable definitions
- `infrastructure/dynamodb-table.json` - CloudFormation template for auth table with pk/sk + GSI1
- `infrastructure/kms-key.json` - CloudFormation template for Spotify token encryption key
- `infrastructure/README.md` - Comprehensive deployment guide and IAM policy documentation
- `.env.example` - All required environment variables documented

## Decisions Made

**CloudFormation over manual setup:** Using infrastructure-as-code for reproducible deployments and version control of AWS resources.

**On-demand billing for DynamoDB:** Pay-per-request pricing appropriate for initial launch with unpredictable traffic patterns. Can migrate to provisioned capacity if usage becomes consistent.

**Enable KMS key rotation immediately:** Security best practice from day one. AWS KMS handles old key versions transparently for decryption.

**Consistent encryption context:** Using `{ purpose: "spotify-token", app: "anchor" }` as immutable constants to prevent encrypt/decrypt mismatches.

**Auth.js adapter marshalling options:** Following official adapter requirements with `convertEmptyValues`, `removeUndefinedValues`, and `convertClassInstanceToMap` for DynamoDB compatibility.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**NPM cache permission error:** Global npm cache had root-owned files from previous npm versions. Resolved by using temporary cache directory (`--cache /tmp/npm-cache-anchor`) instead of requiring sudo access.

**Port 3000 in use:** Dev server automatically selected port 3001. No action needed - Next.js handles port conflicts gracefully.

## User Setup Required

**External services require manual configuration.** The following AWS resources must be deployed before the application can authenticate users:

### Required Steps

1. **Deploy DynamoDB table:**
   ```bash
   aws cloudformation create-stack \
     --stack-name anchor-auth-table \
     --template-body file://infrastructure/dynamodb-table.json
   ```

2. **Deploy KMS encryption key:**
   ```bash
   aws cloudformation create-stack \
     --stack-name anchor-kms-key \
     --template-body file://infrastructure/kms-key.json
   ```

3. **Create IAM user with permissions:**
   - DynamoDB: PutItem, GetItem, UpdateItem, DeleteItem, Query, Scan on table and GSI1
   - KMS: Encrypt, Decrypt, DescribeKey on the created key

4. **Set environment variables in `.env.local`:**
   ```
   AUTH_DYNAMODB_ID=<IAM access key>
   AUTH_DYNAMODB_SECRET=<IAM secret key>
   AUTH_DYNAMODB_REGION=<region>
   KMS_KEY_ID=<key ID from CloudFormation output>
   ```

See `infrastructure/README.md` for complete deployment guide with commands and IAM policy template.

## Next Phase Readiness

**Ready for NextAuth configuration:** All infrastructure utilities are in place. Plan 01-02 can proceed with:
- Configuring Auth.js with Google OAuth, Resend magic links, and Spotify OAuth
- Implementing NextAuth route handlers
- Setting up session management with the DynamoDB adapter

**No blockers:** CloudFormation templates validated successfully with AWS CLI. TypeScript compilation passes without errors. All dependencies installed.

**Pending user action:** AWS infrastructure must be deployed and credentials configured before authentication features can be tested. This is expected and documented in infrastructure/README.md.

---
*Phase: 01-foundation*
*Completed: 2026-02-04*
