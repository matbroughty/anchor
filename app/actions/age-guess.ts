"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "@/lib/bedrock/client";
import { AGE_GUESS_SYSTEM_PROMPT } from "@/lib/bedrock/prompts";
import { putAgeGuess } from "@/lib/dynamodb/content";
import { getMusicData } from "@/lib/dynamodb/music-data";
import { getFeaturedArtists } from "@/lib/dynamodb/featured-artists";
import type { AgeGuess } from "@/types/content";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface GenerateAgeGuessResult {
  ageGuess: AgeGuess | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildAgeGuessInput(input: {
  favourites: string[];
  recent: string[];
  albums: Array<{ artist: string; title: string }>;
}): string {
  const inputJson = JSON.stringify(input, null, 2);
  return `${inputJson}\n\nBased on this music taste, estimate an age range and generation vibe. Respond with ONLY the JSON object (no markdown, no code fences, no extra text).`;
}

async function callBedrockForAgeGuess(userMessage: string): Promise<AgeGuess> {
  const response = await bedrockClient.send(
    new ConverseCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      system: [{ text: AGE_GUESS_SYSTEM_PROMPT }],
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      inferenceConfig: { maxTokens: 2000, temperature: 0.7 },
    })
  );

  const content = response.output?.message?.content;
  if (!content || content.length === 0 || !("text" in content[0])) {
    throw new Error("Empty response from Bedrock");
  }

  let responseText = (content[0] as { text: string }).text.trim();

  // Strip markdown code fences if present
  responseText = responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "");
  responseText = responseText.trim();

  // Parse JSON response
  try {
    const ageGuess = JSON.parse(responseText) as AgeGuess;
    ageGuess.generatedAt = Date.now();
    return ageGuess;
  } catch (error) {
    console.error(
      "Failed to parse Bedrock JSON response. Raw response:",
      responseText
    );
    console.error("Parse error:", error);
    throw new Error(
      `Invalid JSON response from AI: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Generates a playful age guess based on the authenticated user's music taste.
 * This is an inference, not a demographic fact. Dashboard-only feature.
 */
export async function generateAgeGuess(): Promise<GenerateAgeGuessResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { ageGuess: null, error: "Not authenticated" };
    }

    const [musicData, featuredArtists] = await Promise.all([
      getMusicData(session.user.id),
      getFeaturedArtists(session.user.id),
    ]);

    if (!musicData) {
      return {
        ageGuess: null,
        error: "No music data available. Fetch Spotify data first.",
      };
    }

    // Build the input JSON for the AI
    const input = {
      favourites: featuredArtists.map((a) => a.name),
      recent: musicData.artists.slice(0, 10).map((a) => a.name),
      albums: musicData.albums.slice(0, 6).map((a) => ({
        artist: a.artists.map((ar) => ar.name).join(" & "),
        title: a.name,
      })),
    };

    const userMessage = buildAgeGuessInput(input);
    const ageGuess = await callBedrockForAgeGuess(userMessage);

    // Store in DynamoDB
    await putAgeGuess(session.user.id, ageGuess);

    revalidatePath("/dashboard");

    return { ageGuess };
  } catch (error) {
    console.error("Age guess generation error:", error);
    return {
      ageGuess: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
