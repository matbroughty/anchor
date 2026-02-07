# Anchor.band

**Live at: https://anchor.band**

A tasteful music profile platform where users claim handles, connect Spotify, and publish shareable pages showcasing their music taste.

## What is Anchor?

Anchor.band is like Letterboxd for music - a place to share your music taste in a non-cringe, tasteful way. Connect your Spotify account, claim your unique handle, and get a clean profile page at `anchor.band/yourhandle` that you can share on social media or use as a personal landing page.

**Features:**
- 🎵 Connect Spotify and showcase your top artists, albums, and tracks
- 🤖 AI-generated bios and album captions (powered by Claude)
- ⭐ Highlight up to 3 featured artists on your profile
- 📊 Fun music taste analysis with critic-informed insights
- 👁️ View counter to see how many people visit your page
- 🔗 Shareable public profile at your unique handle
- 🎨 Clean, minimal, album-first design aesthetic

**Core Values:**
- Non-cringe, tasteful representation of your music taste
- Clean, minimal design aesthetic
- Fast and reliable

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Authentication**: NextAuth v5 (Auth.js) with Google OAuth, Magic Link email, and Spotify OAuth
- **Database**: AWS DynamoDB (single-table design)
- **Token Encryption**: AWS KMS (customer-managed keys)
- **AI Content Generation**: AWS Bedrock (Claude 3.5 Sonnet & Haiku)
- **Music Data**: Spotify Web API
- **Styling**: Tailwind CSS
- **Email**: Resend
- **Hosting**: AWS Amplify

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

## Features

### Music Profile
- **Spotify Integration**: Connect your Spotify account to automatically fetch your top artists, albums, and tracks
- **Public Profile Pages**: Clean, shareable pages at `anchor.band/yourhandle`
- **Featured Artists**: Highlight up to 3 favorite artists with circular profile images and blue ring highlighting
- **Album-First Design**: Prominent album artwork display with captions
- **Top Artists & Tracks**: Scrollable sections showcasing your music taste

### AI-Powered Content
- **Smart Bio Generation**: AI writes a tasteful, non-cringe bio based on your listening patterns
  - Analyzes your top artists and tracks
  - Considers your featured artists for personalized context
  - Editable after generation
- **Album Captions**: One-sentence AI-generated captions for each album
  - Contextual to your overall taste
  - Highlights featured artist albums
  - Regenerate individual captions anytime
- **Music Taste Analysis**: Fun critic-informed analysis of your music taste
  - Traffic light rating system (green/amber/red)
  - Breakdown by artists and albums with reasoning
  - "Critic vibe" tags (indie-head, poptimist, etc.)
  - Green/amber/red flags in your taste
  - Personalized recommendations ("If you like X, try Y")
  - Dashboard-only (not published to profile yet)

### Analytics
- **View Counter**: Track how many times your public profile is viewed
  - Automatically excludes your own views
  - Displayed in navigation bar (owner-only)
  - Comma-formatted display (e.g., "1,234 views")
  - Atomic DynamoDB increments prevent race conditions

### Publishing & Privacy
- **Publish Toggle**: Control whether your profile is publicly visible
- **Handle Claiming**: Unique handles with real-time validation
- **Profile Management**: Edit display name, bio, and featured artists

## Project Structure

```
anchor/
├── app/
│   ├── (auth)/              # Authentication pages (signin, verify-email)
│   ├── (protected)/         # Protected routes
│   │   ├── dashboard/       # Dashboard with content management
│   │   └── profile/         # Profile settings
│   ├── [handle]/            # Public profile pages (dynamic route)
│   ├── actions/             # Server actions
│   │   ├── ai-content.ts    # Bio & caption generation
│   │   ├── taste-analysis.ts # Music taste analysis
│   │   ├── spotify.ts       # Spotify data fetching
│   │   └── featured-artists.ts # Featured artist management
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth handlers
│   │   └── profile/         # Profile management APIs
│   ├── components/          # React components
│   │   ├── PublicProfile.tsx # Public profile display
│   │   ├── TasteAnalysis.tsx # Taste analysis UI
│   │   ├── BioEditor.tsx    # Bio editing interface
│   │   ├── AlbumCaptions.tsx # Caption management
│   │   └── FeaturedArtistsEditor.tsx # Featured artist selection
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── infrastructure/          # CloudFormation templates for AWS
├── lib/
│   ├── bedrock/             # AWS Bedrock AI integration
│   │   ├── client.ts        # Bedrock client configuration
│   │   └── prompts.ts       # AI system prompts
│   ├── dynamodb/            # DynamoDB data layer
│   │   ├── content.ts       # Bio, captions, taste analysis
│   │   ├── featured-artists.ts # Featured artist storage
│   │   ├── music-data.ts    # Spotify music data
│   │   ├── public-profile.ts # Public profile queries
│   │   ├── view-counter.ts  # View counting logic
│   │   └── schema.ts        # Single-table design schema
│   ├── dynamodb.ts          # DynamoDB client
│   ├── kms.ts               # KMS encryption utilities
│   ├── handle.ts            # Handle validation and claiming
│   └── spotify.ts           # Spotify token management
├── types/                   # TypeScript type definitions
│   ├── content.ts           # Content types (bio, captions, analysis)
│   └── music.ts             # Music types (artists, albums, tracks)
├── auth.ts                  # NextAuth configuration
├── middleware.ts            # Route protection
└── .planning/               # GSD project planning (not deployed)
```

## Development Notes

### User Journey

1. **Sign In**: User authenticates with Google OAuth or magic link email
2. **Claim Handle**: After first sign-in, user claims unique handle with real-time validation
3. **Connect Spotify**: User connects Spotify account (tokens encrypted with KMS)
4. **Fetch Music Data**: System retrieves top 50 artists, 6 albums, and 50 tracks from Spotify
5. **Generate Content**: AI generates bio and album captions based on music taste
6. **Customize Profile**: User can:
   - Edit bio and captions
   - Select up to 3 featured artists
   - Generate music taste analysis
7. **Publish**: User toggles profile to public, making it visible at `anchor.band/handle`
8. **Share**: Profile URL can be shared on social media

### Handle Validation Rules

- Length: 3-30 characters
- Characters: lowercase alphanumeric and hyphens only
- No leading or trailing hyphens
- No consecutive hyphens
- Reserved words blocked (admin, api, auth, etc.)

### AI Content Generation

All AI content follows strict anti-cringe rules:
- No emojis
- No hype words (amazing, incredible, fire, etc.)
- No clichés or superlatives
- Factual, conversational language with subtle humor
- Specific observations rather than generic praise

**Models Used:**
- **Claude 3.5 Sonnet**: Music taste analysis (complex reasoning)
- **Claude 3 Haiku**: Bio and caption generation (fast, cost-effective)

### Data Architecture

**Single-Table DynamoDB Design:**
- Partition Key: `USER#{userId}` or `HANDLE#{handle}`
- Sort Keys:
  - `USER#{userId}` - User record
  - `MUSIC#ARTISTS` - Top artists
  - `MUSIC#ALBUMS` - Top albums
  - `MUSIC#TRACKS` - Top tracks
  - `MUSIC#FEATURED_ARTISTS` - Featured artists
  - `PROFILE#METADATA` - Last refresh timestamp, view count
  - `CONTENT#BIO` - AI-generated bio
  - `CONTENT#CAPTION#{albumId}` - Album captions
  - `CONTENT#TASTE_ANALYSIS` - Taste analysis
  - `HANDLE#{handle}` - Handle → userId lookup

**View Counter:**
- Atomic ADD operations prevent race conditions
- Increments only for non-owner views
- Displayed only to profile owner

### Security

- **Spotify tokens** are encrypted at rest using AWS KMS customer-managed keys
- **Database sessions** used for authentication (required for magic links)
- **DynamoDB transactions** ensure handle uniqueness (prevents race conditions)
- **Route protection** via middleware redirects unauthenticated users
- **ISR caching** for public profiles (1-hour revalidation)

## Current Status

**✅ Live Production Site**: https://anchor.band

**Completed Features:**
- ✅ Next.js 15 App Router with full TypeScript
- ✅ AWS infrastructure (DynamoDB single-table, KMS, Bedrock)
- ✅ NextAuth v5 with Google OAuth, Magic Links, and Spotify OAuth
- ✅ Profile management with handle claiming and validation
- ✅ Spotify data fetching (artists, albums, tracks)
- ✅ AI content generation (bios, captions, taste analysis)
- ✅ Featured artists with customizable highlighting
- ✅ Public profile pages with ISR (1-hour revalidation)
- ✅ View counter with atomic increments
- ✅ Dashboard with content management
- ✅ Publish/unpublish toggle
- ✅ Social metadata (Open Graph, Twitter Cards)
- ✅ Responsive design (mobile-first)
- ✅ Dark mode support

**Potential Future Enhancements:**
- Public taste analysis (currently dashboard-only)
- Social features (following, likes)
- Playlist creation from profile
- Music discovery feed
- Advanced analytics

## License

Private project - not open source

---

Built with [GSD (Get Shit Done)](https://github.com/anthropics/claude-code) workflow