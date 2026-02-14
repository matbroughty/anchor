/**
 * Types for the Musical Eras / Timeline feature
 *
 * Allows users to curate key albums from their musical journey
 * and display them as a horizontal timeline on their published page.
 */

/**
 * Prompt IDs for the wizard flow
 */
export type EraPromptId =
  | "first_album"          // First album you remember listening to
  | "first_adored"         // First album you truly adored
  | "teenage_years_1"      // Teenage years (up to 3 albums)
  | "teenage_years_2"
  | "teenage_years_3"
  | "taste_shift"          // Album that changed your taste forever
  | "always_return"        // Album you can always go back to
  | "recent_love"          // Most recent album you loved
  | "forever_album";       // If forced, your one forever album

/**
 * Timeline display modes
 */
export type TimelineMode =
  | "release_date"  // Sort by album release date (default)
  | "life_era"      // Show with age-at-release if birth year provided
  | "custom";       // User-controlled order

/**
 * Single era entry representing an album selection
 */
export interface EraEntry {
  entryId: string;                    // UUID
  promptId: EraPromptId;              // Which prompt this answers
  promptLabel: string;                // Display label (e.g., "First album", "Teenage years")

  // Album data source
  source: "spotify" | "applemusic";   // Which API the album came from

  // Album metadata (denormalized for performance)
  albumId: string;                    // Spotify or Apple Music catalog ID
  albumName: string;
  artistName: string;
  releaseDate: string;                // ISO date (YYYY-MM-DD or YYYY)
  releaseYear: number;
  artworkUrl: string;                 // Resolved to specific size (600x600)

  // Ordering
  orderIndex: number;                 // Used for custom sort

  // Metadata
  createdAt: string;                  // ISO timestamp

  // Future fields (v2)
  userNote?: string;                  // Optional user commentary
  intensity?: "low" | "medium" | "high";  // How much this album meant
  revisitFrequency?: number;          // How often user returns to it (1-5)
}

/**
 * User's complete musical eras data
 * Stored as ERAS sort key under USER#{userId}
 */
export interface ErasData {
  timelineMode: TimelineMode;
  birthYear?: number;                 // Optional for life_era mode
  entries: EraEntry[];
  updatedAt: string;                  // ISO timestamp
}

/**
 * Prompt configuration for wizard
 */
export interface EraPrompt {
  id: EraPromptId;
  label: string;
  question: string;
  description?: string;
  allowMultiple: boolean;             // For teenage_years (up to 3)
  allowSkip: boolean;
}

/**
 * Album search result from Apple Music
 */
export interface AppleAlbumSearchResult {
  appleAlbumId: string;
  albumName: string;
  artistName: string;
  releaseDate: string;
  releaseYear: number;
  artworkUrl: string;                 // Template or resolved URL
}

/**
 * Cached Apple Music album metadata
 * Stored separately to avoid repeated API calls
 */
export interface AppleAlbumCache {
  appleAlbumId: string;
  albumName: string;
  artistName: string;
  releaseDate: string;
  releaseYear: number;
  artworkUrlTemplate: string;         // Apple's {w}x{h} template
  artworkUrl600: string;              // Pre-resolved 600x600
  artworkUrl300: string;              // Pre-resolved 300x300
  fetchedAt: string;                  // ISO timestamp
  expiresAt: number;                  // Unix timestamp for TTL
}
