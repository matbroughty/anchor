"use client";

import type { Artist, Track } from "@/types/music";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MusicDataSectionProps {
  artists: Artist[];
  tracks: Track[];
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Picks the image closest to 300 px width from a Spotify image array.
 * Falls back to the first available image, then null.
 */
function pickImage(images: { url: string; width: number }[]): string | null {
  if (!images || images.length === 0) return null;

  // Sort by distance from 300px target
  const sorted = [...images].sort(
    (a, b) => Math.abs(a.width - 300) - Math.abs(b.width - 300)
  );
  return sorted[0].url;
}

/**
 * Returns a human-readable relative time string (e.g. "2 hours ago").
 */
function relativeTime(timestampMs: number): string {
  const diff = Date.now() - timestampMs;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "just now";
  if (minutes < 60) return minutes + " minute" + (minutes !== 1 ? "s" : "") + " ago";
  if (hours < 24) return hours + " hour" + (hours !== 1 ? "s" : "") + " ago";
  return days + " day" + (days !== 1 ? "s" : "") + " ago";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MusicDataSection({ artists, tracks, cachedAt }: MusicDataSectionProps) {
  return (
    <div className="space-y-6">
      {/* Artists row — horizontal scroll */}
      {artists.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-3">Top Artists</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {artists.map((artist) => {
              const imgUrl = pickImage(artist.images);
              return (
                <div
                  key={artist.id}
                  className="flex-none flex flex-col items-center gap-2"
                  style={{ minWidth: 72 }}
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={artist.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-xl font-medium">
                        {artist.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-gray-600 text-center truncate w-16">
                    {artist.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracks list */}
      {tracks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Top Tracks</h3>
          <ul className="space-y-2">
            {tracks.map((track, i) => (
              <li
                key={track.id}
                className="flex items-center gap-3 text-sm"
              >
                <span className="text-gray-400 w-5 text-right flex-shrink-0">
                  {i + 1}.
                </span>
                <div className="min-w-0">
                  <p className="text-gray-900 font-medium truncate">{track.name}</p>
                  <p className="text-gray-500 truncate">
                    {track.artists.map((a) => a.name).join(", ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Last updated timestamp */}
      <p className="text-xs text-gray-400">
        Last updated: {relativeTime(cachedAt)}
      </p>
    </div>
  );
}
