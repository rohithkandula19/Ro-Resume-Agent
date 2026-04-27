"use client";

type Sub = { score: number };
type Breakdown = {
  llm_match?: Sub & { missing_keywords?: string[]; top_improvements?: string[] };
  keyword?: Sub & { matched?: string[]; missing?: string[] };
  structure?: Sub & { sections_found?: Record<string, boolean>; contact?: any; issues?: string[] };
  parseability?: Sub & { page_count?: number; extractable_chars?: number; issues?: string[] };
};

type Props = {
  data: {
    composite: number;
    verdict: string;
    weights: Record<string, number>;
    breakdown: Breakdown;
    issues: { source: string; issue: string }[];
  } | null;
};

const Bar = ({ label, score, weight }: { label: string; score: number; weight: number }) => {
  const s = Math.max(0, Math.min(100, score));
  const color = s >= 80 ? "#10b981" : s >= 60 ? "#6366f1" : s >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/70">
          {label} <span className="text-white/30">· {Math.round(weight * 100)}% weight</span>
        </span>
        <span className="font-mono">{s}</span>
      </div>
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${s}%`, background: color }} />
      </div>
    </div>
  );
};

export default function ATSBreakdown({ data }: Props) {
  if (!data) return null;
  const b = data.breakdown || {};
  const w = data.weights || {};
  return (
    <div className="glass rounded-2xl p-5 glow space-y-4">
      <div className="flex justify-between items-baseline">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/50">Composite ATS Score</div>
          <div className="text-lg font-semibold">{data.verdict}</div>
        </div>
        <div className="text-4xl font-bold">{data.composite}<span className="text-sm text-white/40">/100</span></div>
      </div>

      <div className="space-y-3">
        <Bar label="LLM semantic match" score={b.llm_match?.score ?? 0} weight={w.llm ?? 0} />
        <Bar label="JD keyword coverage" score={b.keyword?.score ?? 0} weight={w.keyword ?? 0} />
        <Bar label="Resume structure" score={b.structure?.score ?? 0} weight={w.structure ?? 0} />
        <Bar label="PDF parseability" score={b.parseability?.score ?? 0} weight={w.parseability ?? 0} />
      </div>

      {data.issues?.length > 0 && (
        <div className="pt-3 border-t border-white/5">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Top issues</div>
          <ul className="text-sm space-y-1">
            {data.issues.slice(0, 8).map((i, idx) => (
              <li key={idx} className="text-white/70">
                <span className="text-white/40 mr-1">[{i.source}]</span>
                {i.issue}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
