"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import PlaylistTable from "@/components/PlaylistTable";
import GenrePie from "@/components/charts/GenrePie";
import TopArtistsBar from "@/components/charts/TopArtistsBar";
import AlbumGallery from "@/components/charts/AlbumGallery";
import YearLine from "@/components/charts/YearLine";
import YearDetailsTable from "@/components/charts/YearDetailsTable";
import DownloadStatsButton from "@/components/DownloadStatsButton";
import type { Track } from "@/types/playlist";

export default function Home() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [playlistImage, setPlaylistImage] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCharts, setShowCharts] = useState(false);
  const [tableReady, setTableReady] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);

  // ---- Load & Save Last Playlist ----
  useEffect(() => {
    const savedUrl = localStorage.getItem("playlistUrl");
    if (savedUrl) setPlaylistUrl(savedUrl);
  }, []);

  useEffect(() => {
    if (playlistUrl) localStorage.setItem("playlistUrl", playlistUrl);
  }, [playlistUrl]);

  // ---------- Helpers ----------
  const extractPlaylistId = (url: string) => {
    const regex = /playlist\/([a-zA-Z0-9]+)/;
    const match = regex.exec(url);
    return match ? match[1] : "";
  };

  const fetchTracksByUrl = async () => {
    const id = extractPlaylistId(playlistUrl);
    if (!id) {
      setError("Invalid playlist URL");
      return;
    }

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setError("");
    setLoading(true);
    setTableReady(false); // reset before new load

    try {
      const res = await fetch(`/api/playlist/${id}`, { signal: controller.signal });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setPlaylistName(data.name || "Unknown Playlist");
      setPlaylistImage(data.image || "");
      setPlaylistDescription(data.description || "");  
      setTracks(data.tracks || []);

      // delay triggers smooth animation
      setTimeout(() => setTableReady(true), 60);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      setError(err.message || "Failed to fetch playlist.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- File Export ----------
  const downloadFile = (format: "csv" | "json" | "txt") => {
    if (!tracks.length) return;

    let blob: Blob;
    const filename = `${playlistName || "playlist"}.${format}`;

    if (format === "csv") {
      const header = "Track,Artist,Album,Year,Genre,Lyrics\n";
      const rows = tracks
        .map(
          (t) =>
            `"${t.track.replace(/"/g, '""')}",` +
            `"${t.artistJoined.replace(/"/g, '""')}",` +
            `"${t.album.replace(/"/g, '""')}",` +
            `${t.year},` +
            `"${t.genre.replace(/"/g, '""')}",` +
            (t.lyricsUrl ? `"${t.lyricsUrl}"` : `""`)
        )
        .join("\n");

      blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    } else if (format === "json") {
        const full = {
          name: playlistName,
          image: playlistImage,
          description: playlistDescription,
          tracks,
        };
      
        blob = new Blob([JSON.stringify(full, null, 2)], {
          type: "application/json",
        });
    } else {
      const content = tracks
        .map(
          (t, i) =>
            `${i + 1}. ${t.track} - ${t.artistJoined} (${t.year})` +
            (t.lyricsUrl ? `\n   Lyrics: ${t.lyricsUrl}` : "")
        )
        .join("\n\n");

      blob = new Blob([content], { type: "text/plain" });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- Stats aggregation ----------
  const { genreCounts, artistCounts, yearCounts, albumCounts } = useMemo(() => {
    const g: Record<string, number> = {};
    const a: Record<string, { name: string; count: number; image?: string }> = {};
    const y: Record<string, number> = {};
    const albums: Record<
      string,
      {
        album: string;
        albumId: string;
        count: number;
        year?: string;
        image?: string;
        artists: Set<string>;
      }
    > = {};
  
    for (const t of tracks) {
      // --- Genres ---
      const genres = t.genre
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
  
      genres.forEach((gen) => (g[gen] = (g[gen] || 0) + 1));
  
    // --- Artists (NAME-based keys for charts) ---
    if (t.artists && t.artists.length > 0) {
      t.artists.forEach((name, index) => {
        const id = t.artistIds?.[index];
        const img = id ? t.artistImages?.[id] : undefined;

        if (!a[name]) {
          a[name] = {
            name,
            count: 0,
            image: typeof img === "string" ? img : undefined,
          };
        }

        if (!a[name].image && typeof img === "string") {
          a[name].image = img;
        }

        a[name].count++;
      });
    }

  
      // --- Years ---
      if (t.year && t.year !== "Unknown") {
        y[t.year] = (y[t.year] || 0) + 1;
      }
  
      // --- Albums ---
      if (t.albumId) {
        const key = t.albumId;
  
        if (!albums[key]) {
          albums[key] = {
            album: t.album,
            albumId: t.albumId,
            count: 0,
            year: t.year && t.year !== "Unknown" ? t.year : undefined,
            image: t.albumImage ?? undefined,
            artists: new Set<string>(),
          };
        }
  
        const album = albums[key];
        album.count++;
  
        if (!album.year && t.year && t.year !== "Unknown") {
          album.year = t.year;
        }
  
        if (!album.image && t.albumImage) {
          album.image = t.albumImage;
        }
  
        t.artists.forEach((art) => album.artists.add(art));
      }
    }
  
    return { genreCounts: g, artistCounts: a, yearCounts: y, albumCounts: albums };
  }, [tracks]);
  
  // Flattened counts
  const flattenedArtistCounts = useMemo(() => {
      const result: Record<string, number> = {};

      for (const [id, data] of Object.entries(artistCounts)) {
        const label = `${data.name} (id: ${id})`;
        result[label] = data.count;
      }

      return result;
    }, [artistCounts]);

  
  const flattenedAlbumCounts = useMemo(() => {
    const result: Record<string, number> = {};
  
    for (const [albumId, data] of Object.entries(albumCounts)) {
      const label = `${data.album || "Unknown Album"} (id: ${albumId})`;
  
      result[label] = data.count;
    }
  
    return result;
  }, [albumCounts]);
    
  // Average year
  const averageYear =
    Object.keys(yearCounts).length > 0
      ? Math.round(
          Object.entries(yearCounts).reduce(
            (acc, [y, c]) => acc + Number(y) * c,
            0
          ) / Object.values(yearCounts).reduce((a, b) => a + b, 0)
        )
      : "Unknown";

  // ---------- UI ----------
  return (
    <main
      className="flex flex-col items-center w-full min-h-screen p-6 text-center bg-cover bg-center"
      style={{
        backgroundImage: playlistImage
          ? `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.85)), url(${playlistImage})`
          : "none",
        backgroundSize: "cover",
        backgroundColor: "#111",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="backdrop-blur-md bg-black/45 p-6 rounded-2xl shadow-xl w-full max-w-5xl border border-white/10">
        <h1 className="text-3xl font-bold mb-4 text-white">
          Spotify Playlist Data Explorer 🎧
        </h1>

        <p className="mb-4 text-gray-400">
          Paste a Spotify playlist URL below 💚
          <br />
          <span className="text-gray-500 text-sm">
            ⚠️ Public playlists only — official/private playlists are blocked
            by the Spotify API.
          </span>
        </p>

        <div className="flex justify-center gap-2 mb-4">
          <input
            type="text"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") fetchTracksByUrl();
            }}
            placeholder="https://open.spotify.com/playlist/..."
            className="border border-gray-600 rounded-lg p-2 w-80 bg-gray-900 text-gray-100"
          />

          <button
            onClick={fetchTracksByUrl}
            disabled={!playlistUrl || loading}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg"
          >
            {loading ? "Loading…" : "Fetch Playlist"}
          </button>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        {playlistName && (
          <div className="flex flex-col items-center mb-4">
            {playlistImage && (
              <img
                src={playlistImage}
                alt="Playlist cover"
                className="w-40 h-40 rounded-lg shadow-md mb-2"
              />
            )}
            <h2 className="text-2xl font-semibold text-white">{playlistName}</h2>
          </div>
        )}

        {/* TRACKS + TABLE */}
        {tracks.length > 0 && (
          <>
            <p className="mt-2 text-green-400 mb-4 animate-pulse">
              ✅ {tracks.length} tracks fetched successfully!
            </p>

            {/* Export */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => downloadFile("csv")}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
              >
                📊 CSV
              </button>

              <button
                onClick={() => downloadFile("json")}
                className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
              >
                📦 JSON
              </button>

              <button
                onClick={() => downloadFile("txt")}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-lg transition-all transform hover:scale-105"
              >
                📄 TXT
              </button>
            </div>

            {/* Playlist Table with fade + slide-down */}
            <div
              className={`
                transition-all duration-300 ease-out
                ${tableReady ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
              `}
            >
              <PlaylistTable tracks={tracks} />
            </div>

            {/* Summary + Charts */}
            <div className="mt-10 text-center text-gray-300 border-t border-gray-700 pt-6">
              <h3 className="text-xl font-semibold mb-2">Playlist Summary</h3>

              <p className="text-gray-400 mb-4">
                {tracks.length} tracks • {Object.keys(artistCounts).length}{" "}
                artists • {Object.keys(albumCounts).length} albums •{" "}
                {Object.keys(genreCounts).length} genres • Avg. year:{" "}
                {averageYear}
              </p>

              <div className="flex justify-center gap-4 mb-6">
                <DownloadStatsButton
                  playlistName={playlistName}
                  genreCounts={genreCounts}
                  artistCounts={flattenedArtistCounts}
                  albumCounts={flattenedAlbumCounts}
                  yearCounts={yearCounts}
                />

                <button
                  onClick={() => {
                    setShowCharts((prev) => {
                      const next = !prev;
                
                      // ⬇️ If expanding, auto-scroll smoothly
                      if (!prev && next) {
                          // OPENING — scroll down a bit
                          setTimeout(() => {
                            window.scrollTo({
                              top: window.scrollY + 400,
                              behavior: "smooth",
                            });
                          }, 150);
                        } else if (prev && !next) {
                          // CLOSING — scroll up slowly
                          setTimeout(() => {
                            window.scrollTo({
                              top: window.scrollY - 100, // smaller move upward
                              behavior: "smooth",
                            });
                          }, 300); // a little later & slower feel
                        }
                      return next;
                    });
                  }}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold shadow-md transition"
                >
                  {showCharts ? "Hide Visualizations 🔽" : "Show Visualizations 📊"}
                </button>
              </div>

              {/* Smooth expand/collapse wrapper */}
              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-out
                  ${showCharts ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"}
                `}
              >
                {/* Inner wrapper fades + slides */}
                <div
                  className={`
                    transition-all duration-300
                    ${showCharts ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}
                  `}
                >
                  <div className="flex flex-col items-center gap-12 mb-12 text-white">
                    <div className="w-full max-w-4xl">
                      <GenrePie data={genreCounts} />
                    </div>

                    <div className="w-full max-w-5xl">
                      <TopArtistsBar data={artistCounts} />
                    </div>

                    <div className="w-full max-w-6xl">
                      <AlbumGallery
                        albums={Object.values(albumCounts).map(data => ({
                          album: data.album,
                          artist: Array.from(data.artists).join(", "),
                          year: data.year,
                          image: data.image,
                          count: data.count,
                          })
                        )}
                      />
                    </div>

                    <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-start">
                      <YearLine data={yearCounts} />
                      <YearDetailsTable tracks={tracks} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {loading && (
          <div className="flex flex-col items-center mt-4 text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-500 mb-4"></div>
            <p className="text-green-500">
              Large playlists may take longer to load...
            </p>
          </div>
        )}
      </div>

      <footer className="text-gray-500 text-sm mt-6 text-center flex items-center justify-center gap-2">
        <a
          href="https://github.com/elisesykimgit/spotify-playlist-data-explorer"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          {/* GitHub logo */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="opacity-80"
          >
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.95.6.1.8-.25.8-.55v-2c-3.2.7-3.9-1.55-3.9-1.55-.55-1.4-1.3-1.75-1.3-1.75-1.1-.75.1-.75.1-.75 1.2.1 1.85 1.25 1.85 1.25 1.05 1.9 2.75 1.35 3.45 1.05.1-.8.4-1.35.75-1.65-2.55-.3-5.25-1.3-5.25-5.75 0-1.3.45-2.35 1.25-3.15-.15-.3-.55-1.55.1-3.2 0 0 1-.3 3.3 1.2a11 11 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.65 1.65.25 2.9.1 3.2.8.8 1.25 1.85 1.25 3.15 0 4.45-2.7 5.45-5.3 5.75.45.4.85 1.15.85 2.35v3.5c0 .3.2.65.8.55A10.98 10.98 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/>
          </svg>
      
          Built by<span className="underline">elisesykimgit</span>
        </a>
      </footer>
    </main>
  );
}
