---
status: diagnosed
trigger: "Diagnose root cause of authentication issue."
created: 2026-02-07T00:00:00Z
updated: 2026-02-07T00:10:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED - NextAuth configuration missing allowDangerousEmailAccountLinking on OAuth providers
test: verified auth.ts has no allowDangerousEmailAccountLinking flag on Google or Spotify providers
expecting: root cause confirmed - need to add flag to OAuth providers
next_action: document root cause and return diagnosis

## Symptoms

expected: User can sign in with Google OAuth and remain authenticated across sessions
actual: OAuthAccountNotLinked error occurs, signin fails and redirects to /signin?error=OAuthAccountNotLinked
errors: "OAuthAccountNotLinked error: Another account already exists with the same e-mail address"
reproduction: Attempt Google OAuth signin when email already exists from another provider
started: Current issue in phase 01-foundation

## Eliminated

## Evidence

- timestamp: 2026-02-07T00:05:00Z
  checked: /Users/mathewbroughton/claude-gsd/anchor/auth.ts
  found: NextAuth v5 configuration with Google, Resend (email), and Spotify providers. Uses DynamoDBAdapter with database session strategy. No allowDangerousEmailAccountLinking flag present on any provider.
  implication: Missing allowDangerousEmailAccountLinking configuration on OAuth providers (Google, Spotify) prevents automatic account linking when same email exists

- timestamp: 2026-02-07T00:06:00Z
  checked: NextAuth v5 documentation via web search
  found: OAuthAccountNotLinked error occurs when OAuth sign-in attempted with email that already exists. Automatic account linking is disabled by default for security. Solution is allowDangerousEmailAccountLinking: true flag in provider config.
  implication: This is expected behavior without the flag. Flag must be added to Google and Spotify provider configs to allow users to sign in with multiple providers using same email

- timestamp: 2026-02-07T00:08:00Z
  checked: package.json versions and DynamoDB adapter usage
  found: Using next-auth@5.0.0-beta.30 with @auth/dynamodb-adapter@2.11.1. Configuration has three providers (Google OAuth, Resend email/magic link, Spotify OAuth) but none have allowDangerousEmailAccountLinking enabled.
  implication: User flow allows account creation via Resend magic link OR Google OAuth. If user first creates account with magic link using email@example.com, then tries to sign in with Google OAuth using same email@example.com, NextAuth blocks the sign-in by default for security (prevents account takeover). This is the exact scenario causing the error.

## Resolution

root_cause: NextAuth v5 configuration in auth.ts is missing the allowDangerousEmailAccountLinking flag on OAuth providers (Google and Spotify). By default, NextAuth prevents automatic account linking when a user attempts to sign in with an OAuth provider using an email address that already exists in the database from a different provider (e.g., created via Resend magic link). This security measure prevents account takeover attacks, but creates a poor UX when the same user legitimately wants to use multiple sign-in methods with the same email. The error "OAuthAccountNotLinked: Another account already exists with the same e-mail address" is NextAuth's expected behavior when this flag is not set.

fix: Add allowDangerousEmailAccountLinking: true to Google and Spotify OAuth provider configurations in auth.ts. This flag tells NextAuth to trust that these OAuth providers have verified the user's email address and allows automatic account linking when the email matches an existing user.

verification: After adding the flag, test the exact reproduction scenario: (1) Sign in with magic link using email@example.com, (2) Sign out, (3) Sign in with Google OAuth using same email@example.com. Should succeed without OAuthAccountNotLinked error.

files_changed: ["/Users/mathewbroughton/claude-gsd/anchor/auth.ts"]
