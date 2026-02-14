"use client";

import { useState } from "react";
import Link from "next/link";

interface ProfileCardProps {
  handle: string;
  displayName: string | null;
  droppedDate: string | null;
  topArtists: string[];
  recentTracks: string[];
  albumArtwork: string | null;
}

export function ProfileCardWithPreview({
  handle,
  displayName,
  droppedDate,
  topArtists,
  recentTracks,
  albumArtwork,
}: ProfileCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="relative">
      <Link
        href={`/${handle}`}
        className="group block p-6 bg-white rounded-lg border border-neutral-200 hover:border-neutral-400 hover:shadow-md transition-all"
      >
        <div className="flex gap-4">
          {/* Left: Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-4">
              <h3 className="font-semibold text-neutral-900 mb-1 group-hover:underline">
                {displayName || handle}
              </h3>
              {droppedDate && (
                <p className="text-xs text-neutral-500">
                  Dropped {droppedDate}
                </p>
              )}
            </div>

            {/* Top Artists */}
            {topArtists.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-neutral-500 mb-1.5">Top Artists</p>
                <div className="space-y-1">
                  {topArtists.slice(0, 3).map((artist, idx) => (
                    <p key={idx} className="text-sm text-neutral-700 truncate">
                      {artist}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Tracks */}
            {recentTracks.length > 0 && (
              <div>
                <p className="text-xs text-neutral-500 mb-1.5">Recent Tracks</p>
                <div className="space-y-1">
                  {recentTracks.slice(0, 2).map((track, idx) => (
                    <p key={idx} className="text-sm text-neutral-700 truncate">
                      {track}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for profiles without music data */}
            {topArtists.length === 0 && recentTracks.length === 0 && (
              <p className="text-sm text-neutral-500 italic">
                View profile
              </p>
            )}
          </div>

          {/* Right: Album artwork or anchor icon */}
          <div className="flex-shrink-0 relative">
            {albumArtwork ? (
              <img
                src={albumArtwork}
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

            {/* Anchor icon overlay */}
            <button
              type="button"
              onMouseEnter={() => setShowPreview(true)}
              onMouseLeave={() => setShowPreview(false)}
              onClick={(e) => e.preventDefault()}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center shadow-lg hover:bg-neutral-800 transition-colors z-10"
              title="Preview profile"
            >
              <svg
                className="w-4 h-4 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <path d="M5 16a7 7 0 0 0 14 0" />
                <line x1="5" y1="16" x2="5" y2="18" />
                <line x1="19" y1="16" x2="19" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </Link>

      {/* Hover preview popup */}
      {showPreview && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          onMouseEnter={() => setShowPreview(true)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 pointer-events-auto" onClick={() => setShowPreview(false)} />

          {/* Preview container */}
          <div className="relative w-[90vw] h-[80vh] max-w-4xl bg-white rounded-lg shadow-2xl overflow-hidden pointer-events-auto">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/50 to-transparent p-4 z-10 flex items-center justify-between">
              <span className="text-white font-medium">
                Preview: {displayName || handle}
              </span>
              <button
                onClick={() => setShowPreview(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* iframe preview */}
            <iframe
              src={`/${handle}`}
              className="w-full h-full border-0"
              title={`Preview of ${displayName || handle}'s profile`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
