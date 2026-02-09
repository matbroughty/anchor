import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import ProfilePageClient from "./ProfilePageClient";

async function getProfile(userId: string) {
  const userKey = `USER#${userId}`;

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
    return null;
  }

  // Check if user has Spotify connected
  const spotifyResult = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: userKey,
        sk: "SPOTIFY",
      },
    })
  );

  return {
    handle: result.Item.handle || null,
    displayName: result.Item.name || null,
    email: result.Item.email || null,
    spotifyConnected: !!spotifyResult.Item,
    lastfmUsername: result.Item.lastfmUsername || null,
  };
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Fetch profile data directly from DynamoDB
  const profile = await getProfile(session.user.id);

  if (!profile) {
    // User record doesn't exist - shouldn't happen after auth
    redirect("/signin");
  }

  // If no handle, redirect to claim handle page
  if (!profile.handle) {
    redirect("/profile/claim-handle");
  }

  // Extract OAuth error from URL if present (Next.js 15: searchParams is async)
  const params = await searchParams;
  const oauthError = params.error || null;

  return (
    <ProfilePageClient
      profile={profile}
      oauthError={oauthError}
      spotifyAction={async () => {
        "use server";
        await signIn("spotify", { redirectTo: "/profile" });
      }}
    />
  );
}
