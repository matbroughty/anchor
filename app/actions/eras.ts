"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { userPK, ERAS_SK } from "@/lib/dynamodb/schema";
import { getSpotifyTokens, searchSpotifyAlbums, getSpotifyAlbum } from "@/lib/spotify";
import { searchAlbums as searchSpotifyAlbumsAnon, getAlbum as getSpotifyAlbumAnon } from "@/lib/spotify-data";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";
import type { ErasData, EraEntry, TimelineMode, EraPromptId } from "@/types/eras";
import type { Album } from "@/types/music";
import { v4 as uuidv4 } from "uuid";

/**
 * Search for albums using Spotify catalog
 * Uses user's Spotify OAuth if connected, otherwise anonymous Client Credentials
 */
export async function searchAlbumsForEras(query: string): Promise<{
  success: boolean;
  albums?: Album[];
  source?: "spotify" | "applemusic";
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    if (!query.trim()) {
      return { success: true, albums: [], source: "spotify" };
    }

    // Check if user has Spotify connected
    const pk = userPK(session.user.id);
    const spotifyResult = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: "SPOTIFY" },
      })
    );

    // If Spotify connected, use user's OAuth token
    if (spotifyResult.Item) {
      try {
        const tokens = await getSpotifyTokens(session.user.id);
        if (tokens) {
          const albums = await searchSpotifyAlbums(tokens.accessToken, query, 10);
          return { success: true, albums, source: "spotify" };
        }
      } catch (spotifyError) {
        console.error("Spotify OAuth search failed, falling back to anonymous:", spotifyError);
        // Fall through to anonymous Spotify
      }
    }

    // Use Spotify Client Credentials (anonymous access) as fallback
    // This is FREE and works for Last.fm/manual users
    const token = await getClientCredentialsToken();
    const albums = await searchSpotifyAlbumsAnon(token, query, 10);
    return { success: true, albums, source: "spotify" };
  } catch (error) {
    console.error("Failed to search albums for eras:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search albums",
    };
  }
}

/**
 * Get user's eras data from DynamoDB
 */
export async function getErasData(): Promise<{
  success: boolean;
  data?: ErasData;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const pk = userPK(session.user.id);
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: ERAS_SK },
      })
    );

    if (!result.Item) {
      // Return empty eras data structure
      return {
        success: true,
        data: {
          timelineMode: "release_date",
          entries: [],
          updatedAt: new Date().toISOString(),
        },
      };
    }

    return {
      success: true,
      data: result.Item as ErasData,
    };
  } catch (error) {
    console.error("Failed to get eras data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get eras data",
    };
  }
}

/**
 * Save complete eras data to DynamoDB
 * Used when user completes the wizard or makes bulk changes
 */
export async function saveErasData(erasData: ErasData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate entries
    if (!Array.isArray(erasData.entries)) {
      return { success: false, error: "Invalid entries data" };
    }

    // Update timestamp
    erasData.updatedAt = new Date().toISOString();

    const pk = userPK(session.user.id);
    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk,
          sk: ERAS_SK,
          ...erasData,
        },
      })
    );

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/eras");

    return { success: true };
  } catch (error) {
    console.error("Failed to save eras data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save eras data",
    };
  }
}

/**
 * Add a new entry to user's eras
 * Used in the wizard to add albums one at a time
 * Uses Spotify OAuth if user has it connected, otherwise Client Credentials (free)
 */
export async function addEraEntry(
  promptId: EraPromptId,
  promptLabel: string,
  albumId: string,
  source: "spotify" | "applemusic"
): Promise<{
  success: boolean;
  entry?: EraEntry;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Fetch album metadata from Spotify
    let albumData: {
      albumName: string;
      artistName: string;
      releaseDate: string;
      releaseYear: number;
      artworkUrl: string;
    } | null = null;

    // Try user's Spotify OAuth token first
    const tokens = await getSpotifyTokens(session.user.id);

    if (tokens) {
      // User has Spotify connected - use OAuth token
      const spotifyAlbum = await getSpotifyAlbum(tokens.accessToken, albumId);
      if (!spotifyAlbum) {
        return { success: false, error: "Album not found on Spotify" };
      }

      albumData = {
        albumName: spotifyAlbum.albumName,
        artistName: spotifyAlbum.artistName,
        releaseDate: spotifyAlbum.releaseDate,
        releaseYear: spotifyAlbum.releaseYear,
        artworkUrl: spotifyAlbum.artworkUrl600,
      };
    } else {
      // User doesn't have Spotify - use anonymous Client Credentials (free)
      const anonToken = await getClientCredentialsToken();
      const spotifyAlbum = await getSpotifyAlbumAnon(anonToken, albumId);
      if (!spotifyAlbum) {
        return { success: false, error: "Album not found on Spotify" };
      }

      albumData = {
        albumName: spotifyAlbum.albumName,
        artistName: spotifyAlbum.artistName,
        releaseDate: spotifyAlbum.releaseDate,
        releaseYear: spotifyAlbum.releaseYear,
        artworkUrl: spotifyAlbum.artworkUrl600,
      };
    }

    // Get existing eras data
    const erasResult = await getErasData();
    if (!erasResult.success || !erasResult.data) {
      return { success: false, error: "Failed to load existing eras data" };
    }

    const erasData = erasResult.data;

    // Create new entry (source is always "spotify" now)
    const newEntry: EraEntry = {
      entryId: uuidv4(),
      promptId,
      promptLabel,
      source: "spotify",
      albumId,
      albumName: albumData.albumName,
      artistName: albumData.artistName,
      releaseDate: albumData.releaseDate,
      releaseYear: albumData.releaseYear,
      artworkUrl: albumData.artworkUrl,
      orderIndex: erasData.entries.length,
      createdAt: new Date().toISOString(),
    };

    // Add to entries
    erasData.entries.push(newEntry);
    erasData.updatedAt = new Date().toISOString();

    // Save back to DynamoDB
    const saveResult = await saveErasData(erasData);
    if (!saveResult.success) {
      return { success: false, error: saveResult.error };
    }

    return { success: true, entry: newEntry };
  } catch (error) {
    console.error("Failed to add era entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add era entry",
    };
  }
}

/**
 * Update an existing entry
 * Used for reordering or editing entries
 */
export async function updateEraEntry(
  entryId: string,
  updates: Partial<EraEntry>
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const erasResult = await getErasData();
    if (!erasResult.success || !erasResult.data) {
      return { success: false, error: "Failed to load eras data" };
    }

    const erasData = erasResult.data;
    const entryIndex = erasData.entries.findIndex((e) => e.entryId === entryId);

    if (entryIndex === -1) {
      return { success: false, error: "Entry not found" };
    }

    // Update entry
    erasData.entries[entryIndex] = {
      ...erasData.entries[entryIndex],
      ...updates,
    };

    erasData.updatedAt = new Date().toISOString();

    const saveResult = await saveErasData(erasData);
    return saveResult;
  } catch (error) {
    console.error("Failed to update era entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update era entry",
    };
  }
}

/**
 * Delete a specific entry
 */
export async function deleteEraEntry(entryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const erasResult = await getErasData();
    if (!erasResult.success || !erasResult.data) {
      return { success: false, error: "Failed to load eras data" };
    }

    const erasData = erasResult.data;
    erasData.entries = erasData.entries.filter((e) => e.entryId !== entryId);
    erasData.updatedAt = new Date().toISOString();

    const saveResult = await saveErasData(erasData);
    return saveResult;
  } catch (error) {
    console.error("Failed to delete era entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete era entry",
    };
  }
}

/**
 * Update timeline settings (mode and birth year)
 */
export async function updateTimelineSettings(
  timelineMode: TimelineMode,
  birthYear?: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const erasResult = await getErasData();
    if (!erasResult.success || !erasResult.data) {
      return { success: false, error: "Failed to load eras data" };
    }

    const erasData = erasResult.data;
    erasData.timelineMode = timelineMode;
    if (birthYear !== undefined) {
      erasData.birthYear = birthYear;
    }
    erasData.updatedAt = new Date().toISOString();

    const saveResult = await saveErasData(erasData);
    return saveResult;
  } catch (error) {
    console.error("Failed to update timeline settings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update timeline settings",
    };
  }
}

/**
 * Delete all eras data
 * Used when user wants to reset or remove their timeline
 */
export async function deleteErasData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const pk = userPK(session.user.id);
    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: ERAS_SK },
      })
    );

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    revalidatePath("/eras");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete eras data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete eras data",
    };
  }
}
