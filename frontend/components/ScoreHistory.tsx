"use client";
import { useEffect, useState } from "react";

interface ScoreEntry {
  score: number;
  sid: string;
  ts: number;
}

const LS_KEY = "ro-score-history";
const MAX_ENTRIES = 10;

function scoreColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTextColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ScoreHistory({
  currentScore,
  sessionId,
}: {
  currentScore: number;
  sessionId: string;
}) {
  const [history, setHistory] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const stored: ScoreEntry[] = raw ? JSON.parse(raw) : [];

      let updated = [...stored];
      if (currentScore > 0 && sessionId) {
        const alreadyExists = updated.some((e) => e.sid === sessionId);
        if (!alreadyExists) {
          updated = [...updated, { score: currentScore, sid: sessionId, ts: Date.now() }];
          // Keep last MAX_ENTRIES
          if (updated.length > MAX_ENTRIES) {
            updated = updated.slice(updated.length - MAX_ENTRIES);
          }
          localStorage.setItem(LS_KEY, JSON.stringify(updated));
        }
      }
      setHistory(updated.slice(-MAX_ENTRIES));
    } catch {
      // localStorage may not be available
    }
  }, [currentScore, sessionId]);

  const best = history.length > 0 ? Math.max(...history.map((e) => e.score)) : 0;
  const latest = history.length > 0 ? history[history.length - 1].score : 0;

  const chartMaxHeight = 80; // px

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-3">Score History</div>

      {history.length < 2 ? (
        <div className="text-white/40 text-sm italic text-center py-6">
          Build more resumes to see your score trend.
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="flex gap-4 mb-4">
            <div className="hairline rounded-lg px-3 py-2 flex-1 text-center">
              <div className="text-xs text-white/40 mb-0.5">Best</div>
              <div className={`text-xl font-bold ${scoreTextColor(best)}`}>{best}</div>
            </div>
            <div className="hairline rounded-lg px-3 py-2 flex-1 text-center">
              <div className="text-xs text-white/40 mb-0.5">Latest</div>
              <div className={`text-xl font-bold ${scoreTextColor(latest)}`}>{latest}</div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-white/30 pr-2 pointer-events-none"
              style={{ width: "28px" }}>
              <span>100</span>
              <span>50</span>
              <span>0</span>
            </div>

            {/* Chart area */}
            <div className="ml-8">
              {/* Grid lines */}
              <div
                className="relative border-b border-white/10"
                style={{ height: `${chartMaxHeight + 4}px` }}
              >
                <div className="absolute w-full border-t border-white/5" style={{ top: 0 }} />
                <div className="absolute w-full border-t border-white/5" style={{ top: `${chartMaxHeight / 2}px` }} />

                {/* Bars */}
                <div className="flex items-end gap-1 h-full pb-1">
                  {history.map((entry, i) => {
                    const barH = Math.max(4, Math.round((entry.score / 100) * chartMaxHeight));
                    return (
                      <div
                        key={i}
                        className="relative flex-1 flex flex-col items-center justify-end group"
                        style={{ height: "100%" }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          <div className="bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                            {entry.score}/100
                          </div>
                        </div>
                        <div
                          className={`w-full rounded-t-sm ${scoreColor(entry.score)} transition-all`}
                          style={{ height: `${barH}px` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* X-axis labels */}
              <div className="flex gap-1 mt-1">
                {history.map((entry, i) => (
                  <div
                    key={i}
                    className="flex-1 text-center text-white/30 overflow-hidden"
                    style={{ fontSize: "9px" }}
                  >
                    {formatDate(entry.ts)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
