"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MusicSearch } from "@/app/components/MusicSearch";
import {
  searchArtistsAction,
  searchAlbumsAction,
  searchTracksAction,
  saveManualCuration,
} from "@/app/actions/manual-curation";
import type { Artist, Album, Track } from "@/types/music";

interface CurateClientProps {
  initialArtists: Artist[];
  initialAlbums: Album[];
  initialTracks: Track[];
}

/**
 * Client component for manual music curation
 * Three sections: Artists (6), Albums (6), Tracks (10)
 */
export function CurateClient({
  initialArtists,
  initialAlbums,
  initialTracks,
}: CurateClientProps) {
  const router = useRouter();
  const [artists, setArtists] = useState<Artist[]>(initialArtists);
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedArtistIds = new Set(artists.map((a) => a.id));
  const selectedAlbumIds = new Set(albums.map((a) => a.id));
  const selectedTrackIds = new Set(tracks.map((t) => t.id));

  const isComplete = artists.length === 6 && albums.length === 6 && tracks.length === 10;

  const handleAddArtist = (artist: Artist) => {
    if (artists.length < 6) {
      setArtists([...artists, artist]);
    }
  };

  const handleRemoveArtist = (id: string) => {
    setArtists(artists.filter((a) => a.id !== id));
  };

  const handleAddAlbum = (album: Album) => {
    if (albums.length < 6) {
      setAlbums([...albums, album]);
    }
  };

  const handleRemoveAlbum = (id: string) => {
    setAlbums(albums.filter((a) => a.id !== id));
  };

  const handleAddTrack = (track: Track) => {
    if (tracks.length < 10) {
      setTracks([...tracks, track]);
    }
  };

  const handleRemoveTrack = (id: string) => {
    setTracks(tracks.filter((t) => t.id !== id));
  };

  const handleSave = async () => {
    if (!isComplete) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await saveManualCuration(artists, albums, tracks);
      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Failed to save curation");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save curation");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push("/profile");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Curate Your Anchor</h1>
          <p className="text-gray-600">
            Select your favorite artists, albums, and tracks to create your musical anchor.
            Search the Apple Music catalog to find your favorites.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {artists.length}/6
              </p>
              <p className="text-sm text-gray-600">Artists</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {albums.length}/6
              </p>
              <p className="text-sm text-gray-600">Albums</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {tracks.length}/10
              </p>
              <p className="text-sm text-gray-600">Tracks</p>
            </div>
          </div>
        </div>

        {/* Section 1: Artists */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            1. Select Artists (6 required)
          </h2>

          <MusicSearch
            type="artist"
            onSelect={handleAddArtist}
            selectedIds={selectedArtistIds}
            maxSelected={6}
            searchAction={searchArtistsAction}
          />

          {/* Selected Artists */}
          {artists.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Artists</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {artists.map((artist, index) => (
                  <div
                    key={artist.id}
                    className="relative border border-gray-200 rounded-lg p-3 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveArtist(artist.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      ×
                    </button>
                    {artist.images[0] && (
                      <img
                        src={artist.images[0].url}
                        alt={artist.name}
                        className="w-full aspect-square rounded object-cover mb-2"
                      />
                    )}
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {index + 1}. {artist.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Albums */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            2. Select Albums (6 required)
          </h2>

          <MusicSearch
            type="album"
            onSelect={handleAddAlbum}
            selectedIds={selectedAlbumIds}
            maxSelected={6}
            searchAction={searchAlbumsAction}
          />

          {/* Selected Albums */}
          {albums.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Albums</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {albums.map((album, index) => (
                  <div
                    key={album.id}
                    className="relative border border-gray-200 rounded-lg p-3 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveAlbum(album.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      ×
                    </button>
                    {album.images[0] && (
                      <img
                        src={album.images[0].url}
                        alt={album.name}
                        className="w-full aspect-square rounded object-cover mb-2"
                      />
                    )}
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {index + 1}. {album.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {album.artists.map((a) => a.name).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Tracks */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            3. Select Tracks (10 required)
          </h2>

          <MusicSearch
            type="track"
            onSelect={handleAddTrack}
            selectedIds={selectedTrackIds}
            maxSelected={10}
            searchAction={searchTracksAction}
          />

          {/* Selected Tracks */}
          {tracks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Selected Tracks</h3>
              <div className="space-y-2">
                {tracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 group"
                  >
                    {track.album.images[0] && (
                      <img
                        src={track.album.images[0].url}
                        alt={track.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {index + 1}. {track.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {track.artists.map((a) => a.name).join(", ")} • {track.album.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveTrack(track.id)}
                      className="flex-shrink-0 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-end sticky bottom-0 bg-gray-50 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isComplete || isSaving}
            className="px-6 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save Anchor"}
          </button>
        </div>
      </div>
    </div>
  );
}
