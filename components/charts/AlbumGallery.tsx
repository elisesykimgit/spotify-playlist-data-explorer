"use client";
import Image from "next/image";
import React from "react";
import placeholder from "@/public/emptyalbum.png";

interface AlbumData {
  album: string;
  artist: string;
  year?: number | string;
  image?: string;
  count: number;
}

interface AlbumGalleryProps {
  albums: AlbumData[];
}

export default function AlbumGallery({ albums }: AlbumGalleryProps) {
  const sorted = [...albums].sort((a, b) => b.count - a.count);
  const top10 = sorted.slice(0, Math.min(10, sorted.length));

  const title =
    sorted.length <= 10
      ? `🗄️ Top ${sorted.length} Most Represented Albums`
      : "🗄️ Top 10 Most Represented Albums";

  const left = top10.slice(0, 5);
  const right = top10.slice(5, 10);

  return (
    <div className="bg-gray-900 rounded-2xl p-4 text-white shadow-lg mt-6">
      <h2 className="text-lg font-bold mb-4 text-center whitespace-normal leading-snug">
        {title}
      </h2>

      {top10.length === 0 ? (
        <p className="text-center text-gray-400 text-sm">
          No album data available.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
          <div className="flex flex-col gap-4">
            {left.map((album, index) => (
              <AlbumRow key={album.album} rank={index + 1} data={album} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            {right.map((album, i) => (
              <AlbumRow key={album.album} rank={i + 6} data={album} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AlbumRow({ rank, data }: { rank: number; data: AlbumData }) {
  const blockGlow =
    rank === 1
      ? "shadow-[0_0_15px_4px_rgba(255,215,0,0.35)]"
      : rank === 2
      ? "shadow-[0_0_15px_4px_rgba(192,192,192,0.30)]"
      : rank === 3
      ? "shadow-[0_0_15px_4px_rgba(205,127,50,0.30)]"
      : "";

  const artistName =
    data.artist ??
    (data as any).artists ??
    (data as any).primary_artist ??
    "Unknown Artist";

  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${blockGlow}`}
    >
      {/* Rank */}
      <span className="text-sm font-semibold text-gray-300 w-8 text-right">
        {rank.toString().padStart(2, "0")}
      </span>

      {/* Album Art — SQUARE + SHADOW */}
      <div className="w-12 h-12 overflow-hidden flex-shrink-0 bg-gray-800 shadow-[0_0_10px_2px_rgba(0,0,0,0.8)]">
        <Image
          src={
            !data.image || data.image === "null"
              ? placeholder
              : data.image.startsWith("http")
              ? data.image
              : placeholder
          }
          alt={data.album}
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Text */}
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-xs whitespace-normal break-words truncate">
          {data.album}
        </span>

        <span className="text-[11px] text-gray-400 whitespace-normal break-words">
          {artistName}
        </span>

        {data.year && (
          <span className="text-[11px] text-gray-500 whitespace-normal break-words">
            {data.year}
          </span>
        )}
      </div>
    </div>
  );
}
