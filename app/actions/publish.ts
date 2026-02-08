"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import { Resend } from "resend";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

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
    // Set publishedAt only if it doesn't exist (first time publishing)
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk: pk },
        UpdateExpression: "SET isPublic = :isPublic, updatedAt = :updatedAt, publishedAt = if_not_exists(publishedAt, :publishedAt)",
        ExpressionAttributeValues: {
          ":isPublic": true,
          ":updatedAt": new Date().toISOString(),
          ":publishedAt": Date.now(),
        },
      })
    );

    // Get the user's handle and details to revalidate the public page and send notification
    const userDetails = await getUserDetails(userId);
    if (userDetails?.handle) {
      revalidatePath(`/${userDetails.handle}`);

      // Send notification email when anchor is dropped
      try {
        const emailResult = await resend.emails.send({
          from: "Anchor <onboarding@resend.dev>",
          to: "dropped@anchor.band",
          replyTo: "hello@anchor.band",
          subject: `⚓ New Anchor Dropped: ${userDetails.handle}`,
          html: `
            <h2>⚓ A new anchor has been dropped!</h2>
            <p><strong>Handle:</strong> ${userDetails.handle}</p>
            <p><strong>Display Name:</strong> ${userDetails.displayName || "Not set"}</p>
            <p><strong>Email:</strong> ${userDetails.email || "Not available"}</p>
            <p><strong>Profile URL:</strong> <a href="https://anchor.band/${userDetails.handle}">https://anchor.band/${userDetails.handle}</a></p>
            <p><strong>Dropped at:</strong> ${new Date().toISOString()}</p>
          `,
        });
        console.log("Anchor dropped notification sent:", emailResult);
      } catch (emailError) {
        // Don't fail the publish action if email fails
        console.error("Failed to send anchor dropped notification:", emailError);
      }
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

/**
 * Fetches the user's details from their USER record.
 */
async function getUserDetails(userId: string): Promise<{
  handle: string;
  displayName: string | null;
  email: string | null;
} | null> {
  const pk = userPK(userId);

  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: pk },
      ProjectionExpression: "handle, displayName, email",
    })
  );

  if (!result.Item) {
    return null;
  }

  return {
    handle: (result.Item.handle as string) ?? "",
    displayName: (result.Item.displayName as string) ?? null,
    email: (result.Item.email as string) ?? null,
  };
}
