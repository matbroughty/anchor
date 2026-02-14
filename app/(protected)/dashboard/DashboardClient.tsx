"use client";

import { useState, useTransition } from "react";
import { MusicDataSection } from "@/app/components/MusicDataSection";
import { BioEditor } from "@/app/components/BioEditor";
import { FeaturedArtistsEditor } from "@/app/components/FeaturedArtistsEditor";
import { AlbumCaptions } from "@/app/components/AlbumCaptions";
import { TasteAnalysis } from "@/app/components/TasteAnalysis";
import { AgeGuess } from "@/app/components/AgeGuess";
import { RefreshButton } from "@/app/components/RefreshButton";
import { PublishToggle } from "@/app/components/PublishToggle";
import ErasTimeline from "@/app/components/ErasTimeline";
import { ListeningPartySelector } from "@/app/components/ListeningPartySelector";
import { refreshSpotifyData } from "@/app/actions/spotify";
import { refreshLastfmUserData } from "@/app/actions/lastfm";
import { generateBio, generateAlbumCaptions, regenerateBio, regenerateCaption } from "@/app/actions/ai-content";
import type { MusicData, Artist } from "@/types/music";
import type { ContentData, Bio, Caption, TasteAnalysis as TasteAnalysisType, AgeGuess as AgeGuessType } from "@/types/content";
import type { ErasData } from "@/types/eras";
import type { FavouriteListeningParty } from "@/types/listening-party";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DashboardClientProps {
  initialMusicData: MusicData | null;
  initialContent: ContentData;
  initialFeaturedArtists: Artist[];
  initialTasteAnalysis: TasteAnalysisType | null;
  initialAgeGuess: AgeGuessType | null;
  initialErasData?: ErasData;
  initialFavouriteListeningParty: FavouriteListeningParty | null;
  userId: string;
  handle: string | null;
  isPublished: boolean;
  musicService: "spotify" | "lastfm" | "manual" | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardClient({
  initialMusicData,
  initialContent,
  initialFeaturedArtists,
  initialTasteAnalysis,
  initialAgeGuess,
  initialErasData,
  initialFavouriteListeningParty,
  handle,
  isPublished: initialIsPublished,
  musicService,
}: DashboardClientProps) {
  const [musicData, setMusicData] = useState<MusicData | null>(initialMusicData);
  const [content, setContent] = useState<ContentData>(initialContent);
  const [featuredArtists, setFeaturedArtists] = useState<Artist[]>(initialFeaturedArtists);
  const [erasData, setErasData] = useState<ErasData | undefined>(initialErasData);
  const [favouriteListeningParty, setFavouriteListeningParty] = useState<FavouriteListeningParty | null>(initialFavouriteListeningParty);
  const [published, setPublished] = useState(initialIsPublished);
  const [isPending, startTransition] = useTransition();

  // -----------------------------------------------------------------------
  // Refresh handler — calls server action, updates local music data state
  // -----------------------------------------------------------------------
  const handleRefresh = async () => {
    startTransition(async () => {
      // Call appropriate refresh action based on connected service
      if (musicService === "spotify") {
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
      } else if (musicService === "lastfm") {
        const result = await refreshLastfmUserData();
        // For Last.fm, we need to fetch the music data after refresh
        // since refreshLastfmUserData doesn't return it
        if (result.success) {
          // The data will be available on next page load
          // For now, trigger a page refresh
          window.location.reload();
          return;
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Your Music Profile</h1>
            {musicService && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {musicService === "spotify" ? "Spotify" : musicService === "lastfm" ? "Last.fm" : "Self-Curated"}
              </span>
            )}
          </div>
          <div className={!musicData && musicService && musicService !== "manual" ? "relative" : ""}>
            {!musicData && musicService && musicService !== "manual" && (
              <div className="absolute -inset-2 bg-blue-400 rounded-lg opacity-75 animate-pulse"></div>
            )}
            <div className="relative">
              {musicService === "manual" ? (
                <a
                  href="/curate"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Edit Curation
                </a>
              ) : musicService ? (
                <RefreshButton onRefresh={handleRefresh} disabled={isPending} />
              ) : null}
            </div>
          </div>
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
              <a href="#musical-eras" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Musical Eras
              </a>
              <a href="#listening-party" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Listening Party
              </a>
              <a href="#bio" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Bio
              </a>
              <a href="#taste-analysis" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Taste Analysis
              </a>
              <a href="#age-guess" className="text-xs font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap px-3 py-1 rounded-md hover:bg-gray-100 transition-colors">
                Guess My Age
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg sm:rounded-xl px-6 py-12 text-center border-2 border-blue-200">
            <div className="max-w-md mx-auto">
              {musicService ? (
                <>
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Ready to sync your music!
                    </h3>
                    <p className="text-gray-700 mb-6">
                      You&apos;ve connected {musicService === "spotify" ? "Spotify" : musicService === "lastfm" ? "Last.fm" : "manual curation"}.
                      {musicService === "manual" ? (
                        <>
                          Visit your <a href="/profile" className="font-semibold text-blue-600 hover:text-blue-700">profile page</a> and click &quot;Curate Your Anchor&quot; to select your music.
                        </>
                      ) : (
                        <>
                          Now click the <span className="font-semibold">Refresh button</span> (top right)
                          to fetch your music data.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-700">
                    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    <span className="font-medium">Look for the circular arrow icon above</span>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Connect your music service
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Connect Spotify, Last.fm, or curate your own anchor to get started. Your music data will appear here once synced.
                  </p>
                  <a
                    href="/profile"
                    className="inline-block px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Profile
                  </a>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Favourite Artists */}
            <div id="favourite-artists" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Favourite Artists</h2>
              <p className="text-sm text-gray-600 mb-4">
                Highlight up to 4 artists on your profile (optional).
                {musicService === "lastfm" || musicService === "manual"
                  ? " Select from your top artists."
                  : " These will appear above your top recent artists."}
              </p>
              <FeaturedArtistsEditor
                initialFeatured={featuredArtists}
                onUpdate={setFeaturedArtists}
                disabled={isPending}
                allArtists={musicData?.artists || []}
                musicService={musicService}
              />
            </div>

            {/* Musical Eras */}
            <div id="musical-eras" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Musical Eras</h2>
                <a
                  href="/eras"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {erasData && erasData.entries.length > 0 ? "Edit Timeline" : "Create Timeline"}
                </a>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Build a timeline of the albums that shaped your musical journey.
              </p>
              {erasData && erasData.entries.length > 0 ? (
                <div className="mt-6">
                  <ErasTimeline erasData={erasData} />
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg text-center">
                  <p className="text-gray-500 mb-4">
                    You haven&apos;t created your musical timeline yet.
                  </p>
                  <a
                    href="/eras"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Start Your Timeline
                  </a>
                </div>
              )}
            </div>

            {/* Tim's Twitter Listening Party */}
            <div id="listening-party" className="bg-white shadow sm:rounded-lg px-4 py-5 sm:p-6 scroll-mt-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Tim&apos;s Twitter Listening Party</h2>
              <p className="text-sm text-gray-600 mb-4">
                Select your favourite listening party to showcase on your profile (optional).
              </p>
              <ListeningPartySelector
                initialFavourite={favouriteListeningParty}
                onUpdate={setFavouriteListeningParty}
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

            {/* Age Guess */}
            <div id="age-guess" className="scroll-mt-20">
              <AgeGuess
                initialAgeGuess={initialAgeGuess}
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
