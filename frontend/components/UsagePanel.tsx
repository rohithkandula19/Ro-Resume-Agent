"use client";
import { useEffect, useState } from "react";
import { Gauge, RefreshCw, Loader2 } from "lucide-react";
import { getUsage, type UsageSummary } from "@/lib/api";

function fmtTokens(n: number | undefined) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function fmtCost(n: number | undefined) {
  if (!n) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return "$" + n.toFixed(2);
}

export default function UsagePanel() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setBusy(true); setErr("");
    try { setData(await getUsage()); }
    catch (e: any) { setErr(String(e.message || e).slice(0, 160)); }
    finally { setBusy(false); }
  };

  useEffect(() => { load(); }, []);

  const t = data?.totals || {};

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="text-indigo-400" size={18} />
        <div className="font-semibold">LLM Usage</div>
        <button onClick={load} disabled={busy}
          className="ml-auto text-xs text-white/60 hover:text-white flex items-center gap-1">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Refresh
        </button>
      </div>

      {err && <div className="text-xs text-rose-300 mb-2">{err}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Stat label="Calls" value={String(t.calls || 0)} />
        <Stat label="Prompt tokens" value={fmtTokens(t.prompt)} />
        <Stat label="Output tokens" value={fmtTokens(t.completion)} />
        <Stat label="Total tokens" value={fmtTokens(t.total)} />
        <Stat label="Est. cost" value={fmtCost(t.cost)} />
      </div>

      {data && data.by_endpoint.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">By endpoint</div>
          <div className="text-[12px] space-y-0.5">
            {data.by_endpoint.slice(0, 10).map((r, i) => (
              <div key={i} className="flex gap-2 items-center hairline rounded px-2 py-1">
                <span className="font-mono text-white/70 truncate flex-1 min-w-0">{r.endpoint}</span>
                <span className="text-white/50 w-10 text-right tabular-nums">{r.calls}×</span>
                <span className="text-white/80 w-14 text-right tabular-nums">{fmtTokens(r.tokens)}</span>
                <span className="text-indigo-300 w-14 text-right tabular-nums">{fmtCost(r.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.by_model.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">By model</div>
          <div className="text-[12px] space-y-0.5">
            {data.by_model.map((r, i) => (
              <div key={i} className="flex flex-wrap gap-x-2 gap-y-0.5 items-center hairline rounded px-2 py-1">
                <span className="text-white/50 text-[10px] uppercase tracking-wider w-14 sm:w-20">{r.provider}</span>
                <span className="font-mono text-white/80 truncate flex-1 min-w-[120px]">{r.model}</span>
                <span className="text-white/50 w-10 text-right tabular-nums">{r.calls}×</span>
                <span className="text-white/80 w-14 text-right tabular-nums">{fmtTokens(r.tokens)}</span>
                <span className="text-indigo-300 w-14 text-right tabular-nums">{fmtCost(r.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.recent.length === 0 && (
        <div className="text-xs text-white/50">No LLM calls recorded yet — run a build or prep to populate.</div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="hairline rounded-lg p-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-white/50">{label}</div>
      <div className="font-bold text-sm mt-0.5">{value}</div>
    </div>
  );
}
