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
    <div className="space-y-4">
      {/* Section header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Musical Eras</h2>
        <p className="text-zinc-400">
          {erasData.timelineMode === "life_era" && erasData.birthYear
            ? "Albums that shaped my journey, with ages"
            : "Albums that shaped my journey, by release date"}
        </p>
      </div>

      {/* Horizontal scrollable timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

        {/* Scrollable container */}
        <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          <div className="flex gap-8 min-w-max px-4">
            {sortedEntries.map((entry, index) => {
              const age = calculateAge(entry.releaseYear);
              const showAge = erasData.timelineMode === "life_era" && age !== null;

              return (
                <div
                  key={entry.entryId}
                  className="flex flex-col items-center relative"
                  style={{ minWidth: "160px" }}
                >
                  {/* Timeline dot */}
                  <div className="absolute top-24 w-3 h-3 bg-blue-500 rounded-full border-2 border-zinc-900 z-10" />

                  {/* Album card */}
                  <div className="mb-6 group">
                    <div className="relative w-40 h-40 rounded-lg overflow-hidden shadow-lg group-hover:shadow-2xl transition-shadow">
                      <Image
                        src={entry.artworkUrl}
                        alt={`${entry.albumName} by ${entry.artistName}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </div>

                  {/* Info below timeline */}
                  <div className="mt-8 text-center space-y-1" style={{ maxWidth: "160px" }}>
                    {/* Prompt label */}
                    <div className="inline-block px-2 py-1 rounded-full bg-zinc-800 text-xs text-zinc-400 font-medium mb-2">
                      {entry.promptLabel}
                    </div>

                    {/* Album name */}
                    <p className="font-semibold text-white text-sm leading-tight line-clamp-2">
                      {entry.albumName}
                    </p>

                    {/* Artist name */}
                    <p className="text-zinc-400 text-xs leading-tight line-clamp-1">
                      {entry.artistName}
                    </p>

                    {/* Year / Age */}
                    <p className="text-zinc-500 text-xs font-medium">
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
        <div className="text-center text-xs text-zinc-500 italic">
          Timeline shows my age when each album was released
        </div>
      )}
    </div>
  );
}
