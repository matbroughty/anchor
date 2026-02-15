import { NextRequest, NextResponse } from "next/server";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";

/**
 * Admin API endpoint to check USER record values.
 * Helps diagnose why profiles aren't showing on landing page.
 */

export async function GET(request: NextRequest) {
  // Verify secret
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scanResult = await dynamoDocumentClient.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "pk = sk AND begins_with(pk, :userPrefix)",
        ExpressionAttributeValues: {
          ":userPrefix": "USER#",
        },
      })
    );

    const users = (scanResult.Items || []).map((user) => ({
      handle: user.handle,
      isPublic: user.isPublic,
      isPublicType: typeof user.isPublic,
      isPublicValue: JSON.stringify(user.isPublic),
      hasHandle: !!user.handle,
      publishedAt: user.publishedAt,
      spotifyConnected: user.spotifyConnected,
      lastfmUsername: user.lastfmUsername,
    }));

    return NextResponse.json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error checking users:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check failed" },
      { status: 500 }
    );
  }
}
