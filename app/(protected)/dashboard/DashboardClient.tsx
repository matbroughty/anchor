"use client";

import { useState, useTransition } from "react";
import { MusicDataSection } from "@/app/components/MusicDataSection";
import { BioEditor } from "@/app/components/BioEditor";
import { FeaturedArtistsEditor } from "@/app/components/FeaturedArtistsEditor";
import { AlbumCaptions } from "@/app/components/AlbumCaptions";
import { TasteAnalysis } from "@/app/components/TasteAnalysis";
import { RefreshButton } from "@/app/components/RefreshButton";
import { PublishToggle } from "@/app/components/PublishToggle";
import { refreshSpotifyData } from "@/app/actions/spotify";
import { generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption } from "@/app/actions/ai-content";
import type { MusicData, Artist } from "@/types/music";
import type { ContentData, Bio, Caption, TasteAnalysis as TasteAnalysisType } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardClientProps {
  initialMusicData: MusicData | null;
  initialContent: ContentData;
  initialFeaturedArtists: Artist[];
  initialTasteAnalysis: TasteAnalysisType | null;
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
  initialFeaturedArtists,
  initialTasteAnalysis,
  handle,
  isPublished: initialIsPublished,
}: DashboardClientProps) {
  const [musicData, setMusicData] = useState<MusicData | null>(initialMusicData);
  const [content, setContent] = useState<ContentData>(initialContent);
  const [featuredArtists, setFeaturedArtists] = useState<Artist[]>(initialFeaturedArtists);
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

        {/* Quick Navigation Menu */}
        {musicData && (
          <nav className="bg-white shadow sm:rounded-lg px-4 py-3 sticky top-4 z-10">
            <div className="flex gap-3 overflow-x-auto">
              <a href="#your-page" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Your Page
              </a>
              <a href="#favourite-artists" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Favourite Artists
              </a>
              <a href="#bio" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Bio
              </a>
              <a href="#taste-analysis" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Taste Analysis
              </a>
              <a href="#album-captions" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Album Captions
              </a>
              <a href="#your-music" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Your Music
              </a>
            </div>
          </nav>
        )}

        {/* Publish controls + Bio generation — always visible */}
        {handle && (
          <div id="your-page" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
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
            {/* Favourite Artists */}
            <div id="favourite-artists" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Favourite Artists</h2>
              <p className="text-sm text-gray-600 mb-4">
                Highlight up to 3 artists on your profile (optional).
                These will appear above your top recent artists.
              </p>
              <FeaturedArtistsEditor
                initialFeatured={featuredArtists}
                onUpdate={setFeaturedArtists}
                disabled={isPending}
              />
            </div>

            {/* Bio editor */}
            <div id="bio" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bio</h2>
              <BioEditor
                bio={content.bio}
                onUpdate={handleBioUpdate}
                onRegenerate={handleBioRegenerate}
                disabled={isPending}
              />
            </div>

            {/* Taste Analysis */}
            <div id="taste-analysis" className="scroll-mt-20">
              <TasteAnalysis
                initialAnalysis={initialTasteAnalysis}
                hasMusicData={!!musicData}
              />
            </div>

            {/* Album captions */}
            <div id="album-captions" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Album Captions</h2>
              <AlbumCaptions
                albums={musicData.albums}
                captions={content.captions}
                onCaptionUpdate={handleCaptionUpdate}
                disabled={isPending}
              />
            </div>

            {/* Music data section — artists & tracks */}
            <div id="your-music" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Music</h2>
              <MusicDataSection
                artists={musicData.artists}
                tracks={musicData.tracks}
                cachedAt={musicData.cachedAt}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
