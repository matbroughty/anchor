# Codebase Concerns

**Analysis Date:** 2026-02-08

## Tech Debt

**Orphaned Album Captions on Spotify Disconnect:**
- Issue: When a user disconnects Spotify via `disconnectSpotify()`, individual album captions with dynamic sort keys (CONTENT#CAPTION#{albumId}) are left orphaned in DynamoDB rather than deleted
- Files: `app/actions/disconnect-spotify.ts` (lines 63-65)
- Impact: Over time, disconnecting and reconnecting users accumulate orphaned caption records in the database. No functional impact on user experience but increases storage costs and data complexity
- Fix approach: Implement a batch delete operation using Query + Delete loop for all CONTENT#CAPTION# prefixed sort keys when disconnecting. Consider wrapping in a transaction to ensure atomicity

**Landing Examples File Size:**
- Issue: `lib/landing-examples.ts` is 657 lines and contains hardcoded mock data for three landing page profiles with extensive Spotify-like object structures
- Files: `lib/landing-examples.ts`
- Impact: Large JSON-like data structure makes the file hard to maintain. If landing examples need updates, it requires touching this monolithic data file
- Fix approach: Consider moving to a JSON file or database seeded data. Could split into separate constant files if more examples are added

**Console Logging in Production Code:**
- Issue: Multiple console.log and console.error statements throughout server-side code leave debugging output in production logs
- Files: `auth.ts` (lines 20-21), `app/actions/ai-content.ts` (lines 153-154), `app/actions/age-guess.ts` (lines 65-69), `lib/spotify.ts` (line 48), and others
- Impact: Production logs cluttered with debug information. Makes it harder to spot real errors in log aggregation tools. Adds noise for operations team
- Fix approach: Replace console statements with structured logging using a logging library (Winston, Pino, or similar). Keep only error-level logs in production

## Known Bugs

**Race Condition in Spotify Token Refresh:**
- Symptoms: If multiple server actions simultaneously call `refreshSpotifyToken()` when token has just expired, both may trigger concurrent refresh attempts
- Files: `lib/spotify.ts` (lines 15-55), `app/actions/spotify.ts` (line 113)
- Trigger: Load spike causing two rapid API requests while token expires (time window typically < 1 second)
- Workaround: Token refresh includes guard comment on line 9-10 advising only call when actually expired, but not enforced at type level. In practice, low frequency due to token validity window being hours

**Album Captions Left Incomplete if Bedrock Fails Mid-Generation:**
- Symptoms: If `generateAlbumCaptions()` fails after persisting some captions but before completing the full album set, user sees partial state
- Files: `app/actions/ai-content.ts` (lines 184-205)
- Trigger: Bedrock timeout or rate limit during caption generation loop
- Workaround: UI shows error message. User can call action again, which will regenerate already-existing captions

**Missing Handle Route Protection for /dashboard:**
- Symptoms: Middleware only protects `/profile` and `/settings` routes, but `/dashboard` at `/protected/dashboard` also contains protected content
- Files: `middleware.ts` (lines 6-8)
- Trigger: Direct navigation to `/dashboard` when user is not authenticated might bypass middleware depending on route structure
- Workaround: `auth()` is checked inside dashboard page component, so double-protected. Middleware gap doesn't create security issue but is incomplete

## Security Considerations

**Credentials Embedded in KMS Client Initialization:**
- Risk: AWS credentials (AUTH_DYNAMODB_ID, AUTH_DYNAMODB_SECRET) hardcoded in client constructor rather than using IAM roles or environment-based credentials provider
- Files: `lib/kms.ts` (lines 8-13)
- Current mitigation: Credentials are env vars, so not in source code. In AWS Amplify/Lambda, should use IAM role assumption instead
- Recommendations: Replace explicit credential object with credential chain provider (AWS SDK automatically checks IAM roles, env vars in order). Use `fromNodeProviderChain()` or similar

**AllowDangerousEmailAccountLinking Enabled on OAuth Providers:**
- Risk: Both Google and Spotify providers have `allowDangerousEmailAccountLinking: true`, allowing account takeover if email is verified on one provider but not the other
- Files: `auth.ts` (lines 35, 44)
- Current mitigation: Email verification happens during auth flow, but no explicit check that email was verified before linking
- Recommendations: Implement explicit email verification check before allowing account linking. Consider setting to `false` and handling linking explicitly with user consent

**No Input Validation on Featured Artist Count:**
- Risk: FeaturedArtistsEditor allows adding up to 4 artists (hardcoded limit on line 88) but limit is enforced only client-side
- Files: `app/components/FeaturedArtistsEditor.tsx` (line 88), `app/actions/featured-artists.ts`
- Current mitigation: Server action should validate, but check if boundary is enforced
- Recommendations: Add explicit validation in `updateFeaturedArtists()` server action to reject requests with more than 4 artists

**Age Guess LLM Response Parsing Without Full Validation:**
- Risk: Age guess JSON parsing in `age-guess.ts` strips markdown then parses, but doesn't validate required fields before storing
- Files: `app/actions/age-guess.ts` (lines 50-73)
- Current mitigation: Try-catch wraps parse attempt and returns error. Bedrock system prompt designed to constrain output
- Recommendations: After JSON parsing, validate that required fields (ageRange, vibe, etc.) exist before storing in DB

**Public Profile Last.fm Username Could Be XSS Vector:**
- Risk: If Last.fm API returns unsanitized username in profile data, it could be rendered unsanitized
- Files: `lib/lastfm.ts`, displayed via `app/components/PublicProfile.tsx`
- Current mitigation: Last.fm API returns structured JSON. React automatically escapes text content. No dangerouslySetInnerHTML found in codebase
- Recommendations: Continue avoiding dangerouslySetInnerHTML. Validate Last.fm responses contain only expected fields

## Performance Bottlenecks

**Sequential Album Caption Generation:**
- Problem: `generateAlbumCaptions()` loops through albums sequentially, making one Bedrock call at a time
- Files: `app/actions/ai-content.ts` (lines 184-205)
- Cause: Comment on line 183 explicitly says "Sequential to avoid Bedrock throttling"
- Improvement path: Batch requests with concurrency control (Promise.all with semaphore pattern for 2-3 parallel requests). Monitor error rates. Bedrock default rate limit is higher than current implementation assumes

**Incremental View Count Updates Fire-and-Forget:**
- Problem: `getPublicProfile()` increments view count with non-blocking catch handler. If write fails, silently ignores error
- Files: `lib/dynamodb/public-profile.ts` (lines 113-116)
- Cause: Don't want to delay page render for non-critical counter update
- Improvement path: Implement retry queue with delayed processing. Background job to reconcile view counts. Current approach risks undercounting

**Spotify Music Data Refetch Blocks Until Complete:**
- Problem: `_doRefresh()` fetches artists and tracks in parallel (good) but blocks until both write to DB and cache revalidation completes
- Files: `app/actions/spotify.ts` (lines 111-143)
- Cause: Atomic update approach, but page render waits for full completion
- Improvement path: Return data to client immediately, background-queue the DB write and cache invalidation. Trade consistency for responsiveness

**No Pagination for Large Top Track Lists:**
- Problem: Fetches top 50 tracks from Spotify but stores all in DynamoDB. Stores all 50 but displays only 10 in UI and passes all to Bedrock for captions
- Files: `app/actions/spotify.ts` (line 121), `app/actions/ai-content.ts` (line 46)
- Cause: Top 50 is still small dataset. No real impact currently but limits future scaling
- Improvement path: If track pool grows (e.g., all-time instead of medium_term), implement pagination or streaming

## Fragile Areas

**Single-Table DynamoDB Schema Without Query/Scan Optimization:**
- Files: `lib/dynamodb/` directory (all modules), `lib/dynamodb/schema.ts`
- Why fragile: Single-table design requires exact sort-key knowledge to query. Adding new data types requires new SK constants. No GSI (Global Secondary Index) for common queries like "all published users"
- Safe modification: Always define SK constants in `schema.ts` before adding new record types. Document what sort-key patterns exist. Test queries return expected results
- Test coverage: Schema changes need integration tests against live DynamoDB table

**Handle Claim Race Condition Relies on Transaction:**
- Files: `lib/handle.ts` (lines 106-156)
- Why fragile: Safety depends entirely on TransactWriteCommand atomicity. Competitor race conditions could theoretically cause inconsistent state if transaction support degrades
- Safe modification: Never split handle reservation and user update into separate operations. Always use transaction with ConditionExpression
- Test coverage: Add test that attempts concurrent handle claims and validates only one succeeds

**AI Content Generation Depends on Exact Prompt Format:**
- Files: `app/actions/ai-content.ts`, `app/actions/age-guess.ts`, `lib/bedrock/prompts.ts`
- Why fragile: System prompts control LLM behavior. Small wording changes can dramatically affect output quality. Age guess requires JSON parsing which assumes specific format
- Safe modification: When updating prompts, re-test all output paths. Update JSON parsing validation if format changes. Document prompt intent
- Test coverage: Add regression tests with sample music data that validate bio text and caption length bounds

**LastFM Integration Assumes Username Validity Without Verification:**
- Files: `app/actions/lastfm.ts`, `lib/lastfm.ts`
- Why fragile: User can claim any Last.fm username without verification. If username doesn't exist or is private, API call fails silently or returns empty results
- Safe modification: Add API call to `getLastfmUserInfo()` before claiming username, validate user exists and is public
- Test coverage: Test both valid and invalid usernames, private accounts

## Scaling Limits

**Single DynamoDB Table 40GB Limit (On-Demand):**
- Current capacity: Not specified in code (on-demand billing)
- Limit: On-Demand tables auto-scale but each partition becomes slow > 10GB. Single-table design means all data competes for same partitions
- Scaling path: When table exceeds 100GB, migrate to multi-table design: Users table, Music Data table, Content table. Requires application-level sharding key changes

**Bedrock Concurrency Default Limit:**
- Current capacity: Likely 100 tokens/second default for on-demand
- Limit: Multiple concurrent users calling caption generation will hit token limit under 10+ simultaneous sessions
- Scaling path: Request Bedrock quota increase via AWS console. Implement token budget queue. Switch to batch API for non-interactive workloads

**Spotify API Rate Limit (180 requests / 15 min):**
- Current capacity: Each refresh is 2 concurrent requests (artists + tracks). ~90 simultaneous refreshes possible in 15 min window
- Limit: Beyond ~100 concurrent users, refresh hits rate limit
- Scaling path: Implement exponential backoff with Retry-After header. Cache aggressively. Move to server-side batch refreshes instead of per-user on-demand

**No Connection Pooling for DynamoDB:**
- Current capacity: Default SDK behavior uses one connection per operation
- Limit: Under 100+ concurrent operations, connection overhead becomes noticeable
- Scaling path: AWS SDK v3 handles connection pooling automatically. Monitor CloudWatch metrics for connection errors

## Dependencies at Risk

**NextAuth v5 Authentication Strategy:**
- Risk: Database session strategy with DynamoDB adapter is relatively new in NextAuth v5. Less battle-tested than traditional session backends
- Impact: Session corruption, token expiration edge cases, callback ordering issues
- Migration plan: Monitor NextAuth security advisories. Have fallback to custom JWT strategy if issues emerge. Maintain session adapter tests

**AWS SDK v3 Library Churn:**
- Risk: AWS SDK v3 introduces new APIs regularly. Client libraries like @aws-sdk/client-bedrock-runtime are still maturing
- Impact: API breaking changes in minor versions. Bedrock API stability uncertain
- Migration plan: Pin SDK versions to patch level. Test updates in staging. Subscribe to AWS SDK GitHub for breaking changes

**Resend Email Service for Magic Links:**
- Risk: Resend is a newer email service. Magic link delivery depends entirely on their service availability
- Impact: Users cannot sign in if Resend API is down
- Migration plan: Implement email provider abstraction. Maintain fallback provider (e.g., SendGrid, AWS SES) behind adapter pattern

## Missing Critical Features

**No Email Verification:**
- Problem: Users can sign up with unverified emails. Magic link sends to email but doesn't verify ownership before account creation
- Blocks: GDPR compliance (can't be sure user authorized their own email). Multi-tenant risks (user could claim others' emails)

**No Rate Limiting on Public Profile Views:**
- Problem: `/[handle]` pages increment view counter without rate limiting. Malicious client could artificially inflate view counts
- Blocks: Analytics integrity. Users can't trust view counts as real traffic metric

**No Automated Cleanup of Orphaned Records:**
- Problem: Orphaned album captions, disconnected Spotify records, and deleted handle entries accumulate in database
- Blocks: Database cost control. Data quality assurance

**No Admin Dashboard:**
- Problem: No way for ops to see user counts, debug database issues, or monitor service health
- Blocks: Scaling and reliability

## Test Coverage Gaps

**Handle Claim Race Condition:**
- What's not tested: Concurrent claims of same handle from multiple clients
- Files: `lib/handle.ts` (claimHandle function)
- Risk: Handle duplication or double-claiming could go unnoticed in staging until production scale
- Priority: High

**Spotify Token Refresh Error Path:**
- What's not tested: Behavior when Spotify API returns 401 Unauthorized or malformed refresh response
- Files: `lib/spotify.ts` (refreshSpotifyToken)
- Risk: Corrupt token state could cause silent auth failures
- Priority: High

**Public Profile Cache Revalidation:**
- What's not tested: That revalidatePath actually invalidates ISR cache after profile publish
- Files: `app/actions/publish.ts` (revalidatePath calls)
- Risk: Published profile changes might not surface for up to 1 hour (ISR revalidate period)
- Priority: Medium

**Last.fm Username Validation:**
- What's not tested: Invalid/private usernames, API errors, partial response handling
- Files: `lib/lastfm.ts`, `app/actions/lastfm.ts`
- Risk: Silent failure if username invalid, leaving user unable to connect
- Priority: Medium

**AI Caption Generation Edge Cases:**
- What's not tested: Bedrock timeouts mid-generation, malformed JSON responses, extremely long/short music lists
- Files: `app/actions/ai-content.ts`, `app/actions/age-guess.ts`
- Risk: User stuck with partial state if generation fails
- Priority: Medium

**Middleware Protected Route Coverage:**
- What's not tested: All protected routes correctly identified and enforcement of auth
- Files: `middleware.ts`
- Risk: Accidental exposure of protected content
- Priority: Medium

---

*Concerns audit: 2026-02-08*
