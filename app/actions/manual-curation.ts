"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { UpdateCommand, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import { putMusicData, getMusicData } from "@/lib/dynamodb/music-data";
import {
  searchArtists as searchSpotifyArtists,
  searchAlbums as searchSpotifyAlbums,
  searchTracks as searchSpotifyTracks,
} from "@/lib/spotify-data";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";
import type { Artist, Album, Track } from "@/types/music";

/**
 * Search for artists using Spotify catalog (anonymous access)
 */
export async function searchArtistsAction(query: string): Promise<{
  success: boolean;
  artists?: Artist[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (!query.trim()) {
      return { success: true, artists: [] };
    }

    // Get Spotify client credentials token (anonymous access)
    const token = await getClientCredentialsToken();
    const artists = await searchSpotifyArtists(token, query, 10);
    return { success: true, artists };
  } catch (error) {
    console.error("Failed to search artists:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search artists",
    };
  }
}

/**
 * Search for albums using Spotify catalog (anonymous access)
 */
export async function searchAlbumsAction(query: string): Promise<{
  success: boolean;
  albums?: Album[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (!query.trim()) {
      return { success: true, albums: [] };
    }

    // Get Spotify client credentials token (anonymous access)
    const token = await getClientCredentialsToken();
    const albums = await searchSpotifyAlbums(token, query, 10);
    return { success: true, albums };
  } catch (error) {
    console.error("Failed to search albums:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search albums",
    };
  }
}

/**
 * Search for tracks using Spotify catalog (anonymous access)
 */
export async function searchTracksAction(query: string): Promise<{
  success: boolean;
  tracks?: Track[];
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (!query.trim()) {
      return { success: true, tracks: [] };
    }

    // Get Spotify client credentials token (anonymous access)
    const token = await getClientCredentialsToken();
    const tracks = await searchSpotifyTracks(token, query, 10);
    return { success: true, tracks };
  } catch (error) {
    console.error("Failed to search tracks:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search tracks",
    };
  }
}

/**
 * Save manually curated music data to DynamoDB
 * Requires exactly 6 artists, 6 albums, and 10 tracks
 */
export async function saveManualCuration(
  artists: Artist[],
  albums: Album[],
  tracks: Track[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate input
    if (artists.length !== 6) {
      return { success: false, error: "Must select exactly 6 artists" };
    }
    if (albums.length !== 6) {
      return { success: false, error: "Must select exactly 6 albums" };
    }
    if (tracks.length !== 10) {
      return { success: false, error: "Must select exactly 10 tracks" };
    }

    const userId = session.user.id;
    const pk = userPK(userId);

    // Set manualCuration flag in user record
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression: "SET manualCuration = :true, updatedAt = :now",
        ExpressionAttributeValues: {
          ":true": true,
          ":now": new Date().toISOString(),
        },
      })
    );

    // Save music data using the same format as Spotify/Last.fm
    await putMusicData(userId, { artists, albums, tracks });

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/curate");

    return { success: true };
  } catch (error) {
    console.error("Failed to save manual curation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save manual curation",
    };
  }
}

/**
 * Get existing manual curation data
 * Returns null if no data exists
 */
export async function getManualCuration(): Promise<{
  success: boolean;
  data?: { artists: Artist[]; albums: Album[]; tracks: Track[] };
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const musicData = await getMusicData(session.user.id);
    if (!musicData) {
      return { success: true, data: undefined };
    }

    return {
      success: true,
      data: {
        artists: musicData.artists,
        albums: musicData.albums,
        tracks: musicData.tracks,
      },
    };
  } catch (error) {
    console.error("Failed to get manual curation:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get manual curation",
    };
  }
}

/**
 * Disconnect manual curation and remove all associated data
 * Same pattern as disconnectLastfm and disconnectSpotify
 */
export async function disconnectManualCuration(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const pk = userPK(session.user.id);

    // Remove manualCuration flag from user record and unpublish
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression:
          "REMOVE manualCuration SET isPublic = :false, updatedAt = :now",
        ExpressionAttributeValues: {
          ":false": false,
          ":now": new Date().toISOString(),
        },
      })
    );

    // Delete all music data (artists, albums, tracks, featured artists)
    const musicKeys = [
      { pk, sk: "MUSIC#ARTISTS" },
      { pk, sk: "MUSIC#ALBUMS" },
      { pk, sk: "MUSIC#TRACKS" },
      { pk, sk: "MUSIC#FEATURED_ARTISTS" },
    ];

    await Promise.all(
      musicKeys.map((key) =>
        dynamoDocumentClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: key,
          })
        )
      )
    );

    // Delete all content data (bio, captions, taste analysis, age guess)
    const contentKeys = [
      { pk, sk: "CONTENT#BIO" },
      { pk, sk: "CONTENT#CAPTIONS" },
      { pk, sk: "CONTENT#TASTE_ANALYSIS" },
      { pk, sk: "CONTENT#AGE_GUESS" },
    ];

    await Promise.all(
      contentKeys.map((key) =>
        dynamoDocumentClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: key,
          })
        )
      )
    );

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    // Revalidate landing page to remove unpublished profile from dropped anchors
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect manual curation:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to disconnect manual curation",
    };
  }
}
