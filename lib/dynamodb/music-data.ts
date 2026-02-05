import {
  BatchGetCommand,
  TransactWriteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { MUSIC_SK, METADATA_SK, userPK } from "@/lib/dynamodb/schema";
import type { Artist, Track, Album, MusicData } from "@/types/music";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Fetches all three music-data items for a user in a single BatchGet call.
 *
 * Returns null if any of the three items is missing -- this signals that
 * the user has never fetched (or the data was somehow partially deleted).
 */
export async function getMusicData(userId: string): Promise<MusicData | null> {
  const pk = userPK(userId);

  const result = await dynamoDocumentClient.send(
    new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: {
          Keys: [
            { pk, sk: MUSIC_SK.ARTISTS },
            { pk, sk: MUSIC_SK.ALBUMS },
            { pk, sk: MUSIC_SK.TRACKS },
          ],
        },
      },
    })
  );

  const responses = result.Responses?.[TABLE_NAME] ?? [];

  // Index responses by sort key for easy lookup
  const bySK = new Map<string, Record<string, unknown>>();
  for (const item of responses) {
    bySK.set(item.sk as string, item);
  }

  const artistsItem = bySK.get(MUSIC_SK.ARTISTS);
  const albumsItem = bySK.get(MUSIC_SK.ALBUMS);
  const tracksItem = bySK.get(MUSIC_SK.TRACKS);

  // All three must be present
  if (!artistsItem || !albumsItem || !tracksItem) {
    return null;
  }

  // Use the cachedAt from the artists item as the canonical timestamp
  // (all three are written atomically so they share the same value)
  return {
    artists: artistsItem.data as Artist[],
    albums: albumsItem.data as Album[],
    tracks: tracksItem.data as Track[],
    cachedAt: artistsItem.cachedAt as number,
  };
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Atomically writes artists, albums, and tracks items and updates the
 * METADATA item's lastRefresh timestamp.
 *
 * Uses TransactWrite so either all four writes succeed or none do.
 */
export async function putMusicData(
  userId: string,
  data: { artists: Artist[]; albums: Album[]; tracks: Track[] }
): Promise<void> {
  const pk = userPK(userId);
  const now = Date.now();

  await dynamoDocumentClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              pk,
              sk: MUSIC_SK.ARTISTS,
              data: data.artists,
              cachedAt: now,
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              pk,
              sk: MUSIC_SK.ALBUMS,
              data: data.albums,
              cachedAt: now,
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              pk,
              sk: MUSIC_SK.TRACKS,
              data: data.tracks,
              cachedAt: now,
            },
          },
        },
        {
          Put: {
            TableName: TABLE_NAME,
            Item: {
              pk,
              sk: METADATA_SK,
              lastRefresh: now,
            },
          },
        },
      ],
    })
  );
}

// ---------------------------------------------------------------------------
// Cooldown helpers
// ---------------------------------------------------------------------------

/**
 * Returns the lastRefresh timestamp from the user's METADATA item,
 * or null if the item does not exist (user has never refreshed).
 */
export async function getLastRefresh(userId: string): Promise<number | null> {
  const result = await dynamoDocumentClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: userPK(userId),
        sk: METADATA_SK,
      },
    })
  );

  if (!result.Item) return null;
  return (result.Item.lastRefresh as number) ?? null;
}

/**
 * Determines whether the user is allowed to refresh their Spotify data.
 *
 * Returns true when:
 *   - The user has never refreshed (no METADATA item), OR
 *   - The cooldown period has elapsed since lastRefresh
 *
 * @param cooldownMs - Cooldown duration in milliseconds (default 24 hours)
 */
export async function canRefresh(
  userId: string,
  cooldownMs: number = 24 * 60 * 60 * 1000
): Promise<boolean> {
  const lastRefresh = await getLastRefresh(userId);
  if (lastRefresh === null) return true;
  return Date.now() - lastRefresh > cooldownMs;
}
