import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import { getMusicData } from "@/lib/dynamodb/music-data";
import { getFeaturedArtists } from "@/lib/dynamodb/featured-artists";
import { getContent } from "@/lib/dynamodb/content";
import { DashboardClient } from "./DashboardClient";

// ---------------------------------------------------------------------------
// User Status Query
// ---------------------------------------------------------------------------

interface UserStatus {
  handle: string | null;
  isPublic: boolean;
}

async function getUserStatus(userId: string): Promise<UserStatus> {
  const pk = userPK(userId);

  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { pk, sk: pk },
      ProjectionExpression: "handle, isPublic",
    })
  );

  return {
    handle: (result.Item?.handle as string) ?? null,
    isPublic: result.Item?.isPublic === true,
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

  const [musicData, contentData, featuredArtists, userStatus] = await Promise.all([
    getMusicData(userId),
    getContent(userId),
    getFeaturedArtists(userId),
    getUserStatus(userId),
  ]);

  return (
    <DashboardClient
      initialMusicData={musicData}
      initialContent={contentData}
      initialFeaturedArtists={featuredArtists}
      userId={userId}
      handle={userStatus.handle}
      isPublished={userStatus.isPublic}
    />
  );
}
