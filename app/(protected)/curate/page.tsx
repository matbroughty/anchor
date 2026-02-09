import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getManualCuration } from "@/app/actions/manual-curation";
import { CurateClient } from "./CurateClient";

/**
 * Manual curation page - allows users to select their own music
 * Uses Apple Music catalog search (no user authentication required)
 */
export default async function CuratePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Fetch existing curation data if available
  const result = await getManualCuration();
  const existingData = result.success && result.data ? result.data : null;

  return (
    <CurateClient
      initialArtists={existingData?.artists || []}
      initialAlbums={existingData?.albums || []}
      initialTracks={existingData?.tracks || []}
    />
  );
}
