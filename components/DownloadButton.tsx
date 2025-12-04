"use client";

interface Track {
  track: string;
  artists: string[];        
  artistJoined: string;    
  album: string;
  year: string;
  genre: string;
  lyricsUrl?: string | null;
}

export default function DownloadButton({ data }: { data: Track[] }) {
  const download = (format: "csv" | "json" | "txt") => {
    let blob: Blob;
    let filename: string;

    if (format === "csv") {
      const header = "Track,Artists,Album,Year,Genre,Lyrics\n";

      const rows = data
        .map((t) =>
          [
            `"${t.track.replace(/"/g, '""')}"`,
            `"${t.artistJoined.replace(/"/g, '""')}"`, 
            `"${t.album.replace(/"/g, '""')}"`,
            t.year,
            `"${t.genre.replace(/"/g, '""')}"`,
            t.lyricsUrl ? `"${t.lyricsUrl}"` : '""',
          ].join(",")
        )
        .join("\n");

      blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
      filename = "spotify_playlist.csv";
    }

    else if (format === "json") {
      blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      filename = "spotify_playlist.json";
    }

    else {
      const content = data
        .map((t, i) =>
          `${i + 1}. ${t.track} - ${t.artistJoined} (${t.year})` +    
          (t.lyricsUrl ? `\n   Lyrics: ${t.lyricsUrl}` : "")
        )
        .join("\n");

      blob = new Blob([content], { type: "text/plain" });
      filename = "spotify_playlist.txt";
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex justify-center gap-4 mt-6">
      <button
        onClick={() => download("csv")}
        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
      >
        <span>📊</span> Download CSV
      </button>

      <button
        onClick={() => download("json")}
        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
      >
        <span>📦</span> Download JSON
      </button>

      <button
        onClick={() => download("txt")}
        className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
      >
        <span>📄</span> Download TXT
      </button>
    </div>
  );
}
