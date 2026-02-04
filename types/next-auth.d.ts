import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    id: string
    handle?: string
    displayName?: string
    spotifyConnected?: boolean
  }
  interface Session {
    user: User
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    handle?: string
    spotifyAccessToken?: string
    spotifyRefreshToken?: string
    spotifyTokenExpires?: number
  }
}
