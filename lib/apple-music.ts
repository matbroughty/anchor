/**
 * Apple Music API client for catalog search
 * Uses developer token (JWT) for authentication - no user auth required
 * Documentation: https://developer.apple.com/documentation/applemusicapi/
 */

import { createSign } from "crypto";
import type { Artist, Album, Track, SpotifyImage, ArtistRef } from "@/types/music";

// Cache developer token in memory (valid for 6 months)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

const APPLE_MUSIC_API_BASE = "https://api.music.apple.com/v1";
const TOKEN_VALIDITY_MS = 6 * 30 * 24 * 60 * 60 * 1000; // 6 months

/**
 * Apple Music API response types
 */
interface AppleMusicArtist {
  id: string;
  type: "artists";
  href: string;
  attributes: {
    name: string;
    genreNames: string[];
    url: string;
    artwork?: {
      url: string;
      width: number;
      height: number;
    };
  };
}

interface AppleMusicAlbum {
  id: string;
  type: "albums";
  href: string;
  attributes: {
    name: string;
    artistName: string;
    artwork: {
      url: string;
      width: number;
      height: number;
    };
    genreNames: string[];
    url: string;
    releaseDate: string;
  };
  relationships?: {
    artists?: {
      data: Array<{
        id: string;
        type: "artists";
        href: string;
      }>;
    };
  };
}

interface AppleMusicSong {
  id: string;
  type: "songs";
  href: string;
  attributes: {
    name: string;
    artistName: string;
    albumName: string;
    artwork: {
      url: string;
      width: number;
      height: number;
    };
    genreNames: string[];
    url: string;
    previews?: Array<{ url: string }>;
  };
  relationships?: {
    artists?: {
      data: Array<{
        id: string;
        type: "artists";
      }>;
    };
    albums?: {
      data: Array<{
        id: string;
        type: "albums";
      }>;
    };
  };
}

interface AppleMusicSearchResponse {
  results: {
    artists?: {
      data: AppleMusicArtist[];
    };
    albums?: {
      data: AppleMusicAlbum[];
    };
    songs?: {
      data: AppleMusicSong[];
    };
  };
}

/**
 * Generates an Apple Music developer token (JWT)
 * Valid for 6 months, cached in memory
 * Uses ES256 algorithm (ECDSA with P-256 curve)
 */
function generateDeveloperToken(): string {
  const now = Math.floor(Date.now() / 1000);

  // Check if cached token is still valid (with 1 day buffer)
  if (cachedToken && tokenExpiry > now + 86400) {
    return cachedToken;
  }

  const teamId = process.env.APPLE_MUSIC_TEAM_ID;
  const keyId = process.env.APPLE_MUSIC_KEY_ID;
  const privateKey = process.env.APPLE_MUSIC_PRIVATE_KEY;

  if (!teamId || !keyId || !privateKey) {
    throw new Error(
      "Missing Apple Music credentials. Set APPLE_MUSIC_TEAM_ID, APPLE_MUSIC_KEY_ID, and APPLE_MUSIC_PRIVATE_KEY environment variables."
    );
  }

  // JWT header
  const header = {
    alg: "ES256",
    kid: keyId,
  };

  // JWT payload
  const expiry = now + Math.floor(TOKEN_VALIDITY_MS / 1000);
  const payload = {
    iss: teamId,
    iat: now,
    exp: expiry,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with ES256
  const sign = createSign("SHA256");
  sign.update(signatureInput);
  sign.end();
  const signature = sign.sign(privateKey, "base64");
  const encodedSignature = base64UrlEncode(Buffer.from(signature, "base64"));

  // Construct JWT
  const token = `${signatureInput}.${encodedSignature}`;

  // Cache token
  cachedToken = token;
  tokenExpiry = expiry;

  return token;
}

/**
 * Base64 URL encoding (without padding)
 */
function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input) : input;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Transforms Apple Music artwork URL template to specific size
 * Template format: https://example.com/{w}x{h}bb.jpg
 */
function getArtworkUrl(template: string, width: number, height: number): string {
  return template.replace("{w}", width.toString()).replace("{h}", height.toString());
}

/**
 * Transforms Apple Music images to Spotify image format
 */
function transformImages(artworkTemplate: string): SpotifyImage[] {
  // Return multiple sizes like Spotify does
  return [
    {
      url: getArtworkUrl(artworkTemplate, 640, 640),
      width: 640,
      height: 640,
    },
    {
      url: getArtworkUrl(artworkTemplate, 300, 300),
      width: 300,
      height: 300,
    },
    {
      url: getArtworkUrl(artworkTemplate, 64, 64),
      width: 64,
      height: 64,
    },
  ];
}

/**
 * Search Apple Music catalog for artists
 */
export async function searchArtists(query: string, limit = 10): Promise<Artist[]> {
  if (!query.trim()) {
    return [];
  }

  const token = generateDeveloperToken();
  const encodedQuery = encodeURIComponent(query);
  const url = `${APPLE_MUSIC_API_BASE}/catalog/us/search?types=artists&term=${encodedQuery}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple Music API error: ${response.status} ${errorText}`);
  }

  const data: AppleMusicSearchResponse = await response.json();
  const artists = data.results.artists?.data || [];

  return artists.map((artist) => ({
    id: artist.id,
    name: artist.attributes.name,
    images: artist.attributes.artwork
      ? transformImages(artist.attributes.artwork.url)
      : [],
    genres: artist.attributes.genreNames || [],
    external_urls: {
      applemusic: artist.attributes.url,
    },
  }));
}

/**
 * Search Apple Music catalog for albums
 */
export async function searchAlbums(query: string, limit = 10): Promise<Album[]> {
  if (!query.trim()) {
    return [];
  }

  const token = generateDeveloperToken();
  const encodedQuery = encodeURIComponent(query);
  const url = `${APPLE_MUSIC_API_BASE}/catalog/us/search?types=albums&term=${encodedQuery}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple Music API error: ${response.status} ${errorText}`);
  }

  const data: AppleMusicSearchResponse = await response.json();
  const albums = data.results.albums?.data || [];

  return albums.map((album) => {
    // Extract artist info from artistName string
    const artistNames = album.attributes.artistName.split(",").map((n) => n.trim());
    const artists: ArtistRef[] = artistNames.map((name, index) => ({
      id: `${album.id}-artist-${index}`,
      name,
    }));

    return {
      id: album.id,
      name: album.attributes.name,
      artists,
      images: transformImages(album.attributes.artwork.url),
      albumType: "album", // Apple Music doesn't distinguish album types
      external_urls: {
        applemusic: album.attributes.url,
      },
    };
  });
}

/**
 * Search Apple Music catalog for tracks (songs)
 */
export async function searchTracks(query: string, limit = 10): Promise<Track[]> {
  if (!query.trim()) {
    return [];
  }

  const token = generateDeveloperToken();
  const encodedQuery = encodeURIComponent(query);
  const url = `${APPLE_MUSIC_API_BASE}/catalog/us/search?types=songs&term=${encodedQuery}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple Music API error: ${response.status} ${errorText}`);
  }

  const data: AppleMusicSearchResponse = await response.json();
  const songs = data.results.songs?.data || [];

  return songs.map((song) => {
    // Extract artist info from artistName string
    const artistNames = song.attributes.artistName.split(",").map((n) => n.trim());
    const artists: ArtistRef[] = artistNames.map((name, index) => ({
      id: `${song.id}-artist-${index}`,
      name,
    }));

    return {
      id: song.id,
      name: song.attributes.name,
      artists,
      album: {
        id: `${song.id}-album`,
        name: song.attributes.albumName,
        images: transformImages(song.attributes.artwork.url),
        album_type: "album",
      },
      popularity: 50, // Apple Music doesn't provide popularity scores
      external_urls: {
        applemusic: song.attributes.url,
      },
    };
  });
}

/**
 * Lookup a specific album by Apple Music catalog ID
 * Used for Eras feature to fetch full album metadata
 */
export async function lookupAlbum(
  albumId: string,
  storefront: string = "us"
): Promise<{
  appleAlbumId: string;
  albumName: string;
  artistName: string;
  releaseDate: string;
  releaseYear: number;
  artworkUrlTemplate: string;
  artworkUrl600: string;
  artworkUrl300: string;
  genreNames: string[];
} | null> {
  const token = generateDeveloperToken();
  const url = `${APPLE_MUSIC_API_BASE}/catalog/${storefront}/albums/${albumId}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const errorText = await response.text();
    throw new Error(`Apple Music API error: ${response.status} ${errorText}`);
  }

  const data: { data: AppleMusicAlbum[] } = await response.json();
  const album = data.data[0];

  if (!album) {
    return null;
  }

  const artworkTemplate = album.attributes.artwork.url;
  const releaseDate = album.attributes.releaseDate;
  const releaseYear = parseInt(releaseDate.split("-")[0], 10);

  return {
    appleAlbumId: album.id,
    albumName: album.attributes.name,
    artistName: album.attributes.artistName,
    releaseDate,
    releaseYear,
    artworkUrlTemplate: artworkTemplate,
    artworkUrl600: getArtworkUrl(artworkTemplate, 600, 600),
    artworkUrl300: getArtworkUrl(artworkTemplate, 300, 300),
    genreNames: album.attributes.genreNames || [],
  };
}

/**
 * Batch lookup multiple albums by Apple Music catalog IDs
 * More efficient than multiple individual lookups
 */
export async function lookupAlbums(
  albumIds: string[],
  storefront: string = "us"
): Promise<Map<string, {
  appleAlbumId: string;
  albumName: string;
  artistName: string;
  releaseDate: string;
  releaseYear: number;
  artworkUrlTemplate: string;
  artworkUrl600: string;
  artworkUrl300: string;
  genreNames: string[];
}>> {
  if (albumIds.length === 0) {
    return new Map();
  }

  const token = generateDeveloperToken();
  const idsParam = albumIds.join(",");
  const url = `${APPLE_MUSIC_API_BASE}/catalog/${storefront}/albums?ids=${idsParam}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple Music API error: ${response.status} ${errorText}`);
  }

  const data: { data: AppleMusicAlbum[] } = await response.json();
  const results = new Map();

  for (const album of data.data) {
    const artworkTemplate = album.attributes.artwork.url;
    const releaseDate = album.attributes.releaseDate;
    const releaseYear = parseInt(releaseDate.split("-")[0], 10);

    results.set(album.id, {
      appleAlbumId: album.id,
      albumName: album.attributes.name,
      artistName: album.attributes.artistName,
      releaseDate,
      releaseYear,
      artworkUrlTemplate: artworkTemplate,
      artworkUrl600: getArtworkUrl(artworkTemplate, 600, 600),
      artworkUrl300: getArtworkUrl(artworkTemplate, 300, 300),
      genreNames: album.attributes.genreNames || [],
    });
  }

  return results;
}
