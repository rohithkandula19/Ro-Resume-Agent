"use client";
import { motion } from "framer-motion";

type Fixation = { zone: string; dwell_ms: number; takeaway: string; sentiment: string };

export default function ScanSimulator({ data }: { data: any }) {
  if (!data) return null;
  const fixations: Fixation[] = data.fixations || [];
  const sentColor = (s: string) =>
    s === "positive" ? "#10b981" : s === "negative" ? "#ef4444" : "#f59e0b";

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="text-lg font-semibold">6-Second Recruiter Scan</div>
          <div className="text-xs text-white/50">Simulated F-pattern eye path</div>
        </div>
        <div className={`text-xs px-2 py-1 rounded-full border ${
          data.decision === "advance" ? "border-emerald-400 text-emerald-300" :
          data.decision === "maybe"   ? "border-amber-400 text-amber-300" :
                                         "border-red-400 text-red-300"
        }`}>
          {data.decision || "–"}
        </div>
      </div>

      {data.first_impression && (
        <div className="text-sm text-white/70 mb-4 italic">"{data.first_impression}"</div>
      )}

      <div className="space-y-2">
        {fixations.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="hairline rounded-lg p-2.5 flex items-center gap-3"
          >
            <div className="text-xs font-mono text-white/50 w-16">{f.dwell_ms}ms</div>
            <div className="w-2 h-2 rounded-full" style={{ background: sentColor(f.sentiment) }} />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-white/40">{f.zone}</div>
              <div className="text-sm">{f.takeaway}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {data.recommendations?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Recommendations</div>
          <ul className="text-sm text-white/80 space-y-1">
            {data.recommendations.map((r: string, i: number) => <li key={i}>• {r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
