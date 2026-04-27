"use client";

import { useState, useEffect } from "react";

type Report = {
  jd_keywords: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  coverage_percent: number;
  bullets_report: { bullet: string; hits: string[]; section: string; item: string }[];
  summary_hits?: string[];
  skills_hits?: string[];
};

export default function XrayOverlay({
  report,
  onApplyKeywords,
  applying,
}: {
  report: Report | null;
  onApplyKeywords?: (keywords: string[]) => void;
  applying?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
  }, [report?.missing_keywords?.join(",")]);

  if (!report) return null;

  const toggle = (k: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(report.missing_keywords.slice(0, 40)));
  const clearAll = () => setSelected(new Set());

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex justify-between items-baseline mb-3">
        <div className="text-lg font-semibold">ATS X-Ray</div>
        <div className="text-xs text-white/50">coverage {report.coverage_percent}%</div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest text-white/50">
            Missing keywords {selected.size > 0 && <span className="text-indigo-300 normal-case tracking-normal ml-2">({selected.size} selected)</span>}
          </div>
          <div className="flex gap-2 text-[10px]">
            <button onClick={selectAll}  className="text-white/50 hover:text-white">select all</button>
            <button onClick={clearAll}   className="text-white/50 hover:text-white">clear</button>
          </div>
        </div>
        <div className="text-[11px] text-white/50 mb-2">
          Tap the ones you actually have, then Apply — I'll rebuild your resume weaving them into bullets and skills.
        </div>
        <div className="flex flex-wrap gap-1.5">
          {report.missing_keywords.slice(0, 40).map((k) => {
            const on = selected.has(k);
            return (
              <button
                key={k}
                onClick={() => toggle(k)}
                className={`text-xs px-2 py-0.5 rounded-full border transition ${
                  on
                    ? "bg-indigo-500/20 border-indigo-400/60 text-indigo-100"
                    : "bg-red-500/10 border-red-400/30 text-red-300 hover:bg-red-500/20"
                }`}
              >
                {on ? "✓ " : "+ "}{k}
              </button>
            );
          })}
          {report.missing_keywords.length === 0 && (
            <span className="text-emerald-300 text-xs">Nothing missing — nice.</span>
          )}
        </div>
        {selected.size > 0 && onApplyKeywords && (
          <button
            onClick={() => onApplyKeywords(Array.from(selected))}
            disabled={applying}
            className="mt-3 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium"
          >
            {applying ? "Rebuilding…" : `Apply ${selected.size} keyword${selected.size === 1 ? "" : "s"} to resume`}
          </button>
        )}
      </div>

      <div className="mb-4">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Matched keywords</div>
        <div className="flex flex-wrap gap-1.5">
          {report.matched_keywords.slice(0, 40).map((k) => (
            <span key={k} className="text-xs bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full">
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-white/50">Bullet-by-bullet</div>
        {report.bullets_report.map((b, i) => (
          <div key={i} className="hairline rounded-lg p-2.5">
            <div className="text-xs text-white/40 mb-1">
              {b.section} · {b.item}
            </div>
            <div className="text-sm">{b.bullet}</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {b.hits.length === 0 ? (
                <span className="text-xs text-red-300">no JD keywords matched</span>
              ) : (
                b.hits.map((h, j) => (
                  <span key={j} className="text-[10px] bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 px-1.5 py-0.5 rounded">
                    {h}
                  </span>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
