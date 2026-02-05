import type {
  Artist,
  Track,
  Album,
  SpotifyTopArtistsResponse,
  SpotifyTopTracksResponse,
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
 * Derives the user's top albums from their top tracks.
 *
 * Algorithm:
 *   1. Group tracks by album.id
 *   2. Skip singles (album_type === 'single')
 *   3. Score each album: sum(track.popularity) / trackCount  (weighted average)
 *   4. Sort descending by score, take top N
 *
 * @param tracks - The full set of top tracks (output of getTopTracks)
 * @param limit  - Number of albums to return (default 5)
 * @returns Album array sorted by score, with score included for transparency
 */
export function deriveTopAlbums(tracks: Track[], limit: number = 5): Album[] {
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
