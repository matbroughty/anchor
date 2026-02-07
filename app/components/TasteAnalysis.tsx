"use client";

import { useState, useTransition } from "react";
import { generateTasteAnalysis } from "@/app/actions/taste-analysis";
import type { TasteAnalysis as TasteAnalysisType } from "@/types/content";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TasteAnalysisProps {
  initialAnalysis: TasteAnalysisType | null;
  hasMusicData: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TasteAnalysis({
  initialAnalysis,
  hasMusicData,
}: TasteAnalysisProps) {
  const [analysis, setAnalysis] = useState<TasteAnalysisType | null>(
    initialAnalysis
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    startTransition(async () => {
      setError(null);
      const result = await generateTasteAnalysis();
      if (result.analysis) {
        setAnalysis(result.analysis);
      } else {
        setError(result.error ?? "Failed to generate analysis");
      }
    });
  };

  // Traffic light color helper
  const lightColor = (light: "green" | "amber" | "red") => {
    switch (light) {
      case "green":
        return "text-green-600 dark:text-green-400";
      case "amber":
        return "text-amber-600 dark:text-amber-400";
      case "red":
        return "text-red-600 dark:text-red-400";
    }
  };

  const lightBg = (light: "green" | "amber" | "red") => {
    switch (light) {
      case "green":
        return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
      case "amber":
        return "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
      case "red":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Music Taste Analysis
        </h2>
        <button
          onClick={handleGenerate}
          disabled={isPending || !hasMusicData}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending
            ? "Analyzing..."
            : analysis
            ? "Regenerate"
            : "Generate Analysis"}
        </button>
      </div>

      {!hasMusicData && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Fetch your Spotify data first to generate a taste analysis.
        </p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {analysis && (
        <div className="space-y-6">
          {/* Overall Rating */}
          <div
            className={`p-4 rounded-lg border ${lightBg(
              analysis.overall.light
            )}`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`text-4xl font-bold ${lightColor(
                  analysis.overall.light
                )}`}
              >
                {analysis.overall.score}
              </div>
              <div className="flex-1">
                <div
                  className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${lightColor(
                    analysis.overall.light
                  )} bg-white dark:bg-neutral-800`}
                >
                  {analysis.overall.light.toUpperCase()}
                </div>
                <p className="text-sm text-neutral-700 dark:text-neutral-300">
                  {analysis.overall.one_liner}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Your Vibe
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {analysis.summary.critic_vibe.map((vibe, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded text-xs"
                >
                  {vibe}
                </span>
              ))}
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {analysis.summary.taste_arc}
            </p>
          </div>

          {/* Insights */}
          {(analysis.insights.green_flags.length > 0 ||
            analysis.insights.amber_flags.length > 0 ||
            analysis.insights.red_flags.length > 0) && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Insights
              </h3>
              <div className="space-y-2">
                {analysis.insights.green_flags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                      Green Flags
                    </h4>
                    <ul className="space-y-1">
                      {analysis.insights.green_flags.map((flag, i) => (
                        <li
                          key={i}
                          className="text-sm text-neutral-600 dark:text-neutral-400"
                        >
                          • {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.insights.amber_flags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                      Amber Flags
                    </h4>
                    <ul className="space-y-1">
                      {analysis.insights.amber_flags.map((flag, i) => (
                        <li
                          key={i}
                          className="text-sm text-neutral-600 dark:text-neutral-400"
                        >
                          • {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.insights.red_flags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                      Red Flags
                    </h4>
                    <ul className="space-y-1">
                      {analysis.insights.red_flags.map((flag, i) => (
                        <li
                          key={i}
                          className="text-sm text-neutral-600 dark:text-neutral-400"
                        >
                          • {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                You Might Like
              </h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, i) => (
                  <div key={i}>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-1">
                      {rec.because}
                    </p>
                    <ul className="space-y-1">
                      {rec.picks.map((pick, j) => (
                        <li
                          key={j}
                          className="text-sm text-neutral-700 dark:text-neutral-300"
                        >
                          • {pick.artist}
                          {pick.title && ` - ${pick.title}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-neutral-400 dark:text-neutral-600">
            Generated {new Date(analysis.generatedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
