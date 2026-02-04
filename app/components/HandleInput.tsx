"use client";

import { useEffect, useState } from "react";

interface HandleInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function HandleInput({
  value,
  onChange,
  disabled,
  error: externalError,
}: HandleInputProps) {
  const [validationError, setValidationError] = useState<string>("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Debounced availability check
  useEffect(() => {
    // Clear previous state when value changes
    setIsAvailable(null);
    setValidationError("");

    if (!value) {
      return;
    }

    // Local validation first
    const normalized = value.toLowerCase();

    if (normalized.length < 3) {
      setValidationError("Handle must be at least 3 characters");
      return;
    }
    if (normalized.length > 30) {
      setValidationError("Handle must be 30 characters or less");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(normalized)) {
      setValidationError(
        "Only lowercase letters, numbers, and hyphens allowed"
      );
      return;
    }
    if (normalized.startsWith("-") || normalized.endsWith("-")) {
      setValidationError("Cannot start or end with hyphen");
      return;
    }
    if (normalized.includes("--")) {
      setValidationError("Cannot contain consecutive hyphens");
      return;
    }

    // Debounce availability check
    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const response = await fetch(
          `/api/profile/handle/check?handle=${encodeURIComponent(normalized)}`
        );
        const data = await response.json();
        setIsAvailable(data.available);
      } catch (error) {
        console.error("Error checking handle availability:", error);
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  const displayError = externalError || validationError;
  const showSuccess =
    !displayError && value.length >= 3 && isAvailable === true;

  return (
    <div className="space-y-2">
      <label
        htmlFor="handle"
        className="block text-sm font-medium text-gray-700"
      >
        Handle
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">anchor.band/</span>
        </div>
        <input
          type="text"
          id="handle"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`
            block w-full pl-32 pr-10 py-2 sm:text-sm border rounded-md
            focus:outline-none focus:ring-2 focus:ring-offset-0
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${
              displayError
                ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                : showSuccess
                ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            }
          `}
          placeholder="your-handle"
          aria-describedby={displayError ? "handle-error" : undefined}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {isChecking && (
            <svg
              className="animate-spin h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}
          {!isChecking && showSuccess && (
            <svg
              className="h-5 w-5 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {!isChecking && isAvailable === false && (
            <svg
              className="h-5 w-5 text-red-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      {displayError && (
        <p className="text-sm text-red-600" id="handle-error">
          {displayError}
        </p>
      )}
      {showSuccess && (
        <p className="text-sm text-green-600">Handle is available</p>
      )}
      {!displayError && isAvailable === false && (
        <p className="text-sm text-red-600">Handle is already taken</p>
      )}
    </div>
  );
}
