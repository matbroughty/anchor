import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getErasData } from "@/app/actions/eras";
import ErasWizard from "./ErasWizard";

// Force dynamic rendering to prevent auth caching
export const dynamic = "force-dynamic";

/**
 * Musical Eras wizard page
 * Allows users to curate key albums from their musical journey
 */
export default async function ErasPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  // Get existing eras data if any
  const erasResult = await getErasData();
  const existingData = erasResult.success ? erasResult.data : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-3">
            Your Musical Eras
          </h1>
          <p className="text-lg text-zinc-400">
            Build a timeline of the albums that shaped your musical journey
          </p>
        </div>

        <ErasWizard existingData={existingData} />
      </div>
    </div>
  );
}
