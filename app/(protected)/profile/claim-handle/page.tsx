"use client";

import { HandleInput } from "@/app/components/HandleInput";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ClaimHandlePage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!handle || handle.length < 3) {
      setError("Please enter a valid handle");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/profile/handle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ handle }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to claim handle");
        setIsSubmitting(false);
        return;
      }

      // Success - redirect to profile
      router.push("/profile");
    } catch (error) {
      setError("Failed to claim handle. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
          Claim your handle
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a unique handle for your Anchor page
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <HandleInput
              value={handle}
              onChange={setHandle}
              disabled={isSubmitting}
              error={error}
            />

            <button
              type="submit"
              disabled={isSubmitting || handle.length < 3}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Claiming..." : "Claim Handle"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
