/**
 * Image object from Spotify API responses
 */
export interface SpotifyImage {
  url: string;
  width: number;
  height: number;
}

/**
 * A Spotify artist with the fields we persist
 */
export interface Artist {
  id: string;
  name: string;
  images: SpotifyImage[];
  genres: string[];
  external_urls?: {
    spotify?: string;
    lastfm?: string;
    applemusic?: string;
  };
}

/**
 * Minimal artist reference embedded inside a Track or Album
 */
export interface ArtistRef {
  id: string;
  name: string;
}

/**
 * A Spotify track with the fields we persist
 */
export interface Track {
  id: string;
  name: string;
  artists: ArtistRef[];
  album: {
    id: string;
    name: string;
    images: SpotifyImage[];
    album_type: string;
  };
  popularity: number;
  external_urls?: {
    spotify?: string;
    lastfm?: string;
    applemusic?: string;
  };
}

/**
 * A derived album with a weighted popularity score
 */
export interface Album {
  id: string;
  name: string;
  artists: ArtistRef[];
  images: SpotifyImage[];
  albumType: string;
  /** Weighted score: sum of track popularities / track count */
  score?: number;
  external_urls?: {
    spotify?: string;
    lastfm?: string;
    applemusic?: string;
  };
}

/**
 * The full set of music data we cache per user
 */
export interface MusicData {
  artists: Artist[];
  albums: Album[];
  tracks: Track[];
  /** Unix timestamp (ms) when this data was cached */
  cachedAt: number;
}

// ---------------------------------------------------------------------------
// Spotify API response shapes (used for parsing raw API payloads)
// ---------------------------------------------------------------------------

export interface SpotifyTopArtistsResponse {
  items: Array<{
    id: string;
    name: string;
    images: SpotifyImage[];
    genres: string[];
  }>;
  next: string | null;
  total: number;
}

export interface SpotifyTopTracksResponse {
  items: Array<{
    id: string;
    name: string;
    artists: ArtistRef[];
    album: {
      id: string;
      name: string;
      images: SpotifyImage[];
      album_type: string;
    };
    popularity: number;
  }>;
  next: string | null;
  total: number;
}

export interface SpotifySearchArtistsResponse {
  artists: {
    items: Array<{
      id: string;
      name: string;
      images: SpotifyImage[];
      genres: string[];
    }>;
  };
}

export interface SpotifySearchAlbumsResponse {
  albums: {
    items: Array<{
      id: string;
      name: string;
      artists: ArtistRef[];
      images: SpotifyImage[];
      album_type: string;
    }>;
  };
}

export interface SpotifySearchTracksResponse {
  tracks: {
    items: Array<{
      id: string;
      name: string;
      artists: ArtistRef[];
      album: {
        id: string;
        name: string;
        images: SpotifyImage[];
        album_type: string;
      };
      popularity: number;
    }>;
  };
}
