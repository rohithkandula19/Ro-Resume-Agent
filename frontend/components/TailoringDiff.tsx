"use client";

/**
 * Side-by-side diff of original vs JD-tailored resume JSON.
 * Highlights: rewritten bullets, new bullets (added by tailoring),
 * dropped bullets (removed), skills reordered / added / dropped.
 */

type Item = {
  title?: string;
  org?: string;
  dates?: string | string[];
  bullets?: string[];
};

type Resume = {
  summary?: string;
  skills?: string[];
  experience?: Item[];
  projects?: Item[];
};

function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const A = new Set(norm(a).split(" ").filter(w => w.length > 3));
  const B = new Set(norm(b).split(" ").filter(w => w.length > 3));
  if (A.size === 0 || B.size === 0) return 0;
  let overlap = 0;
  A.forEach(w => { if (B.has(w)) overlap++; });
  return overlap / Math.max(A.size, B.size);
}

type BulletStatus = "unchanged" | "rewritten" | "added" | "dropped";

function diffBullets(origBullets: string[], tailBullets: string[]): Array<{
  status: BulletStatus;
  text: string;
  paired?: string;
}> {
  const used = new Set<number>();
  const out: Array<{ status: BulletStatus; text: string; paired?: string }> = [];

  for (const t of tailBullets) {
    let bestIdx = -1;
    let bestSim = 0;
    origBullets.forEach((o, i) => {
      if (used.has(i)) return;
      const s = similarity(o, t);
      if (s > bestSim) { bestSim = s; bestIdx = i; }
    });
    if (bestSim >= 0.7) {
      used.add(bestIdx);
      out.push({ status: "unchanged", text: t });
    } else if (bestSim >= 0.25) {
      used.add(bestIdx);
      out.push({ status: "rewritten", text: t, paired: origBullets[bestIdx] });
    } else {
      out.push({ status: "added", text: t });
    }
  }

  origBullets.forEach((o, i) => {
    if (!used.has(i)) out.push({ status: "dropped", text: o });
  });

  return out;
}

function diffSkills(origSkills: string[], tailSkills: string[]) {
  const origSet = new Set(origSkills.map(norm));
  const tailSet = new Set(tailSkills.map(norm));
  const added = tailSkills.filter(s => !origSet.has(norm(s)));
  const dropped = origSkills.filter(s => !tailSet.has(norm(s)));
  const kept = tailSkills.filter(s => origSet.has(norm(s)));
  return { added, dropped, kept };
}

function ItemHeader({ item }: { item: Item }) {
  const dates = Array.isArray(item.dates) ? item.dates.join(" ") : item.dates;
  return (
    <div className="flex justify-between items-baseline mb-1">
      <div className="text-sm font-semibold text-white">
        {item.title}{item.org ? ` · ${item.org}` : ""}
      </div>
      {dates && <div className="text-xs text-white/50">{dates}</div>}
    </div>
  );
}

const statusStyles: Record<BulletStatus, string> = {
  unchanged: "text-white/60 border-l-2 border-white/10",
  rewritten: "text-amber-200 border-l-2 border-amber-400 bg-amber-400/5",
  added:     "text-emerald-200 border-l-2 border-emerald-400 bg-emerald-400/5",
  dropped:   "text-rose-300/70 border-l-2 border-rose-400/60 bg-rose-400/5 line-through",
};

const statusLabel: Record<BulletStatus, string> = {
  unchanged: "",
  rewritten: "rewritten",
  added:     "added",
  dropped:   "dropped",
};

function SectionDiff({ title, orig, tail }: { title: string; orig: Item[]; tail: Item[] }) {
  if (!orig.length && !tail.length) return null;

  const pairs: Array<{ orig?: Item; tail?: Item }> = [];
  const usedOrig = new Set<number>();
  tail.forEach(t => {
    const idx = orig.findIndex((o, i) =>
      !usedOrig.has(i) && (norm(o.org || "") === norm(t.org || "") || norm(o.title || "") === norm(t.title || ""))
    );
    if (idx >= 0) { usedOrig.add(idx); pairs.push({ orig: orig[idx], tail: t }); }
    else pairs.push({ tail: t });
  });
  orig.forEach((o, i) => { if (!usedOrig.has(i)) pairs.push({ orig: o }); });

  return (
    <div className="mb-5">
      <div className="text-xs uppercase tracking-widest text-indigo-300 mb-2">{title}</div>
      {pairs.map((p, idx) => {
        const header = p.tail || p.orig!;
        const diffs = diffBullets(p.orig?.bullets || [], p.tail?.bullets || []);
        return (
          <div key={idx} className="mb-4">
            <ItemHeader item={header} />
            <div className="space-y-1">
              {diffs.map((d, i) => (
                <div key={i} className={`text-xs px-2 py-1.5 rounded ${statusStyles[d.status]}`}>
                  {statusLabel[d.status] && (
                    <span className="inline-block text-[9px] uppercase tracking-widest mr-2 opacity-70">
                      {statusLabel[d.status]}
                    </span>
                  )}
                  {d.text}
                  {d.status === "rewritten" && d.paired && (
                    <div className="mt-1 text-[10px] text-white/40 italic">
                      was: {d.paired}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function computeStats(original: Resume, tailored: Resume): {
  total: number;
  rewritten: number;
  added: number;
  dropped: number;
  unchanged: number;
  score: number;
} {
  const sections: Array<{ orig: Item[]; tail: Item[] }> = [
    { orig: original.experience || [], tail: tailored.experience || [] },
    { orig: original.projects || [], tail: tailored.projects || [] },
  ];

  let total = 0, rewritten = 0, added = 0, dropped = 0, unchanged = 0;

  for (const { orig, tail } of sections) {
    const usedOrig = new Set<number>();
    const pairs: Array<{ orig?: Item; tail?: Item }> = [];
    tail.forEach(t => {
      const idx = orig.findIndex((o, i) =>
        !usedOrig.has(i) && (norm(o.org || "") === norm(t.org || "") || norm(o.title || "") === norm(t.title || ""))
      );
      if (idx >= 0) { usedOrig.add(idx); pairs.push({ orig: orig[idx], tail: t }); }
      else pairs.push({ tail: t });
    });
    orig.forEach((o, i) => { if (!usedOrig.has(i)) pairs.push({ orig: o }); });

    for (const p of pairs) {
      const diffs = diffBullets(p.orig?.bullets || [], p.tail?.bullets || []);
      for (const d of diffs) {
        total++;
        if (d.status === "rewritten") rewritten++;
        else if (d.status === "added") added++;
        else if (d.status === "dropped") dropped++;
        else unchanged++;
      }
    }
  }

  const score = total > 0 ? Math.round(((rewritten + added) / total) * 100) : 0;
  return { total, rewritten, added, dropped, unchanged, score };
}

function StatsBar({ stats }: { stats: ReturnType<typeof computeStats> }) {
  const { total, rewritten, added, dropped, unchanged, score } = stats;
  return (
    <div className="hairline rounded-xl p-3 mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
        <StatPill label="Total bullets" value={total} className="text-white/60" />
        <StatPill label="Rewritten" value={rewritten} className="text-amber-300" dotColor="bg-amber-400" />
        <StatPill label="Added" value={added} className="text-emerald-300" dotColor="bg-emerald-400" />
        <StatPill label="Dropped" value={dropped} className="text-rose-300" dotColor="bg-rose-400" />
        <StatPill label="Unchanged" value={unchanged} className="text-white/40" />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-white/50">Tailoring Strength</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          score >= 60 ? "bg-indigo-500/30 text-indigo-200 border border-indigo-400/40" :
          score >= 30 ? "bg-amber-500/20 text-amber-200 border border-amber-400/30" :
          "bg-white/10 text-white/50 border border-white/10"
        }`}>
          {score}%
        </span>
      </div>
    </div>
  );
}

function StatPill({ label, value, className, dotColor }: {
  label: string; value: number; className: string; dotColor?: string;
}) {
  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      {dotColor && <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />}
      <span className="text-white/40">{label}:</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

export default function TailoringDiff({
  original,
  tailored,
}: {
  original: Resume | null;
  tailored: Resume | null;
}) {
  if (!original || !tailored) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-white/50">
        Paste a JD and click Build — I will show you every bullet I rewrote for that role.
      </div>
    );
  }

  const skillDiff = diffSkills(original.skills || [], tailored.skills || []);
  const summarySim = similarity(original.summary || "", tailored.summary || "");
  const summaryChanged = summarySim < 0.7;
  const stats = computeStats(original, tailored);

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-lg font-semibold">Tailoring Diff</div>
        <div className="text-xs text-white/50">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1" /> rewritten{" "}
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 ml-2 mr-1" /> added{" "}
          <span className="inline-block w-2 h-2 rounded-full bg-rose-400 ml-2 mr-1" /> dropped
        </div>
      </div>

      <StatsBar stats={stats} />

      {tailored.summary && (
        <div className="mb-5">
          <div className="text-xs uppercase tracking-widest text-indigo-300 mb-2">Summary</div>
          <div className={`text-xs px-2 py-1.5 rounded ${summaryChanged ? statusStyles.rewritten : statusStyles.unchanged}`}>
            {summaryChanged && (
              <span className="inline-block text-[9px] uppercase tracking-widest mr-2 opacity-70">rewritten for JD</span>
            )}
            {tailored.summary}
            {summaryChanged && original.summary && (
              <div className="mt-1 text-[10px] text-white/40 italic">was: {original.summary}</div>
            )}
          </div>
        </div>
      )}

      <div className="mb-5">
        <div className="text-xs uppercase tracking-widest text-indigo-300 mb-2">Skills</div>
        <div className="flex flex-wrap gap-1.5">
          {skillDiff.kept.map(s => (
            <span key={"k" + s} className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/70">{s}</span>
          ))}
          {skillDiff.added.map(s => (
            <span key={"a" + s} className="text-xs px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-200 border border-emerald-400/30">
              + {s}
            </span>
          ))}
          {skillDiff.dropped.map(s => (
            <span key={"d" + s} className="text-xs px-2 py-0.5 rounded bg-rose-400/10 text-rose-200 border border-rose-400/30 line-through">
              {s}
            </span>
          ))}
        </div>
      </div>

      <SectionDiff
        title="Experience"
        orig={original.experience || []}
        tail={tailored.experience || []}
      />
      <SectionDiff
        title="Projects"
        orig={original.projects || []}
        tail={tailored.projects || []}
      />
    </div>
  );
}
