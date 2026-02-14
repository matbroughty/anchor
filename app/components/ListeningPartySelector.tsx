"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ListeningParty, FavouriteListeningParty } from "@/types/listening-party";

interface ListeningPartySelectorProps {
  initialFavourite: FavouriteListeningParty | null;
  onUpdate: (favourite: FavouriteListeningParty | null) => void;
}

export function ListeningPartySelector({
  initialFavourite,
  onUpdate,
}: ListeningPartySelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ListeningParty[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedParty, setSelectedParty] = useState<FavouriteListeningParty | null>(initialFavourite);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/listening-party/search?term=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        console.error("Search failed:", await response.text());
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debouncing
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle party selection
  const handleSelectParty = async (party: ListeningParty) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/listening-party/favourite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(party),
      });

      if (response.ok) {
        setSelectedParty(party);
        onUpdate(party);
        setSearchQuery("");
        setSearchResults([]);
      } else {
        console.error("Failed to save favourite:", await response.text());
        alert("Failed to save favourite listening party");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save favourite listening party");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove favourite
  const handleRemoveFavourite = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/listening-party/favourite", {
        method: "DELETE",
      });

      if (response.ok) {
        setSelectedParty(null);
        onUpdate(null);
      } else {
        console.error("Failed to remove favourite:", await response.text());
        alert("Failed to remove favourite listening party");
      }
    } catch (error) {
      console.error("Remove error:", error);
      alert("Failed to remove favourite listening party");
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="space-y-4">
      {/* Current Selection */}
      {selectedParty ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-4">
            {/* Album Artwork */}
            {selectedParty.artworkMedium && (
              <div className="flex-shrink-0">
                <img
                  src={selectedParty.artworkMedium}
                  alt={`${selectedParty.album} by ${selectedParty.artist}`}
                  className="w-20 h-20 rounded-lg shadow-md"
                />
              </div>
            )}

            {/* Party Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                {selectedParty.artist} - {selectedParty.album}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {formatPartyDate(selectedParty.partyDateTime)}
              </p>
              <div className="flex gap-2 flex-wrap">
                {selectedParty.replayLink && (
                  <a
                    href={selectedParty.replayLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Replay
                  </a>
                )}
                <button
                  onClick={handleRemoveFavourite}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600">
          Search for a listening party by artist or album name to set your favourite.
        </p>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by artist or album..."
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          {searchResults.map((party) => (
            <button
              key={party.partyId}
              onClick={() => handleSelectParty(party)}
              disabled={isSaving}
              className="w-full flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-left disabled:opacity-50"
            >
              {/* Artwork */}
              {party.artworkSmall && (
                <div className="flex-shrink-0">
                  <img
                    src={party.artworkSmall}
                    alt={`${party.album} by ${party.artist}`}
                    className="w-12 h-12 rounded shadow-sm"
                  />
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 text-sm truncate">
                  {party.artist}
                </h4>
                <p className="text-gray-600 text-sm truncate">
                  {party.album}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  {formatPartyDate(party.partyDateTime)}
                </p>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0 self-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {searchQuery.trim().length >= 2 && !isSearching && searchResults.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No listening parties found for &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
}
