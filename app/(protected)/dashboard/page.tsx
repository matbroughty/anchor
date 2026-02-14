import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import { getMusicData } from "@/lib/dynamodb/music-data";
import { getFeaturedArtists } from "@/lib/dynamodb/featured-artists";
import { getContent, getTasteAnalysis, getAgeGuess } from "@/lib/dynamodb/content";
import { DashboardClient } from "./DashboardClient";

// Force dynamic rendering - prevents caching of auth() calls
// This is CRITICAL to prevent user session leakage
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// User Status Query
// ---------------------------------------------------------------------------

interface UserStatus {
  handle: string | null;
  isPublic: boolean;
  musicService: "spotify" | "lastfm" | "manual" | null;
}

async function getUserStatus(userId: string): Promise<UserStatus> {
  const pk = userPK(userId);

  // Get user record
  const userResult = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: pk },
      ProjectionExpression: "handle, isPublic, lastfmUsername, manualCuration",
    })
  );

  // Check for Spotify connection
  const spotifyResult = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: "SPOTIFY" },
    })
  );

  // Determine which service is connected
  let musicService: "spotify" | "lastfm" | "manual" | null = null;
  if (spotifyResult.Item) {
    musicService = "spotify";
  } else if (userResult.Item?.lastfmUsername) {
    musicService = "lastfm";
  } else if (userResult.Item?.manualCuration) {
    musicService = "manual";
  }

  return {
    handle: (userResult.Item?.handle as string) ?? null,
    isPublic: userResult.Item?.isPublic === true,
    musicService,
  };
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

/**
 * Dashboard page — server component.
 *
 * Fetches music data, content, and user status in parallel, then hands
 * everything to the client component for interactive rendering.
 * The protected layout already guards this route, but we double-check
 * here so the redirect target is explicit.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;

  const [musicData, contentData, featuredArtists, tasteAnalysis, ageGuess, userStatus] =
    await Promise.all([
      getMusicData(userId),
      getContent(userId),
      getFeaturedArtists(userId),
      getTasteAnalysis(userId),
      getAgeGuess(userId),
      getUserStatus(userId),
    ]);

  return (
    <DashboardClient
      initialMusicData={musicData}
      initialContent={contentData}
      initialFeaturedArtists={featuredArtists}
      initialTasteAnalysis={tasteAnalysis}
      initialAgeGuess={ageGuess}
      userId={userId}
      handle={userStatus.handle}
      isPublished={userStatus.isPublic}
      musicService={userStatus.musicService}
    />
  );
}
