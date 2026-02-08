/**
 * Last.fm API client for fetching user music data.
 *
 * Last.fm API is completely open - no approval needed!
 * For public profile data, we only need the user's username.
 * No OAuth required for read operations.
 */

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_API_URL = "https://ws.audioscrobbler.com/2.0/";

if (!LASTFM_API_KEY) {
  console.warn("LASTFM_API_KEY not set - Last.fm integration will not work");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LastfmImage {
  "#text": string;
  size: "small" | "medium" | "large" | "extralarge" | "mega";
}

interface LastfmArtistResponse {
  topartists: {
    artist: Array<{
      name: string;
      playcount: string;
      url: string;
      image: LastfmImage[];
      mbid?: string;
    }>;
  };
}

interface LastfmAlbumResponse {
  topalbums: {
    album: Array<{
      name: string;
      playcount: string;
      url: string;
      artist: {
        name: string;
        url: string;
      };
      image: LastfmImage[];
      mbid?: string;
    }>;
  };
}

interface LastfmTrackResponse {
  toptracks: {
    track: Array<{
      name: string;
      playcount: string;
      url: string;
      artist: {
        name: string;
        url: string;
      };
      image?: LastfmImage[];
      mbid?: string;
    }>;
  };
}

interface LastfmUserInfo {
  user: {
    name: string;
    realname?: string;
    url: string;
    image: LastfmImage[];
    playcount: string;
  };
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

async function callLastfmApi<T>(params: Record<string, string>): Promise<T> {
  if (!LASTFM_API_KEY) {
    throw new Error("Last.fm API key not configured");
  }

  const searchParams = new URLSearchParams({
    api_key: LASTFM_API_KEY,
    format: "json",
    ...params,
  });

  const response = await fetch(`${LASTFM_API_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Last.fm API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Verify that a Last.fm username exists and is valid.
 */
export async function verifyLastfmUser(username: string): Promise<boolean> {
  try {
    await callLastfmApi<LastfmUserInfo>({
      method: "user.getInfo",
      user: username,
    });
    return true;
  } catch (error) {
    console.error("Last.fm user verification error:", error);
    return false;
  }
}

/**
 * Fetch user's top artists from Last.fm.
 * Period: overall | 7day | 1month | 3month | 6month | 12month
 */
export async function getLastfmTopArtists(
  username: string,
  limit: number = 50,
  period: string = "6month"
) {
  const data = await callLastfmApi<LastfmArtistResponse>({
    method: "user.getTopArtists",
    user: username,
    limit: limit.toString(),
    period,
  });

  return data.topartists.artist.map((artist) => ({
    name: artist.name,
    url: artist.url,
    playcount: parseInt(artist.playcount),
    images: artist.image.map((img) => ({
      url: img["#text"],
      size: img.size,
    })),
    mbid: artist.mbid,
  }));
}

/**
 * Fetch user's top albums from Last.fm.
 */
export async function getLastfmTopAlbums(
  username: string,
  limit: number = 50,
  period: string = "6month"
) {
  const data = await callLastfmApi<LastfmAlbumResponse>({
    method: "user.getTopAlbums",
    user: username,
    limit: limit.toString(),
    period,
  });

  return data.topalbums.album.map((album) => ({
    name: album.name,
    artist: album.artist.name,
    url: album.url,
    playcount: parseInt(album.playcount),
    images: album.image.map((img) => ({
      url: img["#text"],
      size: img.size,
    })),
    mbid: album.mbid,
  }));
}

/**
 * Fetch user's top tracks from Last.fm.
 */
export async function getLastfmTopTracks(
  username: string,
  limit: number = 50,
  period: string = "6month"
) {
  const data = await callLastfmApi<LastfmTrackResponse>({
    method: "user.getTopTracks",
    user: username,
    limit: limit.toString(),
    period,
  });

  return data.toptracks.track.map((track) => ({
    name: track.name,
    artist: track.artist.name,
    url: track.url,
    playcount: parseInt(track.playcount),
    images: track.image?.map((img) => ({
      url: img["#text"],
      size: img.size,
    })) || [],
    mbid: track.mbid,
  }));
}

/**
 * Get user info to display their Last.fm profile details.
 */
export async function getLastfmUserInfo(username: string) {
  const data = await callLastfmApi<LastfmUserInfo>({
    method: "user.getInfo",
    user: username,
  });

  return {
    username: data.user.name,
    realname: data.user.realname,
    url: data.user.url,
    playcount: parseInt(data.user.playcount),
    image: data.user.image.find((img) => img.size === "large")?.["#text"] || null,
  };
}
