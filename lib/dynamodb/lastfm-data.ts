import {
  getLastfmTopArtists,
  getLastfmTopAlbums,
  getLastfmTopTracks,
} from "@/lib/lastfm";
import { putMusicData } from "@/lib/dynamodb/music-data";
import type { Artist, Album, Track } from "@/types/music";

/**
 * Fetches music data from Last.fm and converts it to our standard format.
 * This matches the Spotify data structure so the rest of the app works the same.
 */
export async function fetchLastfmMusicData(
  username: string
): Promise<{ artists: Artist[]; albums: Album[]; tracks: Track[] }> {
  // Fetch top data from Last.fm (overall period to capture all listening history)
  const [lastfmArtists, lastfmAlbums, lastfmTracks] = await Promise.all([
    getLastfmTopArtists(username, 50, "overall"),
    getLastfmTopAlbums(username, 50, "overall"),
    getLastfmTopTracks(username, 50, "overall"),
  ]);

  // Convert Last.fm format to our standard Artist format
  const artists: Artist[] = lastfmArtists.map((artist, index) => ({
    id: artist.mbid || `lastfm-artist-${index}`, // Use MBID if available, fallback to index
    name: artist.name,
    images: artist.images
      .filter((img) => img.url) // Filter out empty URLs
      .map((img) => ({
        url: img.url,
        width: img.size === "mega" ? 300 : img.size === "large" ? 200 : 64,
        height: img.size === "mega" ? 300 : img.size === "large" ? 200 : 64,
      })),
    genres: [], // Last.fm doesn't provide genre data in top artists
    external_urls: {
      lastfm: artist.url,
    },
  }));

  // Convert Last.fm format to our standard Album format
  const albums: Album[] = lastfmAlbums.slice(0, 6).map((album, index) => ({
    id: album.mbid || `lastfm-album-${index}`,
    name: album.name,
    artists: [
      {
        id: `lastfm-artist-${album.artist}`,
        name: album.artist,
      },
    ],
    images: album.images
      .filter((img) => img.url)
      .map((img) => ({
        url: img.url,
        width: img.size === "mega" ? 300 : img.size === "large" ? 200 : 64,
        height: img.size === "mega" ? 300 : img.size === "large" ? 200 : 64,
      })),
    albumType: "album", // Last.fm doesn't distinguish album types
  }));

  // Convert Last.fm format to our standard Track format
  const tracks: Track[] = lastfmTracks.map((track, index) => ({
    id: track.mbid || `lastfm-track-${index}`,
    name: track.name,
    artists: [
      {
        id: `lastfm-artist-${track.artist}`,
        name: track.artist,
      },
    ],
    album: {
      id: `lastfm-album-unknown-${index}`,
      name: "", // Last.fm top tracks doesn't include album info
      images: [],
      album_type: "album",
    },
    popularity: 0, // Last.fm doesn't provide popularity scores
  }));

  return { artists, albums, tracks };
}

/**
 * Fetches and stores Last.fm music data for a user.
 * This is the equivalent of refreshSpotifyData but for Last.fm.
 */
export async function refreshLastfmData(
  userId: string,
  username: string
): Promise<void> {
  const musicData = await fetchLastfmMusicData(username);
  await putMusicData(userId, musicData);
}
