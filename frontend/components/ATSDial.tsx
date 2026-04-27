"use client";
import { motion } from "framer-motion";

export default function ATSDial({ score = 0, label = "ATS Match" }: { score?: number; label?: string }) {
  const s = Math.max(0, Math.min(100, score));
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const dash = (s / 100) * circ;

  const color = s >= 85 ? "#10b981" : s >= 65 ? "#6366f1" : s >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="glass rounded-2xl p-5 flex items-center gap-5 glow">
      <svg width="170" height="170" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" />
        <motion.circle
          cx="90" cy="90" r={radius}
          stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - dash }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform="rotate(-90 90 90)"
        />
        <text x="90" y="95" textAnchor="middle" fontSize="34" fontWeight="700" fill="white">
          {s}
        </text>
        <text x="90" y="118" textAnchor="middle" fontSize="11" fill="#9ca3af">/ 100</text>
      </svg>
      <div>
        <div className="text-xs uppercase tracking-widest text-white/50">{label}</div>
        <div className="text-lg font-semibold mt-1">
          {s >= 85 ? "Ready to send" : s >= 65 ? "Almost there" : s >= 45 ? "Needs work" : "Major rewrite needed"}
        </div>
      </div>
    </div>
  );
}
