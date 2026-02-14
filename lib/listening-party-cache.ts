import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import type { ListeningPartyRow, ListeningParty } from "@/types/listening-party";

/**
 * CSV data source URL (fixed)
 */
const CSV_URL = "https://timstwitterlisteningparty.com/data/time-slot-data.csv";

/**
 * Cache TTL: 6 hours
 */
const CACHE_TTL_SECONDS = 6 * 60 * 60;

/**
 * DynamoDB cache key
 */
const CACHE_PK = "CACHE#TWTLP";
const CACHE_SK = "CSV";

/**
 * Parse CSV row (NO HEADERS) into ListeningPartyRow
 * 13 columns by index
 */
function parseCSVRow(row: string): ListeningPartyRow | null {
  // Split by comma, but handle quoted fields
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      columns.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  columns.push(current.trim()); // Last column

  // Must have exactly 13 columns
  if (columns.length !== 13) {
    return null;
  }

  return {
    partyDateTime: columns[0],
    artist: columns[1],
    album: columns[2],
    tweetLink: columns[3],
    replayLink: columns[4],
    twitterHandles: columns[5],
    timelineLink: columns[6],
    spotifyAlbumLink: columns[7],
    artworkSmall: columns[8],
    artworkMedium: columns[9],
    albumReleaseDate: columns[10],
    partyId: columns[11],
    artworkLarge: columns[12],
  };
}

/**
 * Parse entire CSV body into array of rows
 */
function parseCSV(csvBody: string): ListeningPartyRow[] {
  const lines = csvBody.split("\n").filter((line) => line.trim());
  const rows: ListeningPartyRow[] = [];

  for (const line of lines) {
    const row = parseCSVRow(line);
    if (row) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Fetch CSV from source URL
 */
async function fetchCSV(): Promise<string> {
  const response = await fetch(CSV_URL, {
    headers: {
      "User-Agent": "anchor.band/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Get cached CSV data from DynamoDB
 */
async function getCachedCSV(): Promise<string | null> {
  try {
    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk: CACHE_PK, sk: CACHE_SK },
      })
    );

    if (!result.Item) {
      return null;
    }

    const expiresAt = result.Item.expiresAt as number;
    const now = Math.floor(Date.now() / 1000);

    if (now > expiresAt) {
      // Expired
      return null;
    }

    return result.Item.csvBody as string;
  } catch (error) {
    console.error("Failed to get cached CSV:", error);
    return null;
  }
}

/**
 * Store CSV in DynamoDB cache
 */
async function cacheCSV(csvBody: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + CACHE_TTL_SECONDS;

  try {
    await dynamoDocumentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          pk: CACHE_PK,
          sk: CACHE_SK,
          csvBody,
          fetchedAt: new Date().toISOString(),
          expiresAt,
        },
      })
    );
  } catch (error) {
    console.error("Failed to cache CSV:", error);
    // Non-fatal - continue without caching
  }
}

/**
 * Get all listening parties (with caching)
 */
export async function getAllListeningParties(): Promise<ListeningPartyRow[]> {
  // Check cache first
  let csvBody = await getCachedCSV();

  if (!csvBody) {
    // Cache miss or expired - fetch fresh data
    console.log("[ListeningParty] Cache miss, fetching CSV...");
    csvBody = await fetchCSV();
    await cacheCSV(csvBody);
  } else {
    console.log("[ListeningParty] Cache hit");
  }

  return parseCSV(csvBody);
}

/**
 * Search listening parties by artist or album
 */
export async function searchListeningParties(
  term: string,
  limit: number = 20
): Promise<ListeningParty[]> {
  const allParties = await getAllListeningParties();
  const lowerTerm = term.toLowerCase();

  // Filter matches
  const matches = allParties.filter((party) => {
    const artistMatch = party.artist.toLowerCase().includes(lowerTerm);
    const albumMatch = party.album.toLowerCase().includes(lowerTerm);
    return artistMatch || albumMatch;
  });

  // Sort matches:
  // 1. Exact starts-with matches first
  // 2. Then by most recent partyDateTime
  matches.sort((a, b) => {
    const aArtistStarts = a.artist.toLowerCase().startsWith(lowerTerm);
    const bArtistStarts = b.artist.toLowerCase().startsWith(lowerTerm);
    const aAlbumStarts = a.album.toLowerCase().startsWith(lowerTerm);
    const bAlbumStarts = b.album.toLowerCase().startsWith(lowerTerm);

    const aStarts = aArtistStarts || aAlbumStarts;
    const bStarts = bArtistStarts || bAlbumStarts;

    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;

    // Both start or both don't start - sort by date descending
    return b.partyDateTime.localeCompare(a.partyDateTime);
  });

  // Convert to minimal payload and limit results
  return matches.slice(0, limit).map((row) => ({
    partyId: row.partyId,
    partyDateTime: row.partyDateTime,
    artist: row.artist,
    album: row.album,
    replayLink: row.replayLink,
    spotifyAlbumLink: row.spotifyAlbumLink,
    artworkSmall: row.artworkSmall,
    artworkMedium: row.artworkMedium,
    artworkLarge: row.artworkLarge,
    albumReleaseDate: row.albumReleaseDate,
    tweetLink: row.tweetLink,
    timelineLink: row.timelineLink,
  }));
}
