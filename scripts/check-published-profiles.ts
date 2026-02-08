import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "../lib/dynamodb";

async function checkPublishedProfiles() {
  console.log("Checking all published profiles...\n");

  // Query for all handles using GSI1
  const result = await dynamoDocumentClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "HANDLE",
      },
    })
  );

  console.log(`Total handles found: ${result.Items?.length || 0}\n`);

  if (!result.Items) return;

  for (const item of result.Items) {
    console.log(`Handle: ${item.handle}`);
    console.log(`  UserID: ${item.userId}`);

    // Get the user record
    const userResult = await dynamoDocumentClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "pk = :pk AND sk = :sk",
        ExpressionAttributeValues: {
          ":pk": `USER#${item.userId}`,
          ":sk": `USER#${item.userId}`,
        },
      })
    );

    if (userResult.Items && userResult.Items.length > 0) {
      const user = userResult.Items[0];
      console.log(`  isPublic: ${user.isPublic}`);
      console.log(`  publishedAt: ${user.publishedAt}`);
      console.log(`  displayName: ${user.displayName || "N/A"}`);
      console.log(`  lastfmUsername: ${user.lastfmUsername || "N/A"}`);
      console.log(`  spotifyConnected: ${user.spotifyConnected || false}`);
    }
    console.log("");
  }
}

checkPublishedProfiles().catch(console.error);
