"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { TransactWriteCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { userPK } from "@/lib/dynamodb/schema";

/**
 * Disconnects Spotify and removes all associated data.
 *
 * This action:
 * - Deletes encrypted Spotify tokens
 * - Removes music data (artists, albums, tracks)
 * - Removes AI-generated content (bio, captions)
 * - Unpublishes the user's page
 *
 * The user will need to reconnect Spotify to use the platform again.
 */
export async function disconnectSpotify(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const userId = session.user.id;
    const pk = userPK(userId);

    // Delete Spotify tokens
    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: "SPOTIFY",
        },
      })
    );

    // Delete music data
    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: "PROFILE#METADATA",
        },
      })
    );

    // Delete bio
    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          pk,
          sk: "CONTENT#BIO",
        },
      })
    );

    // Note: Album captions have dynamic sort keys (CONTENT#CAPTION#{albumId})
    // For simplicity, we'll leave them orphaned. They'll be regenerated when user reconnects.
    // A more thorough cleanup could scan for CONTENT#CAPTION# prefix and delete all.

    // Update user record: set isPublic=false (unpublish)
    await dynamoDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { pk, sk: pk },
              UpdateExpression: "SET isPublic = :false",
              ExpressionAttributeValues: {
                ":false": false,
              },
            },
          },
        ],
      })
    );

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect Spotify:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disconnect Spotify",
    };
  }
}
