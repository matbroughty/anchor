"use client";

import { useState, useTransition } from "react";
import { refreshSpotifyData } from "@/app/actions/spotify";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RefreshButtonProps {
  /** Called with the new MusicData when refresh succeeds */
  onRefresh: () => Promise<void>;
  /** Externally-driven disabled state (e.g. parent transition pending) */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a cooldown duration in milliseconds, returns a human-readable
 * string like "23h 45m".
 */
function formatCooldown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RefreshButton({ onRefresh, disabled }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsRefreshing(true);
    setError(null);
    setCooldownMessage(null);

    try {
      // First probe the server action directly to detect cooldown before
      // delegating to the parent's onRefresh (which may do extra work).
      const result = await refreshSpotifyData();

      if (result.cooldownRemaining !== undefined && result.cooldownRemaining > 0) {
        setCooldownMessage(formatCooldown(result.cooldownRemaining));
        return;
      }

      if (result.error && !result.data) {
        setError(result.error);
        return;
      }

      // Success — let parent handle state update
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const isDisabled = disabled || isRefreshing || !!cooldownMessage;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRefreshing ? (
          <>
            <svg
              className="animate-spin h-4 w-4 text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Refreshing...
          </>
        ) : (
          "Refresh from Spotify"
        )}
      </button>

      {/* Cooldown or error message */}
      {cooldownMessage && (
        <span className="text-xs text-gray-500">
          Next refresh in {cooldownMessage}
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
