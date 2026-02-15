import { NextRequest, NextResponse } from "next/server";
import { ScanCommand, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";

/**
 * Admin API endpoint to fix missing/incomplete HANDLE records.
 *
 * Usage: POST /api/admin/fix-handles?secret=YOUR_SECRET
 *
 * Security: Requires ADMIN_SECRET env var as secret parameter
 */

export async function POST(request: NextRequest) {
  // Verify secret
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await fixMissingHandles();
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fixing handles:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fix failed" },
      { status: 500 }
    );
  }
}

async function fixMissingHandles() {
  console.log("[fix-handles] Scanning for USER records with handles...");

  // Scan for all user records
  const scanResult = await dynamoDocumentClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression:
        "pk = sk AND begins_with(pk, :userPrefix) AND attribute_exists(handle)",
      ExpressionAttributeValues: {
        ":userPrefix": "USER#",
      },
    })
  );

  const users = scanResult.Items || [];
  console.log(`[fix-handles] Found ${users.length} user(s) with handles`);

  let fixed = 0;
  let updated = 0;
  let alreadyOk = 0;
  const details: Array<{ handle: string; action: string }> = [];

  for (const user of users) {
    const userId = (user.pk as string).replace("USER#", "");
    const handle = (user.handle as string).toLowerCase();
    const handleKey = `HANDLE#${handle}`;

    console.log(`[fix-handles] Checking: ${handle} (userId: ${userId})`);

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
        !item.handle || !item.GSI1PK || !item.GSI1SK || item.userId !== userId;

      if (needsUpdate) {
        console.log(`[fix-handles]   Updating incomplete HANDLE record`);

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

        console.log(`[fix-handles]   ✓ Updated`);
        updated++;
        details.push({ handle, action: "updated" });
      } else {
        console.log(`[fix-handles]   ✓ OK`);
        alreadyOk++;
        details.push({ handle, action: "ok" });
      }
    } else {
      console.log(`[fix-handles]   Creating missing HANDLE record`);

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
            claimedAt: new Date().toISOString(),
          },
        })
      );

      console.log(`[fix-handles]   ✓ Created`);
      fixed++;
      details.push({ handle, action: "created" });
    }
  }

  return {
    success: true,
    summary: {
      totalChecked: users.length,
      alreadyOk,
      updated,
      created: fixed,
    },
    details,
  };
}
