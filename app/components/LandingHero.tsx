import Link from "next/link";

/**
 * Landing page hero section
 * Server component - no client-side interactivity needed
 */
export function LandingHero() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 md:py-32 text-center">
        {/* Musical Anchor Icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <svg
              className="w-16 h-16 md:w-20 md:h-20 text-neutral-700 dark:text-neutral-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Anchor symbol */}
              <circle cx="12" cy="5" r="3"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <path d="M5 16a7 7 0 0 0 14 0"/>
              <line x1="5" y1="16" x2="5" y2="18"/>
              <line x1="19" y1="16" x2="19" y2="18"/>
            </svg>
            {/* Music note overlay */}
            <svg
              className="absolute -top-1 -right-1 w-6 h-6 md:w-8 md:h-8 text-blue-500 dark:text-blue-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-10">
          Your music profile, tastefully done
        </h1>
        <Link
          href="/signin"
          className="inline-block bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-8 py-4 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium text-lg"
        >
          Get Started
        </Link>
      </div>
    </section>
  );
}
