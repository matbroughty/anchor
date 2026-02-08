/**
 * Debug script to check what profiles exist in DynamoDB
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
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

async function debugProfiles() {
  console.log("Scanning for USER records with handles...\n");

  const result = await dynamoDocumentClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "attribute_exists(handle) AND pk = sk",
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("No user records with handles found!");
    return;
  }

  console.log(`Found ${result.Items.length} user records with handles:\n`);

  for (const item of result.Items) {
    console.log("---");
    console.log("Handle:", item.handle);
    console.log("Display Name:", item.displayName || "(none)");
    console.log("isPublic:", item.isPublic);
    console.log("publishedAt:", item.publishedAt || "(not set)");
    console.log("pk:", item.pk);
    console.log("sk:", item.sk);
    console.log("");
  }

  // Now check which would pass the filter
  console.log("\n=== Filter Test ===");
  console.log("Filter: isPublic = true AND attribute_exists(handle) AND pk = sk\n");

  const filtered = result.Items.filter(
    (item) => item.isPublic === true && item.handle && item.pk === item.sk
  );

  console.log(`Profiles that pass filter: ${filtered.length}`);
  filtered.forEach((item) => {
    console.log(`  - ${item.handle} (${item.displayName || "no name"})`);
  });
}

debugProfiles().catch(console.error);
