"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useEffect, useMemo, useState } from "react";

// TYPES
type GenrePoint = {
  name: string;
  value: number;
  _otherGenres?: { name: string; value: number }[];
};

// TOOLTIP
function CustomTooltip(props: any) {
  const { active, payload } = props || {};
  if (!active || !payload?.length) return null;

  const raw = payload[0]?.payload;
  if (!raw) return null;

  const item: GenrePoint = {
    name: raw.name,
    value: raw.value,
    _otherGenres: raw._otherGenres,
  };

  return (
    <div
      className="pointer-events-auto rounded-md text-white text-xs shadow-xl p-2"
      style={{
        background: "rgba(0,0,0,0.72)",
        border: "1px solid rgba(255,255,255,0.18)",
        backdropFilter: "blur(4px)",
        maxWidth: 240,
      }}
    >
      {!item._otherGenres ? (
        <>
          <div className="font-semibold">{item.name}</div>
          <div>{item.value} tracks</div>
        </>
      ) : (
        <>
          <div className="font-semibold mb-2">
            Other — Top {Math.min(10, item._otherGenres.length)}
          </div>

          {item._otherGenres
            .slice()
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map((g, i) => (
              <div key={i} className="flex justify-between mb-1">
                <span>{g.name}</span>
                <span className="text-gray-300">{g.value}</span>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

// MAIN COMPONENT
export default function GenrePie({ data }: { data: Record<string, number> }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // MEMOIZED DATA TRANSFORM
  const { finalData, total } = useMemo(() => {
    let entries: GenrePoint[] = Object.entries(data).map(([name, value]) => ({
      name,
      value,
    }));

    entries.sort((a, b) => b.value - a.value);

    const TOP_N = 20;
    let processed = entries;

    if (entries.length > TOP_N) {
      const top = entries.slice(0, TOP_N);
      const rest = entries.slice(TOP_N);
      const sum = rest.reduce((s, r) => s + r.value, 0);

      if (sum >= 5) {
        processed = [
          ...top,
          {
            name: "Other",
            value: sum,
            _otherGenres: rest,
          },
        ];
      }
    }

    const totalCount = processed.reduce((s, d) => s + d.value, 0);

    return { finalData: processed, total: totalCount };
  }, [data]);

  if (!finalData.length) {
    return (
      <div className="text-gray-400 text-sm text-center">
        No genre data available
      </div>
    );
  }

  // VISUAL CONSTANTS (NO COLOR CHANGES)
  const COLORS = [
    "#1DB954",
    "#1ED760",
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#10B981",
    "#14B8A6",
    "#F43F5E",
    "#6366F1",
  ];

  const OUTER_RADIUS = isMobile ? 85 : 105;
  const LABEL_FONT = isMobile ? 11 : 15;
  const LABEL_OFFSET = 24;

  return (
    <div className="bg-gray-900 p-4 rounded-2xl shadow-lg w-full flex flex-col md:flex-row">
      {/* LEFT SIDE */}
      <div className="flex-1">
        <h3 className="text-white font-semibold mb-3 text-center text-lg">
          🎶 Genre Distribution
        </h3>

        <ResponsiveContainer width="100%" height={isMobile ? 320 : 420}>
          <PieChart>
            <Pie
              data={finalData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={OUTER_RADIUS}
              innerRadius={0}
              isAnimationActive={false}   
              label={(props: any) => {
                const { name, value, cx, cy, midAngle, outerRadius, fill } = props;

                if (isMobile) return null;

                const percent = value / total;
                if (percent < 0.035) return null;

                const RAD = Math.PI / 180;

                // Label distance
                const r =
                  outerRadius + LABEL_OFFSET + 8;

                const x = cx + r * Math.cos(-midAngle * RAD);
                const y = cy + r * Math.sin(-midAngle * RAD);

                return (
                  <text
                    x={x}
                    y={y}
                    fill={fill}
                    fontSize={LABEL_FONT}
                    textAnchor={x > cx ? "start" : "end"}
                    dominantBaseline="central"
                  >
                    {name} ({Math.round(percent * 100)}%)
                  </text>
                );
              }}
              labelLine={(props: any) => {
                const { points, stroke } = props;

                // Stick extension 
                const EXT = 0.2; // 20%, clean and proportional
                const x = points[1].x + (points[1].x - points[0].x) * EXT;
                const y = points[1].y + (points[1].y - points[0].y) * EXT;

                return (
                  <path
                    d={`M${points[0].x},${points[0].y}
                        L${points[1].x},${points[1].y}
                        L${x},${y}`}
                    stroke={stroke}
                    strokeWidth={1.4}
                    fill="none"
                  />
                );
              }}
            >
              {finalData.map((entry, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>

            <Tooltip content={<CustomTooltip />} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* RIGHT LEGEND */}
      <div
        className="text-white text-xs w-full md:w-auto md:ml-4 mt-4 md:mt-0"
        style={{ maxHeight: 520, overflowY: "auto", paddingRight: 12 }}
      >
        <div className="font-semibold mb-2">Genres (Counts)</div>

        {finalData.map((d, i) => (
          <div key={i} className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              <span>{d.name}</span>
            </div>
            <span className="text-gray-300">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
