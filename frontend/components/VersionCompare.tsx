"use client";
import { useEffect, useState } from "react";
import { GitCompare, Loader2 } from "lucide-react";
import { listVersions, compareVersions } from "@/lib/api";

type Version = { id: string; label: string; created_at: number; meta?: any };

export default function VersionCompare({ sid }: { sid: string }) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!sid) return;
    listVersions(sid).then((v) => {
      setVersions(v || []);
      if (v && v.length >= 2) {
        setA(v[v.length - 2].id);
        setB(v[v.length - 1].id);
      }
    }).catch(() => setVersions([]));
  }, [sid]);

  const run = async () => {
    if (!a || !b || a === b) { setErr("Pick two different versions."); return; }
    setBusy(true); setErr(""); setData(null);
    try {
      const r = await compareVersions(sid, a, b);
      setData(r);
    } catch (e: any) {
      setErr(String(e.message || e).slice(0, 200));
    } finally { setBusy(false); }
  };

  if (!sid) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <GitCompare className="text-indigo-400" size={18} />
        <div className="font-semibold">Version Compare</div>
      </div>
      {versions.length < 2 ? (
        <div className="text-xs text-white/50">Build the resume at least twice to compare versions.</div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-end mb-3">
            <VersionSelect label="Version A" value={a} onChange={setA} versions={versions} />
            <VersionSelect label="Version B" value={b} onChange={setB} versions={versions} />
            <button onClick={run} disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm disabled:opacity-40 flex items-center justify-center gap-1 self-start">
              {busy && <Loader2 size={12} className="animate-spin" />} Compare
            </button>
          </div>
          {err && <div className="text-xs text-rose-300 mb-2">{err}</div>}
          {data && (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              <div className="text-[10px] uppercase tracking-widest text-white/50">
                {data.diffs.length} bullet pairs · {data.diffs.filter((d: any) => d.added_metrics).length} gained metrics
              </div>
              {data.diffs.map((d: any, i: number) => (
                <div key={i} className="hairline rounded-lg p-2 text-[12px]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest text-white/50">{d.section}</span>
                    <span className="text-white/70">{d.item}</span>
                    <span className="ml-auto text-[10px] text-white/50">
                      {d.similarity_percent}% match · {d.word_delta > 0 ? "+" : ""}{d.word_delta} words
                      {d.added_metrics && <span className="text-emerald-300 ml-1">+metric</span>}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-rose-500/5 rounded p-1.5 text-rose-200/80">
                      <span className="md:hidden text-[10px] uppercase tracking-widest text-white/40 block mb-0.5">Before</span>
                      {d.original || <em className="text-white/30">—</em>}
                    </div>
                    <div className="bg-emerald-500/5 rounded p-1.5 text-emerald-200/80">
                      <span className="md:hidden text-[10px] uppercase tracking-widest text-white/40 block mb-0.5">After</span>
                      {d.rewritten || <em className="text-white/30">—</em>}
                    </div>
                  </div>
                </div>
              ))}
              {data.diffs.length === 0 && <div className="text-xs text-white/50">No bullet-level changes between these versions.</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function VersionSelect({ label, value, onChange, versions }: {
  label: string; value: string; onChange: (v: string) => void; versions: Version[];
}) {
  return (
    <label className="block w-full sm:w-auto">
      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="hairline rounded-lg p-1.5 bg-black/20 text-sm w-full sm:w-auto max-w-full">
        <option value="">—</option>
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {new Date(v.created_at * 1000).toLocaleString()} · {v.label || v.id}
          </option>
        ))}
      </select>
    </label>
  );
}
