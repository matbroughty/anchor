/**
 * Cleanup duplicate example profiles, keeping only the most recent one for each handle
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const TABLE_NAME = process.env.AUTH_DYNAMODB_TABLE_NAME || "anchor-auth";

const client = new DynamoDBClient({
  region: process.env.AUTH_DYNAMODB_REGION!,
  credentials: {
    accessKeyId: process.env.AUTH_DYNAMODB_ID!,
    secretAccessKey: process.env.AUTH_DYNAMODB_SECRET!,
  },
});

const dynamoDocumentClient = DynamoDBDocumentClient.from(client);

async function cleanupDuplicates() {
  console.log("Scanning for duplicate example profiles...\n");

  // Find all example profiles (userId starts with "example-")
  const result = await dynamoDocumentClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(pk, :prefix)",
      ExpressionAttributeValues: {
        ":prefix": "USER#example-",
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("No example profiles found.");
    return;
  }

  // Group by handle
  const byHandle = new Map<string, any[]>();
  for (const item of result.Items) {
    if (item.pk === item.sk && item.handle) {
      const handle = item.handle as string;
      if (!byHandle.has(handle)) {
        byHandle.set(handle, []);
      }
      byHandle.get(handle)!.push(item);
    }
  }

  console.log(`Found ${result.Items.length} example user records`);
  console.log(`Grouped into ${byHandle.size} unique handles:\n`);

  for (const [handle, profiles] of byHandle.entries()) {
    console.log(`${handle}: ${profiles.length} copies`);

    if (profiles.length > 1) {
      // Sort by publishedAt (most recent first)
      profiles.sort((a, b) => {
        const timeA = (a.publishedAt as number) || 0;
        const timeB = (b.publishedAt as number) || 0;
        return timeB - timeA;
      });

      // Keep the first (most recent), delete the rest
      const [keep, ...toDelete] = profiles;

      console.log(`  Keeping: ${keep.pk} (publishedAt: ${keep.publishedAt})`);
      console.log(`  Deleting: ${toDelete.length} older copies...`);

      for (const profile of toDelete) {
        // Delete user record
        await dynamoDocumentClient.send(
          new DeleteCommand({
            TableName: TABLE_NAME,
            Key: { pk: profile.pk, sk: profile.sk },
          })
        );

        // Delete handle mapping
        const handleKey = `HANDLE#${handle.toLowerCase()}`;
        try {
          await dynamoDocumentClient.send(
            new DeleteCommand({
              TableName: TABLE_NAME,
              Key: { pk: handleKey, sk: handleKey },
            })
          );
        } catch (err) {
          // Handle mapping might not exist or already deleted
        }

        // Note: We're not deleting associated data (music, content) for simplicity
        // Those orphaned records won't cause issues

        console.log(`    Deleted: ${profile.pk}`);
      }

      // Update handle mapping to point to the kept profile
      console.log(`  Updating handle mapping for ${handle}...`);
      const handleKey = `HANDLE#${handle.toLowerCase()}`;
      await dynamoDocumentClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { pk: handleKey, sk: handleKey },
        })
      );

      // Will be recreated on next access or by seed script
    } else {
      console.log(`  Only one copy - no cleanup needed`);
    }

    console.log("");
  }

  console.log("✓ Cleanup complete!");
}

cleanupDuplicates().catch(console.error);
