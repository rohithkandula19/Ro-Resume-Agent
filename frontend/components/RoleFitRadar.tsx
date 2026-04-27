"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

type Axis = { name: string; score: number; evidence?: string; gap?: string };

export default function RoleFitRadar({ axes = [], role = "" }: { axes?: Axis[]; role?: string }) {
  const data = axes.map((a) => ({ subject: a.name, A: a.score, full: 10 }));
  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">Role-Fit Radar</div>
          <div className="text-lg font-semibold">{role || "Target role"}</div>
        </div>
        <div className="text-xs text-white/40">0-10 per axis</div>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <RadarChart data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: "#d1d5db", fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "#6b7280", fontSize: 10 }} />
          <Radar name="You" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
          <Legend wrapperStyle={{ color: "#9ca3af" }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
