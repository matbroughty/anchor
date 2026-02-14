"use client";

import { useState } from "react";
import type { FavouriteListeningParty } from "@/types/listening-party";

interface TimsListeningPartyIconProps {
  favourite: FavouriteListeningParty;
}

const TIMS_ICON_URL = "https://raw.githubusercontent.com/matbroughty/timstwitterlisteningparty/master/img/apple-icon.png";

export function TimsListeningPartyIcon({ favourite }: TimsListeningPartyIconProps) {
  const [showCard, setShowCard] = useState(false);

  // Format party date
  const formatPartyDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Fixed position icon in bottom right */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onMouseEnter={() => setShowCard(true)}
          onMouseLeave={() => setShowCard(false)}
          onClick={() => setShowCard(!showCard)}
          className="w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
          title="Tim's Twitter Listening Party"
        >
          <img
            src={TIMS_ICON_URL}
            alt="Tim's Twitter Listening Party"
            className="w-full h-full rounded-full"
          />
        </button>

        {/* Hover/Tap Card */}
        {showCard && (
          <div
            className="absolute bottom-20 right-0 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
            onMouseEnter={() => setShowCard(true)}
            onMouseLeave={() => setShowCard(false)}
          >
            {/* Album Artwork Header */}
            {favourite.artworkLarge && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={favourite.artworkLarge}
                  alt={`${favourite.album} by ${favourite.artist}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            {/* Card Content */}
            <div className="p-4">
              <div className="flex items-start gap-2 mb-3">
                <img
                  src={TIMS_ICON_URL}
                  alt="Tim's Twitter Listening Party"
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Tim&apos;s Twitter Listening Party
                  </h3>
                  <p className="text-xs text-gray-600">
                    Favourite Listening Party
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <h4 className="font-bold text-gray-900 text-base leading-tight">
                  {favourite.artist}
                </h4>
                <p className="text-gray-700 text-sm leading-tight">
                  {favourite.album}
                </p>
                <p className="text-gray-500 text-xs">
                  {formatPartyDate(favourite.partyDateTime)}
                </p>
              </div>

              {/* Open Replay Button */}
              {favourite.replayLink && (
                <a
                  href={favourite.replayLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 text-white text-center py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                  Open Replay
                </a>
              )}

              {/* Additional Links */}
              <div className="flex gap-2 mt-2">
                {favourite.spotifyAlbumLink && (
                  <a
                    href={favourite.spotifyAlbumLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    Spotify
                  </a>
                )}
                {favourite.tweetLink && (
                  <a
                    href={favourite.tweetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded hover:bg-gray-200 transition-colors"
                  >
                    Tweet
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
