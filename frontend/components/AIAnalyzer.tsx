"use client";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, Target,
  Send, Wand2, Lightbulb, RefreshCw, Copy, Check,
  Flag, Flame, MessageCircle, DollarSign, Users,
} from "lucide-react";
import {
  critiqueResume, runXray, assistResume, analyzeJDDeep,
  type ResumeCritique,
} from "@/lib/api";

type CustomAsk = {
  id: number;
  prompt: string;
  status: "running" | "done" | "error";
  summary?: string;
  added_section?: string;
  updated_resume?: string;
  error?: string;
};

const SEV_COLOR: Record<string, string> = {
  high:   "text-red-300 border-red-400/40 bg-red-500/5",
  medium: "text-amber-300 border-amber-400/40 bg-amber-500/5",
  low:    "text-sky-300 border-sky-400/40 bg-sky-500/5",
};

const SECTION_LABEL: Record<string, string> = {
  summary: "Summary", skills: "Skills", experience: "Experience",
  projects: "Projects", education: "Education", ats: "ATS",
  structure: "Structure",
};

const QUICK_PROMPTS = [
  "Rewrite my summary to match the JD tone",
  "Make bullets more quantified with metrics",
  "Add a projects section with my GitHub work",
  "Tighten wording to fit a single page",
  "Strengthen weak action verbs",
  "Add ATS-friendly keywords from the JD",
];

export default function AIAnalyzer({
  resumeText,
  jdText,
  role,
  builtResume,
  onApplyResumeText,
}: {
  resumeText: string;
  jdText: string;
  role: string;
  builtResume: any; // optional — only needed for xray (missing keywords)
  onApplyResumeText?: (text: string) => void;
}) {
  const [critique, setCritique] = useState<ResumeCritique | null>(null);
  const [xray, setXray] = useState<any>(null);
  const [jdDeep, setJdDeep] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState("");

  const [prompt, setPrompt] = useState("");
  const [asks, setAsks] = useState<CustomAsk[]>([]);
  const nextId = useRef(1);
  const autoRanRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasResume = resumeText.trim().length > 50;
  const hasJd = jdText.trim().length > 20;

  /* ── analyze ──────────────────────────────────────────────────────────── */
  const analyze = async () => {
    if (!hasResume) {
      setErr("Upload or paste your resume first.");
      return;
    }
    setErr("");
    setRunning(true);
    try {
      // Run critique + JD-deep + xray in parallel
      const jobs: Promise<any>[] = [
        critiqueResume(resumeText, role, jdText).then(setCritique).catch((e) => {
          console.warn("critique failed", e);
          setCritique(null);
        }),
      ];
      if (hasJd) {
        jobs.push(
          analyzeJDDeep(jdText).then(setJdDeep).catch((e) => {
            console.warn("jd-deep failed", e);
            setJdDeep(null);
          }),
        );
      }
      if (builtResume && hasJd) {
        jobs.push(
          runXray(builtResume, jdText).then(setXray).catch((e) => {
            console.warn("xray failed", e);
            setXray(null);
          }),
        );
      }
      await Promise.allSettled(jobs);
    } catch (e: any) {
      setErr(e.message || "Analyze failed");
    } finally {
      setRunning(false);
    }
  };

  // Auto-analyze once resume + JD are both present
  useEffect(() => {
    if (autoRanRef.current) return;
    if (hasResume && hasJd) {
      autoRanRef.current = true;
      analyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasResume, hasJd]);

  /* ── custom ask ───────────────────────────────────────────────────────── */
  const sendAsk = async (overrideText?: string) => {
    const text = (overrideText ?? prompt).trim();
    if (!text) return;
    if (!hasResume) {
      setErr("Upload or paste your resume first.");
      return;
    }
    setPrompt("");
    setErr("");

    const id = nextId.current++;
    setAsks((a) => [...a, { id, prompt: text, status: "running" }]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50);

    try {
      const r = await assistResume(resumeText, text);
      setAsks((a) =>
        a.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "done",
                summary: r.summary,
                added_section: r.added_section,
                updated_resume: r.updated_resume,
              }
            : x,
        ),
      );
    } catch (e: any) {
      setAsks((a) =>
        a.map((x) => (x.id === id ? { ...x, status: "error", error: e.message || "Failed" } : x)),
      );
    }
  };

  const applyAsk = (ask: CustomAsk) => {
    if (!ask.updated_resume || !onApplyResumeText) return;
    onApplyResumeText(ask.updated_resume);
  };

  /* ── render helpers ───────────────────────────────────────────────────── */

  const issuesBySev = (critique?.issues || []).slice().sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return (order as any)[a.severity] - (order as any)[b.severity];
  });

  const score = critique?.overall_score ?? 0;
  const scoreColor =
    score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-red-300";

  /* ── ui ───────────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="text-indigo-400 shrink-0" size={20} />
            <div>
              <div className="text-base font-semibold">AI Analyzer</div>
              <div className="text-[11px] text-white/50">
                Auto-checks resume vs JD, flags issues, and can apply any custom fix you ask for.
              </div>
            </div>
          </div>
          <button
            onClick={analyze}
            disabled={running || !hasResume}
            className="shrink-0 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5"
          >
            {running ? (
              <><Loader2 className="animate-spin" size={12} /> Analyzing…</>
            ) : critique ? (
              <><RefreshCw size={12} /> Re-analyze</>
            ) : (
              <><Wand2 size={12} /> Analyze now</>
            )}
          </button>
        </div>

        {/* Context strip */}
        <div className="flex items-center gap-1.5 mt-3 text-[10px]">
          <StatusChip on={hasResume} label="Resume" />
          <StatusChip on={hasJd} label="JD" />
          <StatusChip on={!!role} label={role ? `Role: ${role}` : "Role"} />
          {critique && (
            <span className={`ml-auto text-xs font-mono ${scoreColor}`}>
              Score: {score}/100
            </span>
          )}
        </div>

        {err && (
          <div className="mt-2 text-xs text-red-300 flex items-center gap-1.5">
            <AlertCircle size={12} /> {err}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* ── HERO: Score + Verdict ───────────────────────────────────── */}
        {critique && (
          <div className="glass rounded-2xl p-5 flex items-start gap-5">
            <div className="shrink-0 text-center">
              <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Resume score</div>
              <div className={`text-5xl font-bold ${scoreColor}`}>
                {score}
                <span className="text-lg text-white/30 font-normal">/100</span>
              </div>
            </div>
            {critique.verdict && (
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Verdict</div>
                <div className="text-[13px] text-white/90 leading-snug">{critique.verdict}</div>
              </div>
            )}
          </div>
        )}

        {/* ── JD DEEP READ ────────────────────────────────────────────── */}
        {jdDeep && (jdDeep.urgency || jdDeep.culture_signals?.length || jdDeep.red_flags?.length) && (
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Flame size={12} className="text-indigo-300" />
              <div className="text-xs font-semibold">JD Deep-Read</div>
              {jdDeep.urgency && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full border ${
                  jdDeep.urgency === "high"   ? "border-red-400/40 bg-red-500/10 text-red-200" :
                  jdDeep.urgency === "medium" ? "border-amber-400/40 bg-amber-500/10 text-amber-200" :
                                                "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                }`}>
                  {jdDeep.urgency} urgency
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {jdDeep.red_flags?.length > 0 && (
                <FlagList
                  icon={<Flag size={11} className="text-red-300" />}
                  title="🚩 Red flags"
                  items={jdDeep.red_flags}
                  colorClass="text-red-200 border-red-400/30 bg-red-500/5"
                />
              )}
              {jdDeep.green_flags?.length > 0 && (
                <FlagList
                  icon={<CheckCircle2 size={11} className="text-emerald-300" />}
                  title="✅ Green flags"
                  items={jdDeep.green_flags}
                  colorClass="text-emerald-200 border-emerald-400/30 bg-emerald-500/5"
                />
              )}
            </div>

            {(jdDeep.culture_signals?.length > 0 || jdDeep.ideal_traits?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {jdDeep.culture_signals?.length > 0 && (
                  <ChipList
                    icon={<Users size={11} className="text-indigo-300" />}
                    title="Culture signals"
                    items={jdDeep.culture_signals}
                  />
                )}
                {jdDeep.ideal_traits?.length > 0 && (
                  <ChipList
                    icon={<Sparkles size={11} className="text-indigo-300" />}
                    title="Ideal candidate traits"
                    items={jdDeep.ideal_traits}
                  />
                )}
              </div>
            )}

            {(jdDeep.negotiation_tips?.length > 0 || jdDeep.questions_to_ask?.length > 0 || jdDeep.interview_style || jdDeep.comp_hints) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {jdDeep.negotiation_tips?.length > 0 && (
                  <TipList
                    icon={<DollarSign size={11} className="text-emerald-300" />}
                    title="Negotiation leverage"
                    items={jdDeep.negotiation_tips}
                  />
                )}
                {jdDeep.questions_to_ask?.length > 0 && (
                  <TipList
                    icon={<MessageCircle size={11} className="text-sky-300" />}
                    title="Questions to ask them"
                    items={jdDeep.questions_to_ask}
                  />
                )}
                {jdDeep.interview_style && (
                  <div className="hairline rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Interview style</div>
                    <div className="text-[12px] text-white/80">{jdDeep.interview_style}</div>
                  </div>
                )}
                {jdDeep.comp_hints && (
                  <div className="hairline rounded-lg p-2">
                    <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Comp hints</div>
                    <div className="text-[12px] text-white/80">{jdDeep.comp_hints}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Two-column: Strengths ∥ Missing keywords ────────────────── */}
        {(critique?.strengths?.length || xray?.missing_keywords?.length) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {critique?.strengths?.length ? (
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 size={12} className="text-emerald-300" />
                  <div className="text-xs font-semibold">Strengths</div>
                </div>
                <ul className="space-y-1">
                  {critique.strengths.map((s, i) => (
                    <li key={i} className="text-[12px] text-white/80 flex gap-1.5">
                      <span className="text-emerald-300/70 shrink-0">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <div />}

            {xray?.missing_keywords?.length ? (
              <div className="glass rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target size={12} className="text-amber-300" />
                  <div className="text-xs font-semibold">Missing JD keywords</div>
                  <span className="text-[10px] text-white/40">({xray.missing_keywords.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {xray.missing_keywords.slice(0, 24).map((kw: string) => (
                    <span
                      key={kw}
                      className="text-[11px] bg-amber-300/10 border border-amber-300/30 text-amber-200 px-2 py-0.5 rounded-full"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : <div />}
          </div>
        )}

        {/* ── Suggestions ─────────────────────────────────────────────── */}
        {issuesBySev.length > 0 && (
          <div className="glass rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertCircle size={12} className="text-amber-300" />
              <div className="text-xs font-semibold">Suggestions</div>
              <span className="text-[10px] text-white/40">({issuesBySev.length})</span>
            </div>
            <div className="space-y-2">
              {issuesBySev.map((it, i) => (
                <div
                  key={i}
                  className={`hairline rounded-lg p-2.5 border ${SEV_COLOR[it.severity] || ""}`}
                >
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-80 mb-1">
                    <span>{SECTION_LABEL[it.section] || it.section}</span>
                    <span className="opacity-60">·</span>
                    <span>{it.severity}</span>
                    <button
                      onClick={() => sendAsk(`Fix this: ${it.fix}`)}
                      className="ml-auto normal-case tracking-normal text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-white/70 hover:text-white flex items-center gap-1"
                      title="Ask the AI to apply this fix"
                    >
                      <Wand2 size={9} /> apply
                    </button>
                  </div>
                  <div className="text-[12px] text-white/90">{it.issue}</div>
                  <div className="text-[11px] text-white/60 mt-1">
                    <span className="text-white/40">Fix: </span>{it.fix}
                  </div>
                  {it.example && (
                    <div className="text-[11px] mt-1 font-mono bg-black/30 rounded px-2 py-1 text-white/70">
                      {it.example}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!running && !critique && !xray && !jdDeep && (
          <div className="glass rounded-xl p-6 text-center">
            <Lightbulb className="mx-auto text-indigo-300 mb-2" size={24} />
            <div className="text-sm text-white/80 font-medium mb-1">
              {hasResume && hasJd
                ? "Click Analyze to start"
                : "Load a resume and a JD to auto-analyze"}
            </div>
            <div className="text-[11px] text-white/50 max-w-sm mx-auto">
              Runs a resume critique, a deep JD read (culture, red flags,
              negotiation, interview style) and a keyword x-ray in one pass.
              Every finding has an "apply" button.
            </div>
          </div>
        )}

        {/* Custom asks log */}
        {asks.map((ask) => (
          <AskCard key={ask.id} ask={ask} onApply={() => applyAsk(ask)} canApply={!!onApplyResumeText} />
        ))}
      </div>

      {/* Quick prompts */}
      {asks.length === 0 && hasResume && (
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => sendAsk(p)}
              className="text-[11px] px-2.5 py-1 rounded-full hairline text-white/70 hover:text-white hover:border-indigo-400/50 transition"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="glass rounded-xl p-2 flex items-end gap-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendAsk();
            }
          }}
          placeholder="Ask anything — e.g. &quot;add a projects section using my GitHub repos&quot;, &quot;rewrite bullets with metrics&quot;…"
          rows={1}
          className="flex-1 bg-transparent text-sm resize-none outline-none max-h-24 p-1"
        />
        <button
          onClick={() => sendAsk()}
          disabled={!prompt.trim() || !hasResume}
          className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 shrink-0"
          aria-label="Send"
        >
          <Send size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function StatusChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${
        on
          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
          : "border-white/10 text-white/40"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${on ? "bg-emerald-300" : "bg-white/20"}`}
      />
      {label}
    </span>
  );
}

function FlagList({
  icon, title, items, colorClass,
}: {
  icon: React.ReactNode; title: string;
  items: { flag: string; reason?: string }[];
  colorClass: string;
}) {
  return (
    <div className={`hairline rounded-lg p-2 border ${colorClass}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <div className="text-[11px] font-semibold">{title}</div>
        <span className="text-[10px] opacity-60">({items.length})</span>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[11px]">
            <span className="font-medium">{it.flag}</span>
            {it.reason && <span className="opacity-70"> — {it.reason}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChipList({
  icon, title, items,
}: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="hairline rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <div className="text-[11px] font-semibold text-white/80">{title}</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {items.map((it, i) => (
          <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-white/70 px-2 py-0.5 rounded-full">
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function TipList({
  icon, title, items,
}: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="hairline rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <div className="text-[11px] font-semibold text-white/80">{title}</div>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-[11px] text-white/70 flex gap-1.5">
            <span className="text-white/30 shrink-0">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AskCard({
  ask, onApply, canApply,
}: { ask: CustomAsk; onApply: () => void; canApply: boolean }) {
  const [copied, setCopied] = useState(false);
  const copyResume = async () => {
    if (!ask.updated_resume) return;
    try {
      await navigator.clipboard.writeText(ask.updated_resume);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="glass rounded-xl p-3 border-l-2 border-indigo-400/60">
      <div className="text-[10px] uppercase tracking-widest text-indigo-300/80 mb-1">You asked</div>
      <div className="text-[12px] text-white/90 mb-2">{ask.prompt}</div>

      {ask.status === "running" && (
        <div className="flex items-center gap-1.5 text-[11px] text-white/60">
          <Loader2 size={11} className="animate-spin" /> Working on it…
        </div>
      )}

      {ask.status === "error" && (
        <div className="text-[11px] text-red-300 flex items-center gap-1.5">
          <AlertCircle size={11} /> {ask.error}
        </div>
      )}

      {ask.status === "done" && (
        <div className="space-y-2">
          <div className="text-[11px] text-white/70">
            <span className="text-emerald-300">AI:</span> {ask.summary}
          </div>
          {ask.added_section && (
            <div className="text-[10px] text-white/40">
              Touched section: <span className="text-white/70">{ask.added_section}</span>
            </div>
          )}
          {ask.updated_resume && (
            <div className="flex items-center gap-2">
              {canApply && (
                <button
                  onClick={onApply}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-indigo-500/30 hover:bg-indigo-500/60 text-indigo-100 flex items-center gap-1"
                >
                  <Wand2 size={10} /> Apply to resume
                </button>
              )}
              <button
                onClick={copyResume}
                className="text-[11px] px-2.5 py-1 rounded-md hairline text-white/60 hover:text-white flex items-center gap-1"
              >
                {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy updated</>}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
