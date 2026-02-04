# Anchor.band

A tasteful music profile platform where users claim handles, connect Spotify, and publish shareable pages showcasing their music taste.

## What is Anchor?

Anchor.band is like Letterboxd for music - a place to share your music taste in a non-cringe, tasteful way. Connect your Spotify account, claim your unique handle, and get a clean profile page at `anchor.band/yourhandle` that you can share on social media or use as a personal landing page.

**Core Values:**
- Non-cringe, tasteful representation of your music taste
- Clean, minimal design aesthetic
- Fast and reliable

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth v5 (Auth.js) with Google OAuth, Magic Link email, and Spotify OAuth
- **Database**: AWS DynamoDB (single-table design)
- **Token Encryption**: AWS KMS (customer-managed keys)
- **Styling**: Tailwind CSS
- **Email**: Resend
- **Hosting**: AWS Amplify (planned)

## Prerequisites

Before setting up the project, you'll need:

1. **Node.js 22+** installed
2. **AWS Account** with:
   - DynamoDB access
   - KMS access
   - IAM user with appropriate permissions
3. **Google Cloud Console** account (for Google OAuth)
4. **Resend** account (for magic link emails)
5. **Spotify Developer** account (for Spotify OAuth)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy AWS Infrastructure

Deploy the CloudFormation templates to create required AWS resources:

```bash
# Deploy DynamoDB table
aws cloudformation create-stack \
  --stack-name anchor-dynamodb \
  --template-body file://infrastructure/dynamodb-table.json \
  --parameters ParameterKey=TableName,ParameterValue=anchor-auth

# Deploy KMS key
aws cloudformation create-stack \
  --stack-name anchor-kms \
  --template-body file://infrastructure/kms-key.json

# Wait for stacks to complete
aws cloudformation wait stack-create-complete --stack-name anchor-dynamodb
aws cloudformation wait stack-create-complete --stack-name anchor-kms

# Get KMS Key ID
aws cloudformation describe-stacks \
  --stack-name anchor-kms \
  --query 'Stacks[0].Outputs[?OutputKey==`KeyId`].OutputValue' \
  --output text
```

See `infrastructure/README.md` for detailed deployment instructions.

### 3. Configure External Services

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to **APIs & Services → Credentials**
4. Create **OAuth 2.0 Client ID**
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Save your Client ID and Client Secret

#### Resend
1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your domain or use Resend's test domain for development

#### Spotify
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
4. Save your Client ID and Client Secret

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Required variables:

```bash
# Auth.js
AUTH_SECRET=                    # Generate with: openssl rand -base64 32
AUTH_URL=http://localhost:3000

# AWS DynamoDB
AUTH_DYNAMODB_ID=              # AWS IAM access key ID
AUTH_DYNAMODB_SECRET=          # AWS IAM secret access key
AUTH_DYNAMODB_REGION=          # e.g., us-east-1

# AWS KMS
KMS_KEY_ID=                    # From CloudFormation output

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Resend
AUTH_RESEND_KEY=

# Spotify
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
anchor/
├── app/
│   ├── (auth)/              # Authentication pages (signin, verify-email)
│   ├── (protected)/         # Protected routes (profile, settings)
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth handlers
│   │   └── profile/         # Profile management APIs
│   ├── components/          # React components
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── infrastructure/          # CloudFormation templates for AWS
├── lib/                     # Utility libraries
│   ├── dynamodb.ts         # DynamoDB client
│   ├── kms.ts              # KMS encryption utilities
│   ├── handle.ts           # Handle validation and claiming
│   └── spotify.ts          # Spotify token management
├── types/                   # TypeScript type definitions
├── auth.ts                  # NextAuth configuration
├── middleware.ts            # Route protection
└── .planning/              # GSD project planning (not deployed)
```

## Development Notes

### Authentication Flow

1. User signs in with Google or requests magic link email
2. After authentication, user is redirected to `/profile/claim-handle` (if no handle)
3. User claims unique handle with real-time validation
4. User can connect Spotify account (tokens encrypted with KMS)
5. Profile page shows handle, display name, email, and Spotify status

### Handle Validation Rules

- Length: 3-30 characters
- Characters: lowercase alphanumeric and hyphens only
- No leading or trailing hyphens
- No consecutive hyphens
- Reserved words blocked (admin, api, auth, etc.)

### Security

- **Spotify tokens** are encrypted at rest using AWS KMS customer-managed keys
- **Database sessions** used for authentication (required for magic links)
- **DynamoDB transactions** ensure handle uniqueness (prevents race conditions)
- **Route protection** via middleware redirects unauthenticated users

## Current Status

**Phase 1 (Foundation)** - In Progress
- ✅ Next.js 15 project scaffolded
- ✅ AWS infrastructure (DynamoDB, KMS)
- ✅ NextAuth v5 with Google, Email, and Spotify providers
- ⏳ Profile management and handle claiming (verification in progress)

**Coming Next:**
- Phase 2: Spotify data fetching and AI content generation
- Phase 3: Public pages with SSR and social metadata
- Phase 4: Landing page experience

## License

Private project - not open source

---

Built with [GSD (Get Shit Done)](https://github.com/anthropics/claude-code) workflow