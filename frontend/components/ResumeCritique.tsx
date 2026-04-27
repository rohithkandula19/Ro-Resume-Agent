"use client";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { critiqueResume, type ResumeCritique } from "@/lib/api";

const SEV_COLOR: Record<string, string> = {
  high: "text-red-300 border-red-400/40 bg-red-500/5",
  medium: "text-amber-300 border-amber-400/40 bg-amber-500/5",
  low: "text-sky-300 border-sky-400/40 bg-sky-500/5",
};

const SECTION_LABEL: Record<string, string> = {
  summary: "Summary", skills: "Skills", experience: "Experience",
  projects: "Projects", education: "Education", ats: "ATS",
  structure: "Structure",
};

export default function ResumeCritiquePanel({
  resumeText, role, jdText,
}: {
  resumeText: string; role: string; jdText: string;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResumeCritique | null>(null);
  const [err, setErr] = useState("");

  const run = async () => {
    setErr("");
    if (!resumeText.trim()) {
      setErr("Upload or paste your resume first.");
      return;
    }
    setLoading(true);
    try {
      const r = await critiqueResume(resumeText, role, jdText);
      setData(r);
    } catch (e: any) {
      setErr(e.message || "Critique failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={18} />
          <div className="text-lg font-semibold">Resume Critique</div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
        >
          {loading ? <><Loader2 className="animate-spin" size={14} /> Reviewing…</> : "Critique my resume"}
        </button>
      </div>

      <p className="text-[12px] text-white/50 mb-3">
        AI reviews your summary, skills, bullets, structure, and ATS issues. Scoped to your target role if set.
      </p>

      {err && <div className="text-sm text-red-300 mb-2">{err}</div>}

      {data && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-bold tabular-nums">{data.overall_score}</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">/ 100</div>
            {data.verdict && <div className="text-sm text-white/80 ml-2">{data.verdict}</div>}
          </div>

          {data.strengths?.length > 0 && (
            <div className="hairline rounded-xl p-3">
              <div className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1 flex items-center gap-1">
                <CheckCircle2 size={12} /> Strengths
              </div>
              <ul className="text-sm space-y-1">
                {data.strengths.map((s, i) => (
                  <li key={i} className="text-white/80">· {s}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            {data.issues?.map((it, i) => (
              <div key={i} className={`hairline rounded-xl p-3 border ${SEV_COLOR[it.severity] || ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={14} />
                  <div className="text-xs uppercase tracking-widest">
                    {SECTION_LABEL[it.section] || it.section} · {it.severity}
                  </div>
                </div>
                <div className="text-sm text-white/90">{it.issue}</div>
                <div className="text-sm text-white/70 mt-1"><span className="text-white/50">Fix:</span> {it.fix}</div>
                {it.example && (
                  <div className="text-xs text-white/60 italic mt-1 border-l-2 border-white/20 pl-2">
                    e.g. {it.example}
                  </div>
                )}
              </div>
            ))}
            {data.issues?.length === 0 && (
              <div className="text-sm text-white/60">No major issues found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
