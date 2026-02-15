/**
 * Last.fm Artist Image Enhancement
 *
 * Enhances Last.fm artist images by searching Spotify for matching artists
 * and using their high-quality images. Enhances both featured artists and
 * top recent artists during the publish action.
 */

import { getFeaturedArtists, putFeaturedArtists } from "@/lib/dynamodb/featured-artists";
import { getMusicData, putMusicData } from "@/lib/dynamodb/music-data";
import { searchArtists } from "@/lib/spotify-data";
import { getClientCredentialsToken } from "@/lib/spotify-client-credentials";
import type { Artist } from "@/types/music";

export interface EnhancementResult {
  enhancedCount: number;
  skippedCount: number;
  failedCount: number;
}

/**
 * Enhances Last.fm artist images with high-quality Spotify images.
 *
 * Algorithm:
 * 1. Get user's featured artists and top artists from DynamoDB
 * 2. Check if user is a Last.fm user (has external_urls.lastfm)
 * 3. For each artist (featured + top recent):
 *    - Skip if already has high-quality images (width >= 300, valid URL)
 *    - Search Spotify for artist by name
 *    - Find exact name match (case-insensitive)
 *    - Merge Spotify images into artist object
 *    - Add 100ms delay to avoid rate limiting
 * 4. Save enhanced artists back to DynamoDB (featured + top recent)
 * 5. Return enhancement statistics
 *
 * @param userId - User ID to enhance artists for
 * @returns Statistics about the enhancement operation
 */
export async function enhanceLastfmArtistImages(
  userId: string
): Promise<EnhancementResult> {
  const result: EnhancementResult = {
    enhancedCount: 0,
    skippedCount: 0,
    failedCount: 0,
  };

  try {
    // Get user's featured artists and music data (top artists)
    const [featuredArtists, musicData] = await Promise.all([
      getFeaturedArtists(userId),
      getMusicData(userId),
    ]);

    // Check if user has any artist data
    const hasFeaturedArtists = featuredArtists.length > 0;
    const hasTopArtists = musicData?.artists && musicData.artists.length > 0;

    if (!hasFeaturedArtists && !hasTopArtists) {
      console.log("[Enhancement] No artists to enhance");
      return result;
    }

    // Check if this is a Last.fm user by looking at any artist
    // Last.fm artists will have external_urls.lastfm
    const allArtists = [...featuredArtists, ...(musicData?.artists || [])];
    const isLastfmUser = allArtists.some((artist) => artist.external_urls?.lastfm);

    if (!isLastfmUser) {
      console.log("[Enhancement] Not a Last.fm user, skipping enhancement");
      return result;
    }

    const artistCount = featuredArtists.length + (musicData?.artists.length || 0);
    console.log(`[Enhancement] Enhancing ${artistCount} artists (${featuredArtists.length} featured + ${musicData?.artists.length || 0} top) for Last.fm user`);

    // Get Spotify client credentials token
    let token: string;
    try {
      token = await getClientCredentialsToken();
    } catch (error) {
      console.error("[Enhancement] Failed to get Spotify token:", error);
      return result;
    }

    // Track which artists were enhanced (separate arrays for featured and top)
    const enhancedFeaturedArtists: Artist[] = [];
    const enhancedTopArtists: Artist[] = [];
    let isFirstArtist = true;

    // Helper function to enhance a single artist
    const enhanceArtist = async (artist: Artist): Promise<Artist> => {
      // Skip if artist already has high-quality images
      // Check for: non-empty array, valid URLs, and proper dimensions
      const hasGoodImages =
        artist.images.length > 0 &&
        artist.images.some((img) =>
          img.width >= 300 &&
          img.url &&
          img.url.trim() !== "" &&
          !img.url.includes('2a96cbd8b46e442fc41c2b86b821562f.png') // Last.fm placeholder
        );

      if (hasGoodImages) {
        console.log(`[Enhancement] Skipping ${artist.name} - already has good images`);
        result.skippedCount++;
        return artist;
      }

      // Log why we're enhancing this artist
      if (artist.images.length === 0) {
        console.log(`[Enhancement] Artist ${artist.name} has no images`);
      } else {
        console.log(`[Enhancement] Artist ${artist.name} has ${artist.images.length} images but none are high-quality`);
      }

      try {
        // Add delay between API calls (skip delay for first artist)
        if (!isFirstArtist) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        isFirstArtist = false;

        // Search Spotify for the artist
        console.log(`[Enhancement] Searching Spotify for: ${artist.name}`);
        const spotifyResults = await searchArtists(token, artist.name, 5);

        // Find exact name match (case-insensitive)
        const exactMatch = spotifyResults.find(
          (result) => result.name.toLowerCase() === artist.name.toLowerCase()
        );

        if (exactMatch && exactMatch.images.length > 0) {
          console.log(`[Enhancement] Found exact match for ${artist.name}, merging images`);
          result.enhancedCount++;
          return {
            ...artist,
            images: exactMatch.images,
          };
        } else {
          console.log(`[Enhancement] No exact match found for ${artist.name}`);
          result.skippedCount++;
          return artist;
        }
      } catch (error) {
        // Handle rate limiting gracefully
        if (error instanceof Error && error.message.includes("Rate limited")) {
          console.error(`[Enhancement] Rate limited on ${artist.name}, skipping`);
        } else {
          console.error(`[Enhancement] Error enhancing ${artist.name}:`, error);
        }
        result.failedCount++;
        return artist;
      }
    };

    // Enhance featured artists
    for (const artist of featuredArtists) {
      const enhancedArtist = await enhanceArtist(artist);
      enhancedFeaturedArtists.push(enhancedArtist);
    }

    // Enhance top artists if they exist
    if (musicData?.artists) {
      for (const artist of musicData.artists) {
        const enhancedArtist = await enhanceArtist(artist);
        enhancedTopArtists.push(enhancedArtist);
      }
    }

    // Save enhanced artists back to DynamoDB if any were enhanced
    if (result.enhancedCount > 0) {
      console.log(`[Enhancement] Saving ${result.enhancedCount} enhanced artists to DynamoDB`);

      // Save featured artists if any were enhanced
      if (hasFeaturedArtists) {
        await putFeaturedArtists(userId, enhancedFeaturedArtists);
      }

      // Save music data with enhanced top artists if they exist
      if (musicData && hasTopArtists) {
        await putMusicData(userId, {
          artists: enhancedTopArtists,
          albums: musicData.albums,
          tracks: musicData.tracks,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("[Enhancement] Fatal error during enhancement:", error);
    throw error;
  }
}
