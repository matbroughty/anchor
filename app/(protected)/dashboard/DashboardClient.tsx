"use client";

import { useState, useTransition } from "react";
import { MusicDataSection } from "@/app/components/MusicDataSection";
import { BioEditor } from "@/app/components/BioEditor";
import { AlbumCaptions } from "@/app/components/AlbumCaptions";
import { RefreshButton } from "@/app/components/RefreshButton";
import { PublishToggle } from "@/app/components/PublishToggle";
import { refreshSpotifyData } from "@/app/actions/spotify";
import { generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption } from "@/app/actions/ai-content";
import type { MusicData } from "@/types/music";
import type { ContentData, Bio, Caption } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardClientProps {
  initialMusicData: MusicData | null;
  initialContent: ContentData;
  userId: string;
  handle: string | null;
  isPublished: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardClient({
  initialMusicData,
  initialContent,
  handle,
  isPublished: initialIsPublished,
}: DashboardClientProps) {
  const [musicData, setMusicData] = useState<MusicData | null>(initialMusicData);
  const [content, setContent] = useState<ContentData>(initialContent);
  const [published, setPublished] = useState(initialIsPublished);
  const [isPending, startTransition] = useTransition();

  // -----------------------------------------------------------------------
  // Refresh handler — calls server action, updates local music data state
  // -----------------------------------------------------------------------
  const handleRefresh = async () => {
    startTransition(async () => {
      const result = await refreshSpotifyData();
      if (result.data) {
        setMusicData(result.data);
        // After fresh music data arrives, kick off content generation if
        // the user has never had content generated before.
        if (!content.bio) {
          const bioResult = await generateBio();
          if (bioResult.bio) {
            setContent((prev) => ({ ...prev, bio: bioResult.bio }));
          }
        }
        if (content.captions.length === 0) {
          const captionsResult = await generateAlbumCaptions();
          if (captionsResult.captions.length > 0) {
            setContent((prev) => ({ ...prev, captions: captionsResult.captions }));
          }
        }
      }
    });
  };

  // -----------------------------------------------------------------------
  // Bio callbacks
  // -----------------------------------------------------------------------
  const handleBioUpdate = (bio: Bio) => {
    setContent((prev) => ({ ...prev, bio }));
  };

  const handleBioRegenerate = async (): Promise<Bio> => {
    const result = await regenerateBio();
    if (result.bio) {
      setContent((prev) => ({ ...prev, bio: result.bio }));
      return result.bio;
    }
    throw new Error(result.error ?? "Regeneration failed");
  };

  const handleGenerateBio = async () => {
    startTransition(async () => {
      const bioResult = await generateBio();
      if (bioResult.bio) {
        setContent((prev) => ({ ...prev, bio: bioResult.bio }));
      }
    });
  };

  // -----------------------------------------------------------------------
  // Caption callbacks
  // -----------------------------------------------------------------------
  const handleCaptionUpdate = (caption: Caption) => {
    setContent((prev) => ({
      ...prev,
      captions: prev.captions.some((c) => c.albumId === caption.albumId)
        ? prev.captions.map((c) => (c.albumId === caption.albumId ? caption : c))
        : [...prev.captions, caption],
    }));
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Your Music Profile</h1>
          <RefreshButton onRefresh={handleRefresh} disabled={isPending} />
        </div>

        {/* Publish controls + Bio generation — always visible */}
        {handle && (
          <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Page</h2>

            {/* Generate bio button if no bio exists and music data is present */}
            {musicData && !content.bio && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-blue-900 mb-1">
                      Generate your bio
                    </h3>
                    <p className="text-sm text-blue-700">
                      Let AI create a fun bio based on your music taste. You can edit it afterwards.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateBio}
                    disabled={isPending}
                    className="flex-shrink-0 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isPending ? "Generating..." : "Generate Bio"}
                  </button>
                </div>
              </div>
            )}

            <PublishToggle
              isPublished={published}
              handle={handle}
              onStatusChange={setPublished}
              hasBio={!!content.bio}
            />
          </div>
        )}

        {/* No data state */}
        {!musicData ? (
          <div className="bg-white shadow sm:rounded-lg px-6 py-10 text-center">
            <p className="text-gray-600 mb-4">
              Connect Spotify to get started. Your music data will appear here once synced.
            </p>
            <a
              href="/profile"
              className="inline-block px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Profile
            </a>
          </div>
        ) : (
          <>
            {/* Music data section — artists & tracks */}
            <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Music</h2>
              <MusicDataSection
                artists={musicData.artists}
                tracks={musicData.tracks}
                cachedAt={musicData.cachedAt}
              />
            </div>

            {/* Bio editor */}
            <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bio</h2>
              <BioEditor
                bio={content.bio}
                onUpdate={handleBioUpdate}
                onRegenerate={handleBioRegenerate}
                disabled={isPending}
              />
            </div>

            {/* Album captions */}
            <div className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Album Captions</h2>
              <AlbumCaptions
                albums={musicData.albums}
                captions={content.captions}
                onCaptionUpdate={handleCaptionUpdate}
                disabled={isPending}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
