"use client";

import { useState } from "react";
import { updateCaption } from "@/app/actions/content-edit";
import { regenerateCaption } from "@/app/actions/ai-content";
import type { Album } from "@/types/music";
import type { Caption } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AlbumCaptionsProps {
  albums: Album[];
  captions: Caption[];
  onCaptionUpdate: (caption: Caption) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Picks the image closest to 300 px width from a Spotify image array.
 * Falls back to the first available, then null.
 */
function pickImage(images: { url: string; width: number }[]): string | null {
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort(
    (a, b) => Math.abs(a.width - 300) - Math.abs(b.width - 300)
  );
  return sorted[0].url;
}

// ---------------------------------------------------------------------------
// Per-album card component (keeps per-card state isolated)
// ---------------------------------------------------------------------------

interface AlbumCardProps {
  album: Album;
  caption: Caption | undefined;
  onCaptionUpdate: (caption: Caption) => void;
  disabled?: boolean;
}

function AlbumCard({ album, caption, onCaptionUpdate, disabled }: AlbumCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(caption?.text ?? "");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imgUrl = pickImage(album.images);
  const currentText = caption?.text ?? "";

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleEditClick = () => {
    setEditText(currentText);
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await updateCaption(album.id, editText);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.caption) {
        onCaptionUpdate(result.caption);
        setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setError(null);
    try {
      const result = await regenerateCaption(album.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.caption) {
        onCaptionUpdate(result.caption);
        if (isEditing) setEditText(result.caption.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setIsRegenerating(false);
    }
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white hover:shadow-sm transition-shadow">
      {/* Album artwork */}
      <div className="aspect-square w-full">
        {imgUrl ? (
          <img src={imgUrl} alt={album.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-3xl font-medium">
              {album.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-3 space-y-2">
        {/* Album info */}
        <div>
          <p className="text-sm font-medium text-gray-900 truncate">{album.name}</p>
          <p className="text-xs text-gray-500 truncate">
            {album.artists.map((a) => a.name).join(", ")}
          </p>
        </div>

        {/* Caption display or edit */}
        {isEditing ? (
          <div className="space-y-2">
            <div>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={150}
                disabled={isSaving}
                className="block w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 resize-none"
              />
              <p className="text-xs text-gray-400 text-right">
                {editText.length}/150
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !editText.trim()}
                className="px-2 py-1 border border-transparent rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={"text-xs " + (caption ? "text-gray-700" : "text-gray-400 italic")}>
              {caption ? caption.text : "No caption"}
            </p>

            {/* Edit / Regenerate buttons — always visible (clean minimal aesthetic) */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleEditClick}
                disabled={disabled || isRegenerating}
                className="px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={disabled || isRegenerating}
                title="Generate a new caption for this album using AI"
                className="inline-flex items-center gap-1 px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRegenerating ? (
                  <>
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    ...
                  </>
                ) : (
                  "Regenerate"
                )}
              </button>
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function AlbumCaptions({ albums, captions, onCaptionUpdate, disabled }: AlbumCaptionsProps) {
  if (albums.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">No albums available yet.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {albums.map((album) => {
        const caption = captions.find((c) => c.albumId === album.id);
        return (
          <AlbumCard
            key={album.id}
            album={album}
            caption={caption}
            onCaptionUpdate={onCaptionUpdate}
            disabled={disabled}
          />
        );
      })}
    </div>
  );
}
