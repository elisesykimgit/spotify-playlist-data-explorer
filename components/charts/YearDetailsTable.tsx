"use client";
import React, { useState } from "react";
import type { Track } from "@/types/playlist";

export default function YearDetailsTable({ tracks }: { tracks: Track[] }) {
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Group tracks by year
  const yearMap: Record<string, Track[]> = {};
  for (const t of tracks) {
    const y = t.year || "Unknown";
    if (!yearMap[y]) yearMap[y] = [];
    yearMap[y].push(t);
  }

  const years = Object.keys(yearMap)
    .filter((y) => y !== "Unknown")
    .sort((a, b) => Number(a) - Number(b));

  return (
    <div className="mt-8 text-left">
      <h4 className="text-xl font-semibold mb-3 text-center">
        🎶 Tracks by Year Details
      </h4>

      <table className="w-full text-sm text-gray-300 border border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-800 text-gray-400">
          <tr>
            <th className="p-3 text-left">Year</th>
            <th className="p-3 text-left">Tracks (click to expand)</th>
            <th className="p-3 text-left">Count</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td colSpan={3} className="p-0">
              <div
                className="
                  max-h-[300px]
                  md:max-h-[650px]
                  overflow-y-auto
                "
              >
                {years.map((year) => (
                  <React.Fragment key={year}>
                    <table className="w-full">
                      <tbody>
                        {/* Year row */}
                        <tr
                          className="border-t border-gray-700 hover:bg-gray-800 cursor-pointer transition"
                          onClick={() =>
                            setExpandedYear(expandedYear === year ? null : year)
                          }
                        >
                          <td className="p-3 font-semibold text-white">
                            {year}
                          </td>
                          <td className="p-3 italic text-gray-400">
                            {expandedYear === year
                              ? "▼ Showing tracks..."
                              : "▶ Click to expand"}
                          </td>
                          <td className="p-3">{yearMap[year].length}</td>
                        </tr>

                        {/* Expanded track list */}
                        {expandedYear === year && (
                          <tr className="bg-gray-900 border-t border-gray-700">
                            <td colSpan={3} className="p-0">
                              <div
                                className="
                                  max-h-[300px]
                                  overflow-y-auto
                                  p-4
                                  text-gray-300
                                "
                              >
                                <ul className="list-disc ml-6 space-y-1">
                                  {yearMap[year].map((t, i) => (
                                    <li key={i}>
                                      <span className="text-white font-medium">
                                        {t.track}
                                      </span>{" "}
                                      <span className="text-gray-400">
                                        by {t.artistJoined}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </React.Fragment>
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
