"use client";

interface DownloadStatsButtonProps {
  genreCounts: Record<string, number>;
  artistCounts: Record<string, number>;
  yearCounts: Record<string, number>;
  albumCounts: Record<string, number>;
  playlistName: string;
}

export default function DownloadStatsButton({
  genreCounts,
  artistCounts,
  yearCounts,
  albumCounts,
  playlistName,
}: DownloadStatsButtonProps) {
  const handleDownload = (format: "json" | "csv") => {
    const flattenedArtists: Record<string, number> = {};
    const flattenedAlbums: Record<string, number> = {};

    for (const [name, count] of Object.entries(artistCounts)) {
      flattenedArtists[name] = count;
    }

    for (const [name, count] of Object.entries(albumCounts)) {
      flattenedAlbums[name] = count;
    }

    const safeName = playlistName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const filename = `${safeName}_statistics.${format}`;

    const sortEntries = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]);

    let blob: Blob;

    if (format === "json") {
      const data = {
        playlist: playlistName,
        genres: genreCounts,
        artists: flattenedArtists,
        albums: flattenedAlbums,
        years: yearCounts,
        generatedAt: new Date().toISOString(),
      };

      blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
    } else {
      const toCSV = (
        obj: Record<string, number>,
        title: string,
        columnName: string
      ) => {
        const rows = sortEntries(obj)
          .map(([key, value]) => `"${key.replace(/"/g, '""')}",${value}`)
          .join("\n");

        return `${title}\n${columnName},Count\n${rows}\n\n--------------------------------\n\n`;
      };

      const csvContent =
        `Playlist Statistics for: ${playlistName}\n\n` +
        toCSV(genreCounts, "🎧 Genres", "Genre") +
        toCSV(flattenedArtists, "🌟 Artists", "Artist") +
        toCSV(flattenedAlbums, "💿 Albums", "Album") +
        toCSV(yearCounts, "📆 Years", "Year") +
        `Generated At,${new Date().toLocaleString()}\n`;

      blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

   return (
    <div className="flex justify-center gap-3 mt-4">
      <button
        onClick={() => handleDownload("csv")}
        className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105"
      >
        📊 CSV
      </button>
      <button
        onClick={() => handleDownload("json")}
        className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-5 py-2 rounded-lg shadow-lg transition-all transform hover:scale-105"
      >
        📦 JSON
      </button>
    </div>
  );
}
