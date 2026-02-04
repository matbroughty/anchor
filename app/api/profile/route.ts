import { auth } from "@/auth";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from "next/server";

/**
 * GET /api/profile
 * Get current user's profile information
 */
export async function GET() {
  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userKey = `USER#${session.user.id}`;

    // Get user record from DynamoDB
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: userKey,
          sk: userKey,
        },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has Spotify connected
    // Spotify tokens are stored in separate record with sk: SPOTIFY
    const spotifyResult = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: userKey,
          sk: "SPOTIFY",
        },
      })
    );

    const spotifyConnected = !!spotifyResult.Item;

    // Return profile data
    return NextResponse.json({
      handle: result.Item.handle || null,
      displayName: result.Item.name || session.user.name || null,
      email: result.Item.email || session.user.email || null,
      spotifyConnected,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profile
 * Update user's profile information (currently only displayName)
 */
export async function PATCH(request: Request) {
  // Verify authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { displayName } = body;

    if (!displayName || typeof displayName !== "string") {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    // Validate display name length
    if (displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "Display name cannot be empty" },
        { status: 400 }
      );
    }

    if (displayName.length > 100) {
      return NextResponse.json(
        { error: "Display name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const userKey = `USER#${session.user.id}`;

    // Update user record with new display name
    await dynamoDocumentClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          pk: userKey,
          sk: userKey,
        },
        UpdateExpression: "SET #name = :name, updatedAt = :time",
        ExpressionAttributeNames: {
          "#name": "name", // Use expression attribute name to avoid reserved word
        },
        ExpressionAttributeValues: {
          ":name": displayName.trim(),
          ":time": new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({
      displayName: displayName.trim(),
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
