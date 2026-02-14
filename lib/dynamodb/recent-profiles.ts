import { unstable_noStore as noStore } from "next/cache";
import { ScanCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK, MUSIC_SK } from "@/lib/dynamodb/schema";

/**
 * Recent profile data for landing page
 */
export interface RecentProfile {
  handle: string;
  displayName: string | null;
  publishedAt: number | null;
  topArtists: string[]; // Up to 3 artist names
  recentTracks: string[]; // Up to 2 track titles
  albumArtwork: string | null; // First album cover image URL
}

/**
 * Fetches recently published profiles for the landing page.
 *
 * Scans for USER records where isPublic=true and handle is set,
 * sorted by most recent updates.
 *
 * Uses unstable_noStore() to prevent caching and ensure fresh data.
 *
 * @param limit - Number of profiles to return (default 10)
 */
export async function getRecentProfiles(limit: number = 10): Promise<RecentProfile[]> {
  // Opt out of caching to ensure we always fetch fresh data
  noStore();
    try {
      // Scan for all USER records (pk = sk pattern)
      // Then filter in code for published profiles
      // Note: This is acceptable for low volume. For high traffic, consider:
      // - GSI with isPublic as partition key and createdAt as sort key
      // - Caching results in Redis or similar
      const result = await dynamoDocumentClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "pk = sk AND begins_with(pk, :userPrefix)",
          ExpressionAttributeValues: {
            ":userPrefix": "USER#",
          },
        })
      );

      console.log("[getRecentProfiles] Scan result:", {
        count: result.Items?.length || 0,
        items: result.Items?.map((item) => ({
          handle: item.handle,
          isPublic: item.isPublic,
          publishedAt: item.publishedAt,
        })),
      });

      console.log("[getRecentProfiles] All items before filtering:", result.Items?.map(item => ({
        handle: item.handle,
        isPublic: item.isPublic,
        publishedAt: item.publishedAt,
        pk: item.pk,
      })));

      // Filter for published profiles with handles
      const publishedUsers = (result.Items || []).filter(
        (item) => item.handle && item.isPublic === true
      );

      console.log("[getRecentProfiles] Published users after filtering:", publishedUsers.length);

      // Sort by publishedAt timestamp (most recent first)
      // Profiles without publishedAt still appear but are sorted last
      const sortedUsers = publishedUsers
        .sort((a, b) => {
          const publishedAtA = (a.publishedAt as number) || 0;
          const publishedAtB = (b.publishedAt as number) || 0;

          // Sort by publishedAt descending (most recent first)
          // Profiles with publishedAt always come before those without
          if (publishedAtA > 0 && publishedAtB === 0) return -1;
          if (publishedAtA === 0 && publishedAtB > 0) return 1;

          if (publishedAtB !== publishedAtA) {
            return publishedAtB - publishedAtA;
          }

          // If both have same/no publishedAt, sort alphabetically
          const handleA = (a.handle as string).toLowerCase();
          const handleB = (b.handle as string).toLowerCase();
          return handleA.localeCompare(handleB);
        })
        .slice(0, limit);

      console.log("[getRecentProfiles] Sorted users:", sortedUsers.map(item => ({
        handle: item.handle,
        publishedAt: item.publishedAt,
      })));

      // Batch fetch music data for top 5 profiles
      const userIds = sortedUsers
        .map((item) => {
          const pk = item.pk as string;
          return pk.replace("USER#", "");
        })
        .slice(0, 5);

      const musicKeys = userIds.flatMap((userId) => [
        { pk: userPK(userId), sk: MUSIC_SK.ARTISTS },
        { pk: userPK(userId), sk: MUSIC_SK.ALBUMS },
        { pk: userPK(userId), sk: MUSIC_SK.TRACKS },
      ]);

      let musicDataMap = new Map<string, { artists?: any[]; albums?: any[]; tracks?: any[] }>();

      if (musicKeys.length > 0) {
        try {
          console.log("[getRecentProfiles] Fetching music data for keys:", musicKeys.length);

          const musicResult = await dynamoDocumentClient.send(
            new BatchGetCommand({
              RequestItems: {
                [TABLE_NAME]: {
                  Keys: musicKeys,
                },
              },
            })
          );

          console.log("[getRecentProfiles] Music result responses:", musicResult.Responses?.[TABLE_NAME]?.length || 0);

          // Index by userId
          (musicResult.Responses?.[TABLE_NAME] || []).forEach((item) => {
            const pk = item.pk as string;
            const userId = pk.replace("USER#", "");
            const sk = item.sk as string;

            if (!musicDataMap.has(userId)) {
              musicDataMap.set(userId, {});
            }

            const userMusic = musicDataMap.get(userId)!;

            if (sk === MUSIC_SK.ARTISTS) {
              userMusic.artists = item.data as any[];
              console.log(`[getRecentProfiles] Found ${userMusic.artists?.length || 0} artists for ${userId}`);
            } else if (sk === MUSIC_SK.ALBUMS) {
              userMusic.albums = item.data as any[];
              console.log(`[getRecentProfiles] Found ${userMusic.albums?.length || 0} albums for ${userId}`);
            } else if (sk === MUSIC_SK.TRACKS) {
              userMusic.tracks = item.data as any[];
              console.log(`[getRecentProfiles] Found ${userMusic.tracks?.length || 0} tracks for ${userId}`);
            }
          });

          console.log("[getRecentProfiles] Music data map size:", musicDataMap.size);
        } catch (error) {
          console.error("Failed to fetch music data for profiles:", error);
        }
      }

      // Build profile objects with music data
      const profiles: RecentProfile[] = sortedUsers.map((item) => {
        const pk = item.pk as string;
        const userId = pk.replace("USER#", "");
        const musicData = musicDataMap.get(userId);

        // Get first album artwork (preferring ~300px width)
        let albumArtwork: string | null = null;
        if (musicData?.albums && musicData.albums.length > 0) {
          const firstAlbum = musicData.albums[0];
          if (firstAlbum.images && firstAlbum.images.length > 0) {
            // Find image closest to 300px width, or just use first
            const images = firstAlbum.images;
            const preferred = images.find((img: any) => img.width >= 300) || images[0];
            albumArtwork = preferred?.url || null;
          }
        }

        return {
          handle: item.handle as string,
          displayName: (item.displayName as string) || null,
          publishedAt: (item.publishedAt as number) || null,
          topArtists: musicData?.artists?.slice(0, 3).map((a: any) => a.name) || [],
          recentTracks: musicData?.tracks?.slice(0, 2).map((t: any) => t.name) || [],
          albumArtwork,
        };
      });

    // Return the profiles we found
    return profiles;
  } catch (error) {
    console.error("Failed to fetch recent profiles:", error);
    // Return empty array on error - component will handle gracefully
    return [];
  }
}
