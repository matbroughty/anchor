"use client";

import { useState } from "react";

interface ProfileFormProps {
  initialDisplayName: string;
  onSave: (displayName: string) => Promise<void>;
}

export function ProfileForm({ initialDisplayName, onSave }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await onSave(displayName);
      setMessage({ type: "success", text: "Profile updated successfully" });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges = displayName !== initialDisplayName;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="displayName"
          className="block text-base font-semibold text-gray-900"
        >
          Display Name
        </label>
        <input
          type="text"
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isLoading}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          maxLength={100}
        />
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !hasChanges || !displayName.trim()}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isLoading ? "Saving..." : "Save Changes"}
      </button>
    </form>
  );
}
