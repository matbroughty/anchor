import { cache } from "react";
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
}

/**
 * Fetches recently published profiles for the landing page.
 *
 * Scans for USER records where isPublic=true and handle is set,
 * sorted by most recent updates.
 *
 * Wrapped in React cache() for request-level deduplication.
 *
 * @param limit - Number of profiles to return (default 10)
 */
export const getRecentProfiles = cache(
  async (limit: number = 10): Promise<RecentProfile[]> => {
    try {
      // Scan for published users with handles
      // Note: This is acceptable for low volume. For high traffic, consider:
      // - GSI with isPublic as partition key and createdAt as sort key
      // - Caching results in Redis or similar
      const result = await dynamoDocumentClient.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: "isPublic = :true AND attribute_exists(handle) AND pk = sk",
          ExpressionAttributeValues: {
            ":true": true,
          },
          Limit: limit * 3, // Over-fetch to account for filtering
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

      // Sort by publishedAt timestamp (most recent first)
      const sortedUsers = (result.Items || [])
        .filter((item) => item.handle) // Ensure handle exists
        .sort((a, b) => {
          const publishedAtA = (a.publishedAt as number) || 0;
          const publishedAtB = (b.publishedAt as number) || 0;

          // Sort by publishedAt descending (most recent first)
          if (publishedAtB !== publishedAtA) {
            return publishedAtB - publishedAtA;
          }

          // If both have no publishedAt, sort alphabetically
          const handleA = (a.handle as string).toLowerCase();
          const handleB = (b.handle as string).toLowerCase();
          return handleB.localeCompare(handleA);
        })
        .slice(0, limit);

      // Batch fetch music data for top 5 profiles
      const userIds = sortedUsers
        .map((item) => {
          const pk = item.pk as string;
          return pk.replace("USER#", "");
        })
        .slice(0, 5);

      const musicKeys = userIds.flatMap((userId) => [
        { pk: userPK(userId), sk: MUSIC_SK.ARTISTS },
        { pk: userPK(userId), sk: MUSIC_SK.TRACKS },
      ]);

      let musicDataMap = new Map<string, { artists?: any[]; tracks?: any[] }>();

      if (musicKeys.length > 0) {
        try {
          const musicResult = await dynamoDocumentClient.send(
            new BatchGetCommand({
              RequestItems: {
                [TABLE_NAME]: {
                  Keys: musicKeys,
                },
              },
            })
          );

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
            } else if (sk === MUSIC_SK.TRACKS) {
              userMusic.tracks = item.data as any[];
            }
          });
        } catch (error) {
          console.error("Failed to fetch music data for profiles:", error);
        }
      }

      // Build profile objects with music data
      const profiles: RecentProfile[] = sortedUsers.map((item) => {
        const pk = item.pk as string;
        const userId = pk.replace("USER#", "");
        const musicData = musicDataMap.get(userId);

        return {
          handle: item.handle as string,
          displayName: (item.displayName as string) || null,
          publishedAt: (item.publishedAt as number) || null,
          topArtists: musicData?.artists?.slice(0, 3).map((a: any) => a.name) || [],
          recentTracks: musicData?.tracks?.slice(0, 2).map((t: any) => t.name) || [],
        };
      });

      // Ensure matbroughty always appears (fallback for production)
      if (profiles.length === 0 || !profiles.some(p => p.handle === "matbroughty")) {
        const fallbackProfiles: RecentProfile[] = [
          {
            handle: "matbroughty",
            displayName: null,
            publishedAt: null,
            topArtists: [],
            recentTracks: [],
          },
          ...profiles.filter(p => p.handle !== "matbroughty"),
        ].slice(0, limit);
        return fallbackProfiles;
      }

      return profiles;
    } catch (error) {
      console.error("Failed to fetch recent profiles:", error);
      // Return fallback even on error
      return [
        {
          handle: "matbroughty",
          displayName: null,
          publishedAt: null,
          topArtists: [],
          recentTracks: [],
        },
      ];
    }
  }
);
