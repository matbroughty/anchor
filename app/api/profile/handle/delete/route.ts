import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { userPK } from "@/lib/dynamodb/schema";

/**
 * DELETE /api/profile/handle/delete
 *
 * Deletes the user's handle and allows them to claim a new one.
 * This is a destructive action that removes the handle from the global registry.
 */
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const userKey = userPK(userId);

    // Get current handle
    const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: userKey,
          sk: userKey,
        },
      })
    );

    const currentHandle = result.Item?.handle as string | undefined;

    if (!currentHandle) {
      return NextResponse.json({ error: "No handle to delete" }, { status: 400 });
    }

    const handleKey = `HANDLE#${currentHandle.toLowerCase()}`;

    // Atomic transaction: remove handle from user record + delete handle registry entry
    await dynamoDocumentClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                pk: userKey,
                sk: userKey,
              },
              UpdateExpression: "REMOVE handle, isPublic",
              ConditionExpression: "attribute_exists(pk)",
            },
          },
          {
            Delete: {
              TableName: TABLE_NAME,
              Key: {
                pk: handleKey,
                sk: handleKey,
              },
            },
          },
        ],
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete handle:", error);
    return NextResponse.json(
      { error: "Failed to delete handle" },
      { status: 500 }
    );
  }
}
