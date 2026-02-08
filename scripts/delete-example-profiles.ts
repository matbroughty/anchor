import { GetCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "../lib/dynamodb";

/**
 * Deletes the example/seed profiles from the database.
 *
 * Profiles to delete:
 * - beatsandrhymes
 * - cosmicjams
 * - indievibes
 */

const EXAMPLE_HANDLES = ["beatsandrhymes", "cosmicjams", "indievibes"];

async function deleteProfile(handle: string) {
  const handleLower = handle.toLowerCase();
  const handleKey = `HANDLE#${handleLower}`;

  console.log(`\nDeleting profile: ${handleLower}`);
  console.log("=".repeat(50));

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
    console.log(`  ⚠️  HANDLE record not found - skipping`);
    return;
  }

  const userId = handleResult.Item.userId as string;
  const userPK = `USER#${userId}`;

  console.log(`  Found userId: ${userId}`);

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
  console.log(`  Found ${userItems.length} user records`);

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

  console.log(`  Total items to delete: ${allItemsToDelete.length}`);

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

    console.log(`  Deleted batch ${Math.floor(i / 25) + 1} (${chunk.length} items)`);
  }

  console.log(`  ✓ Profile ${handleLower} deleted completely`);
}

async function deleteExampleProfiles() {
  console.log("Deleting example profiles...\n");

  for (const handle of EXAMPLE_HANDLES) {
    try {
      await deleteProfile(handle);
    } catch (error) {
      console.error(`  ✗ Error deleting ${handle}:`, error);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Done!");
}

deleteExampleProfiles().catch(console.error);
