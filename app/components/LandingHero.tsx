"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Landing page hero section
 */
export function LandingHero() {
  const [showInfo, setShowInfo] = useState(false);
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

        <h1 className="text-5xl md:text-6xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
          Your music profile, tastefully done
        </h1>
        <div className="flex items-center justify-center gap-2 mb-10">
          <p className="text-xl md:text-2xl text-neutral-600 dark:text-neutral-400">
            Ready to share your taste?
          </p>
          <div className="relative">
            <button
              onClick={() => setShowInfo(!showInfo)}
              onMouseEnter={() => setShowInfo(true)}
              onMouseLeave={() => setShowInfo(false)}
              className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              aria-label="Information about Spotify connection"
            >
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="8" r="0.5" fill="currentColor" strokeWidth="2" />
              </svg>
            </button>
            {showInfo && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-4 text-sm text-left z-10">
                <p className="text-neutral-700 dark:text-neutral-300 mb-2">
                  <strong>Music service required:</strong> Anchor connects to Spotify or Last.fm to fetch your top artists, albums, and tracks.
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                  Last.fm has open API access. Spotify requires manual approval due to API restrictions.
                </p>
              </div>
            )}
          </div>
        </div>
        <Link
          href="/signin"
          className="inline-block bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-8 py-4 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors font-medium text-lg"
        >
          Drop Anchor (get started)
        </Link>
      </div>
    </section>
  );
}
