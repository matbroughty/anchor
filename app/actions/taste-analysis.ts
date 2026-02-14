"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "@/lib/bedrock/client";
import { TASTE_ANALYSIS_SYSTEM_PROMPT } from "@/lib/bedrock/prompts";
import { putTasteAnalysis } from "@/lib/dynamodb/content";
import { getMusicData } from "@/lib/dynamodb/music-data";
import { getFeaturedArtists } from "@/lib/dynamodb/featured-artists";
import { getErasData } from "@/app/actions/eras";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDocumentClient, TABLE_NAME } from "@/lib/dynamodb";
import { userPK } from "@/lib/dynamodb/schema";
import type { TasteAnalysis } from "@/types/content";
import type { ErasData } from "@/types/eras";
import type { FavouriteListeningParty } from "@/types/listening-party";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface GenerateTasteAnalysisResult {
  analysis: TasteAnalysis | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Fetches user's favourite listening party from DynamoDB
 */
async function getFavouriteListeningParty(userId: string): Promise<FavouriteListeningParty | null> {
  try {
    const pk = userPK(userId);
    const sk = "LISTENING_PARTY#FAVOURITE";

    const result = await dynamoDocumentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { pk, sk },
      })
    );

    if (!result.Item) {
      return null;
    }

    return {
      partyId: result.Item.partyId,
      partyDateTime: result.Item.partyDateTime,
      artist: result.Item.artist,
      album: result.Item.album,
      replayLink: result.Item.replayLink,
      spotifyAlbumLink: result.Item.spotifyAlbumLink,
      artworkSmall: result.Item.artworkSmall,
      artworkMedium: result.Item.artworkMedium,
      artworkLarge: result.Item.artworkLarge,
      albumReleaseDate: result.Item.albumReleaseDate,
      tweetLink: result.Item.tweetLink,
      timelineLink: result.Item.timelineLink,
    };
  } catch (error) {
    console.error("Failed to fetch favourite listening party:", error);
    return null;
  }
}

function buildTasteAnalysisInput(input: {
  favourites: string[];
  recent: string[];
  albums: Array<{ artist: string; title: string }>;
  tracks: Array<{ name: string; artists: string[] }>;
  musicalEras?: Array<{ artist: string; album: string; year: number; prompt: string }>;
  listeningParty?: { artist: string; album: string } | null;
}): string {
  const inputJson = JSON.stringify(input, null, 2);
  return `${inputJson}\n\nAnalyze this music taste and respond with ONLY the JSON object (no markdown, no code fences, no extra text).`;
}

async function callBedrockForAnalysis(
  userMessage: string
): Promise<TasteAnalysis> {
  const response = await bedrockClient.send(
    new ConverseCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      system: [{ text: TASTE_ANALYSIS_SYSTEM_PROMPT }],
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      inferenceConfig: { maxTokens: 4000, temperature: 0.7 },
    })
  );

  const content = response.output?.message?.content;
  if (!content || content.length === 0 || !("text" in content[0])) {
    throw new Error("Empty response from Bedrock");
  }

  let responseText = (content[0] as { text: string }).text.trim();

  // Strip markdown code fences if present
  responseText = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
  responseText = responseText.trim();

  // Parse JSON response
  try {
    const analysis = JSON.parse(responseText) as TasteAnalysis;
    analysis.generatedAt = Date.now();
    return analysis;
  } catch (error) {
    console.error("Failed to parse Bedrock JSON response. Raw response:", responseText);
    console.error("Parse error:", error);
    throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Generates a fun music taste analysis for the authenticated user.
 * Analyzes their featured artists, top artists, albums, and tracks.
 * Includes Musical Eras and favourite listening party data if available.
 * Returns a traffic-light rating with insights and recommendations.
 */
export async function generateTasteAnalysis(): Promise<GenerateTasteAnalysisResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { analysis: null, error: "Not authenticated" };
    }

    const [musicData, featuredArtists, erasDataResult, listeningParty] = await Promise.all([
      getMusicData(session.user.id),
      getFeaturedArtists(session.user.id),
      getErasData(),
      getFavouriteListeningParty(session.user.id),
    ]);

    if (!musicData) {
      return {
        analysis: null,
        error: "No music data available. Fetch Spotify data first.",
      };
    }

    const erasData = erasDataResult.success ? erasDataResult.data : undefined;

    // Build the input JSON for the AI
    const input: {
      favourites: string[];
      recent: string[];
      albums: Array<{ artist: string; title: string }>;
      tracks: Array<{ name: string; artists: string[] }>;
      musicalEras?: Array<{ artist: string; album: string; year: number; prompt: string }>;
      listeningParty?: { artist: string; album: string } | null;
    } = {
      favourites: featuredArtists.map((a) => a.name),
      recent: musicData.artists.slice(0, 10).map((a) => a.name),
      albums: musicData.albums.slice(0, 6).map((a) => ({
        artist: a.artists.map((ar) => ar.name).join(" & "),
        title: a.name,
      })),
      tracks: musicData.tracks.slice(0, 10).map((t) => ({
        name: t.name,
        artists: t.artists.map((a) => a.name),
      })),
    };

    // Add Musical Eras if present
    if (erasData && erasData.entries.length > 0) {
      input.musicalEras = erasData.entries.map((entry) => ({
        artist: entry.artistName,
        album: entry.albumName,
        year: entry.releaseYear,
        prompt: entry.promptLabel,
      }));
    }

    // Add listening party if present
    if (listeningParty) {
      input.listeningParty = {
        artist: listeningParty.artist,
        album: listeningParty.album,
      };
    }

    const userMessage = buildTasteAnalysisInput(input);
    const analysis = await callBedrockForAnalysis(userMessage);

    // Store in DynamoDB
    await putTasteAnalysis(session.user.id, analysis);

    revalidatePath("/dashboard");

    return { analysis };
  } catch (error) {
    console.error("Taste analysis generation error:", error);
    return {
      analysis: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
