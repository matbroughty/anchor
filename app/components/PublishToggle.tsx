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
  hasBio: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublishToggle({
  isPublished,
  handle,
  onStatusChange,
  hasBio,
}: PublishToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleToggle = async () => {
    // If publishing without a bio, show confirmation
    if (!isPublished && !hasBio) {
      setShowConfirm(true);
      return;
    }

    await doPublishToggle();
  };

  const doPublishToggle = async () => {
    setShowConfirm(false);
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
  const fullUrl = `https://anchor.band${publicUrl}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${handle} on Anchor.band`,
          text: "Check out my music profile",
          url: fullUrl,
        });
      } catch (err) {
        // User cancelled or share failed, fall back to copy
        if ((err as Error).name !== "AbortError") {
          handleCopyUrl();
        }
      }
    } else {
      // No native share, just copy
      handleCopyUrl();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Profile URL - always visible, prominent */}
      <div className={`p-4 rounded-lg border-2 ${
        isPublished
          ? "bg-blue-50 border-blue-200"
          : "bg-gray-50 border-gray-200"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                  isPublished ? "bg-green-500" : "bg-gray-400"
                }`}
                aria-hidden="true"
              />
              <span className={`text-xs font-medium uppercase tracking-wide ${
                isPublished ? "text-blue-900" : "text-gray-600"
              }`}>
                {isPublished ? "Live" : "Not Published"}
              </span>
            </div>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-lg font-semibold truncate ${
                isPublished
                  ? "text-blue-700 hover:text-blue-900 hover:underline"
                  : "text-gray-500 pointer-events-none"
              }`}
            >
              anchor.band{publicUrl}
            </a>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Share button - only when published */}
            {isPublished && (
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-blue-300 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title="Share your profile URL with others or copy the link"
              >
                {copySuccess ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>
            )}

            {/* Publish/Unpublish button */}
            <button
              type="button"
              onClick={handleToggle}
              disabled={isLoading}
              title={isPublished ? "Haul up anchor - make your profile private and remove it from public view" : "Drop anchor - publish your profile and make it visible to everyone"}
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
                  {isPublished ? "Unpublishing..." : "Dropping..."}
                </>
              ) : isPublished ? (
                "Unpublish"
              ) : (
                "Drop Anchor"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Confirmation dialog for publishing without bio */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop anchor without bio?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your bio is generated to add personality and context to your page. Dropping anchor without it means visitors won&apos;t see an introduction. Are you sure you want to drop anchor without a bio?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={doPublishToggle}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Drop Anchor Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
