import { JWT } from "next-auth/jwt"
import { encryptToken, decryptToken } from "./kms"
import { dynamoDocumentClient, TABLE_NAME } from "./dynamodb"
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb"

/**
 * Refreshes an expired Spotify access token using the refresh token
 *
 * CRITICAL: Only call when token is actually expired (Date.now() > token.spotifyTokenExpires)
 * to avoid race conditions from multiple callback invocations
 *
 * @param token - JWT token containing Spotify refresh token
 * @returns Updated token with new access token and expiry, or error token on failure
 */
export async function refreshSpotifyToken(token: JWT): Promise<JWT> {
  try {
    const basicAuth = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64")

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.spotifyRefreshToken!,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error("Spotify token refresh failed:", refreshedTokens)
      throw refreshedTokens
    }

    return {
      ...token,
      spotifyAccessToken: refreshedTokens.access_token,
      spotifyTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // Spotify may return a new refresh token, or keep the existing one
      spotifyRefreshToken: refreshedTokens.refresh_token ?? token.spotifyRefreshToken,
    }
  } catch (error) {
    console.error("Error refreshing Spotify token:", error)
    // Return error token - don't throw to prevent auth failure
    return {
      ...token,
      error: "RefreshAccessTokenError",
    }
  }
}

/**
 * Stores encrypted Spotify tokens in DynamoDB
 *
 * @param userId - User ID to associate tokens with
 * @param accessToken - Spotify access token to encrypt and store
 * @param refreshToken - Spotify refresh token to encrypt and store
 */
export async function storeSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string
): Promise<void> {
  try {
    // Encrypt tokens using KMS before storage
    const encryptedAccess = await encryptToken(accessToken)
    const encryptedRefresh = await encryptToken(refreshToken)

    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${userId}`,
          sk: `SPOTIFY`,
        },
        UpdateExpression:
          "SET accessToken = :access, refreshToken = :refresh, updatedAt = :time",
        ExpressionAttributeValues: {
          ":access": encryptedAccess,
          ":refresh": encryptedRefresh,
          ":time": new Date().toISOString(),
        },
      })
    )
  } catch (error) {
    console.error("Error storing Spotify tokens:", error)
    throw new Error(
      `Failed to store Spotify tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

/**
 * Retrieves and decrypts Spotify tokens from DynamoDB
 *
 * @param userId - User ID to retrieve tokens for
 * @returns Decrypted tokens or null if not found
 */
export async function getSpotifyTokens(
  userId: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const response = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: `USER#${userId}`,
          sk: `SPOTIFY`,
        },
      })
    )

    if (!response.Item) {
      return null
    }

    // Decrypt tokens before returning
    return {
      accessToken: await decryptToken(response.Item.accessToken),
      refreshToken: await decryptToken(response.Item.refreshToken),
    }
  } catch (error) {
    console.error("Error retrieving Spotify tokens:", error)
    throw new Error(
      `Failed to retrieve Spotify tokens: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
