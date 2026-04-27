"use client";
import { useState } from "react";
import { githubImport } from "@/lib/api";

export default function GithubImport({ role }: { role: string }) {
  const [handle, setHandle] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!handle) return;
    setLoading(true);
    try { setData(await githubImport(handle, role)); }
    catch (e: any) { alert("GitHub import failed: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-3">GitHub Auto-Import</div>
      <div className="flex gap-2 mb-3">
        <input className="flex-1 hairline rounded-lg p-2 bg-transparent text-sm"
          placeholder="e.g. torvalds or github.com/torvalds"
          value={handle} onChange={(e) => setHandle(e.target.value)} />
        <button onClick={run} disabled={loading || !handle.trim()}
          className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50">
          {loading ? "..." : "Import"}
        </button>
      </div>
      <div className="text-xs text-white/40 mb-3">
        Enter your real GitHub username. We pull your top public repos and draft resume bullets.
      </div>
      {data?.selected?.length > 0 && (
        <div className="space-y-2 mt-3">
          {data.selected.map((r: any, i: number) => (
            <div key={i} className="hairline rounded-lg p-3">
              <a href={r.url} target="_blank" className="text-sm font-semibold text-indigo-300">{r.name}</a>
              <div className="text-xs text-white/50 mt-1">{(r.tech_stack || []).join(" · ")}</div>
              <ul className="text-sm mt-2 space-y-1">
                {r.bullets?.map((b: string, j: number) => <li key={j}>• {b}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
