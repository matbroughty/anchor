"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/app/components/ProfileForm";
import { disconnectSpotify } from "@/app/actions/disconnect-spotify";

interface Profile {
  handle: string;
  displayName: string | null;
  email: string | null;
  spotifyConnected: boolean;
}

interface ProfilePageClientProps {
  profile: Profile;
  spotifyAction: () => Promise<void>;
}

export default function ProfilePageClient({
  profile,
  spotifyAction,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [alsoDisconnectSpotify, setAlsoDisconnectSpotify] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const handleSave = async (displayName: string) => {
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to update profile");
    }
  };

  const handleDeleteHandle = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Optionally disconnect Spotify first
      if (alsoDisconnectSpotify && profile.spotifyConnected) {
        const disconnectResult = await disconnectSpotify();
        if (!disconnectResult.success) {
          throw new Error(disconnectResult.error || "Failed to disconnect Spotify");
        }
      }

      const response = await fetch("/api/profile/handle/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete handle");
      }

      // Redirect to claim handle page
      router.push("/profile/claim-handle");
      router.refresh();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete handle");
      setIsDeleting(false);
    }
  };

  const handleDisconnectSpotify = async () => {
    setIsDisconnecting(true);
    setDisconnectError(null);

    try {
      const result = await disconnectSpotify();

      if (!result.success) {
        throw new Error(result.error || "Failed to disconnect Spotify");
      }

      // Refresh page to show updated state
      router.refresh();
      setShowDisconnectConfirm(false);
    } catch (error) {
      setDisconnectError(error instanceof Error ? error.message : "Failed to disconnect Spotify");
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Your Profile
            </h1>

            {/* Dashboard CTA if Spotify is connected */}
            {profile.spotifyConnected && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">
                      Ready to manage your music?
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Go to your dashboard to refresh Spotify data, edit content, and publish your page.
                    </p>
                  </div>
                  <a
                    href="/dashboard"
                    className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Handle (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Handle
                </label>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 mr-1">
                      anchor.band/
                    </span>
                    <a
                      href={`/${profile.handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {profile.handle}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs text-red-600 hover:text-red-800 hover:underline"
                  >
                    Delete handle
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Deleting your handle will unpublish your page and allow you to claim a new handle
                </p>
              </div>

              {/* Display Name (Editable) */}
              <div>
                <ProfileForm
                  initialDisplayName={profile.displayName || ""}
                  onSave={handleSave}
                />
              </div>

              {/* Email (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
              </div>

              {/* Spotify Connection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Spotify Connection
                </label>
                {profile.spotifyConnected ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-sm text-green-700">Connected</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDisconnectConfirm(true)}
                      className="text-xs text-red-600 hover:text-red-800 hover:underline"
                    >
                      Disconnect
                    </button>
                  </div>
                ) : (
                  <form action={spotifyAction}>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Connect Spotify
                    </button>
                  </form>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {profile.spotifyConnected
                    ? "Disconnecting will remove all your music data and unpublish your page"
                    : "Connect to fetch your top artists, albums, and tracks"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Spotify Confirmation Dialog */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnect Spotify?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
              <li>Your Spotify connection and tokens</li>
              <li>All music data (artists, albums, tracks)</li>
              <li>AI-generated bio and captions</li>
              <li>Your page will be unpublished</li>
            </ul>
            <p className="text-sm text-gray-600 mb-4">
              You can reconnect Spotify later, but you&apos;ll need to regenerate all content.
            </p>
            {disconnectError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {disconnectError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDisconnectConfirm(false);
                  setDisconnectError(null);
                }}
                disabled={isDisconnecting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnectSpotify}
                disabled={isDisconnecting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDisconnecting ? "Disconnecting..." : "Disconnect Spotify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Handle Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Handle?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete your handle <strong>{profile.handle}</strong> and unpublish your page. You&apos;ll be able to claim a new handle, but this one will become available for others to claim.
            </p>
            {profile.spotifyConnected && (
              <div className="mb-4">
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoDisconnectSpotify}
                    onChange={(e) => setAlsoDisconnectSpotify(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Also disconnect Spotify (this will delete all music data and content)
                  </span>
                </label>
              </div>
            )}
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {deleteError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                  setAlsoDisconnectSpotify(false);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHandle}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Handle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
