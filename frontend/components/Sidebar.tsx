"use client";
import { useEffect, useState, useMemo } from "react";

import { Upload, FileText, Sparkles, AlertTriangle } from "lucide-react";
import { uploadResume } from "@/lib/api";
import ProfileCard, {
  profileContactText, profileExtrasText, profileWinsText,
  type ProfileData,
} from "@/components/ProfileCard";

const ATS_SAFE_FONTS = new Set([
  "Arial", "Calibri", "Helvetica", "Times New Roman", "Georgia",
  "Verdana", "Tahoma", "Garamond", "Cambria", "Inter",
]);

function jdYearsRequirement(jd: string): number | null {
  if (!jd) return null;
  const m = jd.match(/(\d+)\+?\s*(?:to\s*\d+\s*)?years?\b/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 0 && n <= 30) return n;
  }
  return null;
}

type Props = {
  meta: any;
  resumeText: string; setResumeText: (v: string) => void;
  jdText: string; setJdText: (v: string) => void;
  role: string; setRole: (v: string) => void;
  years: number; setYears: (v: number) => void;
  stylePref: string; setStylePref: (v: string) => void;
  font: string; setFont: (v: string) => void;
  fontSize: number; setFontSize: (v: number) => void;
  template: string; setTemplate: (v: string) => void;
  onBuild: () => void;
  building: boolean;
};

export default function Sidebar(p: Props) {
  const [filename, setFilename] = useState("");
  const [uploading, setUploading] = useState(false);
  const [yearsStr, setYearsStr] = useState(String(p.years ?? ""));
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  useEffect(() => { setYearsStr(String(p.years ?? "")); }, [p.years]);

  const fontUnsafe = p.font && !ATS_SAFE_FONTS.has(p.font);
  const jdYears = useMemo(() => jdYearsRequirement(p.jdText), [p.jdText]);
  const yearsMismatch = jdYears !== null && p.years > 0 && p.years + 2 < jdYears;

  /** Merge profile into uploaded resume text:
   *  - Contact header prepended only if name not already present (avoid dupes)
   *  - Skills / Projects / Credentials appended only if those sections aren't
   *    already in the resume
   *  - Wins Bank always appended (it's LLM context, not printed verbatim) */
  const mergeProfile = (resumeText: string, pd: ProfileData | null): string => {
    if (!pd) return resumeText;
    const lc = resumeText.toLowerCase();

    const contact = profileContactText(pd).trim();
    const extras  = profileExtrasText(pd).trim();
    const wins    = profileWinsText(pd).trim();

    const hasName = !!pd.name && lc.includes(pd.name.toLowerCase());
    const hasSkillsHdr   = /\bskills\b/i.test(resumeText);
    const hasProjectsHdr = /\bprojects\b/i.test(resumeText);

    let out = resumeText;
    if (contact && !hasName) out = contact + "\n\n" + out;
    // Only append extras that aren't obviously already in the resume
    if (extras && !(hasSkillsHdr && hasProjectsHdr)) out = out + "\n\n" + extras;
    if (wins) out = out + "\n\n" + wins;
    return out;
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    setFilename(`Parsing ${f.name}…`);
    try {
      const r = await uploadResume(f);
      // Merge profile contact info into parsed resume text
      p.setResumeText(mergeProfile(r.text, profileData));
      setFilename(r.filename);
    } catch (e: any) {
      setFilename("");
      alert("Upload failed: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <aside className="glass rounded-2xl p-5 w-full md:w-[340px] md:shrink-0 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:overflow-y-auto">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="text-indigo-400" size={20} />
        <div className="text-xl font-bold">RO Resume Agent</div>
      </div>

      <ProfileCard onChange={setProfileData} />

      <label className="block mb-4">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Upload resume</div>
        <div className={`hairline rounded-lg p-3 flex items-center gap-2 cursor-pointer hover:border-white/30 ${uploading ? "opacity-70 animate-pulse" : ""}`}>
          <Upload size={16} className="text-white/60" />
          <span className="text-sm text-white/70 truncate">{filename || "PDF, DOCX, TXT, RTF, HTML, PNG, JPG"}</span>
          <input type="file" className="hidden"
            disabled={uploading}
            accept=".pdf,.docx,.txt,.md,.rtf,.html,.htm,.png,.jpg,.jpeg"
            onChange={(e) => onFile(e.target.files?.[0] || null)} />
        </div>
      </label>

      <label className="block mb-4">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Target JD (optional)</div>
        <textarea value={p.jdText} onChange={(e) => p.setJdText(e.target.value)}
          rows={6}
          className="w-full hairline rounded-lg p-2 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          placeholder="Paste the job description here…" />
      </label>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <label>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Role</div>
          <input value={p.role} onChange={(e) => p.setRole(e.target.value)}
            className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="SWE, PM…" />
        </label>
        <label>
          <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Years</div>
          <input
            type="text" inputMode="numeric" pattern="[0-9]*"
            value={yearsStr}
            placeholder="0"
            onChange={(e) => {
              const v = e.target.value.replace(/[^0-9]/g, "");
              setYearsStr(v);
              p.setYears(v === "" ? 0 : Number(v));
            }}
            className="w-full hairline rounded-lg p-2 bg-transparent text-sm" />
        </label>
      </div>

      <label className="block mb-4">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Design style</div>
        <select value={p.stylePref} onChange={(e) => p.setStylePref(e.target.value)}
          className="w-full hairline rounded-lg p-2 bg-transparent text-sm">
          {["minimal","modern","balanced","premium","executive","creative"].map((s) =>
            <option key={s} value={s} className="bg-black">{s}</option>
          )}
        </select>
      </label>

      <label className="block mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs uppercase tracking-widest text-white/50">Font</div>
          {fontUnsafe && (
            <div className="flex items-center gap-1 text-[10px] text-amber-300" title="Some ATS parsers mis-render non-standard fonts. Prefer Arial, Calibri, Helvetica, Times New Roman, or Inter.">
              <AlertTriangle size={10} /> not ATS-safe
            </div>
          )}
        </div>
        <select value={p.font} onChange={(e) => p.setFont(e.target.value)}
          className="w-full hairline rounded-lg p-2 bg-transparent text-sm max-h-40">
          {(p.meta?.fonts || []).map((f: string) =>
            <option key={f} value={f} className="bg-black">
              {ATS_SAFE_FONTS.has(f) ? "✓ " : ""}{f}
            </option>
          )}
        </select>
      </label>

      {yearsMismatch && (
        <div className="mb-4 hairline border border-amber-400/40 bg-amber-500/5 rounded-lg p-2.5 text-[11px] text-amber-200/90 flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-300" />
          <div>
            JD asks for ~{jdYears} yrs, you entered {p.years}. Tailored bullets will still try to fit — but expect recruiter pushback. Consider targeting roles closer to your level.
          </div>
        </div>
      )}

      <label className="block mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs uppercase tracking-widest text-white/50">Font size</div>
          <div className="text-xs text-white/70 font-mono">{(p.fontSize ?? 10).toFixed(1)}pt</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range" min={8} max={13} step={0.5}
            value={p.fontSize ?? 10}
            onChange={(e) => p.setFontSize?.(Number(e.target.value))}
            className="flex-1 accent-indigo-400"
          />
          <button
            type="button"
            onClick={() => p.setFontSize?.(10)}
            className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white/90 px-2 py-1 hairline rounded-md"
            title="Reset to default (10pt)"
          >
            Reset
          </button>
        </div>
        <div className="flex justify-between text-[10px] text-white/40 mt-1 px-1">
          <span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span>
        </div>
      </label>

      <label className="block mb-6">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-1">Template</div>
        <select value={p.template} onChange={(e) => p.setTemplate(e.target.value)}
          className="w-full hairline rounded-lg p-2 bg-transparent text-sm">
          {(p.meta?.templates || []).map((t: any) =>
            <option key={t.id} value={t.name} className="bg-black">{t.name}</option>
          )}
        </select>
      </label>

      <button onClick={p.onBuild} disabled={p.building}
        className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
        <FileText size={16} />
        {p.building ? "Building…" : "Build tailored resume"}
      </button>

      {p.resumeText && (
        <div className="mt-4 text-xs text-white/40">Parsed: {p.resumeText.length} chars</div>
      )}
    </aside>
  );
}
