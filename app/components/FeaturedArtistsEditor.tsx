"use client";

import { useState } from "react";
import { updateFeaturedArtists } from "@/app/actions/featured-artists";
import { ArtistSearchInput } from "./ArtistSearchInput";
import type { Artist } from "@/types/music";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FeaturedArtistsEditorProps {
  initialFeatured: Artist[];
  onUpdate: (artists: Artist[]) => void;
  disabled?: boolean;
  allArtists?: Artist[]; // For Last.fm users - their full artist list
  musicService?: "spotify" | "lastfm" | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeaturedArtistsEditor({
  initialFeatured,
  onUpdate,
  disabled,
  allArtists = [],
  musicService,
}: FeaturedArtistsEditorProps) {
  const [featured, setFeatured] = useState<Artist[]>(initialFeatured);
  const [isEditing, setIsEditing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleAdd = () => {
    setIsSearching(true);
    setError(null);
  };

  const handleSelect = (artist: Artist) => {
    // Prevent duplicates
    if (featured.some((a) => a.id === artist.id)) {
      setError("This artist is already featured");
      return;
    }

    setFeatured([...featured, artist]);
    setIsSearching(false);
    setIsEditing(true);
    setError(null);
  };

  const handleRemove = (artistId: string) => {
    setFeatured(featured.filter((a) => a.id !== artistId));
    setIsEditing(true);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await updateFeaturedArtists(featured);
      if (result.error) {
        setError(result.error);
        return;
      }

      onUpdate(featured);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFeatured(initialFeatured);
    setIsEditing(false);
    setIsSearching(false);
    setError(null);
  };

  const canAddMore = featured.length < 4;

  // ---------------------------------------------------------------------------
  // Render — search/select mode
  // ---------------------------------------------------------------------------

  if (isSearching) {
    // Last.fm users: select from their own artists
    if (musicService === "lastfm" && allArtists.length > 0) {
      // Filter out already featured artists
      const availableArtists = allArtists.filter(
        (artist) => !featured.some((f) => f.id === artist.id)
      );

      return (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-700 mb-2">
              Select from your top artists:
            </p>
            <div className="border border-gray-200 rounded-md max-h-96 overflow-y-auto bg-white">
              {availableArtists.length === 0 ? (
                <p className="text-sm text-gray-500 italic p-4">
                  All your top artists are already featured
                </p>
              ) : (
                availableArtists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => handleSelect(artist)}
                    disabled={disabled}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-left transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {artist.images[0] ? (
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {artist.name}
                      </p>
                      {artist.genres.length > 0 && (
                        <p className="text-xs text-gray-500 truncate">
                          {artist.genres.slice(0, 3).join(", ")}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSearching(false)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      );
    }

    // Spotify users: search Spotify catalog
    return (
      <div className="space-y-3">
        <ArtistSearchInput
          onSelect={handleSelect}
          onClose={() => setIsSearching(false)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={() => setIsSearching(false)}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — main view
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Featured artists list */}
      {featured.length > 0 ? (
        <div className="space-y-2">
          {featured.map((artist) => (
            <div
              key={artist.id}
              className="flex items-center gap-3 p-3 border border-gray-200 rounded-md bg-gray-50"
            >
              {artist.images[0] ? (
                <img
                  src={artist.images[0].url}
                  alt={artist.name}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {artist.name}
                </p>
                {artist.genres.length > 0 && (
                  <p className="text-xs text-gray-500 truncate">
                    {artist.genres.slice(0, 3).join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemove(artist.id)}
                disabled={disabled || isSaving}
                className="flex-shrink-0 text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500">
            {featured.length}/4 favourite artists
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">
          Add up to 4 artists as favourites on your profile
        </p>
      )}

      {/* Add button */}
      {canAddMore && (
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || isSaving}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Favourite Artist
        </button>
      )}

      {/* Save/Cancel buttons - only show when editing */}
      {isEditing && (
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
