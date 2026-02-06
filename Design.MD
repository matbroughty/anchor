
# Anchor.band — full product + tech design (Option A)
Target domain: `anchor.band`  
Version: v1 (no monetisation)  
Last updated: 2026-02-04

---

## 1) Product intent
Anchor.band creates a **calm, album-first personal music taste page** (Letterboxd energy, simplified).  
Users claim a handle, connect Spotify, auto-generate tasteful copy, and publish:

`https://anchor.band/<handle>`

Non-goals (explicit):
- No ratings, reviews, comments, likes, follows, feeds
- No monetisation, billing, ads
- No template marketplace / heavy theming

---

## 2) User flows

### 2.1 Public viewing
- Anyone can view `/<handle>` if `isPublic=true`.
- Page renders server-side for correct social previews.
- Page must be fast, mobile-first, minimal.

### 2.2 Signup + publish
1) Claim handle + display name (optional socials)
2) Connect Spotify
3) Generate copy (AWS Bedrock)
4) Publish
5) Copy link

### 2.3 Refresh
- Default: auto refresh every 7 days
- Manual: “Refresh now” (cooldown enforced)
- Lock: disable auto refresh (page stays stable until manual refresh)

---

## 3) UI design (single layout)

### 3.1 Header
- Display name
- @handle (muted)
- AI bio (1–2 sentences max, non-cringe)

### 3.2 Top Artists
- 5–6 artists
- Circular images
- Link to Spotify artist

### 3.3 Records I’d Stand By (albums)
- 3–5 derived albums
- Square covers (no rounding)
- Album title + artist
- Optional 1-line caption per album (max 8 words)

### 3.4 On Repeat (tracks)
- 3 tracks
- Text-only list (Track — Artist)
- Link to Spotify track

### 3.5 Elsewhere
- Social icons only (no usernames shown)
- Optional website icon

### 3.6 Footer
- “Powered by Anchor”
- Spotify attribution

---

## 4) Content / copy rules (anti-cringe)

### 4.1 Bio rules
- Max 2 sentences
- No emojis
- No hype words (“iconic”, “legendary”, “masterpiece”)
- No clichés: ban phrases like “music lover”, “passionate”, “eclectic”
- Do not mention Spotify explicitly

### 4.2 Album line rules
- Max 8 words per album
- No emojis, no exclamation marks
- No “best”, “iconic”, “masterpiece”
- No genres, no years
- No first-person “I”
- Empty string is allowed (better than cringe)

---

## 5) Tech stack (AWS Option A)

### Frontend
- Next.js (TypeScript) — required for OG meta tags + SSR
- Hosted on AWS Amplify Hosting (GitHub integration)

### Backend
- API Gateway (REST) + Lambda (Node.js 20 + TS)

### Data
- DynamoDB (profiles)
- DynamoDB (tokens) + KMS encryption

### LLM
- AWS Bedrock runtime (InvokeModel)

### Social share images (optional v1)
- S3 for per-handle OG images, fronted by CloudFront

### DNS
- Route 53 for `anchor.band`

This can be set-up manually if easier to provide instructions

---

## 6) Spotify integration

### 6.1 OAuth
- Authorization Code flow (server-side code exchange)
- Store access+refresh tokens encrypted using KMS
- Minimal scopes:
  - `user-top-read`
  - optional: `user-read-recently-played`

### 6.2 Endpoints used
- `GET /v1/me`
- `GET /v1/me/top/artists?time_range=medium_term&limit=6`
- `GET /v1/me/top/tracks?time_range=medium_term&limit=10`

### 6.3 Deriving albums (since Spotify has no /me/top/albums)
- From top tracks, take `track.album`
- Group by `album.id`, count occurrences
- Sort by count desc
- Pick 3–5 unique albums
- Store only required fields (id, name, artist, image, url)

### 6.4 Rate limiting
- On 429, read `Retry-After` and retry once
- Never call Spotify on public page views

---

## 7) Bedrock generation

### 7.1 Inputs
- displayName
- top artist names
- derived albums (id, name, artist)
- top tracks (name, artist)

### 7.2 Outputs stored
- `bio` (string)
- `albumLines` (map albumId -> string)

### 7.3 Prompting (recommended: single call)
Return **JSON only**:

```json
{
  "bio": "…",
  "albumLines": {
    "<albumId>": "…"
  }
}
````

### 7.4 Validation (server-side)

* Parse JSON; if parse fails, proceed with safe defaults
* Enforce constraints; trim or blank invalid lines
* Prefer stable copy: only regenerate when “material data” changes (hash)

---

## 8) Data model (DynamoDB)

### 8.1 Table: AnchorProfiles

Partition key:

* `pk` = `USER#<handle>`

Attributes (core):

* `handle` (string)
* `displayName` (string)
* `isPublic` (bool)
* `socials` (map<string,string>)
* `spotify` (map)

    * `connected` (bool)
    * `topArtists` (list)
    * `topTracks` (list)
    * `topAlbums` (list)
    * `lastRefreshed` (ISO)
* `bio` (string)
* `albumLines` (map<string,string>)
* `spotifyDataHash` (string)
* `createdAt`, `updatedAt` (ISO)

Refresh controls:

* `autoRefreshEnabled` (bool, default true)
* `nextRefreshAt` (ISO)
* `lastSpotifyRefreshAt` (ISO)
* `lastManualRefreshAt` (ISO, optional)
* `lastPublishAt` (ISO, optional)

Locking / concurrency:

* `refreshLockUntil` (ISO, optional)
* `refreshLockId` (string, optional)

GSI fields:

* `gsi1pk` (string, optional)
* `gsi1sk` (string, optional)

### 8.2 Table: AnchorTokens (recommended)

Partition key:

* `pk` = `USER#<handle>`

Attributes:

* `spotifyTokenEnc` (base64 string) — KMS encrypted JSON blob
* `updatedAt` (ISO)

---

## 9) CRUD: do we need Delete now?

### 9.1 Short answer

You don’t need “hard delete” on day 1, but you **do need a way for the user to remove their page** (privacy + trust).

### 9.2 Recommended v1 approach: **Soft delete**

Implement a “Delete my page” action that:

* immediately unpublishes the page
* deletes or invalidates Spotify tokens
* schedules removal of profile data after a short delay

Practical behaviour:

* Set `isPublic=false`
* Set `deletedAt=<nowISO>`
* Remove `gsi1pk/gsi1sk` (stop auto refresh)
* Delete token record in `AnchorTokens`
* Optionally wipe cached Spotify data and generated copy

What the public sees:

* `/handle` returns 404

This is enough for v1 and avoids footguns.

### 9.3 Hard delete (v2)

If/when needed:

* Delete item in `AnchorProfiles`
* Delete tokens
* Delete OG image from S3

Hard delete is simple, but soft delete is safer while you iterate.

---

## 10) Refresh scheduling WITHOUT scanning

### 10.1 GSI: GSI1_DueRefresh

* Partition key: `gsi1pk`
* Sort key: `gsi1sk`

Populate only if:

* spotify.connected == true
* autoRefreshEnabled == true
* isPublic == true (optional — recommended to avoid refreshing unpublished users)
* deletedAt not set

Values:

* `gsi1pk = "AUTO#1"`
* `gsi1sk = "<nextRefreshAt>#<handle>"`

### 10.2 Query for due refresh

* Query GSI where:

    * `gsi1pk = "AUTO#1"`
    * `gsi1sk <= "<nowISO>#~"`

### 10.3 EventBridge schedule

* Run a Lambda hourly:

    * query due items with Limit (25–100)
    * refresh each
    * update `nextRefreshAt` to now+7d and rewrite `gsi1sk`

---

## 11) Concurrency + locking (prevent double refresh)

### 11.1 Lock acquisition pattern

Use conditional update to acquire only if:

* no lock exists OR lock is expired

ConditionExpression:

* `attribute_not_exists(refreshLockUntil) OR refreshLockUntil < :now`

Set:

* `refreshLockUntil = now + 5m`
* `refreshLockId = <uuid>`

If conditional fails:

* someone else is refreshing; skip.

### 11.2 Lock release

Release explicitly (preferred) using lockId match, or allow expiry.

---

## 12) DynamoDB UpdateExpression patterns (key ones)

### 12.1 Acquire refresh lock (conditional)

ConditionExpression:

* `attribute_not_exists(refreshLockUntil) OR refreshLockUntil < :now`

UpdateExpression:

* `SET refreshLockUntil = :lockUntil,
      refreshLockId = :lockId,
      updatedAt = :now`

### 12.2 Release refresh lock (only if lockId matches)

ConditionExpression:

* `refreshLockId = :lockId`

UpdateExpression:

* `REMOVE refreshLockUntil, refreshLockId
   SET updatedAt = :now`

### 12.3 Disable auto refresh (lock toggle OFF)

UpdateExpression:

* `SET autoRefreshEnabled = :false,
      updatedAt = :now
   REMOVE gsi1pk, gsi1sk`

### 12.4 Soft delete (recommended v1 “delete”)

UpdateExpression:

* `SET isPublic = :false,
      deletedAt = :now,
      updatedAt = :now
   REMOVE gsi1pk, gsi1sk, nextRefreshAt`

Then:

* Delete `AnchorTokens` item for this handle
* (Optional) remove spotify/topArtists/topTracks/topAlbums/bio/albumLines to minimise retained data

---

## 13) API contract (REST)

Auth:

* Write endpoints require Cognito JWT
* Public reads do not

Endpoints:

* `POST /api/profile`                     (create/update base profile)
* `GET  /api/profile/{handle}`            (public profile if isPublic)
* `GET  /api/auth/spotify/start`          (build authorize URL)
* `GET  /api/auth/spotify/callback`       (exchange code, fetch/cache data)
* `POST /api/profile/generate`            (Bedrock generate; store bio/albumLines)
* `POST /api/profile/publish`             (set isPublic=true)
* `POST /api/profile/refreshNow`          (manual refresh w/ cooldown)
* `POST /api/profile/autoRefreshToggle`   (on/off)
* `POST /api/profile/delete`              (soft delete + token deletion)

---

## 14) Social previews (must-have)

Route: `/<handle>` (Next.js SSR)
Emit meta tags:

* `og:title`
* `og:description` (bio)
* `og:image` (per-handle or generic)
* `og:url` ([https://anchor.band/](https://anchor.band/)<handle>)
* `twitter:card = summary_large_image`

---

## 15) Monitoring (minimal)

CloudWatch for health + a few custom metrics:

* SignupStarted
* SpotifyConnected
* PagePublished
* PageViewed (no handle dimension initially)
* ManualRefresh (optional)

---

## 16) Acceptance criteria

* Published `/<handle>` renders correctly on mobile + desktop
* URL generates rich preview on Slack + X + WhatsApp
* Signup to publish takes < 60 seconds
* Spotify & Bedrock never called during public page view
* Weekly auto refresh default, can be disabled, manual refresh obeys cooldown
* Delete removes page immediately (404) and removes tokens

```

