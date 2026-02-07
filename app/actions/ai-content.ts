"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "@/lib/bedrock/client";
import {
  BIO_SYSTEM_PROMPT,
  CAPTION_SYSTEM_PROMPT,
} from "@/lib/bedrock/prompts";
import { putBio, putCaption } from "@/lib/dynamodb/content";
import { getMusicData } from "@/lib/dynamodb/music-data";
import type { Bio, Caption } from "@/types/content";
import type { Artist, Track, Album } from "@/types/music";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface GenerateBioResult {
  bio: Bio | null;
  error?: string;
}

export interface GenerateCaptionsResult {
  captions: Caption[];
  error?: string;
}

export interface RegenerateCaptionResult {
  caption: Caption | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildBioUserMessage(artists: Artist[], tracks: Track[]): string {
  const artistNames = artists.map((a) => a.name).join(", ");
  const trackLines = tracks
    .slice(0, 10)
    .map((t) => `- ${t.name} by ${t.artists.map((a) => a.name).join(" & ")}`)
    .join("\n");

  return `Here are my top artists and tracks. Write a bio about my music taste.\n\nTop artists: ${artistNames}\n\nTop tracks:\n${trackLines}`;
}

function buildCaptionUserMessage(
  album: Album,
  artists: Artist[],
  tracks: Track[]
): string {
  const artistNames = artists.map((a) => a.name).join(", ");
  const albumArtist = album.artists.map((a) => a.name).join(" & ");
  const albumTracks = tracks.filter((t) => t.album.id === album.id);

  let context = `Album: "${album.name}" by ${albumArtist}\nMy overall top artists: ${artistNames}`;
  if (albumTracks.length > 0) {
    context += `\nTracks from this album in my top tracks: ${albumTracks.map((t) => t.name).join(", ")}`;
  }

  return `${context}\n\nWrite a one-sentence caption for this album on my profile.`;
}

async function callBedrock(
  systemPrompt: string,
  userMessage: string,
  temperature: number,
  maxTokens: number = 200
): Promise<string> {
  const response = await bedrockClient.send(
    new ConverseCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      system: [{ text: systemPrompt }],
      messages: [{ role: "user", content: [{ text: userMessage }] }],
      inferenceConfig: { maxTokens, temperature },
    })
  );

  const content = response.output?.message?.content;
  if (!content || content.length === 0 || !("text" in content[0])) {
    throw new Error("Empty response from Bedrock");
  }

  return (content[0] as { text: string }).text.trim();
}

// ---------------------------------------------------------------------------
// Server Actions — public
// ---------------------------------------------------------------------------

/**
 * Generates a bio for the authenticated user from their cached music data.
 * If a bio already exists it is overwritten (same behaviour as regenerate).
 */
export async function generateBio(): Promise<GenerateBioResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { bio: null, error: "Not authenticated" };
    }

    const musicData = await getMusicData(session.user.id);
    if (!musicData) {
      return {
        bio: null,
        error: "No music data available. Fetch Spotify data first.",
      };
    }

    const text = await callBedrock(
      BIO_SYSTEM_PROMPT,
      buildBioUserMessage(musicData.artists, musicData.tracks),
      0.6
    );

    const bio: Bio = { text, generatedAt: Date.now() };
    await putBio(session.user.id, bio);

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { bio };
  } catch (error) {
    return {
      bio: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generates captions for every album in the user's cached music data.
 * Sequential to avoid Bedrock throttling.
 */
export async function generateAlbumCaptions(): Promise<GenerateCaptionsResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { captions: [], error: "Not authenticated" };
    }

    const musicData = await getMusicData(session.user.id);
    if (!musicData) {
      return {
        captions: [],
        error: "No music data available. Fetch Spotify data first.",
      };
    }

    const captions: Caption[] = [];

    // Sequential generation to respect Bedrock rate limits
    for (const album of musicData.albums.slice(0, 6)) {
      const text = await callBedrock(
        CAPTION_SYSTEM_PROMPT,
        buildCaptionUserMessage(album, musicData.artists, musicData.tracks),
        0.5,
        100
      );

      const caption: Caption = {
        albumId: album.id,
        text,
        generatedAt: Date.now(),
      };

      await putCaption(session.user.id, caption);
      captions.push(caption);
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { captions };
  } catch (error) {
    return {
      captions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Regenerates the bio — always overwrites, never checks for existing.
 */
export async function regenerateBio(): Promise<GenerateBioResult> {
  return generateBio();
}

/**
 * Regenerates the caption for a single album.
 */
export async function regenerateCaption(
  albumId: string
): Promise<RegenerateCaptionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { caption: null, error: "Not authenticated" };
    }

    const musicData = await getMusicData(session.user.id);
    if (!musicData) {
      return {
        caption: null,
        error: "No music data available. Fetch Spotify data first.",
      };
    }

    const album = musicData.albums.find((a) => a.id === albumId);
    if (!album) {
      return { caption: null, error: "Album not found in music data" };
    }

    const text = await callBedrock(
      CAPTION_SYSTEM_PROMPT,
      buildCaptionUserMessage(album, musicData.artists, musicData.tracks),
      0.5,
      100
    );

    const caption: Caption = { albumId, text, generatedAt: Date.now() };
    await putCaption(session.user.id, caption);

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { caption };
  } catch (error) {
    return {
      caption: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
