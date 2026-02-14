"use client";

import { useMemo } from "react";
import Image from "next/image";
import type { ErasData, EraEntry } from "@/types/eras";

interface ErasTimelineProps {
  erasData: ErasData;
}

export default function ErasTimeline({ erasData }: ErasTimelineProps) {
  const sortedEntries = useMemo(() => {
    const entries = [...erasData.entries];

    switch (erasData.timelineMode) {
      case "release_date":
        // Sort by release year ascending
        return entries.sort((a, b) => a.releaseYear - b.releaseYear);

      case "life_era":
        // Sort by release year but show with age if birthYear provided
        return entries.sort((a, b) => a.releaseYear - b.releaseYear);

      case "custom":
        // Sort by orderIndex
        return entries.sort((a, b) => a.orderIndex - b.orderIndex);

      default:
        return entries;
    }
  }, [erasData]);

  if (sortedEntries.length === 0) {
    return null;
  }

  const calculateAge = (releaseYear: number): number | null => {
    if (!erasData.birthYear) return null;
    const age = releaseYear - erasData.birthYear;
    return age >= 0 ? age : null;
  };

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Musical Eras</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          {erasData.timelineMode === "life_era" && erasData.birthYear
            ? "Albums that shaped my journey, with ages"
            : "Albums that shaped my journey, by release date"}
        </p>
      </div>

      {/* Horizontal scrollable timeline */}
      <div className="relative py-4">
        {/* Scrollable container */}
        <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
          <div className="flex gap-12 min-w-max px-4">
            {sortedEntries.map((entry, index) => {
              const age = calculateAge(entry.releaseYear);
              const showAge = erasData.timelineMode === "life_era" && age !== null;

              return (
                <div
                  key={entry.entryId}
                  className="flex flex-col items-center"
                  style={{ minWidth: "200px" }}
                >
                  {/* Album card - larger and more impactful */}
                  <div className="mb-6 group">
                    <div className="relative w-48 h-48 rounded-xl overflow-hidden shadow-2xl group-hover:shadow-3xl transition-all duration-300 ring-1 ring-neutral-200 dark:ring-neutral-800">
                      <Image
                        src={entry.artworkUrl}
                        alt={`${entry.albumName} by ${entry.artistName}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Info below album */}
                  <div className="text-center space-y-2" style={{ maxWidth: "200px" }}>
                    {/* Prompt label */}
                    <div className="inline-block px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 font-semibold mb-1 uppercase tracking-wider">
                      {entry.promptLabel}
                    </div>

                    {/* Album name */}
                    <p className="font-bold text-neutral-900 dark:text-white text-base leading-tight line-clamp-2">
                      {entry.albumName}
                    </p>

                    {/* Artist name */}
                    <p className="text-neutral-700 dark:text-neutral-300 text-sm leading-tight line-clamp-1 font-medium">
                      {entry.artistName}
                    </p>

                    {/* Year / Age */}
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm font-semibold">
                      {showAge ? `Age ${age} (${entry.releaseYear})` : entry.releaseYear}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend for life_era mode */}
      {erasData.timelineMode === "life_era" && erasData.birthYear && (
        <div className="text-center text-sm text-neutral-500 dark:text-neutral-400 italic">
          Timeline shows my age when each album was released
        </div>
      )}
    </div>
  );
}
