/**
 * Sort-key constants for music data items in the single DynamoDB table.
 *
 * Single-table design: all user data lives under pk = USER#{userId}.
 * Each music entity gets its own sort key so we can batch-fetch or
 * independently update them.
 *
 * User record fields (pk = USER#{userId}, sk = USER#{userId}):
 * - handle: string (the user's claimed handle)
 * - displayName: string | null (user's display name)
 * - isPublic: boolean (default false, controls public page visibility)
 * - lastfmUsername: string | null (Last.fm username if connected)
 * - publishedAt: number | null (Unix timestamp in ms when first published)
 * - updatedAt: string (ISO timestamp of last update)
 */
export const MUSIC_SK = {
  ARTISTS: "MUSIC#ARTISTS",
  ALBUMS: "MUSIC#ALBUMS",
  TRACKS: "MUSIC#TRACKS",
  FEATURED_ARTISTS: "MUSIC#FEATURED_ARTISTS",
} as const;

/**
 * Sort key for the user's profile-level metadata record.
 * We store lastRefresh here so cooldown checks only need one GetCommand.
 * Also stores viewCount for analytics.
 */
export const METADATA_SK = "PROFILE#METADATA";

/**
 * Sort key for the user's musical eras/timeline data.
 * Stores the user's curated album timeline for their musical journey.
 */
export const ERAS_SK = "ERAS";

/**
 * Builds the partition key for a given user.
 *
 * Consistent with the pattern used in lib/spotify.ts (USER#{id})
 * and lib/handle.ts for the single-table layout.
 */
export function userPK(userId: string): string {
  return `USER#${userId}`;
}
