"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Swords } from "lucide-react";
import { runBattle } from "@/lib/api";

export default function BattleMode({ profileText, jdText }: { profileText: string; jdText: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!profileText) return alert("Upload or describe your resume first.");
    setLoading(true); setError("");
    try {
      const res = await runBattle(profileText, jdText);
      setData(res);
    } catch (e: any) {
      setError(e.message || "Battle failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Swords className="text-pink-400" size={20} />
          <div className="text-lg font-semibold">Battle Mode</div>
          <span className="text-xs text-white/50">3 variants fight for the top spot</span>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-white font-medium disabled:opacity-50"
        >
          {loading ? "Battling…" : "Run Battle"}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
      {data && (
        <>
          <div className="text-sm text-white/70 mb-3">
            Winner: <span className="font-semibold text-emerald-400">{data.winner}</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(data.variants || {}).map(([k, v]: any, i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-xl p-4 hairline ${k === data.winner ? "ring-2 ring-emerald-400" : ""}`}
              >
                <div className="text-xs uppercase tracking-widest text-white/50">{k}</div>
                <div className="text-3xl font-bold mt-1">{v.score?.overall ?? "–"}</div>
                <div className="text-xs text-white/40 mt-1">ATS {v.score?.ats_match_percent ?? "–"}%</div>
                <div className="mt-3 text-xs text-white/60 space-y-1">
                  {(v.score?.strengths || []).slice(0, 2).map((s: string, j: number) => (
                    <div key={j}>+ {s}</div>
                  ))}
                  {(v.score?.weaknesses || []).slice(0, 1).map((s: string, j: number) => (
                    <div key={j} className="text-amber-300/80">- {s}</div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
