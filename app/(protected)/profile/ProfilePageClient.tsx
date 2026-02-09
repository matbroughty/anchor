"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/app/components/ProfileForm";
import { disconnectSpotify } from "@/app/actions/disconnect-spotify";
import { connectLastfm, disconnectLastfm } from "@/app/actions/lastfm";

interface Profile {
  handle: string;
  displayName: string | null;
  email: string | null;
  spotifyConnected: boolean;
  lastfmUsername: string | null;
}

interface ProfilePageClientProps {
  profile: Profile;
  spotifyAction: () => Promise<void>;
  oauthError?: string | null;
}

export default function ProfilePageClient({
  profile,
  spotifyAction,
  oauthError,
}: ProfilePageClientProps) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [alsoDisconnectSpotify, setAlsoDisconnectSpotify] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  // Last.fm state
  const [lastfmUsername, setLastfmUsername] = useState("");
  const [isConnectingLastfm, setIsConnectingLastfm] = useState(false);
  const [lastfmError, setLastfmError] = useState<string | null>(null);
  const [showLastfmDisconnectConfirm, setShowLastfmDisconnectConfirm] = useState(false);
  const [isDisconnectingLastfm, setIsDisconnectingLastfm] = useState(false);
  const [lastfmDisconnectError, setLastfmDisconnectError] = useState<string | null>(null);
  const [showOAuthError, setShowOAuthError] = useState(!!oauthError);

  // Get user-friendly error message based on OAuth error code
  const getOAuthErrorMessage = (error: string) => {
    switch (error) {
      case "OAuthAccountNotLinked":
        return {
          title: "This Spotify account is already connected",
          message: "This Spotify account is already linked to a different Anchor profile. To connect it here, you need to disconnect it from the other profile first. If you don't have access to that profile, please contact us at hello@anchor.band for assistance.",
        };
      case "AccessDenied":
        return {
          title: "Connection cancelled",
          message: "You cancelled the Spotify connection. Click 'Connect Spotify' to try again.",
        };
      default:
        return {
          title: "Connection failed",
          message: "Something went wrong while connecting to Spotify. Please try again or contact us at hello@anchor.band if the problem persists.",
        };
    }
  };

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
      // Optionally disconnect music service first
      if (alsoDisconnectSpotify) {
        if (profile.spotifyConnected) {
          const disconnectResult = await disconnectSpotify();
          if (!disconnectResult.success) {
            throw new Error(disconnectResult.error || "Failed to disconnect Spotify");
          }
        } else if (profile.lastfmUsername) {
          const disconnectResult = await disconnectLastfm();
          if (!disconnectResult.success) {
            throw new Error(disconnectResult.error || "Failed to disconnect Last.fm");
          }
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

  const handleConnectLastfm = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnectingLastfm(true);
    setLastfmError(null);

    try {
      const result = await connectLastfm(lastfmUsername);

      if (!result.success) {
        throw new Error(result.error || "Failed to connect Last.fm");
      }

      // Refresh page to show updated state
      router.refresh();
      setLastfmUsername("");
    } catch (error) {
      setLastfmError(error instanceof Error ? error.message : "Failed to connect Last.fm");
    } finally {
      setIsConnectingLastfm(false);
    }
  };

  const handleDisconnectLastfm = async () => {
    setIsDisconnectingLastfm(true);
    setLastfmDisconnectError(null);

    try {
      const result = await disconnectLastfm();

      if (!result.success) {
        throw new Error(result.error || "Failed to disconnect Last.fm");
      }

      // Refresh page to show updated state
      router.refresh();
      setShowLastfmDisconnectConfirm(false);
    } catch (error) {
      setLastfmDisconnectError(error instanceof Error ? error.message : "Failed to disconnect Last.fm");
      setIsDisconnectingLastfm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* OAuth Error Banner */}
        {showOAuthError && oauthError && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  {getOAuthErrorMessage(oauthError).title}
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  {getOAuthErrorMessage(oauthError).message}
                </p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  onClick={() => setShowOAuthError(false)}
                  className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                >
                  <span className="sr-only">Dismiss</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Your Profile
            </h1>

            {/* Dashboard CTA if any music service is connected */}
            {(profile.spotifyConnected || profile.lastfmUsername) && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">
                      Ready to manage your music?
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Go to your dashboard to refresh music data, edit content, and publish your page.
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
                <label className="block text-base font-semibold text-gray-900">
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
                <label className="block text-base font-semibold text-gray-900">
                  Email
                </label>
                <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
              </div>

              {/* Music Data Connection */}
              <div>
                <label className="block text-base font-semibold text-gray-900 mb-3">
                  Music Data Connection
                </label>

                {/* Last.fm Connection */}
                <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900">Last.fm</h4>
                      {profile.lastfmUsername && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    {profile.lastfmUsername && (
                      <button
                        type="button"
                        onClick={() => setShowLastfmDisconnectConfirm(true)}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                  {profile.lastfmUsername ? (
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
                      <span className="text-sm text-green-700">
                        Connected as {profile.lastfmUsername}
                      </span>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleConnectLastfm} className="space-y-2">
                        <input
                          type="text"
                          value={lastfmUsername}
                          onChange={(e) => setLastfmUsername(e.target.value)}
                          placeholder="Enter your Last.fm username"
                          required
                          disabled={isConnectingLastfm || profile.spotifyConnected}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
                        />
                        <button
                          type="submit"
                          disabled={isConnectingLastfm || profile.spotifyConnected}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:bg-gray-400"
                        >
                          {isConnectingLastfm ? "Connecting..." : "Connect Last.fm"}
                        </button>
                      </form>
                      {lastfmError && (
                        <p className="mt-2 text-xs text-red-600">{lastfmError}</p>
                      )}
                      {profile.spotifyConnected && (
                        <p className="mt-2 text-xs text-amber-600">
                          Disconnect Spotify first to use Last.fm
                        </p>
                      )}
                    </>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {profile.lastfmUsername
                      ? "Disconnecting will remove all your music data and unpublish your page"
                      : "Open API - No approval needed. Fetches your top artists, albums, and tracks"}
                  </p>
                </div>

                {/* Spotify Connection */}
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900">Spotify</h4>
                      {profile.spotifyConnected && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    {profile.spotifyConnected && (
                      <button
                        type="button"
                        onClick={() => setShowDisconnectConfirm(true)}
                        className="text-xs text-red-600 hover:text-red-800 hover:underline"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                  {profile.spotifyConnected ? (
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
                  ) : (
                    <>
                      <form action={spotifyAction}>
                        <button
                          type="submit"
                          disabled={!!profile.lastfmUsername}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-gray-400"
                        >
                          Connect Spotify
                        </button>
                      </form>
                      {profile.lastfmUsername && (
                        <p className="mt-2 text-xs text-amber-600">
                          Disconnect Last.fm first to use Spotify
                        </p>
                      )}
                      {!profile.lastfmUsername && (
                        <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded">
                          <p className="text-xs text-amber-800">
                            <strong>Note:</strong> Due to Spotify API limitations, you must contact{" "}
                            <a
                              href="mailto:hello@anchor.band"
                              className="underline hover:text-amber-900"
                            >
                              hello@anchor.band
                            </a>{" "}
                            to be added to our approved user list (limited to 25 users). We recommend using Last.fm instead.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {profile.spotifyConnected
                      ? "Disconnecting will remove all your music data and unpublish your page"
                      : "Requires manual approval - Contact us first"}
                  </p>
                </div>
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

      {/* Disconnect Last.fm Confirmation Dialog */}
      {showLastfmDisconnectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Disconnect Last.fm?
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete:
            </p>
            <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
              <li>Your Last.fm connection</li>
              <li>All music data (artists, albums, tracks)</li>
              <li>AI-generated bio and captions</li>
              <li>Your page will be unpublished</li>
            </ul>
            <p className="text-sm text-gray-600 mb-4">
              You can reconnect Last.fm later, but you&apos;ll need to regenerate all content.
            </p>
            {lastfmDisconnectError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {lastfmDisconnectError}
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowLastfmDisconnectConfirm(false);
                  setLastfmDisconnectError(null);
                }}
                disabled={isDisconnectingLastfm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnectLastfm}
                disabled={isDisconnectingLastfm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDisconnectingLastfm ? "Disconnecting..." : "Disconnect Last.fm"}
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
            {(profile.spotifyConnected || profile.lastfmUsername) && (
              <div className="mb-4">
                <label className="flex items-start gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoDisconnectSpotify}
                    onChange={(e) => setAlsoDisconnectSpotify(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Also disconnect {profile.spotifyConnected ? "Spotify" : "Last.fm"} (this will delete all music data and content)
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
