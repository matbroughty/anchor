import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import Spotify from "next-auth/providers/spotify"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb"
import { storeSpotifyTokens } from "@/lib/spotify"

// Ensure AUTH_SECRET is set (required for NextAuth v5)
// In production (AWS Amplify), ensure AUTH_URL is also set to your domain
if (!process.env.AUTH_SECRET) {
  throw new Error(
    "AUTH_SECRET environment variable is not set. " +
    "Generate one with: openssl rand -base64 32\n" +
    "In AWS Amplify, also set AUTH_URL to your production domain (e.g., https://anchor.band)"
  )
}

// Debug: Log AUTH_URL to verify it's set correctly
console.log("[Auth Config] AUTH_URL:", process.env.AUTH_URL || "NOT SET")
console.log("[Auth Config] NODE_ENV:", process.env.NODE_ENV)

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  // Explicitly set base URL for OAuth redirects in production
  basePath: "/api/auth",
  adapter: DynamoDBAdapter(dynamoDocumentClient, { tableName: TABLE_NAME }),
  // Database session strategy required for magic links and "sign out everywhere"
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Resend({
      from: "onboarding@resend.dev",
      apiKey: process.env.AUTH_RESEND_KEY,
    }),
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: "user-read-email user-top-read user-read-recently-played",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // On Spotify sign-in, encrypt and store tokens
      if (account?.provider === "spotify" && account.access_token && account.refresh_token) {
        try {
          await storeSpotifyTokens(
            user.id!,
            account.access_token,
            account.refresh_token
          )
        } catch (error) {
          console.error("Failed to store Spotify tokens:", error)
          // Don't block sign-in on token storage failure
          // User can re-connect Spotify later
        }
      }
      return true
    },
    async session({ session, user }) {
      // Add custom fields to session
      if (user) {
        session.user.id = user.id
        session.user.handle = user.handle
        session.user.displayName = user.displayName
        session.user.spotifyConnected = user.spotifyConnected
      }
      return session
    },
  },
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-email",
  },
})
