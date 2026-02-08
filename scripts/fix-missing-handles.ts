import { ScanCommand, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "../lib/dynamodb";

/**
 * Fixes missing HANDLE records in the database.
 *
 * For each USER record that has a handle, ensures a corresponding
 * HANDLE#{handle} record exists that points to that user.
 */

async function fixMissingHandles() {
  console.log("Scanning for USER records with handles...\n");

  // Scan for all user records
  const scanResult = await dynamoDocumentClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "pk = sk AND begins_with(pk, :userPrefix) AND attribute_exists(handle)",
      ExpressionAttributeValues: {
        ":userPrefix": "USER#",
      },
    })
  );

  const users = scanResult.Items || [];
  console.log(`Found ${users.length} user(s) with handles\n`);

  let fixed = 0;
  let updated = 0;
  let alreadyOk = 0;

  for (const user of users) {
    const userId = (user.pk as string).replace("USER#", "");
    const handle = (user.handle as string).toLowerCase();
    const handleKey = `HANDLE#${handle}`;

    console.log(`Checking: ${handle} (userId: ${userId})`);

    // Check if HANDLE record exists
    const handleResult = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: handleKey,
          sk: handleKey,
        },
      })
    );

    if (handleResult.Item) {
      const item = handleResult.Item;

      // Check if it has all required fields
      const needsUpdate =
        !item.handle ||
        !item.GSI1PK ||
        !item.GSI1SK ||
        item.userId !== userId;

      if (needsUpdate) {
        console.log(`  ⚠ HANDLE record exists but incomplete - updating...`);

        await dynamoDocumentClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: {
              pk: handleKey,
              sk: handleKey,
              userId,
              handle,
              GSI1PK: "HANDLE",
              GSI1SK: handle,
              claimedAt: item.claimedAt || new Date().toISOString(),
            },
          })
        );

        console.log(`  ✓ HANDLE record updated`);
        updated++;
      } else {
        console.log(`  ✓ HANDLE record OK`);
        alreadyOk++;
      }
    } else {
      console.log(`  ✗ HANDLE record missing - creating...`);

      // Create HANDLE record with all required fields
      await dynamoDocumentClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            pk: handleKey,
            sk: handleKey,
            userId,
            handle,
            GSI1PK: "HANDLE", // For future GSI queries
            GSI1SK: handle,   // For future GSI queries
            claimedAt: new Date().toISOString(),
          },
        })
      );

      console.log(`  ✓ HANDLE record created`);
      fixed++;
    }

    console.log("");
  }

  console.log("=".repeat(50));
  console.log(`Summary:`);
  console.log(`  Total users checked: ${users.length}`);
  console.log(`  Already OK: ${alreadyOk}`);
  console.log(`  Updated (incomplete): ${updated}`);
  console.log(`  Created (missing): ${fixed}`);
  console.log("=".repeat(50));
}

fixMissingHandles().catch(console.error);
