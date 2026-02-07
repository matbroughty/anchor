"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { searchArtists } from "@/lib/spotify-data";
import {
  getFeaturedArtists,
  putFeaturedArtists,
} from "@/lib/dynamodb/featured-artists";
import { getSpotifyTokens } from "@/lib/spotify";
import type { Artist } from "@/types/music";

// ---------------------------------------------------------------------------
// Response types -- server actions must not throw; errors are returned inline
// ---------------------------------------------------------------------------

export interface SearchArtistsResult {
  artists: Artist[];
  error?: string;
}

export interface UpdateFeaturedArtistsResult {
  success: boolean;
  error?: string;
}

export interface GetFeaturedArtistsResult {
  artists: Artist[];
  error?: string;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Searches for artists on Spotify by name.
 * Used by the dashboard's artist search input component.
 */
export async function searchArtistsAction(
  query: string
): Promise<SearchArtistsResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { artists: [], error: "Not authenticated" };
    }

    // Validate query length
    if (!query || query.trim().length === 0) {
      return { artists: [], error: "Search query cannot be empty" };
    }

    if (query.length > 100) {
      return { artists: [], error: "Search query too long" };
    }

    // Get Spotify access token
    const tokens = await getSpotifyTokens(session.user.id);
    if (!tokens) {
      return { artists: [], error: "Spotify not connected" };
    }

    // Search artists
    const artists = await searchArtists(tokens.accessToken, query.trim(), 10);

    return { artists };
  } catch (error) {
    // Handle rate limit errors specially
    if (error instanceof Error && error.message.includes("Rate limited")) {
      return { artists: [], error: error.message };
    }

    return {
      artists: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown error searching artists",
    };
  }
}

/**
 * Updates the user's featured artists.
 * Validates that 0-4 artists are provided and revalidates relevant pages.
 */
export async function updateFeaturedArtists(
  artists: Artist[]
): Promise<UpdateFeaturedArtistsResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate artist count (0-4)
    if (artists.length > 4) {
      return { success: false, error: "Cannot feature more than 4 artists" };
    }

    // Save to database
    await putFeaturedArtists(session.user.id, artists);

    // Revalidate dashboard and public profile pages
    revalidatePath("/dashboard");
    revalidatePath("/[handle]", "page");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error updating featured artists",
    };
  }
}

/**
 * Fetches the user's currently configured featured artists.
 * Returns empty array if none are configured.
 */
export async function getFeaturedArtistsAction(): Promise<GetFeaturedArtistsResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { artists: [], error: "Not authenticated" };
    }

    const artists = await getFeaturedArtists(session.user.id);

    return { artists };
  } catch (error) {
    return {
      artists: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown error fetching featured artists",
    };
  }
}
