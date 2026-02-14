# Anchor.band

**Live at: https://anchor.band**

A tasteful music profile platform where users claim handles, connect their music service (Spotify, Last.fm, or self-curate), and publish shareable pages showcasing their music taste.

## What is Anchor?

Anchor.band is like Letterboxd for music - a place to share your music taste in a non-cringe, tasteful way. Connect Spotify, Last.fm, or manually curate your favorite music, claim your unique handle, and get a clean profile page at `anchor.band/yourhandle` that you can share on social media or use as a personal landing page.

**Features:**
- 🎵 Three music source options: Spotify, Last.fm, or Self-Curate (manual selection)
- 📖 Musical Eras timeline - curate key albums from your musical journey
- 🤖 AI-generated bios and album captions (powered by Claude)
- ⭐ Highlight up to 4 favourite artists on your profile
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
- **Music Data**: Spotify Web API, Last.fm API, Apple Music API (catalog search)
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
6. **Last.fm API** account (for Last.fm integration)
7. **Apple Developer Program** membership (for Apple Music catalog search)

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

#### Last.fm
1. Go to [Last.fm API](https://www.last.fm/api/account/create)
2. Create an API account
3. Save your API Key and Shared Secret

#### Apple Music
1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Go to [Apple Developer Portal](https://developer.apple.com/account)
3. Create a MusicKit identifier under Certificates, Identifiers & Profiles
4. Generate a MusicKit private key (.p8 file)
5. Download the private key and save your Team ID and Key ID

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

# Last.fm
LASTFM_API_KEY=
LASTFM_SHARED_SECRET=

# Apple Music
APPLE_MUSIC_TEAM_ID=           # 10-character team ID
APPLE_MUSIC_KEY_ID=            # 10-character key ID
APPLE_MUSIC_PRIVATE_KEY=       # Multiline private key from .p8 file
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### Music Sources (Choose One)
- **Spotify Integration**: Connect Spotify to automatically fetch your top artists, albums, and tracks from listening history
- **Last.fm Integration**: Connect Last.fm username to showcase your scrobble data
- **Self-Curate (Manual)**: Manually select your favorite 6 artists, 6 albums, and 10 tracks via Apple Music catalog search (no Apple Music account required)
- **Switch Anytime**: Change between music sources at any time from your profile settings

### Musical Eras Timeline
- **Curated Journey**: Build a horizontal timeline of key albums from your musical journey
- **7 Prompts**: Answer thoughtful questions like "First Album," "Taste Shift," "Forever Album"
- **Smart Search**: Uses Spotify API if connected, otherwise Apple Music catalog (no authentication required)
- **Timeline Modes**: Display by release date, with your age at release (life_era mode), or custom order
- **Public Display**: Timeline appears prominently on your published profile page

### Music Profile
- **Public Profile Pages**: Clean, shareable pages at `anchor.band/yourhandle`
- **Favourite Artists**: Highlight up to 4 favourite artists with circular profile images and blue ring highlighting
- **Album-First Design**: Prominent album artwork display with captions
- **Top Recent Artists & Tracks**: Scrollable sections showcasing your music taste
- **Service Indicators**: Profile shows whether data comes from Spotify, Last.fm, or manual curation

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
│   │   ├── profile/         # Profile settings
│   │   ├── curate/          # Manual curation interface
│   │   └── eras/            # Musical Eras wizard
│   ├── [handle]/            # Public profile pages (dynamic route)
│   ├── actions/             # Server actions
│   │   ├── ai-content.ts    # Bio & caption generation
│   │   ├── taste-analysis.ts # Music taste analysis
│   │   ├── spotify.ts       # Spotify data fetching
│   │   ├── lastfm.ts        # Last.fm integration
│   │   ├── manual-curation.ts # Manual music curation
│   │   ├── eras.ts          # Musical Eras management
│   │   └── featured-artists.ts # Featured artist management
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth handlers
│   │   └── profile/         # Profile management APIs
│   ├── components/          # React components
│   │   ├── PublicProfile.tsx # Public profile display
│   │   ├── ErasTimeline.tsx # Musical Eras timeline rail
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
│   │   ├── music-data.ts    # Music data (Spotify/Last.fm/Manual)
│   │   ├── lastfm-data.ts   # Last.fm data fetching
│   │   ├── public-profile.ts # Public profile queries
│   │   ├── view-counter.ts  # View counting logic
│   │   └── schema.ts        # Single-table design schema
│   ├── dynamodb.ts          # DynamoDB client
│   ├── kms.ts               # KMS encryption utilities
│   ├── handle.ts            # Handle validation and claiming
│   ├── spotify.ts           # Spotify API integration
│   ├── lastfm.ts            # Last.fm API integration
│   ├── apple-music.ts       # Apple Music API integration
│   └── eras-prompts.ts      # Musical Eras wizard prompts
├── types/                   # TypeScript type definitions
│   ├── content.ts           # Content types (bio, captions, analysis)
│   ├── music.ts             # Music types (artists, albums, tracks)
│   └── eras.ts              # Musical Eras types (timeline, entries, prompts)
├── auth.ts                  # NextAuth configuration
├── middleware.ts            # Route protection
└── .planning/               # GSD project planning (not deployed)
```

## Development Notes

### User Journey

1. **Sign In**: User authenticates with Google OAuth or magic link email
2. **Claim Handle**: After first sign-in, user claims unique handle with real-time validation
3. **Choose Music Source**: User selects one of three options:
   - **Spotify**: OAuth connection, tokens encrypted with KMS
   - **Last.fm**: Enter username (validated via Last.fm API)
   - **Self-Curate**: Manually search and select 6 artists, 6 albums, 10 tracks via Apple Music catalog
4. **Fetch Music Data**: System retrieves music data from chosen source
5. **Create Musical Eras** (Optional): User can build timeline of key albums from their musical journey
6. **Generate Content**: AI generates bio and album captions based on music taste
7. **Customize Profile**: User can:
   - Edit bio and captions
   - Select up to 4 favourite artists
   - Generate music taste analysis
   - Reorder or edit Musical Eras timeline
8. **Publish**: User toggles profile to public, making it visible at `anchor.band/handle`
9. **Share**: Profile URL can be shared on social media

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
  - `USER#{userId}` - User record (includes lastfmUsername, manualCuration flags)
  - `SPOTIFY` - Encrypted Spotify tokens (if Spotify connected)
  - `MUSIC#ARTISTS` - Top artists (from Spotify, Last.fm, or manual)
  - `MUSIC#ALBUMS` - Top albums (from Spotify, Last.fm, or manual)
  - `MUSIC#TRACKS` - Top tracks (from Spotify, Last.fm, or manual)
  - `MUSIC#FEATURED_ARTISTS` - Featured artists
  - `ERAS` - Musical Eras timeline data (entries with album metadata)
  - `PROFILE#METADATA` - Last refresh timestamp, view count
  - `CONTENT#BIO` - AI-generated bio
  - `CONTENT#CAPTIONS` - Album captions
  - `CONTENT#TASTE_ANALYSIS` - Taste analysis
  - `CONTENT#AGE_GUESS` - Age guess game data
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
- ✅ Three music source options: Spotify, Last.fm, Self-Curate
- ✅ Spotify integration (OAuth, encrypted tokens, automatic sync)
- ✅ Last.fm integration (username connection, scrobble data)
- ✅ Manual curation (Apple Music catalog search, no account required)
- ✅ Musical Eras timeline (7-prompt wizard, horizontal timeline display)
- ✅ Smart album search (Spotify API for Spotify users, Apple Music API fallback)
- ✅ AI content generation (bios, captions, taste analysis, age guess)
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
- Musical Eras timeline customization (add notes, edit dates, reorder)
- Social features (following, likes, comments)
- Playlist creation from profile
- Music discovery feed
- Advanced analytics
- Additional timeline modes (genre-based, mood-based)
- Import/export Musical Eras timelines

## License

Private project - not open source

---

Built with [GSD (Get Shit Done)](https://github.com/anthropics/claude-code) workflow