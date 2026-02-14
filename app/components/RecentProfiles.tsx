import Link from "next/link";
import { getRecentProfiles } from "@/lib/dynamodb/recent-profiles";
import { ProfileCardWithPreview } from "./ProfileCardWithPreview";

/**
 * Landing page dropped anchors section
 * Shows real examples with music data preview
 * Server component - fetches data directly
 */
export async function RecentProfiles() {
  const profiles = await getRecentProfiles(12);

  if (profiles.length === 0) {
    return null;
  }

  // Format published date as "Month Year"
  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <section className="bg-neutral-50 py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl font-semibold text-neutral-900 mb-12 text-center">
          Dropped Anchors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {profiles.map((profile) => {
            const droppedDate = formatDate(profile.publishedAt);

            return (
              <ProfileCardWithPreview
                key={profile.handle}
                handle={profile.handle}
                displayName={profile.displayName}
                droppedDate={droppedDate}
                topArtists={profile.topArtists}
                recentTracks={profile.recentTracks}
                albumArtwork={profile.albumArtwork}
              />
            );
          })}
        </div>

        {/* Repeat CTA */}
        <div className="text-center">
          <Link
            href="/signin"
            className="inline-block bg-neutral-900 text-white px-8 py-4 rounded-lg hover:bg-neutral-800 transition-colors font-medium text-lg"
          >
            Drop your anchor
          </Link>
        </div>
      </div>
    </section>
  );
}
