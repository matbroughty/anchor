"use client";

import { useState, useEffect, useRef } from "react";
import type { Artist, Album, Track } from "@/types/music";

type SearchableItem = Artist | Album | Track;

interface MusicSearchProps<T extends SearchableItem> {
  type: "artist" | "album" | "track";
  onSelect: (item: T) => void;
  selectedIds: Set<string>;
  maxSelected: number;
  searchAction: (query: string) => Promise<{
    success: boolean;
    artists?: Artist[];
    albums?: Album[];
    tracks?: Track[];
    error?: string;
  }>;
}

/**
 * Reusable search component for artists, albums, and tracks
 * Features: debounced search, loading states, keyboard navigation
 */
export function MusicSearch<T extends SearchableItem>({
  type,
  onSelect,
  selectedIds,
  maxSelected,
  searchAction,
}: MusicSearchProps<T>) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for 300ms delay
    debounceTimerRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await searchAction(query);
        if (result.success) {
          const items = (result.artists || result.albums || result.tracks || []) as T[];
          setResults(items);
        } else {
          setError(result.error || "Search failed");
          setResults([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, searchAction]);

  const handleSelect = (item: T) => {
    if (selectedIds.has(item.id)) {
      return; // Already selected
    }
    if (selectedIds.size >= maxSelected) {
      return; // Max reached
    }
    onSelect(item);
    setQuery(""); // Clear search after selection
    setResults([]);
  };

  const getItemDisplay = (item: T) => {
    if (type === "artist") {
      const artist = item as Artist;
      return {
        name: artist.name,
        subtitle: artist.genres.slice(0, 3).join(", ") || "Artist",
        image: artist.images[0]?.url,
      };
    } else if (type === "album") {
      const album = item as Album;
      return {
        name: album.name,
        subtitle: album.artists.map((a) => a.name).join(", "),
        image: album.images[0]?.url,
      };
    } else {
      const track = item as Track;
      return {
        name: track.name,
        subtitle: `${track.artists.map((a) => a.name).join(", ")} • ${track.album.name}`,
        image: track.album.images[0]?.url,
      };
    }
  };

  const isMaxReached = selectedIds.size >= maxSelected;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div>
        <label htmlFor={`search-${type}`} className="block text-sm font-medium text-gray-700 mb-2">
          Search for {type === "artist" ? "artists" : type === "album" ? "albums" : "tracks"}
        </label>
        <div className="relative">
          <input
            id={`search-${type}`}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${type}...`}
            disabled={isMaxReached}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
        {isMaxReached && (
          <p className="mt-1 text-sm text-gray-500">
            Maximum {maxSelected} {type}s selected
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {results.map((item) => {
            const display = getItemDisplay(item);
            const isSelected = selectedIds.has(item.id);
            const canSelect = !isSelected && !isMaxReached;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                disabled={!canSelect}
                className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                  canSelect
                    ? "hover:bg-gray-50 cursor-pointer"
                    : "bg-gray-50 cursor-not-allowed opacity-60"
                }`}
              >
                {display.image && (
                  <img
                    src={display.image}
                    alt={display.name}
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {display.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{display.subtitle}</p>
                </div>
                {isSelected && (
                  <span className="text-xs font-medium text-green-600">Selected</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {query.trim() && !isLoading && results.length === 0 && !error && (
        <div className="text-center py-6 text-gray-500 text-sm">
          No {type}s found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
