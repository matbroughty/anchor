import Link from "next/link";
import { getRecentProfiles } from "@/lib/dynamodb/recent-profiles";

/**
 * Landing page recent profiles section
 * Displays the 10 most recently created anchor pages
 * Server component - fetches data directly
 */
export async function RecentProfiles() {
  const profiles = await getRecentProfiles(10);

  if (profiles.length === 0) {
    return null; // Don't show section if no profiles exist yet
  }

  return (
    <section className="bg-neutral-50 dark:bg-neutral-950 py-16 md:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-8 text-center">
          Dropped Anchors
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <Link
              key={profile.handle}
              href={`/${profile.handle}`}
              className="group block p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Musical anchor icon */}
                <div className="relative flex-shrink-0">
                  <svg
                    className="w-8 h-8 text-neutral-600 dark:text-neutral-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="5" r="3"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <path d="M5 16a7 7 0 0 0 14 0"/>
                    <line x1="5" y1="16" x2="5" y2="18"/>
                    <line x1="19" y1="16" x2="19" y2="18"/>
                  </svg>
                  <svg
                    className="absolute -top-0.5 -right-0.5 w-3 h-3 text-blue-500 dark:text-blue-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                  </svg>
                </div>

                {/* Profile info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:underline">
                    {profile.displayName || profile.handle}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 truncate">
                    anchor.band/{profile.handle}
                  </p>
                </div>

                {/* Arrow icon */}
                <svg
                  className="w-4 h-4 text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
