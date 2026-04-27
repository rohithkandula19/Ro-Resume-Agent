"use client";
import { useEffect, useState } from "react";
import {
  User, ChevronDown, ChevronUp, Save, Plus, X, Trophy,
  Code2, Briefcase, Award, GraduationCap,
} from "lucide-react";

/* ──────────────────────────────────────────────────────────────────────────
   Types
   ────────────────────────────────────────────────────────────────────────── */

export type SkillCategory = "languages" | "frameworks" | "cloud_db" | "tools" | "soft";

export const SKILL_CATEGORIES: { key: SkillCategory; label: string; placeholder: string }[] = [
  { key: "languages",  label: "Languages",        placeholder: "Python, TypeScript, Go" },
  { key: "frameworks", label: "Frameworks",       placeholder: "React, FastAPI, Next.js" },
  { key: "cloud_db",   label: "Cloud & DB",       placeholder: "AWS, GCP, PostgreSQL, Redis" },
  { key: "tools",      label: "Tools",            placeholder: "Docker, Git, Figma, Linear" },
  { key: "soft",       label: "Soft skills",      placeholder: "Mentoring, Roadmapping, Writing" },
];

export type ProjectEntry = {
  name: string;
  tech: string;
  link: string;
  bullets: string; // newline-separated bullets
};

export type SimpleEntry = {
  title: string;    // cert name / degree / school
  sub: string;      // issuer / field / GPA
  year: string;
};

export type ProfileData = {
  // Contact
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  // Structured resume content
  skills: Record<SkillCategory, string>; // each value = comma-separated chip string
  projects: ProjectEntry[];
  certifications: SimpleEntry[];
  education: SimpleEntry[];
  winsBank: string; // the unique bit — AI-readable stash of wins / metrics
};

const EMPTY_SKILLS: Record<SkillCategory, string> = {
  languages: "", frameworks: "", cloud_db: "", tools: "", soft: "",
};

const EMPTY: ProfileData = {
  name: "", email: "", phone: "", location: "",
  linkedin: "", github: "", website: "",
  skills: { ...EMPTY_SKILLS },
  projects: [],
  certifications: [],
  education: [],
  winsBank: "",
};

const STORAGE_KEY = "ro-profile-card";

/* ──────────────────────────────────────────────────────────────────────────
   Storage + migration (handles old shape: skills:string, projects:string)
   ────────────────────────────────────────────────────────────────────────── */

function migrate(raw: any): ProfileData {
  const base: ProfileData = { ...EMPTY, skills: { ...EMPTY_SKILLS } };
  if (!raw || typeof raw !== "object") return base;

  // Contact fields — straight copy
  for (const k of ["name","email","phone","location","linkedin","github","website","winsBank"] as const) {
    if (typeof raw[k] === "string") (base as any)[k] = raw[k];
  }

  // Skills: could be old string, or new record
  if (typeof raw.skills === "string") {
    base.skills.languages = raw.skills; // stuff old blob into languages so nothing is lost
  } else if (raw.skills && typeof raw.skills === "object") {
    for (const c of SKILL_CATEGORIES) {
      if (typeof raw.skills[c.key] === "string") base.skills[c.key] = raw.skills[c.key];
    }
  }

  // Projects: old string → single card; new array → direct
  if (typeof raw.projects === "string" && raw.projects.trim()) {
    base.projects = [{ name: "Project", tech: "", link: "", bullets: raw.projects.trim() }];
  } else if (Array.isArray(raw.projects)) {
    base.projects = raw.projects.map((p: any) => ({
      name: String(p?.name ?? ""),
      tech: String(p?.tech ?? ""),
      link: String(p?.link ?? ""),
      bullets: String(p?.bullets ?? ""),
    }));
  }

  if (Array.isArray(raw.certifications)) {
    base.certifications = raw.certifications.map((c: any) => ({
      title: String(c?.title ?? ""), sub: String(c?.sub ?? ""), year: String(c?.year ?? ""),
    }));
  }
  if (Array.isArray(raw.education)) {
    base.education = raw.education.map((c: any) => ({
      title: String(c?.title ?? ""), sub: String(c?.sub ?? ""), year: String(c?.year ?? ""),
    }));
  }

  return base;
}

export function loadProfile(): ProfileData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(JSON.parse(raw)) : EMPTY;
  } catch { return EMPTY; }
}

function saveProfile(p: ProfileData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

/* ──────────────────────────────────────────────────────────────────────────
   Serializers — split into header / body / wins so the Sidebar can merge
   intelligently without dropping sections when the uploaded resume already
   contains the contact header.
   ────────────────────────────────────────────────────────────────────────── */

/** Contact header: name + email/phone/location + links */
export function profileContactText(p: ProfileData): string {
  const lines: string[] = [];
  if (p.name) lines.push(p.name);
  const contact: string[] = [];
  if (p.email)    contact.push(p.email);
  if (p.phone)    contact.push(p.phone);
  if (p.location) contact.push(p.location);
  if (contact.length) lines.push(contact.join(" | "));
  if (p.linkedin) lines.push(`LinkedIn: ${p.linkedin}`);
  if (p.github)   lines.push(`GitHub: ${p.github}`);
  if (p.website)  lines.push(`Website: ${p.website}`);
  return lines.join("\n");
}

/** Skills + Projects + Certifications + Education (ordered resume body) */
export function profileExtrasText(p: ProfileData): string {
  const out: string[] = [];

  // Skills
  const skillLines: string[] = [];
  for (const c of SKILL_CATEGORIES) {
    const v = (p.skills?.[c.key] || "").trim();
    if (v) skillLines.push(`${c.label}: ${v}`);
  }
  if (skillLines.length) {
    out.push("SKILLS");
    out.push(...skillLines);
    out.push("");
  }

  // Projects
  const projects = (p.projects || []).filter(x => x.name || x.bullets);
  if (projects.length) {
    out.push("PROJECTS");
    for (const pr of projects) {
      const header = [pr.name, pr.tech].filter(Boolean).join(" — ");
      if (header) out.push(header + (pr.link ? `  (${pr.link})` : ""));
      const bullets = (pr.bullets || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      for (const b of bullets) out.push(b.startsWith("•") || b.startsWith("-") ? b : `• ${b}`);
      out.push("");
    }
  }

  // Certifications
  const certs = (p.certifications || []).filter(x => x.title);
  if (certs.length) {
    out.push("CERTIFICATIONS");
    for (const c of certs) {
      out.push([c.title, c.sub, c.year].filter(Boolean).join(" — "));
    }
    out.push("");
  }

  // Education
  const edu = (p.education || []).filter(x => x.title);
  if (edu.length) {
    out.push("EDUCATION");
    for (const e of edu) {
      out.push([e.title, e.sub, e.year].filter(Boolean).join(" — "));
    }
    out.push("");
  }

  return out.join("\n").trim();
}

/** Wins Bank — the unique one. Emitted as a hidden context block the LLM can
 *  pull metrics from, without forcing them into the visible resume. */
export function profileWinsText(p: ProfileData): string {
  const w = (p.winsBank || "").trim();
  if (!w) return "";
  return "── WINS BANK (context for AI tailoring — not printed verbatim) ──\n" + w;
}

/** Back-compat full serializer */
export function profileToText(p: ProfileData): string {
  const parts = [profileContactText(p), profileExtrasText(p), profileWinsText(p)].filter(Boolean);
  return parts.join("\n\n");
}

/* ──────────────────────────────────────────────────────────────────────────
   Small helpers
   ────────────────────────────────────────────────────────────────────────── */

function parseChips(s: string): string[] {
  return s.split(",").map(x => x.trim()).filter(Boolean);
}
function joinChips(chips: string[]): string {
  return chips.join(", ");
}

/* ──────────────────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────────────────── */

type Props = { onChange?: (p: ProfileData) => void };

export default function ProfileCard({ onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<ProfileData>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [section, setSection] = useState<"contact"|"skills"|"projects"|"credentials"|"wins">("contact");

  // Load from localStorage after mount
  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (onChange) onChange(p);
    if (!p.name) setOpen(true);
  }, []);

  const patch = (delta: Partial<ProfileData>) => setProfile(prev => ({ ...prev, ...delta }));

  const setContact = (k: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      patch({ [k]: e.target.value } as any);

  const setSkill = (c: SkillCategory, value: string) =>
    patch({ skills: { ...profile.skills, [c]: value } });

  const addChipTo = (c: SkillCategory, chip: string) => {
    const existing = parseChips(profile.skills[c]);
    if (existing.includes(chip)) return;
    setSkill(c, joinChips([...existing, chip]));
  };
  const removeChipFrom = (c: SkillCategory, chip: string) => {
    const existing = parseChips(profile.skills[c]);
    setSkill(c, joinChips(existing.filter(x => x !== chip)));
  };

  // Projects
  const addProject = () =>
    patch({ projects: [...profile.projects, { name: "", tech: "", link: "", bullets: "" }] });
  const updateProject = (i: number, delta: Partial<ProjectEntry>) => {
    const next = profile.projects.map((p, idx) => idx === i ? { ...p, ...delta } : p);
    patch({ projects: next });
  };
  const removeProject = (i: number) =>
    patch({ projects: profile.projects.filter((_, idx) => idx !== i) });

  // Certifications / Education (same shape)
  const addSimple = (key: "certifications" | "education") =>
    patch({ [key]: [...profile[key], { title: "", sub: "", year: "" }] } as any);
  const updateSimple = (key: "certifications" | "education", i: number, delta: Partial<SimpleEntry>) => {
    const arr = profile[key].map((e, idx) => idx === i ? { ...e, ...delta } : e);
    patch({ [key]: arr } as any);
  };
  const removeSimple = (key: "certifications" | "education", i: number) =>
    patch({ [key]: profile[key].filter((_, idx) => idx !== i) } as any);

  const handleSave = () => {
    saveProfile(profile);
    if (onChange) onChange(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  // "Filled" count for the collapsed header badge
  const filledCount =
    (profile.name ? 1 : 0) +
    (profile.email ? 1 : 0) +
    (profile.phone ? 1 : 0) +
    (profile.location ? 1 : 0) +
    (profile.linkedin ? 1 : 0) +
    (profile.github ? 1 : 0) +
    (profile.website ? 1 : 0) +
    SKILL_CATEGORIES.filter(c => profile.skills[c.key]).length +
    profile.projects.filter(p => p.name || p.bullets).length +
    profile.certifications.filter(c => c.title).length +
    profile.education.filter(e => e.title).length +
    (profile.winsBank.trim() ? 1 : 0);

  /* ──────────────────────────────────────────────────────────────────────── */

  const SECTION_TABS: { key: typeof section; label: string; icon: any }[] = [
    { key: "contact",     label: "Contact",     icon: User },
    { key: "skills",      label: "Skills",      icon: Code2 },
    { key: "projects",    label: "Projects",    icon: Briefcase },
    { key: "credentials", label: "Credentials", icon: GraduationCap },
    { key: "wins",        label: "Wins",        icon: Trophy },
  ];

  return (
    <div className="mb-4 hairline rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <User size={14} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-medium truncate">
            {profile.name || "Your Profile"}
          </span>
          {filledCount > 0 && (
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full shrink-0">
              {filledCount} filled
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-white/40" />
              : <ChevronDown size={14} className="text-white/40" />}
      </button>

      {open && (
        <div className="border-t border-white/5">
          {/* Section tabs */}
          <div className="flex gap-1 px-2 py-2 overflow-x-auto scrollbar-none border-b border-white/5">
            {SECTION_TABS.map(t => {
              const Icon = t.icon;
              const active = section === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSection(t.key)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition ${
                    active
                      ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/40"
                      : "text-white/60 hover:text-white/90 border border-transparent"
                  }`}
                >
                  <Icon size={11} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-3 space-y-2">
            <p className="text-[11px] text-white/40">
              Stored locally — pre-fills every resume you build.
            </p>

            {/* ── CONTACT ────────────────────────────────────────── */}
            {section === "contact" && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Full name"   value={profile.name}     onChange={setContact("name")}     placeholder="Jane Smith" />
                  <Field label="Email"       value={profile.email}    onChange={setContact("email")}    placeholder="jane@email.com" type="email" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Phone"       value={profile.phone}    onChange={setContact("phone")}    placeholder="+1 555 000 0000" />
                  <Field label="Location"    value={profile.location} onChange={setContact("location")} placeholder="San Francisco, CA" />
                </div>
                <Field label="LinkedIn URL"  value={profile.linkedin} onChange={setContact("linkedin")} placeholder="linkedin.com/in/janesmith" />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="GitHub"      value={profile.github}   onChange={setContact("github")}   placeholder="github.com/jane" />
                  <Field label="Website"     value={profile.website}  onChange={setContact("website")}  placeholder="janesmith.dev" />
                </div>
              </div>
            )}

            {/* ── SKILLS (categorized chips) ─────────────────────── */}
            {section === "skills" && (
              <div className="space-y-2">
                {SKILL_CATEGORIES.map(cat => {
                  const chips = parseChips(profile.skills[cat.key]);
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="text-[10px] uppercase tracking-widest text-white/50">{cat.label}</div>
                        {chips.length > 0 && (
                          <div className="text-[10px] text-white/30">{chips.length}</div>
                        )}
                      </div>
                      {chips.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {chips.map(chip => (
                            <span
                              key={chip}
                              className="inline-flex items-center gap-1 text-[11px] bg-indigo-500/15 border border-indigo-400/30 text-indigo-100 rounded-full pl-2 pr-1 py-0.5"
                            >
                              {chip}
                              <button
                                type="button"
                                onClick={() => removeChipFrom(cat.key, chip)}
                                className="text-indigo-200/60 hover:text-white hover:bg-indigo-400/30 rounded-full w-3.5 h-3.5 flex items-center justify-center"
                                aria-label={`Remove ${chip}`}
                              >
                                <X size={9} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <ChipInput
                        placeholder={cat.placeholder}
                        onCommit={(val) => addChipTo(cat.key, val)}
                      />
                    </div>
                  );
                })}
                <p className="text-[10px] text-white/30 pt-1">
                  Press Enter or comma to add a chip. Categories help ATS parsers map skills correctly.
                </p>
              </div>
            )}

            {/* ── PROJECTS (repeatable cards) ────────────────────── */}
            {section === "projects" && (
              <div className="space-y-2">
                {profile.projects.length === 0 && (
                  <div className="text-[11px] text-white/40 italic">No projects yet — add your strongest ones first.</div>
                )}
                {profile.projects.map((pr, i) => (
                  <div key={i} className="hairline rounded-lg p-2 space-y-1.5 bg-white/[0.02]">
                    <div className="flex items-start gap-1.5">
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <input
                          value={pr.name}
                          onChange={(e) => updateProject(i, { name: e.target.value })}
                          placeholder="Project name"
                          className="hairline rounded-md p-1.5 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <input
                          value={pr.tech}
                          onChange={(e) => updateProject(i, { tech: e.target.value })}
                          placeholder="Tech (Python, React…)"
                          className="hairline rounded-md p-1.5 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProject(i)}
                        className="text-white/30 hover:text-red-300 p-1"
                        aria-label="Remove project"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <input
                      value={pr.link}
                      onChange={(e) => updateProject(i, { link: e.target.value })}
                      placeholder="Link (github.com/you/repo or demo URL)"
                      className="w-full hairline rounded-md p-1.5 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <textarea
                      value={pr.bullets}
                      onChange={(e) => updateProject(i, { bullets: e.target.value })}
                      rows={3}
                      placeholder={"One bullet per line:\nBuilt X that achieved Y\nShipped feature for N users"}
                      className="w-full hairline rounded-md p-1.5 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addProject}
                  className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg hairline text-[11px] text-white/70 hover:text-white hover:border-indigo-400/50 transition"
                >
                  <Plus size={12} /> Add project
                </button>
              </div>
            )}

            {/* ── CREDENTIALS (certs + education) ────────────────── */}
            {section === "credentials" && (
              <div className="space-y-3">
                <SimpleList
                  icon={Award}
                  title="Certifications"
                  items={profile.certifications}
                  placeholderA="Cert name (AWS SAA)"
                  placeholderB="Issuer"
                  onAdd={() => addSimple("certifications")}
                  onUpdate={(i, d) => updateSimple("certifications", i, d)}
                  onRemove={(i) => removeSimple("certifications", i)}
                />
                <SimpleList
                  icon={GraduationCap}
                  title="Education"
                  items={profile.education}
                  placeholderA="School / University"
                  placeholderB="Degree / Field"
                  onAdd={() => addSimple("education")}
                  onUpdate={(i, d) => updateSimple("education", i, d)}
                  onRemove={(i) => removeSimple("education", i)}
                />
              </div>
            )}

            {/* ── WINS BANK (the unique one) ─────────────────────── */}
            {section === "wins" && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Trophy size={12} className="text-amber-300" />
                  <div className="text-[11px] font-medium text-amber-200">Wins Bank</div>
                  <span className="text-[9px] bg-amber-300/10 border border-amber-300/30 text-amber-200 px-1.5 py-0.5 rounded-full">
                    AI uses this
                  </span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Dump your brag-worthy lines and metrics here — numbers, outcomes,
                  scale. When you build for a JD, the AI pulls the most relevant
                  ones into your bullets. Doesn't appear verbatim on the resume.
                </p>
                <textarea
                  value={profile.winsBank}
                  onChange={setContact("winsBank")}
                  rows={8}
                  placeholder={[
                    "• Led 12-person team that shipped onboarding redesign — activation +34%",
                    "• Cut p95 API latency from 820ms → 180ms (−78%) by rewriting N+1 queries",
                    "• Presented to 2,000-person Reinvent audience, 4.8/5 rating",
                    "• Owned $3M ARR product line, grew to $7M over 14 months",
                    "• Open-source lib (15k★ on GitHub), maintainer since 2022",
                  ].join("\n")}
                  className="w-full hairline rounded-lg p-2 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-amber-300/60 resize-y font-mono"
                />
              </div>
            )}

            {/* Save button */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 mt-2 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 text-xs font-semibold transition"
            >
              <Save size={12} />
              {saved ? "Saved ✓" : "Save profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────────────────── */

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{label}</div>
      <input
        value={value}
        onChange={onChange}
        type={type}
        className="w-full hairline rounded-lg p-2 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
        placeholder={placeholder}
      />
    </div>
  );
}

/** Chip-entry input: Enter or comma commits, Backspace on empty deletes last. */
function ChipInput({
  placeholder, onCommit,
}: { placeholder: string; onCommit: (v: string) => void }) {
  const [val, setVal] = useState("");
  const commit = () => {
    const v = val.trim().replace(/,$/, "").trim();
    if (v) onCommit(v);
    setVal("");
  };
  return (
    <input
      value={val}
      onChange={(e) => {
        const v = e.target.value;
        if (v.endsWith(",")) { setVal(v.slice(0, -1)); commit(); return; }
        setVal(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
      }}
      onBlur={commit}
      placeholder={placeholder}
      className="w-full hairline rounded-md p-1.5 bg-transparent text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}

function SimpleList({
  icon: Icon, title, items, placeholderA, placeholderB,
  onAdd, onUpdate, onRemove,
}: {
  icon: any;
  title: string;
  items: SimpleEntry[];
  placeholderA: string;
  placeholderB: string;
  onAdd: () => void;
  onUpdate: (i: number, delta: Partial<SimpleEntry>) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={11} className="text-indigo-300" />
        <div className="text-[11px] font-medium text-white/80">{title}</div>
      </div>
      <div className="space-y-1.5">
        {items.length === 0 && (
          <div className="text-[10px] text-white/30 italic pl-4">None added.</div>
        )}
        {items.map((e, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              value={e.title}
              onChange={(ev) => onUpdate(i, { title: ev.target.value })}
              placeholder={placeholderA}
              className="flex-1 hairline rounded-md p-1.5 bg-transparent text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <input
              value={e.sub}
              onChange={(ev) => onUpdate(i, { sub: ev.target.value })}
              placeholder={placeholderB}
              className="flex-1 hairline rounded-md p-1.5 bg-transparent text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <input
              value={e.year}
              onChange={(ev) => onUpdate(i, { year: ev.target.value })}
              placeholder="Year"
              className="w-14 hairline rounded-md p-1.5 bg-transparent text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-white/30 hover:text-red-300 p-0.5"
              aria-label={`Remove ${title} entry`}
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1 py-1 rounded-md hairline text-[10px] text-white/60 hover:text-white hover:border-indigo-400/50 transition"
        >
          <Plus size={10} /> Add {title.toLowerCase().slice(0, -1)}
        </button>
      </div>
    </div>
  );
}
