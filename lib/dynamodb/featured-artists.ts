import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { MUSIC_SK, userPK } from "@/lib/dynamodb/schema";
import type { Artist } from "@/types/music";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetches the user's featured artists from DynamoDB.
 *
 * Returns an empty array if the user has not configured featured artists.
 * This makes featured artists truly optional without requiring database migrations.
 */
export async function getFeaturedArtists(userId: string): Promise<Artist[]> {
  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: userPK(userId),
        sk: MUSIC_SK.FEATURED_ARTISTS,
      },
    })
  );

  if (!result.Item) {
    return [];
  }

  return (result.Item.data as Artist[]) ?? [];
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Stores the user's featured artists in DynamoDB.
 *
 * Validates that the array contains 0-4 artists. Stores full Artist objects
 * so profile views don't require Spotify API calls and remain functional even
 * if an artist is deleted from Spotify.
 *
 * @throws Error if artists array contains more than 4 items
 */
export async function putFeaturedArtists(
  userId: string,
  artists: Artist[]
): Promise<void> {
  // Validate array length
  if (artists.length > 4) {
    throw new Error("Cannot feature more than 4 artists");
  }

  const now = Date.now();

  await dynamoDocumentClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        pk: userPK(userId),
        sk: MUSIC_SK.FEATURED_ARTISTS,
        data: artists,
        updatedAt: now,
      },
    })
  );
}
