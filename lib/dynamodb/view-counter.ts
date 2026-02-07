import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { METADATA_SK, userPK } from "@/lib/dynamodb/schema";

// ---------------------------------------------------------------------------
// View Counter Operations
// ---------------------------------------------------------------------------

/**
 * Atomically increments the view count for a user's profile.
 *
 * Uses DynamoDB's ADD operation to prevent race conditions with concurrent views.
 * Initializes viewCount to 0 if the field doesn't exist yet.
 *
 * This is a fire-and-forget operation - errors are logged but don't block
 * the page render.
 */
export async function incrementViewCount(userId: string): Promise<void> {
  const pk = userPK(userId);

  try {
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: METADATA_SK,
        },
        UpdateExpression:
          "SET viewCount = if_not_exists(viewCount, :zero) + :inc",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":inc": 1,
        },
      })
    );
  } catch (error) {
    // Log error but don't throw - view count is non-critical
    console.error("Failed to increment view count:", error);
  }
}

/**
 * Fetches the current view count for a user's profile.
 *
 * Returns 0 if the PROFILE#METADATA record doesn't exist or if
 * the viewCount field is not set.
 *
 * Used when the owner views their profile to display the current count.
 */
export async function getViewCount(userId: string): Promise<number> {
  const pk = userPK(userId);

  try {
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: METADATA_SK,
        },
      })
    );

    if (!result.Item) return 0;
    return (result.Item.viewCount as number) ?? 0;
  } catch (error) {
    console.error("Failed to fetch view count:", error);
    return 0;
  }
}
