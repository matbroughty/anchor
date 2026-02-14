import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import type { FavouriteListeningParty } from "@/types/listening-party";

/**
 * GET /api/listening-party/favourite
 * Returns user's favourite listening party if set
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pk = userPK(session.user.id);
    const sk = "LISTENING_PARTY#FAVOURITE";

    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
      })
    );

    if (!result.Item) {
      return NextResponse.json({ favourite: null });
    }

    const favourite: FavouriteListeningParty = {
      partyId: result.Item.partyId,
      partyDateTime: result.Item.partyDateTime,
      artist: result.Item.artist,
      album: result.Item.album,
      replayLink: result.Item.replayLink,
      spotifyAlbumLink: result.Item.spotifyAlbumLink,
      artworkSmall: result.Item.artworkSmall,
      artworkMedium: result.Item.artworkMedium,
      artworkLarge: result.Item.artworkLarge,
      albumReleaseDate: result.Item.albumReleaseDate,
      tweetLink: result.Item.tweetLink,
      timelineLink: result.Item.timelineLink,
    };

    return NextResponse.json({ favourite });
  } catch (error) {
    console.error("Failed to get favourite listening party:", error);
    return NextResponse.json(
      { error: "Failed to get favourite listening party" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/listening-party/favourite
 * Save user's favourite listening party
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      partyId,
      partyDateTime,
      artist,
      album,
      replayLink,
      spotifyAlbumLink,
      artworkSmall,
      artworkMedium,
      artworkLarge,
      albumReleaseDate,
      tweetLink,
      timelineLink,
    } = body;

    // Validate required fields
    if (!partyId || !artist || !album || !replayLink) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pk = userPK(session.user.id);
    const sk = "LISTENING_PARTY#FAVOURITE";

    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk,
          sk,
          partyId,
          partyDateTime,
          artist,
          album,
          replayLink,
          spotifyAlbumLink,
          artworkSmall,
          artworkMedium,
          artworkLarge,
          albumReleaseDate,
          tweetLink,
          timelineLink,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save favourite listening party:", error);
    return NextResponse.json(
      { error: "Failed to save favourite listening party" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/listening-party/favourite
 * Remove user's favourite listening party
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pk = userPK(session.user.id);
    const sk = "LISTENING_PARTY#FAVOURITE";

    await dynamoDocumentClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete favourite listening party:", error);
    return NextResponse.json(
      { error: "Failed to delete favourite listening party" },
      { status: 500 }
    );
  }
}
