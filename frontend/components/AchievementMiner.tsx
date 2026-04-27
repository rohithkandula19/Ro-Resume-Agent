"use client";
import { useState } from "react";
import { achievementMine } from "@/lib/api";

export default function AchievementMiner({ resumeText, role }: { resumeText: string; role: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    if (!resumeText) return;
    setLoading(true); setError("");
    try { setData(await achievementMine(resumeText, role || "")); }
    catch (e: any) { setError(e.message || "Failed"); }
    finally { setLoading(false); }
  };
  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-3">
        <div>
          <div className="text-lg font-semibold">Achievement Miner</div>
          <div className="text-xs text-white/50">Socratic questions to pull stories you forgot</div>
        </div>
        <button onClick={run} disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium disabled:opacity-50">
          {loading ? "…" : "Ask me questions"}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
      {data?.questions && (
        <div className="space-y-2">
          {data.questions.map((q: any, i: number) => (
            <div key={i} className="hairline rounded-lg p-3">
              <div className="text-xs uppercase tracking-widest text-indigo-300/80 mb-1">{q.category}</div>
              <div className="text-sm">{q.question}</div>
              <div className="text-xs text-white/40 italic mt-1">Why: {q.why}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
