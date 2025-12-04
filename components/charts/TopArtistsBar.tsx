"use client";

import placeholder from "@/public/emptyartist.png";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  Cell,
} from "recharts";
import { useEffect, useState } from "react";

interface TopArtistsBarProps {
  data: Record<string, { count: number; image?: any }>;
}

function getSmartTicks(max: number): number[] {
  if (max <= 5) return Array.from({ length: max + 1 }, (_, i) => i);
  if (max <= 15) return Array.from({ length: Math.floor(max / 2) + 1 }, (_, i) => i * 2);
  const rounded = Math.ceil(max / 5) * 5;
  return Array.from({ length: rounded / 5 + 1 }, (_, i) => i * 5);
}

function renderArtistImageRight(isMobile: boolean) {
  return (props: any) => {
    try { 
      const { x, y, width, height, value: img } = props;
      if (!img || typeof img !== "string") return null;
  
      const size = isMobile ? 24 : 32;
      const offset = isMobile ? 6 : 10;
      const finalX = x + width + offset;
      const finalY = y + height / 2 - size / 2;
  
      return (
        <foreignObject
          x={finalX}
          y={finalY}
          width={size}
          height={size}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <img
            src={img}
            style={{
              width: size,
              height: size,
              borderRadius: "50%",
              objectFit: "cover",
              pointerEvents: "none",
              boxShadow: "0 0 6px 2px rgba(30,215,96,0.45), 0 0 10px 4px rgba(30,215,96,0.22)",
            }}
          />
        </foreignObject>
      );
    } catch {
      return null;
    }
  };
}
export default function TopArtistsBar({ data }: TopArtistsBarProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const formatted = Object.entries(data)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([artist, info]) => {
      const validImage =
        info.image &&
        typeof info.image === "string" &&
        info.image.trim() !== "" &&
        info.image !== "null"

      return {
        artist,
        count: info.count,
        image: validImage ? info.image : placeholder.src,
      };
    });

  if (!formatted.length) {
    return (
      <div className="text-gray-400 text-sm text-center">
        No artist data available
      </div>
    );
  }
  
  const topArtists = formatted.slice(0, 25);
  const title = formatted.length <= 25 ? `Top ${formatted.length} Artists` : "Top 25 Artists";
  const maxCount = Math.max(...topArtists.map(a => a.count));
  const ticks = getSmartTicks(maxCount);

  
  // MOBILE-FRIENDLY 
  const rowHeight = isMobile ? 38 : 34;
  const MIN_HEIGHT = isMobile ? 260 : 310;
  const AUTO_HEIGHT = topArtists.length * rowHeight * (isMobile ? 0.8 : 1);
  const contentHeight = Math.max(AUTO_HEIGHT, MIN_HEIGHT);
  const containerMaxHeight = isMobile ? 540 : 900;
  const barSize = isMobile ? 18 : 22;

  return (
    <div className="bg-gray-900 p-4 rounded-xl shadow-md">
      <h3 className="text-white font-semibold mb-3 text-center">🌟 {title}</h3>

      <div
        style={{
          width: "100%",
          maxHeight: containerMaxHeight,
          overflowY: contentHeight > containerMaxHeight ? "auto" : "visible",
          paddingRight: 6,
        }}
      >
        <ResponsiveContainer width="100%" height={contentHeight}>
          <BarChart
            data={topArtists}
            layout="vertical"
            margin={{
              left: isMobile ? 45 : 95,
              right: isMobile ? 50 : 100,
              top: 22,
              bottom: 10,
            }}
            barCategoryGap={isMobile ? 12 : 10}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              type="number"
              ticks={ticks}
              domain={[0, ticks[ticks.length - 1]]}
              stroke="#ccc"
              tick={{ fill: "#ccc", fontSize: isMobile ? 9 : 12 }}
            />
            <YAxis
              dataKey="artist"
              type="category"
              stroke="#ccc"
              width={isMobile ? 85 : 150}
              tick={{ fill: "#fff", fontSize: isMobile ? 10 : 12 }}
              interval={0}
            />

            <Tooltip
              contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: 6 }}
              labelStyle={{ color: "#fff" }}
              itemStyle={{ color: "#1DB954" }}
              formatter={(_value, _name, props) => {
                const count = props?.payload?.count ?? 0;
                return [`${count} ${count === 1 ? "track" : "tracks"}`];
              }}
            />

            <Bar dataKey="count" barSize={barSize} isAnimationActive={false} fill="#1DB954">
              {topArtists.map((entry, index) => (
                <Cell key={index} fill="#1DB954" />
              ))}
              <LabelList dataKey="image" content={renderArtistImageRight(isMobile)} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
