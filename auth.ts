import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import Spotify from "next-auth/providers/spotify"
import { DynamoDBAdapter } from "@auth/dynamodb-adapter"
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb"
import { storeSpotifyTokens } from "@/lib/spotify"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
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
