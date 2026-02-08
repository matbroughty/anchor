import { cache } from "react";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";

/**
 * Recent profile data for landing page
 */
export interface RecentProfile {
  handle: string;
  displayName: string | null;
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

      if (!result.Items || result.Items.length === 0) {
        return [];
      }

      // Sort by publishedAt timestamp (most recent first)
      // Fall back to alphabetical if publishedAt doesn't exist (legacy profiles)
      const profiles: RecentProfile[] = result.Items
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
        .slice(0, limit)
        .map((item) => ({
          handle: item.handle as string,
          displayName: (item.displayName as string) || null,
        }));

      return profiles;
    } catch (error) {
      console.error("Failed to fetch recent profiles:", error);
      return [];
    }
  }
);
