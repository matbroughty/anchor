import { cache } from "react";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import { getMusicData } from "@/lib/dynamodb/music-data";
import { getFeaturedArtists } from "@/lib/dynamodb/featured-artists";
import { getContent } from "@/lib/dynamodb/content";
import {
  incrementViewCount,
  getViewCount,
} from "@/lib/dynamodb/view-counter";
import type { Artist, Album, Track } from "@/types/music";
import type { Caption } from "@/types/content";

// ---------------------------------------------------------------------------
// Public Profile Types
// ---------------------------------------------------------------------------

/**
 * Public profile data returned by getPublicProfile().
 * Contains everything needed to render a user's public page.
 */
export interface PublicProfile {
  displayName: string | null;
  handle: string;
  isPublic: boolean;
  bio: string | null;
  featuredArtists: Artist[];
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  captions: Caption[];
  viewCount?: number;
  lastfmUsername?: string | null;
  spotifyUserId?: string | null;
}

// ---------------------------------------------------------------------------
// Public Profile Query
// ---------------------------------------------------------------------------

/**
 * Fetches a user's public profile by handle.
 *
 * Wrapped in React cache() for request-level deduplication -- multiple
 * components can call this in a single render without duplicate DB queries.
 *
 * Returns null when:
 * - Handle doesn't exist
 * - User doesn't exist
 * - User is not published (isPublic is false or undefined)
 *
 * Returns complete profile data for published users.
 *
 * @param viewerHandle - The handle of the viewer (null if not logged in).
 *   Used to exclude owner views from the counter and to fetch the count for the owner.
 */
export const getPublicProfile = cache(
  async (
    handle: string,
    viewerHandle?: string | null
  ): Promise<PublicProfile | null> => {
    const normalizedHandle = handle.toLowerCase();
    const handleKey = `HANDLE#${normalizedHandle}`;

    // Step 1: Look up the handle to get the userId
    const handleResult = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: handleKey,
          sk: handleKey,
        },
      })
    );

    if (!handleResult.Item) {
      return null;
    }

    const userId = handleResult.Item.userId as string;

    // Step 2: Get the user record to check isPublic flag
    const userResult = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: userPK(userId),
          sk: userPK(userId),
        },
      })
    );

    if (!userResult.Item) {
      return null;
    }

    const user = userResult.Item;
    const isPublic = user.isPublic === true;

    // Return null for unpublished users
    if (!isPublic) {
      return null;
    }

    // Step 3: Fetch music data, featured artists, and content in parallel
    const [musicData, featuredArtists, contentData] = await Promise.all([
      getMusicData(userId),
      getFeaturedArtists(userId),
      getContent(userId),
    ]);

    // Step 4: Increment view count if viewer is not the owner
    // Fire-and-forget operation (non-blocking)
    if (viewerHandle !== normalizedHandle) {
      incrementViewCount(userId).catch((error) => {
        console.error("Failed to increment view count:", error);
      });
    }

    // Step 5: Fetch view count for owner (only if viewer is owner)
    let viewCount: number | undefined = undefined;
    if (viewerHandle === normalizedHandle) {
      viewCount = await getViewCount(userId);
    }

    return {
      displayName: (user.displayName as string) ?? null,
      handle: normalizedHandle,
      isPublic: true,
      bio: contentData.bio?.text ?? null,
      featuredArtists,
      artists: musicData?.artists ?? [],
      albums: musicData?.albums ?? [],
      tracks: musicData?.tracks?.slice(0, 10) ?? [], // UI shows top 10 tracks
      captions: contentData.captions,
      viewCount,
      lastfmUsername: (user.lastfmUsername as string) ?? null,
      spotifyUserId: (user.spotifyUserId as string) ?? null,
    };
  }
);
