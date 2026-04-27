"use client";
import { useState } from "react";
import { linkedin } from "@/lib/api";

export default function LinkedInPackCard({ resumeText, role }: { resumeText: string; role: string }) {
  const [loading, setLoading] = useState(false);
  const [pack, setPack] = useState<any>(null);
  const [error, setError] = useState("");

  const run = async () => {
    if (!resumeText || !role) return alert("Need resume + target role.");
    setLoading(true); setError("");
    try {
      const r = await linkedin(resumeText, role);
      if (r) setPack(r);
    }
    catch (e: any) { setError(e.message || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-3">
        <div className="text-lg font-semibold">LinkedIn Pack</div>
        <button onClick={run} disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50">
          {loading ? "…" : "Generate"}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm mb-3">{error}</div>}
      {pack && (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Headline</div>
            <div className="hairline rounded-lg p-2">{pack.headline}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/50 mb-1">About</div>
            <pre className="whitespace-pre-wrap hairline rounded-lg p-2 font-sans">{pack.about}</pre>
          </div>
          {pack.featured_skills && (
            <div>
              <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Featured skills</div>
              <div className="flex flex-wrap gap-1">
                {pack.featured_skills.map((s: string, i: number) => (
                  <span key={i} className="text-xs bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
