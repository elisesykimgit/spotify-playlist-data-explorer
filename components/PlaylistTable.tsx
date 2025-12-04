"use client";

import type { Track } from "@/types/playlist";

export default function PlaylistTable({ tracks }: { tracks: Track[] }) {
  return (
    <div className="w-full max-h-[500px] overflow-y-auto border border-gray-700 rounded-lg mb-8">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-gray-900 text-gray-300">
          <tr>
            <th className="p-3">Track</th>
            <th className="p-3">Artist(s)</th>
            <th className="p-3">Album</th>
            <th className="p-3">Year</th>
            <th className="p-3">Genre(s)</th>
            <th className="p-3">Lyrics</th>
          </tr>
        </thead>

        <tbody className="bg-gray-800 text-gray-100">
          {tracks.map((t, i) => (
            <tr
              key={i}
              className="border-t border-gray-700 hover:bg-gray-700 transition"
            >
              <td className="p-3">{t.track}</td>
              <td className="p-3">{t.artistJoined}</td>
              <td className="p-3">{t.album}</td>
              <td className="p-3">{t.year}</td>
              <td className="p-3">{t.genre}</td>
              <td className="p-3">
                {t.lyricsUrl ? (
                  <a
                    href={t.lyricsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={
                      t.lyricsSource === "genius"
                        ? "text-yellow-400 underline"
                        : "text-blue-400 underline"
                    }
                  >
                    {t.lyricsSource === "genius" ? "Genius" : "Google Search"}
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
