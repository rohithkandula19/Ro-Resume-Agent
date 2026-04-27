"use client";
import { useState } from "react";
import { salaryBand } from "@/lib/api";

export default function SalaryBand({ resumeText, role, years }: { resumeText: string; role: string; years: number }) {
  const [location, setLocation] = useState("San Francisco, US");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!resumeText) return;
    setLoading(true); setError("");
    try { setData(await salaryBand(role, years, location, resumeText)); }
    catch (e: any) { setError(e.message || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-3">
        <div className="text-lg font-semibold">Salary Band Estimator</div>
        <button onClick={run} disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50">
          {loading ? "…" : "Estimate"}
        </button>
      </div>
      <input value={location} onChange={(e) => setLocation(e.target.value)}
        className="w-full hairline rounded-lg p-2 bg-transparent text-sm mb-3" placeholder="Location" />
      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
      {data && (() => {
        const low  = data.low  ?? data.low_usd;
        const mid  = data.mid  ?? data.mid_usd;
        const high = data.high ?? data.high_usd;
        const cur  = data.currency || "USD";
        const sym  = data.currency_symbol || "$";
        const fmt  = (n: number) => (n == null ? "—" : n.toLocaleString());
        return (
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="text-3xl font-bold">{sym}{fmt(mid)}</div>
            <div className="text-sm text-white/50 mb-1">mid · {cur}</div>
          </div>
          <div className="h-2 hairline rounded-full relative bg-white/5">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-indigo-500 to-pink-500 rounded-full" style={{ width: "100%" }} />
          </div>
          <div className="flex justify-between text-xs text-white/60">
            <span>low {sym}{fmt(low)}</span>
            <span>high {sym}{fmt(high)}</span>
          </div>
          <div className="text-xs text-white/50 italic mt-2">{data.basis}</div>
          {data.caveats?.length > 0 && (
            <ul className="text-xs text-white/40 mt-1">
              {data.caveats.map((c: string, i: number) => <li key={i}>· {c}</li>)}
            </ul>
          )}
        </div>
        );
      })()}
    </div>
  );
}
