import { JWT } from "next-auth/jwt"
import { encryptToken, decryptToken } from "./kms"
import { dynamoDocumentClient, TABLE_NAME } from "./dynamodb"
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb"
import { getTopArtists, getTopTracks, deriveTopAlbums } from "./spotify-data"
import { putMusicData } from "./dynamodb/music-data"

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

/**
 * Fetches and stores initial Spotify music data for a newly connected user.
 * Called automatically on first Spotify connection, bypasses cooldown.
 *
 * @param userId - User ID to fetch data for
 * @param accessToken - Spotify access token (already available from OAuth)
 */
export async function fetchInitialSpotifyData(
  userId: string,
  accessToken: string
): Promise<void> {
  try {
    console.log(`[Spotify] Fetching initial data for user ${userId}`)

    // Fetch artists and tracks in parallel
    const [artists, allTracks] = await Promise.all([
      getTopArtists(accessToken, 6),
      getTopTracks(accessToken, 50),
    ])

    // Derive top albums from tracks
    const albums = deriveTopAlbums(allTracks, 6)

    // Store in DynamoDB
    await putMusicData(userId, { artists, albums, tracks: allTracks })

    console.log(`[Spotify] Initial data stored for user ${userId}`)
  } catch (error) {
    // Don't throw - we don't want to break the sign-in flow
    // User can manually refresh if this fails
    console.error("[Spotify] Error fetching initial data:", error)
  }
}

/**
 * Search Spotify catalog for albums
 * Used in Eras wizard for album selection
 *
 * @param accessToken - Spotify access token
 * @param query - Search query string
 * @param limit - Number of results to return (default 10)
 * @returns Array of album objects
 */
export async function searchSpotifyAlbums(
  accessToken: string,
  query: string,
  limit: number = 10
): Promise<any[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Spotify API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const albums = data.albums?.items || [];

    // Transform to common Album format
    return albums.map((album: any) => ({
      id: album.id,
      name: album.name,
      artists: album.artists.map((artist: any) => ({
        id: artist.id,
        name: artist.name,
      })),
      images: album.images.map((img: any) => ({
        url: img.url,
        width: img.width,
        height: img.height,
      })),
      albumType: album.album_type,
      releaseDate: album.release_date,
      external_urls: {
        spotify: album.external_urls.spotify,
      },
    }));
  } catch (error) {
    console.error("Spotify album search error:", error);
    throw error;
  }
}

/**
 * Get full album details from Spotify
 * Used when saving eras entries to get complete metadata
 *
 * @param accessToken - Spotify access token
 * @param albumId - Spotify album ID
 * @returns Album object with full metadata
 */
export async function getSpotifyAlbum(
  accessToken: string,
  albumId: string
): Promise<{
  albumId: string;
  albumName: string;
  artistName: string;
  releaseDate: string;
  releaseYear: number;
  artworkUrl: string;
  artworkUrl600: string;
  artworkUrl300: string;
} | null> {
  try {
    const url = `https://api.spotify.com/v1/albums/${albumId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(`Spotify API error: ${response.status} ${errorText}`);
    }

    const album = await response.json();

    // Find best artwork URLs
    const artworkUrl600 = album.images.find((img: any) => img.height === 640)?.url || album.images[0]?.url || "";
    const artworkUrl300 = album.images.find((img: any) => img.height === 300)?.url || album.images[1]?.url || artworkUrl600;

    const releaseYear = parseInt(album.release_date.split("-")[0], 10);

    return {
      albumId: album.id,
      albumName: album.name,
      artistName: album.artists.map((a: any) => a.name).join(", "),
      releaseDate: album.release_date,
      releaseYear,
      artworkUrl: artworkUrl600,
      artworkUrl600,
      artworkUrl300,
    };
  } catch (error) {
    console.error("Spotify get album error:", error);
    throw error;
  }
}
