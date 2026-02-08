import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
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

async function checkUserData(userId: string) {
  const pk = `USER#${userId}`;
  const result = await dynamoDocumentClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": pk },
    })
  );

  console.log(`\nRecords for user ${userId} (indie-kid):\n`);
  if (!result.Items || result.Items.length === 0) {
    console.log("No records found!");
    return;
  }

  result.Items.forEach((item) => {
    console.log(`sk: ${item.sk}`);
    if (item.sk.startsWith("MUSIC#")) {
      console.log(`  - Has data field: ${!!item.data}`);
      console.log(`  - Data length: ${item.data?.length || 0}`);
      console.log(`  - cachedAt: ${item.cachedAt}`);
    }
    if (item.sk === "PROFILE#METADATA") {
      console.log(`  - lastRefresh: ${item.lastRefresh}`);
    }
    if (item.sk.startsWith("USER#")) {
      console.log(`  - handle: ${item.handle}`);
      console.log(`  - displayName: ${item.displayName || "(none)"}`);
      console.log(`  - isPublic: ${item.isPublic}`);
      console.log(`  - lastfmUsername: ${item.lastfmUsername || "(none)"}`);
    }
    console.log("");
  });
}

checkUserData("bdd00fef-b532-4360-9dee-3456d36c577b").catch(console.error);
