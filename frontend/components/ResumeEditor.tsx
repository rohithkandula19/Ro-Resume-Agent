"use client";

import { useState } from "react";
import { Sparkles, Minus, Plus, Pencil, Check, X } from "lucide-react";
import { aiEditBullet, aiSuggestSummary, aiSuggestSkills, aiSuggestBullet } from "@/lib/api";

type Item = {
  title?: string;
  org?: string;
  dates?: string | string[];
  bullets?: string[];
};

type Resume = {
  name?: string;
  contact?: any;
  summary?: string;
  skills?: string[];
  experience?: Item[];
  projects?: Item[];
  education?: any[];
  certifications?: string[];
};

type Props = {
  resume: Resume | null;
  resumeText: string;
  jdText: string;
  role: string;
  onChange: (next: Resume) => void;
  onRebuild: () => void;
  rebuilding?: boolean;
};

type BulletCtx = { resumeText: string };


export default function ResumeEditor({ resume, resumeText, jdText, role, onChange, onRebuild, rebuilding }: Props) {
  if (!resume) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-white/50">
        Build your resume first, then come back here to edit any section with AI help.
      </div>
    );
  }

  const update = (patch: Partial<Resume>) => onChange({ ...resume, ...patch });

  const setSectionBullet = (section: "experience" | "projects", itemIdx: number, bulletIdx: number, value: string) => {
    const items = [...(resume[section] || [])];
    const item = { ...items[itemIdx] };
    const bullets = [...(item.bullets || [])];
    bullets[bulletIdx] = value;
    item.bullets = bullets;
    items[itemIdx] = item;
    update({ [section]: items } as any);
  };

  const deleteSectionBullet = (section: "experience" | "projects", itemIdx: number, bulletIdx: number) => {
    const items = [...(resume[section] || [])];
    const item = { ...items[itemIdx] };
    item.bullets = (item.bullets || []).filter((_, i) => i !== bulletIdx);
    items[itemIdx] = item;
    update({ [section]: items } as any);
  };

  const addSectionBullet = (section: "experience" | "projects", itemIdx: number) => {
    const items = [...(resume[section] || [])];
    const item = { ...items[itemIdx] };
    item.bullets = [...(item.bullets || []), "New bullet — click ✎ to edit."];
    items[itemIdx] = item;
    update({ [section]: items } as any);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 glow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-lg font-semibold">AI Resume Editor</div>
            <div className="text-xs text-white/50 mt-1">
              Edit any bullet by hand, or use ✨ rewrite · − shorten · + add impact. Save to rebuild the PDF.
            </div>
          </div>
          <button
            onClick={onRebuild}
            disabled={rebuilding}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium"
          >
            {rebuilding ? "Rebuilding…" : "Save & Rebuild"}
          </button>
        </div>
      </div>

      <SummaryCard
        summary={resume.summary || ""}
        resumeText={resumeText}
        jdText={jdText}
        role={role}
        onChange={(s) => update({ summary: s })}
      />

      <SkillsCard
        skills={resume.skills || []}
        resumeText={resumeText}
        jdText={jdText}
        role={role}
        onChange={(s) => update({ skills: s })}
      />

      <SectionCard
        title="Experience"
        items={resume.experience || []}
        resumeText={resumeText}
        jdText={jdText}
        role={role}
        onBulletChange={(i, j, v) => setSectionBullet("experience", i, j, v)}
        onBulletDelete={(i, j) => deleteSectionBullet("experience", i, j)}
        onBulletAdd={(i) => addSectionBullet("experience", i)}
        onAiBullet={async (i) => {
          const item = (resume.experience || [])[i];
          if (!item) return;
          try {
            const r = await aiSuggestBullet(item.title || "", item.org || "", item.bullets || [], jdText, role);
            if (r.bullet) {
              const items = [...(resume.experience || [])];
              const it = { ...items[i] };
              it.bullets = [...(it.bullets || []), r.bullet];
              items[i] = it;
              update({ experience: items });
            }
          } catch (e) { console.warn("suggest bullet failed", e); }
        }}
      />

      <SectionCard
        title="Projects"
        items={resume.projects || []}
        resumeText={resumeText}
        jdText={jdText}
        role={role}
        onBulletChange={(i, j, v) => setSectionBullet("projects", i, j, v)}
        onBulletDelete={(i, j) => deleteSectionBullet("projects", i, j)}
        onBulletAdd={(i) => addSectionBullet("projects", i)}
        onAiBullet={async (i) => {
          const item = (resume.projects || [])[i];
          if (!item) return;
          try {
            const r = await aiSuggestBullet(item.title || "", item.org || "", item.bullets || [], jdText, role);
            if (r.bullet) {
              const items = [...(resume.projects || [])];
              const it = { ...items[i] };
              it.bullets = [...(it.bullets || []), r.bullet];
              items[i] = it;
              update({ projects: items });
            }
          } catch (e) { console.warn("suggest bullet failed", e); }
        }}
      />
    </div>
  );
}

function SummaryCard({
  summary, resumeText, jdText, role, onChange,
}: {
  summary: string;
  resumeText: string;
  jdText: string;
  role: string;
  onChange: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary);
  const [aiBusy, setAiBusy] = useState(false);
  const [undoTo, setUndoTo] = useState<string | null>(null);

  const runAi = async () => {
    setAiBusy(true);
    setUndoTo(summary);
    try {
      const r = await aiSuggestSummary(resumeText, summary, jdText, role);
      if (r.summary) onChange(r.summary);
    } catch (e) { console.warn("suggest summary failed", e); }
    finally { setAiBusy(false); }
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-semibold">Summary</div>
        <div className="flex gap-2 items-center">
          {undoTo !== null && !editing && (
            <button
              onClick={() => { onChange(undoTo); setUndoTo(null); }}
              className="text-[10px] text-amber-300 hover:text-amber-200"
              title="Undo AI change"
            >
              undo
            </button>
          )}
          {!editing && (
            <button
              onClick={runAi}
              disabled={aiBusy || !resumeText}
              className="text-xs text-indigo-300 hover:text-indigo-200 disabled:opacity-40"
              title={jdText ? "Rewrite summary tailored to JD" : "Draft a summary from your profile"}
            >
              <Sparkles size={12} className="inline" /> {aiBusy ? "thinking…" : (jdText ? "AI tailor" : "AI draft")}
            </button>
          )}
          {!editing ? (
            <button onClick={() => { setDraft(summary); setEditing(true); }} className="text-xs text-indigo-300 hover:text-indigo-200">
              <Pencil size={12} className="inline" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => { onChange(draft); setEditing(false); }} className="text-xs text-emerald-300">
                <Check size={12} className="inline" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="text-xs text-white/40">
                <X size={12} className="inline" /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full hairline rounded-lg p-2 bg-transparent text-sm"
        />
      ) : (
        <div className="text-sm text-white/80">
          {aiBusy ? <span className="italic text-white/40">rewriting…</span>
            : (typeof summary === "string" && summary
                ? summary
                : <span className="italic text-white/40">No summary yet — click AI draft to generate one.</span>)}
        </div>
      )}
    </div>
  );
}

const SKILL_TAXONOMY_MIN: Record<string, string[]> = {
  Languages: ["python","java","javascript","typescript","go","golang","rust","c++","c#","ruby","php","scala","kotlin","swift","sql","bash"],
  Frontend: ["react","next.js","nextjs","vue","angular","svelte","html","css","tailwind","redux"],
  Backend: ["node","express","fastapi","flask","django","spring","rails","laravel","graphql","rest","grpc"],
  "Data/ML": ["pandas","numpy","scikit-learn","sklearn","pytorch","tensorflow","keras","xgboost","spark","airflow","mlflow","huggingface","transformers","langchain","rag","embeddings"],
  Cloud: ["aws","gcp","azure","s3","ec2","lambda","ecs","eks","rds","bigquery"],
  Databases: ["postgres","postgresql","mysql","mongodb","redis","elasticsearch","snowflake","bigquery","cassandra","sqlite","dynamodb"],
  "DevOps/Infra": ["docker","kubernetes","k8s","terraform","ansible","helm","jenkins","github actions","gitlab ci","prometheus","grafana","datadog","sentry","linux"],
  Testing: ["jest","pytest","mocha","cypress","selenium","playwright","junit","vitest"],
  Tools: ["git","github","gitlab","jira","figma","postman","swagger"],
};

function categorizeClient(skills: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const other: string[] = [];
  for (const s of skills) {
    const sl = s.trim().toLowerCase();
    let placed = false;
    for (const [cat, terms] of Object.entries(SKILL_TAXONOMY_MIN)) {
      for (const t of terms) {
        if (t === sl) { placed = true; }
        else if (t.includes(" ") && sl.includes(t)) { placed = true; }
        else if (sl.includes(" ") && t.includes(sl)) { placed = true; }
        if (placed) { (out[cat] ||= []).push(s); break; }
      }
      if (placed) break;
    }
    if (!placed) other.push(s);
  }
  if (other.length) out.Other = other;
  return out;
}

function SkillsCard({
  skills, resumeText, jdText, role, onChange,
}: {
  skills: string[];
  resumeText: string;
  jdText: string;
  role: string;
  onChange: (s: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [grouped, setGrouped] = useState(false);

  const runAi = async () => {
    setAiBusy(true);
    try {
      const r = await aiSuggestSkills(resumeText, skills, jdText, role);
      setSuggested(r.add || []);
    } catch (e) { console.warn("suggest skills failed", e); }
    finally { setAiBusy(false); }
  };

  const addOne = (s: string) => {
    onChange([...skills, s]);
    setSuggested(suggested.filter((x) => x !== s));
  };
  const addAll = () => {
    const merged = Array.from(new Set([...skills, ...suggested]));
    onChange(merged);
    setSuggested([]);
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-semibold">Skills</div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setGrouped(!grouped)}
            className="text-xs text-white/50 hover:text-white"
            title="Toggle grouped view"
          >
            {grouped ? "flat" : "grouped"}
          </button>
          <button
            onClick={runAi}
            disabled={aiBusy || !resumeText}
            className="text-xs text-indigo-300 hover:text-indigo-200 disabled:opacity-40"
            title="Suggest skills you have evidence for"
          >
            <Sparkles size={12} className="inline" /> {aiBusy ? "thinking…" : "AI suggest"}
          </button>
        </div>
      </div>
      {grouped ? (
        <div className="space-y-2 mb-2">
          {Object.entries(categorizeClient(skills)).map(([cat, items]) => (
            <div key={cat}>
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">{cat}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((s) => (
                  <span key={s} className="text-xs bg-white/5 text-white/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    {s}
                    <button
                      onClick={() => onChange(skills.filter((x) => x !== s))}
                      className="text-white/40 hover:text-red-300"
                      aria-label="Remove"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {skills.map((s, i) => (
            <span key={i} className="text-xs bg-white/5 text-white/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              {s}
              <button
                onClick={() => onChange(skills.filter((_, j) => j !== i))}
                className="text-white/40 hover:text-red-300"
                aria-label="Remove"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      {suggested.length > 0 && (
        <div className="hairline rounded-lg p-2 mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <div className="text-[11px] text-white/60">Suggested (click to add):</div>
            <div className="flex gap-2 text-[10px]">
              <button onClick={addAll} className="text-indigo-300 hover:text-indigo-200">add all</button>
              <button onClick={() => setSuggested([])} className="text-white/40 hover:text-white/70">dismiss</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggested.map((s) => (
              <button
                key={s}
                onClick={() => addOne(s)}
                className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-400/40 text-indigo-200 hover:bg-indigo-500/20"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              onChange([...skills, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder="Add a skill and press Enter"
          className="flex-1 hairline rounded-lg p-2 bg-transparent text-sm"
        />
      </div>
    </div>
  );
}

function SectionCard({
  title, items, resumeText, jdText, role,
  onBulletChange, onBulletDelete, onBulletAdd, onAiBullet,
}: {
  title: string;
  items: Item[];
  resumeText: string;
  jdText: string;
  role: string;
  onBulletChange: (itemIdx: number, bulletIdx: number, value: string) => void;
  onBulletDelete: (itemIdx: number, bulletIdx: number) => void;
  onBulletAdd: (itemIdx: number) => void;
  onAiBullet: (itemIdx: number) => Promise<void>;
}) {
  const [aiBusyIdx, setAiBusyIdx] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {items.map((item, i) => (
        <div key={i} className="mb-4 last:mb-0">
          <div className="flex justify-between items-baseline mb-2">
            <div className="text-sm text-white">
              <span className="font-semibold">{item.title}</span>
              {item.org && <span className="text-white/60"> · {item.org}</span>}
            </div>
            {item.dates && (
              <div className="text-xs text-white/50">
                {Array.isArray(item.dates) ? item.dates.join(" ") : item.dates}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            {(item.bullets || []).map((b, j) => (
              <BulletRow
                key={j}
                bullet={b}
                resumeText={resumeText}
                jdText={jdText}
                role={role}
                onChange={(v) => onBulletChange(i, j, v)}
                onDelete={() => onBulletDelete(i, j)}
              />
            ))}
            <div className="flex gap-3 mt-1">
              <button
                onClick={() => onBulletAdd(i)}
                className="text-xs text-indigo-300 hover:text-indigo-200"
              >
                + add bullet
              </button>
              <button
                onClick={async () => { setAiBusyIdx(i); try { await onAiBullet(i); } finally { setAiBusyIdx(null); } }}
                disabled={aiBusyIdx === i}
                className="text-xs text-indigo-300 hover:text-indigo-200 disabled:opacity-40"
              >
                <Sparkles size={11} className="inline" /> {aiBusyIdx === i ? "drafting…" : "AI suggest bullet"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BulletRow({
  bullet, resumeText, jdText, role, onChange, onDelete,
}: {
  bullet: string;
  resumeText: string;
  jdText: string;
  role: string;
  onChange: (v: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bullet);
  const [aiPending, setAiPending] = useState<string>("");
  const [lastBeforeAi, setLastBeforeAi] = useState<string | null>(null);
  const [hallucinations, setHallucinations] = useState<string[]>([]);

  const runAi = async (action: string) => {
    setAiPending(action);
    setLastBeforeAi(bullet);
    setHallucinations([]);
    try {
      const r = await aiEditBullet(bullet, action, { jd_text: jdText, role, resume_text: resumeText });
      if (r.bullet) onChange(r.bullet);
      if (r.hallucinations?.length) setHallucinations(r.hallucinations);
    } catch (e) {
      console.warn("ai edit failed", e);
    } finally {
      setAiPending("");
    }
  };

  const undo = () => {
    if (lastBeforeAi != null) {
      onChange(lastBeforeAi);
      setLastBeforeAi(null);
      setHallucinations([]);
    }
  };

  if (editing) {
    return (
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          className="flex-1 hairline rounded-lg p-2 bg-transparent text-sm"
        />
        <div className="flex flex-col gap-1">
          <button onClick={() => { onChange(draft); setEditing(false); }} className="text-emerald-300 hover:text-emerald-200">
            <Check size={14} />
          </button>
          <button onClick={() => setEditing(false)} className="text-white/40">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start group">
      <div className="text-white/30 text-sm">•</div>
      <div className="flex-1 text-sm text-white/85 leading-relaxed">
        {aiPending ? <span className="italic text-white/40">rewriting ({aiPending})…</span> : bullet}
        {hallucinations.length > 0 && (
          <div className="mt-1 text-[11px] text-amber-300/90 bg-amber-500/5 border border-amber-400/30 rounded p-1.5">
            ⚠ Fact check: {hallucinations.join(" · ")}. Verify before saving.
          </div>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
        <IconBtn title="Rewrite stronger" onClick={() => runAi("rewrite")}>
          <Sparkles size={12} />
        </IconBtn>
        <IconBtn title="Shorten" onClick={() => runAi("shorten")}>
          <Minus size={12} />
        </IconBtn>
        <IconBtn title="Add impact" onClick={() => runAi("add_metric")}>
          <Plus size={12} />
        </IconBtn>
        <IconBtn title="Edit" onClick={() => { setDraft(bullet); setEditing(true); }}>
          <Pencil size={12} />
        </IconBtn>
        {lastBeforeAi && (
          <button
            onClick={undo}
            className="text-[10px] text-amber-300 hover:text-amber-200 px-1"
            title="Undo AI change"
          >
            undo
          </button>
        )}
        <IconBtn title="Delete" onClick={onDelete}>
          <X size={12} />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded hairline text-white/60 hover:text-white hover:border-white/40"
    >
      {children}
    </button>
  );
}
