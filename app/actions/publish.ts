"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface PublishResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Publishes the current user's profile page by setting isPublic = true.
 *
 * After publishing, the public page at /{handle} will display the user's
 * profile data.
 */
export async function publishPage(): Promise<PublishResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const pk = userPK(userId);

    // Update the user record to set isPublic = true
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression: "SET isPublic = :isPublic, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":isPublic": true,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    // Get the user's handle to revalidate the public page
    const handle = await getUserHandle(userId);
    if (handle) {
      revalidatePath(`/${handle}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error publishing page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to publish page",
    };
  }
}

/**
 * Unpublishes the current user's profile page by setting isPublic = false.
 *
 * After unpublishing, the public page at /{handle} will return a 404 or
 * "not found" response.
 */
export async function unpublishPage(): Promise<PublishResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const pk = userPK(userId);

    // Update the user record to set isPublic = false
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression: "SET isPublic = :isPublic, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":isPublic": false,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    // Get the user's handle to revalidate the public page
    const handle = await getUserHandle(userId);
    if (handle) {
      revalidatePath(`/${handle}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error unpublishing page:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to unpublish page",
    };
  }
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * Fetches the user's handle from their USER record.
 */
async function getUserHandle(userId: string): Promise<string | null> {
  const pk = userPK(userId);

  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: pk },
      ProjectionExpression: "handle",
    })
  );

  return (result.Item?.handle as string) ?? null;
}
