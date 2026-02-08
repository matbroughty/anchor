"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { GetCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { verifyLastfmUser } from "@/lib/lastfm";
import { refreshLastfmData } from "@/lib/dynamodb/lastfm-data";
import { userPK } from "@/lib/dynamodb/schema";

/**
 * Connect a Last.fm username to the user's account.
 * Verifies the username exists on Last.fm before storing.
 */
export async function connectLastfm(
  username: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate username format (3-15 alphanumeric characters)
    const usernameRegex = /^[a-zA-Z0-9_-]{2,15}$/;
    if (!usernameRegex.test(username)) {
      return { success: false, error: "Invalid Last.fm username format" };
    }

    // Verify username exists on Last.fm
    const isValid = await verifyLastfmUser(username);
    if (!isValid) {
      return { success: false, error: "Last.fm username not found" };
    }

    // Store username in user record
    const pk = userPK(session.user.id);
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression: "SET lastfmUsername = :username, updatedAt = :now",
        ExpressionAttributeValues: {
          ":username": username,
          ":now": new Date().toISOString(),
        },
      })
    );

    // Fetch initial Last.fm data
    await refreshLastfmData(session.user.id, username);

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to connect Last.fm:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to connect Last.fm",
    };
  }
}

/**
 * Disconnect Last.fm and remove all associated data.
 */
export async function disconnectLastfm(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    const pk = userPK(session.user.id);

    // Remove lastfmUsername from user record
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression:
          "REMOVE lastfmUsername SET isPublic = :false, updatedAt = :now",
        ExpressionAttributeValues: {
          ":false": false,
          ":now": new Date().toISOString(),
        },
      })
    );

    // Delete all music data (artists, albums, tracks, featured artists)
    const musicKeys = [
      { pk, sk: "MUSIC#ARTISTS" },
      { pk, sk: "MUSIC#ALBUMS" },
      { pk, sk: "MUSIC#TRACKS" },
      { pk, sk: "MUSIC#FEATURED_ARTISTS" },
    ];

    await Promise.all(
      musicKeys.map((key) =>
        dynamoDocumentClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: key,
          })
        )
      )
    );

    // Delete all content data (bio, captions, taste analysis, age guess)
    const contentKeys = [
      { pk, sk: "CONTENT#BIO" },
      { pk, sk: "CONTENT#CAPTIONS" },
      { pk, sk: "CONTENT#TASTE_ANALYSIS" },
      { pk, sk: "CONTENT#AGE_GUESS" },
    ];

    await Promise.all(
      contentKeys.map((key) =>
        dynamoDocumentClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: key,
          })
        )
      )
    );

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to disconnect Last.fm:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disconnect Last.fm",
    };
  }
}

/**
 * Refresh Last.fm data for the current user.
 * This is the equivalent of refreshSpotifyData but for Last.fm.
 */
export async function refreshLastfmUserData(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // Get Last.fm username from user record
    const pk = userPK(session.user.id);
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
      })
    );

    const lastfmUsername = result.Item?.lastfmUsername;
    if (!lastfmUsername) {
      return { success: false, error: "Last.fm not connected" };
    }

    // Fetch and store fresh Last.fm data
    await refreshLastfmData(session.user.id, lastfmUsername);

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    console.error("Failed to refresh Last.fm data:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh Last.fm data",
    };
  }
}
