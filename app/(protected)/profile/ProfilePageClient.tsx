"use client";

import { ProfileForm } from "@/app/components/ProfileForm";

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
                <div className="mt-1 flex items-center">
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
                <p className="mt-1 text-xs text-gray-500">
                  Your handle cannot be changed
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
                  <form action={spotifyAction}>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Connect Spotify
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
