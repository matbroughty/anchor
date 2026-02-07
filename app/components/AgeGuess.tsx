"use client";

import { useState, useTransition } from "react";
import { generateAgeGuess } from "@/app/actions/age-guess";
import type { AgeGuess as AgeGuessType } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AgeGuessProps {
  initialAgeGuess: AgeGuessType | null;
  hasMusicData: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AgeGuess({ initialAgeGuess, hasMusicData }: AgeGuessProps) {
  const [ageGuess, setAgeGuess] = useState<AgeGuessType | null>(
    initialAgeGuess
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      setError(null);
      const result = await generateAgeGuess();
      if (result.ageGuess) {
        setAgeGuess(result.ageGuess);
      } else {
        setError(result.error ?? "Failed to generate age guess");
      }
    });
  };

  // Confidence color helper
  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "text-green-600 dark:text-green-400";
    if (confidence >= 0.4) return "text-amber-600 dark:text-amber-400";
    return "text-neutral-600 dark:text-neutral-400";
  };

  // Signal bar helper
  const signalBar = (value: number, label: string) => {
    const percentage = Math.round(value * 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-neutral-600 dark:text-neutral-400">
            {label}
          </span>
          <span className="text-neutral-500 dark:text-neutral-500">
            {percentage}%
          </span>
        </div>
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Guess My Age
        </h2>
        <button
          onClick={handleGenerate}
          disabled={isPending || !hasMusicData}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "Guessing..." : ageGuess ? "Regenerate" : "Guess"}
        </button>
      </div>

      {!hasMusicData && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Fetch your Spotify data first to generate an age guess.
        </p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {ageGuess && (
        <div className="space-y-6">
          {/* Disclaimer */}
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Playful inference only.</strong> This is a cultural guess
              based on music taste patterns, not a demographic fact.
            </p>
          </div>

          {/* Primary Guess */}
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex items-baseline gap-3 mb-2">
              <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {ageGuess.age_guess.primary_range}
              </span>
              <span
                className={`text-sm font-medium ${confidenceColor(
                  ageGuess.age_guess.confidence
                )}`}
              >
                {Math.round(ageGuess.age_guess.confidence * 100)}% confident
              </span>
            </div>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 font-medium mb-3">
              {ageGuess.age_guess.generation_vibe}
            </p>
            <ul className="space-y-1">
              {ageGuess.age_guess.reasoning.map((reason, i) => (
                <li
                  key={i}
                  className="text-xs text-neutral-600 dark:text-neutral-400"
                >
                  • {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Signals */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
              Listening Signals
            </h3>
            <div className="space-y-3">
              {signalBar(
                ageGuess.signals.nostalgia_weight,
                "Nostalgia"
              )}
              {signalBar(
                ageGuess.signals.discovery_weight,
                "Discovery"
              )}
              {signalBar(
                ageGuess.signals.album_orientation,
                "Album-oriented"
              )}
              {signalBar(
                ageGuess.signals.playlist_orientation,
                "Playlist-oriented"
              )}
            </div>
          </div>

          {/* Alternate Ranges */}
          {ageGuess.alternate_ranges.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Alternative Ranges
              </h3>
              <div className="space-y-2">
                {ageGuess.alternate_ranges.map((alt, i) => (
                  <div
                    key={i}
                    className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                  >
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                        {alt.range}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-500">
                        {Math.round(alt.confidence * 100)}% confident
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {alt.why}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Generated {new Date(ageGuess.generatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
