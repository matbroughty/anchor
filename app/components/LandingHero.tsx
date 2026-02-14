import Link from "next/link";

/**
 * Landing page hero section
 * Clean, minimal, confident introduction to dropping an anchor
 */
export function LandingHero() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 md:py-32 text-center">
        {/* Musical Anchor Icon */}
        <div className="flex justify-center mb-12">
          <div className="relative">
            <svg
              className="w-16 h-16 md:w-20 md:h-20 text-neutral-700"
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
              className="absolute -top-1 -right-1 w-6 h-6 md:w-8 md:h-8 text-blue-500"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 mb-6 leading-tight">
          Drop your anchor.<br />
          Publish your music taste.
        </h1>

        <p className="text-xl md:text-2xl text-neutral-600 mb-12 max-w-2xl mx-auto">
          Turn your listening history and favourite bands into a public page worth sharing.
        </p>

        <Link
          href="/signin"
          title="Get started - create your music profile and publish it to share your taste with the world"
          className="inline-block bg-neutral-900 text-white px-8 py-4 rounded-lg hover:bg-neutral-800 transition-colors font-medium text-lg"
        >
          Drop your anchor
        </Link>
      </div>
    </section>
  );
}
