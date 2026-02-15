import type {
  Artist,
  Track,
  Album,
  SpotifyTopArtistsResponse,
  SpotifyTopTracksResponse,
  SpotifySearchArtistsResponse,
  SpotifySearchAlbumsResponse,
  SpotifySearchTracksResponse,
} from "@/types/music";

// ---------------------------------------------------------------------------
// Rate-limit-aware fetch helper
// ---------------------------------------------------------------------------

/**
 * Performs a GET against the Spotify Web API.
 * If the server returns 429 (rate limit), throws a descriptive error that
 * includes the Retry-After value so callers can surface it to the UI.
 */
async function spotifyGet<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") ?? "unknown";
    throw new Error(`Rate limited. Retry after ${retryAfter} seconds`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Spotify API error ${response.status}: ${body || response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetches the authenticated user's top artists from Spotify.
 *
 * @param accessToken - Decrypted Spotify OAuth access token
 * @param limit        - Number of artists to fetch (default 6)
 * @returns Normalised Artist array containing only the fields we need
 */
export async function getTopArtists(
  accessToken: string,
  limit: number = 6
): Promise<Artist[]> {
  const url = `https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=medium_term`;
  const data = await spotifyGet<SpotifyTopArtistsResponse>(url, accessToken);

  return data.items.map((item) => ({
    id: item.id,
    name: item.name,
    images: item.images,
    genres: item.genres,
  }));
}

/**
 * Fetches the authenticated user's top tracks from Spotify.
 *
 * We request more tracks than we ultimately display (default 50) because
 * deriveTopAlbums needs a rich pool of tracks to produce good album rankings.
 *
 * @param accessToken - Decrypted Spotify OAuth access token
 * @param limit        - Number of tracks to fetch (default 50)
 * @returns Normalised Track array
 */
export async function getTopTracks(
  accessToken: string,
  limit: number = 50
): Promise<Track[]> {
  const url = `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=medium_term`;
  const data = await spotifyGet<SpotifyTopTracksResponse>(url, accessToken);

  return data.items.map((item) => ({
    id: item.id,
    name: item.name,
    artists: item.artists,
    album: item.album,
    popularity: item.popularity,
  }));
}

/**
 * Searches for artists on Spotify by name.
 *
 * @param accessToken - Decrypted Spotify OAuth access token or client credentials token
 * @param query       - Search query string
 * @param limit       - Number of results to return (default 10)
 * @returns Normalised Artist array containing only the fields we need
 */
export async function searchArtists(
  accessToken: string,
  query: string,
  limit: number = 10
): Promise<Artist[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=artist&limit=${limit}`;
  const data = await spotifyGet<SpotifySearchArtistsResponse>(url, accessToken);

  return data.artists.items.map((item) => ({
    id: item.id,
    name: item.name,
    images: item.images,
    genres: item.genres,
  }));
}

/**
 * Searches for albums on Spotify by name.
 *
 * @param accessToken - Decrypted Spotify OAuth access token or client credentials token
 * @param query       - Search query string
 * @param limit       - Number of results to return (default 10)
 * @returns Normalised Album array containing only the fields we need
 */
export async function searchAlbums(
  accessToken: string,
  query: string,
  limit: number = 10
): Promise<Album[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=${limit}`;
  const data = await spotifyGet<SpotifySearchAlbumsResponse>(url, accessToken);

  return data.albums.items.map((item) => ({
    id: item.id,
    name: item.name,
    artists: item.artists,
    images: item.images,
    albumType: item.album_type,
  }));
}

/**
 * Searches for tracks on Spotify by name.
 *
 * @param accessToken - Decrypted Spotify OAuth access token or client credentials token
 * @param query       - Search query string
 * @param limit       - Number of results to return (default 10)
 * @returns Normalised Track array containing only the fields we need
 */
export async function searchTracks(
  accessToken: string,
  query: string,
  limit: number = 10
): Promise<Track[]> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`;
  const data = await spotifyGet<SpotifySearchTracksResponse>(url, accessToken);

  return data.tracks.items.map((item) => ({
    id: item.id,
    name: item.name,
    artists: item.artists,
    album: item.album,
    popularity: item.popularity,
  }));
}

/**
 * Get full album details from Spotify using any access token (OAuth or Client Credentials).
 * Used when saving eras entries to get complete metadata.
 *
 * @param accessToken - Spotify access token (OAuth or client credentials)
 * @param albumId     - Spotify album ID
 * @returns Album metadata object with full details
 */
export async function getAlbum(
  accessToken: string,
  albumId: string
): Promise<{
  albumId: string;
  albumName: string;
  artistName: string;
  releaseDate: string;
  releaseYear: number;
  artworkUrl600: string;
} | null> {
  try {
    const url = `https://api.spotify.com/v1/albums/${albumId}`;
    const data = await spotifyGet<any>(url, accessToken);

    if (!data || !data.id) {
      return null;
    }

    // Extract release year from release_date (format: YYYY-MM-DD or YYYY)
    const releaseYear = parseInt(data.release_date.split("-")[0]);

    // Get 600x600 artwork (usually the second image in the array)
    const artwork600 = data.images.find((img: any) => img.width === 640) || data.images[0];

    return {
      albumId: data.id,
      albumName: data.name,
      artistName: data.artists[0]?.name || "Unknown Artist",
      releaseDate: data.release_date,
      releaseYear,
      artworkUrl600: artwork600?.url || "",
    };
  } catch (error) {
    console.error("Failed to get album details:", error);
    return null;
  }
}

/**
 * Derives the user's top albums from their top tracks.
 *
 * Algorithm:
 *   1. Group tracks by album.id
 *   2. Skip singles (album_type === 'single')
 *   3. Score each album: sum(track.popularity) / trackCount  (weighted average)
 *   4. Sort descending by score, take top N
 *
 * @param tracks - The full set of top tracks (output of getTopTracks)
 * @param limit  - Number of albums to return (default 6)
 * @returns Album array sorted by score, with score included for transparency
 */
export function deriveTopAlbums(tracks: Track[], limit: number = 6): Album[] {
  // Group tracks by album id
  const albumMap = new Map<
    string,
    { album: Track["album"]; artists: Track["artists"]; popularities: number[] }
  >();

  for (const track of tracks) {
    const existing = albumMap.get(track.album.id);
    if (existing) {
      existing.popularities.push(track.popularity);
    } else {
      albumMap.set(track.album.id, {
        album: track.album,
        artists: track.artists,
        popularities: [track.popularity],
      });
    }
  }

  // Build scored albums, skipping singles
  const scored: Album[] = [];
  for (const [, entry] of albumMap) {
    if (entry.album.album_type === "single") continue;

    const score =
      entry.popularities.reduce((sum, p) => sum + p, 0) /
      entry.popularities.length;

    scored.push({
      id: entry.album.id,
      name: entry.album.name,
      artists: entry.artists,
      images: entry.album.images,
      albumType: entry.album.album_type,
      score,
    });
  }

  // Sort descending by score, take top N
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  return scored.slice(0, limit);
}
