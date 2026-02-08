import { NextRequest, NextResponse } from "next/server";
import { GetCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";

/**
 * Admin API endpoint to delete example profiles.
 *
 * Usage: POST /api/admin/delete-examples?secret=YOUR_SECRET
 *
 * Deletes: beatsandrhymes, cosmicjams, indievibes
 */

const EXAMPLE_HANDLES = ["beatsandrhymes", "cosmicjams", "indievibes"];

export async function POST(request: NextRequest) {
  // Verify secret
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.AUTH_RESEND_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await deleteExampleProfiles();
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error deleting examples:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}

async function deleteProfile(handle: string) {
  const handleLower = handle.toLowerCase();
  const handleKey = `HANDLE#${handleLower}`;

  console.log(`[delete-examples] Deleting profile: ${handleLower}`);

  // 1. Get userId from HANDLE record
  const handleResult = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: handleKey,
        sk: handleKey,
      },
    })
  );

  if (!handleResult.Item) {
    console.log(`[delete-examples]   HANDLE record not found - skipping`);
    return { handle: handleLower, status: "not_found" };
  }

  const userId = handleResult.Item.userId as string;
  const userPK = `USER#${userId}`;

  console.log(`[delete-examples]   Found userId: ${userId}`);

  // 2. Query all items for this user
  const queryResult = await dynamoDocumentClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": userPK,
      },
    })
  );

  const userItems = queryResult.Items || [];
  console.log(`[delete-examples]   Found ${userItems.length} user records`);

  // 3. Delete all items in batches (BatchWrite max 25 items)
  const allItemsToDelete = [
    // HANDLE record
    { pk: handleKey, sk: handleKey },
    // All USER records
    ...userItems.map((item) => ({
      pk: item.pk as string,
      sk: item.sk as string,
    })),
  ];

  console.log(`[delete-examples]   Total items to delete: ${allItemsToDelete.length}`);

  // Batch delete in chunks of 25
  for (let i = 0; i < allItemsToDelete.length; i += 25) {
    const chunk = allItemsToDelete.slice(i, i + 25);

    await dynamoDocumentClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            DeleteRequest: {
              Key: item,
            },
          })),
        },
      })
    );

    console.log(`[delete-examples]   Deleted batch ${Math.floor(i / 25) + 1}`);
  }

  console.log(`[delete-examples]   ✓ Profile ${handleLower} deleted`);

  return {
    handle: handleLower,
    status: "deleted",
    itemsDeleted: allItemsToDelete.length,
  };
}

async function deleteExampleProfiles() {
  console.log("[delete-examples] Deleting example profiles...");

  const results = [];

  for (const handle of EXAMPLE_HANDLES) {
    try {
      const result = await deleteProfile(handle);
      results.push(result);
    } catch (error) {
      console.error(`[delete-examples] Error deleting ${handle}:`, error);
      results.push({
        handle,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    success: true,
    deleted: results.filter((r) => r.status === "deleted").length,
    notFound: results.filter((r) => r.status === "not_found").length,
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };
}
