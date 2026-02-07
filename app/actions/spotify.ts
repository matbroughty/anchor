"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getTopArtists, getTopTracks, deriveTopAlbums } from "@/lib/spotify-data";
import { getMusicData, putMusicData, canRefresh, getLastRefresh } from "@/lib/dynamodb/music-data";
import { getSpotifyTokens } from "@/lib/spotify";
import type { MusicData } from "@/types/music";

// ---------------------------------------------------------------------------
// Response types -- server actions must not throw; errors are returned inline
// ---------------------------------------------------------------------------

export interface FetchSpotifyDataResult {
  data: MusicData | null;
  error?: string;
}

export interface RefreshSpotifyDataResult {
  data: MusicData | null;
  error?: string;
  /** Milliseconds remaining on the cooldown timer (only set when cooldown is active) */
  cooldownRemaining?: number;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Returns the user's cached music data, fetching fresh data from Spotify
 * only when no cache exists yet.
 *
 * This is the primary read path -- public profile pages and the dashboard
 * both call this. Because cached data is served from DynamoDB the Spotify
 * API is never hit on repeated page loads.
 */
export async function fetchSpotifyData(): Promise<FetchSpotifyDataResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { data: null, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // Return cached data when available
    const cached = await getMusicData(userId);
    if (cached) {
      return { data: cached };
    }

    // No cache -- treat as an implicit first refresh
    return await _doRefresh(userId);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error fetching Spotify data",
    };
  }
}

/**
 * Explicitly refreshes the user's Spotify data, respecting the 24-hour
 * cooldown window.  The UI should call this only when the user taps a
 * "Refresh" button; routine reads go through fetchSpotifyData.
 */
export async function refreshSpotifyData(): Promise<RefreshSpotifyDataResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { data: null, error: "Not authenticated" };
    }

    const userId = session.user.id;

    // Cooldown gate
    const allowed = await canRefresh(userId);
    if (!allowed) {
      const lastRefresh = await getLastRefresh(userId);
      const cooldownMs = 24 * 60 * 60 * 1000;
      const cooldownRemaining = lastRefresh
        ? cooldownMs - (Date.now() - lastRefresh)
        : 0;

      return {
        data: null,
        error: "Cooldown active",
        cooldownRemaining: Math.max(0, cooldownRemaining),
      };
    }

    return await _doRefresh(userId);
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Unknown error refreshing Spotify data",
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helper (not exported -- not a server action itself)
// ---------------------------------------------------------------------------

/**
 * Performs the actual Spotify fetch → derive → cache → revalidate flow.
 * Extracted so both fetchSpotifyData (implicit first fetch) and
 * refreshSpotifyData (explicit user action) share identical logic.
 */
async function _doRefresh(userId: string): Promise<RefreshSpotifyDataResult> {
  // Retrieve decrypted access token from DynamoDB + KMS
  const tokens = await getSpotifyTokens(userId);
  if (!tokens) {
    return { data: null, error: "Spotify not connected" };
  }

  // Fetch artists and tracks in parallel -- independent endpoints
  const [artists, allTracks] = await Promise.all([
    getTopArtists(tokens.accessToken, 6),
    getTopTracks(tokens.accessToken, 50),
  ]);

  // Derive top albums from the full track pool (6 for symmetrical 3x2 grid)
  const albums = deriveTopAlbums(allTracks, 6);

  // Persist to DynamoDB (atomic transaction)
  // We store the full track list so future album derivation can re-run if needed,
  // but the MusicData we return to the caller trims tracks to the display limit.
  await putMusicData(userId, { artists, albums, tracks: allTracks });

  // Invalidate Next.js cache for the profile page so the new data surfaces
  revalidatePath("/profile");

  const musicData: MusicData = {
    artists,
    albums,
    tracks: allTracks.slice(0, 10), // UI shows top 10 tracks
    cachedAt: Date.now(),
  };

  return { data: musicData };
}
