"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface YearLineProps {
  data: Record<string, number>;
}

export default function YearLine({ data }: YearLineProps) {
  const formatted = Object.entries(data)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([year, count]) => ({ year, count }));

  if (!formatted.length)
    return (
      <div className="text-gray-400 text-sm text-center">
        No year data available
      </div>
    );

  return (
    <div className="bg-gray-900 p-6 rounded-2xl shadow-lg w-full">
      <h3 className="text-white font-semibold mb-4 text-center text-xl">
        📆 Tracks by Year
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={formatted}
          margin={{ top: 20, right: 40, left: 30, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="year" tick={{ fill: "#ccc", fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: "#ccc", fontSize: 12 }}/>
          <Tooltip
            contentStyle={{
              backgroundColor: "#111",
              border: "1px solid #333",
              borderRadius: "6px",
            }}
          />
          <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} dot={{ r: 5, fill: "#22c55e", strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
