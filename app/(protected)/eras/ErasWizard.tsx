"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ERA_PROMPTS } from "@/lib/eras-prompts";
import { searchAlbumsForEras, addEraEntry, deleteErasData } from "@/app/actions/eras";
import type { ErasData, EraEntry, EraPromptId } from "@/types/eras";
import type { Album } from "@/types/music";
import Image from "next/image";

interface ErasWizardProps {
  existingData?: ErasData;
}

interface SelectedAlbum {
  promptId: EraPromptId;
  promptLabel: string;
  album: Album;
  source: "spotify" | "applemusic";
}

export default function ErasWizard({ existingData }: ErasWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<SelectedAlbum[]>(
    existingData?.entries.map((entry) => ({
      promptId: entry.promptId,
      promptLabel: entry.promptLabel,
      source: entry.source,
      album: {
        id: entry.albumId,
        name: entry.albumName,
        artists: [{ id: "", name: entry.artistName }],
        images: [{ url: entry.artworkUrl, width: 600, height: 600 }],
        albumType: "album",
        external_urls: {},
      },
    })) || []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Album[]>([]);
  const [searchSource, setSearchSource] = useState<"spotify" | "applemusic">("applemusic");
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPrompt = ERA_PROMPTS[currentStep];
  const currentSelections = selections.filter(
    (s) => s.promptId === currentPrompt.id ||
           (currentPrompt.id === "teenage_years_1" && s.promptId.startsWith("teenage_years"))
  );

  const canProceed = currentPrompt.allowSkip || currentSelections.length > 0;
  const maxSelections = currentPrompt.allowMultiple ? 3 : 1;

  // Debounced search
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setError(null);

    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchAlbumsForEras(query);
      if (result.success && result.albums) {
        setSearchResults(result.albums);
        setSearchSource(result.source || "applemusic");
      } else {
        setError(result.error || "Search failed");
        setSearchResults([]);
      }
    } catch (err) {
      setError("Search failed");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSelectAlbum = (album: Album) => {
    const promptId = currentPrompt.allowMultiple
      ? (`teenage_years_${currentSelections.length + 1}` as EraPromptId)
      : currentPrompt.id;

    // Check if already selected
    if (selections.some((s) => s.album.id === album.id)) {
      return;
    }

    // Check max selections
    if (currentSelections.length >= maxSelections) {
      return;
    }

    setSelections([
      ...selections,
      {
        promptId,
        promptLabel: currentPrompt.label,
        album,
        source: searchSource,
      },
    ]);

    // Auto-advance if single selection
    if (!currentPrompt.allowMultiple) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleRemoveSelection = (albumId: string) => {
    setSelections(selections.filter((s) => s.album.id !== albumId));
  };

  const handleNext = () => {
    if (currentStep < ERA_PROMPTS.length - 1) {
      setCurrentStep(currentStep + 1);
      setSearchQuery("");
      setSearchResults([]);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const handleSkip = () => {
    if (currentPrompt.allowSkip) {
      handleNext();
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Clear existing eras data first
      await deleteErasData();

      // Add each selection using server action
      // This fetches full metadata from the appropriate source (Spotify or Apple Music)
      for (const sel of selections) {
        const result = await addEraEntry(
          sel.promptId,
          sel.promptLabel,
          sel.album.id,
          sel.source
        );

        if (!result.success) {
          setError(result.error || "Failed to save album");
          setIsSaving(false);
          return;
        }
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Failed to save eras data");
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">
            Question {currentStep + 1} of {ERA_PROMPTS.length}
          </span>
          <span className="text-sm text-zinc-400">
            {selections.length} album{selections.length !== 1 ? "s" : ""} selected
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / ERA_PROMPTS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current question */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {currentPrompt.question}
        </h2>
        {currentPrompt.description && (
          <p className="text-zinc-400">{currentPrompt.description}</p>
        )}
        {currentPrompt.allowMultiple && (
          <p className="text-sm text-zinc-500 mt-2">
            Select up to 3 albums
          </p>
        )}
      </div>

      {/* Current selections */}
      {currentSelections.length > 0 && (
        <div className="mb-6 space-y-2">
          {currentSelections.map((selection) => (
            <div
              key={selection.album.id}
              className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700"
            >
              {selection.album.images?.[0] && (
                <Image
                  src={selection.album.images[0].url}
                  alt={selection.album.name}
                  width={48}
                  height={48}
                  className="rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {selection.album.name}
                </p>
                <p className="text-sm text-zinc-400 truncate">
                  {selection.album.artists?.[0]?.name}
                </p>
              </div>
              <button
                onClick={() => handleRemoveSelection(selection.album.id)}
                className="text-zinc-400 hover:text-red-400 transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search interface */}
      {currentSelections.length < maxSelections && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search for albums..."
              className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <span className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400">
                {searchSource === "spotify" ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Spotify
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Apple Music
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Search results */}
          {searchQuery && (
            <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8 text-zinc-400">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((album) => (
                  <button
                    key={album.id}
                    onClick={() => handleSelectAlbum(album)}
                    disabled={selections.some((s) => s.album.id === album.id)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg bg-zinc-800/30 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                  >
                    {album.images?.[0] && (
                      <Image
                        src={album.images[0].url}
                        alt={album.name}
                        width={48}
                        height={48}
                        className="rounded"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {album.name}
                      </p>
                      <p className="text-sm text-zinc-400 truncate">
                        {album.artists?.[0]?.name}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-zinc-400">
                  No albums found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400">
          {error}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-6 py-3 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>

        <div className="flex gap-4">
          {currentPrompt.allowSkip && currentSelections.length === 0 && (
            <button
              onClick={handleSkip}
              className="px-6 py-3 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={!canProceed || isSaving}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSaving
              ? "Saving..."
              : currentStep === ERA_PROMPTS.length - 1
              ? "Finish"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
