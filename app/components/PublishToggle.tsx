"use client";

import { useState } from "react";
import { publishPage, unpublishPage } from "@/app/actions/publish";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type PublishToggleProps = {
  isPublished: boolean;
  handle: string;
  onStatusChange: (newStatus: boolean) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublishToggle({
  isPublished,
  handle,
  onStatusChange,
}: PublishToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = isPublished
        ? await unpublishPage()
        : await publishPage();

      if (result.success) {
        onStatusChange(!isPublished);
      } else {
        setError(result.error ?? "Failed to update publish status");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const publicUrl = `/${handle}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isPublished ? "bg-green-500" : "bg-gray-400"
            }`}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-700">
            {isPublished ? "Published" : "Unpublished"}
          </span>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
            isPublished
              ? "border-gray-300 text-gray-700 bg-white hover:bg-gray-50 focus:ring-gray-500"
              : "border-transparent text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
          }`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
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
              {isPublished ? "Unpublishing..." : "Publishing..."}
            </>
          ) : isPublished ? (
            "Unpublish"
          ) : (
            "Publish"
          )}
        </button>
      </div>

      {/* Public page link (only when published) */}
      {isPublished && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Your page:</span>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            anchor.band{publicUrl}
          </a>
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
