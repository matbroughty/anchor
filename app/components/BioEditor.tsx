"use client";

import { useState, useTransition } from "react";
import { updateBio } from "@/app/actions/content-edit";
import type { Bio } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BioEditorProps {
  bio: Bio | null;
  onUpdate: (bio: Bio) => void;
  onRegenerate: () => Promise<Bio>;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BioEditor({ bio, onUpdate, onRegenerate, disabled }: BioEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(bio?.text ?? "");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep editText in sync when bio changes externally (e.g. after regeneration)
  const currentText = bio?.text ?? "";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

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
      const result = await updateBio(editText);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.bio) {
        onUpdate(result.bio);
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
      const newBio = await onRegenerate();
      // If we were in edit mode, update the textarea too
      if (isEditing) {
        setEditText(newBio.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setIsRegenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render — no bio yet (show generate button only)
  // ---------------------------------------------------------------------------
  if (!bio && !isEditing) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-500 italic">No bio generated yet.</p>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={disabled || isRegenerating}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </>
          ) : (
            "Generate Bio"
          )}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — editing mode
  // ---------------------------------------------------------------------------
  if (isEditing) {
    return (
      <div className="space-y-3">
        <div>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={isSaving}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          />
          <p className="mt-1 text-xs text-gray-500 text-right">
            {editText.length}/500 characters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editText.trim()}
            className="px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render — view mode (bio exists)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-800 leading-relaxed">{bio!.text}</p>
        {bio!.editedAt && (
          <span className="flex-shrink-0 text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
            Edited
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleEditClick}
          disabled={disabled}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={disabled || isRegenerating}
          className="inline-flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegenerating ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Regenerating...
            </>
          ) : (
            "Regenerate"
          )}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
