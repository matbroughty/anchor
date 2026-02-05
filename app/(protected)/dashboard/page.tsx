import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMusicData } from "@/lib/dynamodb/music-data";
import { getContent } from "@/lib/dynamodb/content";
import { DashboardClient } from "./DashboardClient";

/**
 * Dashboard page — server component.
 *
 * Fetches music data and content in parallel, then hands everything
 * to the client component for interactive rendering.  The protected
 * layout already guards this route, but we double-check here so the
 * redirect target is explicit.
 */
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;

  const [musicData, contentData] = await Promise.all([
    getMusicData(userId),
    getContent(userId),
  ]);

  return (
    <DashboardClient
      initialMusicData={musicData}
      initialContent={contentData}
      userId={userId}
    />
  );
}
