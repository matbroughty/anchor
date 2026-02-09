import Link from "next/link";
import { getRecentProfiles } from "@/lib/dynamodb/recent-profiles";

/**
 * Landing page dropped anchors section
 * Shows real examples with music data preview
 * Server component - fetches data directly
 */
export async function RecentProfiles() {
  const profiles = await getRecentProfiles(5);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {profiles.map((profile) => {
            const droppedDate = formatDate(profile.publishedAt);

            return (
              <Link
                key={profile.handle}
                href={`/${profile.handle}`}
                className="group block p-6 bg-white rounded-lg border border-neutral-200 hover:border-neutral-400 hover:shadow-md transition-all"
              >
                <div className="flex gap-4">
                  {/* Left: Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="mb-4">
                      <h3 className="font-semibold text-neutral-900 mb-1 group-hover:underline">
                        {profile.displayName || profile.handle}
                      </h3>
                      {droppedDate && (
                        <p className="text-xs text-neutral-500">
                          Dropped {droppedDate}
                        </p>
                      )}
                    </div>

                    {/* Top Artists */}
                    {profile.topArtists.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-neutral-500 mb-1.5">Top Artists</p>
                        <div className="space-y-1">
                          {profile.topArtists.slice(0, 3).map((artist, idx) => (
                            <p key={idx} className="text-sm text-neutral-700 truncate">
                              {artist}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Tracks */}
                    {profile.recentTracks.length > 0 && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-1.5">Recent Tracks</p>
                        <div className="space-y-1">
                          {profile.recentTracks.slice(0, 2).map((track, idx) => (
                            <p key={idx} className="text-sm text-neutral-700 truncate">
                              {track}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty state for profiles without music data */}
                    {profile.topArtists.length === 0 && profile.recentTracks.length === 0 && (
                      <p className="text-sm text-neutral-500 italic">
                        View profile
                      </p>
                    )}
                  </div>

                  {/* Right: Album artwork or anchor icon */}
                  <div className="flex-shrink-0">
                    {profile.albumArtwork ? (
                      <img
                        src={profile.albumArtwork}
                        alt="Album artwork"
                        className="w-24 h-24 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-neutral-100 to-neutral-200 flex items-center justify-center">
                        <svg
                          className="w-12 h-12 text-neutral-400"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="5" r="3" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <path d="M5 16a7 7 0 0 0 14 0" />
                          <line x1="5" y1="16" x2="5" y2="18" />
                          <line x1="19" y1="16" x2="19" y2="18" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
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
