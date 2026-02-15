/**
 * Last.fm Artist Image Enhancement
 *
 * Enhances Last.fm artist images by searching Spotify for matching artists
 * and using their high-quality images. Only enhances featured artists during
 * the publish action.
 */

import { getFeaturedArtists, putFeaturedArtists } from "@/lib/dynamodb/featured-artists";
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
 * 1. Get user's featured artists from DynamoDB
 * 2. Check if user is a Last.fm user (has external_urls.lastfm)
 * 3. For each featured artist:
 *    - Skip if already has high-quality images (width >= 300)
 *    - Search Spotify for artist by name
 *    - Find exact name match (case-insensitive)
 *    - Merge Spotify images into artist object
 *    - Add 100ms delay to avoid rate limiting
 * 4. Save enhanced artists back to DynamoDB
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
    // Get user's featured artists
    const artists = await getFeaturedArtists(userId);

    if (artists.length === 0) {
      console.log("[Enhancement] No featured artists to enhance");
      return result;
    }

    // Check if this is a Last.fm user by looking at the first artist
    // Last.fm artists will have external_urls.lastfm
    const isLastfmUser = artists.some((artist) => artist.external_urls?.lastfm);

    if (!isLastfmUser) {
      console.log("[Enhancement] Not a Last.fm user, skipping enhancement");
      return result;
    }

    console.log(`[Enhancement] Enhancing ${artists.length} featured artists for Last.fm user`);

    // Get Spotify client credentials token
    let token: string;
    try {
      token = await getClientCredentialsToken();
    } catch (error) {
      console.error("[Enhancement] Failed to get Spotify token:", error);
      return result;
    }

    // Track which artists were enhanced
    const enhancedArtists: Artist[] = [];
    let isFirstArtist = true;

    for (const artist of artists) {
      try {
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
          enhancedArtists.push(artist);
          continue;
        }

        // Log why we're enhancing this artist
        if (artist.images.length === 0) {
          console.log(`[Enhancement] Artist ${artist.name} has no images`);
        } else {
          console.log(`[Enhancement] Artist ${artist.name} has ${artist.images.length} images but none are high-quality`);
        }

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
          // Merge Spotify images into the artist object
          enhancedArtists.push({
            ...artist,
            images: exactMatch.images,
          });
          result.enhancedCount++;
        } else {
          console.log(`[Enhancement] No exact match found for ${artist.name}`);
          result.skippedCount++;
          enhancedArtists.push(artist);
        }
      } catch (error) {
        // Handle rate limiting gracefully
        if (error instanceof Error && error.message.includes("Rate limited")) {
          console.error(`[Enhancement] Rate limited on ${artist.name}, skipping remaining artists`);
          result.failedCount++;
          enhancedArtists.push(artist);
          // Continue with remaining artists instead of breaking
          continue;
        }

        console.error(`[Enhancement] Error enhancing ${artist.name}:`, error);
        result.failedCount++;
        enhancedArtists.push(artist);
      }
    }

    // Save enhanced artists back to DynamoDB if any were enhanced
    if (result.enhancedCount > 0) {
      console.log(`[Enhancement] Saving ${result.enhancedCount} enhanced artists to DynamoDB`);
      await putFeaturedArtists(userId, enhancedArtists);
    }

    return result;
  } catch (error) {
    console.error("[Enhancement] Fatal error during enhancement:", error);
    throw error;
  }
}
