"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { getBio, putBio, getCaption, putCaption } from "@/lib/dynamodb/content";
import type { Bio, Caption } from "@/types/content";

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface UpdateBioResult {
  bio: Bio | null;
  error?: string;
}

export interface UpdateCaptionResult {
  caption: Caption | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Saves a manually-edited bio for the authenticated user.
 *
 * Preserves the original generatedAt timestamp so the system can later
 * distinguish AI-authored text from user edits.  Sets editedAt to now.
 *
 * If no bio exists yet (user typed before any AI generation) we treat
 * generatedAt as "now" — functionally equivalent to a user-created bio.
 */
export async function updateBio(newText: string): Promise<UpdateBioResult> {
  try {
    // --- validation --------------------------------------------------------
    if (!newText || newText.trim().length === 0) {
      return { bio: null, error: "Bio text cannot be empty" };
    }
    if (newText.trim().length > 500) {
      return { bio: null, error: "Bio must be 500 characters or fewer" };
    }

    // --- auth --------------------------------------------------------------
    const session = await auth();
    if (!session?.user?.id) {
      return { bio: null, error: "Not authenticated" };
    }

    // --- merge timestamps --------------------------------------------------
    const existing = await getBio(session.user.id);
    const now = Date.now();

    const bio: Bio = {
      text: newText.trim(),
      generatedAt: existing?.generatedAt ?? now,
      editedAt: now,
    };

    // --- persist & revalidate ----------------------------------------------
    await putBio(session.user.id, bio);

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { bio };
  } catch (error) {
    return {
      bio: null,
      error: error instanceof Error ? error.message : "Unknown error updating bio",
    };
  }
}

/**
 * Saves a manually-edited caption for a specific album.
 *
 * Same timestamp-preservation logic as updateBio: generatedAt is kept
 * from the original AI caption (or set to now if none existed).
 */
export async function updateCaption(
  albumId: string,
  newText: string
): Promise<UpdateCaptionResult> {
  try {
    // --- validation --------------------------------------------------------
    if (!albumId || albumId.trim().length === 0) {
      return { caption: null, error: "Album ID is required" };
    }
    if (!newText || newText.trim().length === 0) {
      return { caption: null, error: "Caption text cannot be empty" };
    }
    if (newText.trim().length > 150) {
      return { caption: null, error: "Caption must be 150 characters or fewer" };
    }

    // --- auth --------------------------------------------------------------
    const session = await auth();
    if (!session?.user?.id) {
      return { caption: null, error: "Not authenticated" };
    }

    // --- merge timestamps --------------------------------------------------
    const existing = await getCaption(session.user.id, albumId);
    const now = Date.now();

    const caption: Caption = {
      albumId,
      text: newText.trim(),
      generatedAt: existing?.generatedAt ?? now,
      editedAt: now,
    };

    // --- persist & revalidate ----------------------------------------------
    await putCaption(session.user.id, caption);

    revalidatePath("/dashboard");
    revalidatePath("/profile");

    return { caption };
  } catch (error) {
    return {
      caption: null,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error updating caption",
    };
  }
}
