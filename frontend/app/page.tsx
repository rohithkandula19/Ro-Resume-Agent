"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

// Always-loaded (shell + Build tab essentials)
import Sidebar from "@/components/Sidebar";
import ATSDial from "@/components/ATSDial";
import ATSBreakdown from "@/components/ATSBreakdown";
import LivePreview from "@/components/LivePreview";
import TemplateGallery from "@/components/TemplateGallery";
import ChatPanel from "@/components/ChatPanel";
import AuthModal from "@/components/AuthModal";
import UserMenu from "@/components/UserMenu";

// Lazy-loaded tab content — compiled only when the tab is opened.
// ssr:false skips server prerender (these are client-only anyway) and
// shaves cold-compile time dramatically.
const BattleMode          = dynamic(() => import("@/components/BattleMode"), { ssr: false });
const XrayOverlay         = dynamic(() => import("@/components/XrayOverlay"), { ssr: false });
const ScanSimulator       = dynamic(() => import("@/components/ScanSimulator"), { ssr: false });
const PersonaReview       = dynamic(() => import("@/components/PersonaReview"), { ssr: false });
const CoverLetterCard     = dynamic(() => import("@/components/CoverLetterCard"), { ssr: false });
const LinkedInPackCard    = dynamic(() => import("@/components/LinkedInPackCard"), { ssr: false });
const AchievementMiner    = dynamic(() => import("@/components/AchievementMiner"), { ssr: false });
const GithubImport        = dynamic(() => import("@/components/GithubImport"), { ssr: false });
const SalaryBand          = dynamic(() => import("@/components/SalaryBand"), { ssr: false });
const AIAnalyzer          = dynamic(() => import("@/components/AIAnalyzer"), { ssr: false });
const TailoringDiff       = dynamic(() => import("@/components/TailoringDiff"), { ssr: false });
const ResumeEditor        = dynamic(() => import("@/components/ResumeEditor"), { ssr: false });
const ResumeCritiquePanel = dynamic(() => import("@/components/ResumeCritique"), { ssr: false });
const ResumeAssist        = dynamic(() => import("@/components/ResumeAssist"), { ssr: false });
const ParserTest          = dynamic(() => import("@/components/ParserTest"), { ssr: false });
const SessionHistory      = dynamic(() => import("@/components/SessionHistory"), { ssr: false });
const InterviewPrep       = dynamic(() => import("@/components/InterviewPrep"), { ssr: false });
const MockInterview       = dynamic(() => import("@/components/MockInterview"), { ssr: false });
const VersionCompare      = dynamic(() => import("@/components/VersionCompare"), { ssr: false });
const OfferCompare        = dynamic(() => import("@/components/OfferCompare"), { ssr: false });
const UsagePanel          = dynamic(() => import("@/components/UsagePanel"), { ssr: false });
const ScoreHistory        = dynamic(() => import("@/components/ScoreHistory"), { ssr: false });
const JDAnalyzer          = dynamic(() => import("@/components/JDAnalyzer"), { ssr: false });
const MultiResumeCompare  = dynamic(() => import("@/components/MultiResumeCompare"), { ssr: false });
const LinkedInImport      = dynamic(() => import("@/components/LinkedInImport"), { ssr: false });
const EmailApplyHelper    = dynamic(() => import("@/components/EmailApplyHelper"), { ssr: false });
import {
  fetchMeta, newSession, buildResume, runXray, runScan, gapAnalysis, atsScore,
  logDownload,
} from "@/lib/api";
import { useAuth, useProfileExtraction, useSessionAutoSave } from "@/hooks/useAuth";

const STORAGE_KEY = "ro-resume-agent:v1";

function loadPersisted(): Partial<{
  resumeText: string; jdText: string; role: string; years: number;
  stylePref: string; font: string; fontSize: number; template: string;
  editedResume: any; mustIncludeKeywords: string[];
}> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function savePersisted(data: any) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
  catch { /* quota exceeded — silent */ }
}

function resumeJsonToText(resume: any): string {
  if (!resume || typeof resume !== "object") return "";
  const parts: string[] = [];
  if (resume.name) parts.push(resume.name);
  if (resume.summary) parts.push(resume.summary);
  if (Array.isArray(resume.skills)) parts.push(resume.skills.join(" "));
  for (const exp of resume.experience || []) {
    parts.push([exp.title, exp.org, exp.dates].filter(Boolean).join(" "));
    for (const b of exp.bullets || []) parts.push(b);
  }
  for (const proj of resume.projects || []) {
    parts.push([proj.title, proj.org].filter(Boolean).join(" "));
    for (const b of proj.bullets || []) parts.push(b);
  }
  for (const edu of resume.education || []) {
    parts.push([edu.degree, edu.school, edu.dates].filter(Boolean).join(" "));
  }
  if (Array.isArray(resume.certifications)) parts.push(resume.certifications.join(" "));
  return parts.join("\n");
}

function downloadFile(b64: string | undefined, filename: string, mime: string) {
  if (!b64) return;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const TABS = ["Build", "Optimize", "Analyze", "AI Analyzer", "AI Editor", "Interview", "Generate", "Tools"] as const;
type Tab = typeof TABS[number];

export default function Page() {
  const [meta, setMeta] = useState<any>(null);
  const [sid, setSid] = useState("");
  const [tab, setTab] = useState<Tab>("Build");

  // Always initialize with defaults — loadPersisted() reads localStorage which is
  // unavailable during SSR, causing a hydration mismatch if used as useState initializer.
  // We load it in a useEffect (after mount) instead.
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [role, setRole] = useState("");
  const [years, setYears] = useState(0);
  const [stylePref, setStylePref] = useState("minimal");
  const [font, setFont] = useState("Inter");
  const [fontSize, setFontSize] = useState(10);
  const [template, setTemplate] = useState("Google XYZ Format");

  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState("");
  const [buildResult, setBuildResult] = useState<any>(null);
  const [xray, setXray] = useState<any>(null);
  const [scan, setScan] = useState<any>(null);
  const [atsScoreNum, setAtsScoreNum] = useState(0);
  const [atsDetail, setAtsDetail] = useState<any>(null);
  const [originalAtsScore, setOriginalAtsScore] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const init = async (attempt = 0) => {
      try {
        const [m, s] = await Promise.all([fetchMeta(), newSession()]);
        if (!cancelled) { setMeta(m); setSid(s.session_id); }
      } catch (e) {
        if (!cancelled && attempt < 3) setTimeout(() => init(attempt + 1), 2000 * (attempt + 1));
        else console.warn("session init failed after retries", e);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  const hasBuiltOnce = useRef(false);
  const onBuildRef = useRef<(opts?: { extraKeywords?: string[]; resumeOverride?: any }) => void>(() => {});
  // Ref so applyExtImport can read the latest resumeText without stale closure
  const resumeTextRef = useRef("");

  const [mustIncludeKeywords, setMustIncludeKeywords] = useState<string[]>([]);
  const [editedResume, setEditedResume] = useState<any>(null);
  const [autoOptimizing, setAutoOptimizing] = useState(false);
  const [lastAutoAdded, setLastAutoAdded] = useState<string[]>([]);
  const [persistedLoaded, setPersistedLoaded] = useState(false);

  // Load persisted data client-side only (after mount) to avoid SSR/hydration mismatch.
  useEffect(() => {
    const p = loadPersisted();
    if (p.resumeText) setResumeText(p.resumeText);
    if (p.jdText) setJdText(p.jdText);
    if (p.role) setRole(p.role);
    if (typeof p.years === "number") setYears(p.years);
    if (p.stylePref) setStylePref(p.stylePref);
    if (p.font) setFont(p.font);
    if (typeof p.fontSize === "number") setFontSize(p.fontSize);
    if (p.template) setTemplate(p.template);
    if (p.mustIncludeKeywords) setMustIncludeKeywords(p.mustIncludeKeywords);
    if (p.editedResume) setEditedResume(p.editedResume);
    setPersistedLoaded(true);
  }, []);

  const [extToast, setExtToast] = useState("");

  // Chrome extension import: reads a payload left in localStorage by the extension.
  // Works both on page load (extension opened app) and while page is already open
  // (extension injected while app was already in a tab).
  const applyExtImport = (raw: string | null) => {
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      const hasJd = !!d.jd_text;
      if (hasJd) setJdText(d.jd_text);
      if (d.role) setRole(d.role);
      localStorage.removeItem("ro-ext-import");

      const label = [d.role, d.company].filter(Boolean).join(" @ ");
      const hasResume = !!resumeTextRef.current;

      setTab("Build");

      if (!hasJd) {
        // Scraper couldn't extract the JD — navigate to app, let user paste manually
        setExtToast(label
          ? `📋 Opened: ${label} — JD not captured, paste it below`
          : "📋 Job page opened — paste the JD in the Target JD field below");
      } else if (hasResume) {
        // Resume + JD both available → auto-build
        setExtToast(label
          ? `⚡ Auto-building for: ${label}`
          : "⚡ JD imported — building tailored resume…");
        // Flush setJdText/setRole state first, then build
        setTimeout(() => onBuildRef.current(), 400);
      } else {
        // JD ready, no resume yet
        setExtToast(label
          ? `📋 JD imported: ${label} — upload your resume to build`
          : "📋 JD imported — upload your resume to build");
      }

      setTimeout(() => setExtToast(""), 6000);
    } catch { /* ignore malformed payload */ }
  };

  useEffect(() => {
    // 1. Immediate check on mount
    applyExtImport(localStorage.getItem("ro-ext-import"));

    // 2. Poll localStorage for 10 seconds after mount (500ms intervals).
    //    This catches the case where the content script sets localStorage
    //    slightly after React mounts (timing gap between document_idle and hydration).
    let polls = 0;
    const pollTimer = setInterval(() => {
      polls++;
      const pending = localStorage.getItem("ro-ext-import");
      if (pending) applyExtImport(pending);
      if (polls >= 20) clearInterval(pollTimer); // stop after 10 s
    }, 500);

    // 3. document CustomEvent — content script fires this after setting localStorage
    const onDocEvent = (e: Event) => {
      applyExtImport((e as CustomEvent).detail as string);
    };
    document.addEventListener("ro-ext-import", onDocEvent);

    // 4. Global direct-call hook (world:"MAIN" executeScript path, kept as fallback)
    (window as any).__RO_APPLY_IMPORT = (raw: string) => applyExtImport(raw);

    // 5. postMessage fallback
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === "RO_EXT_IMPORT" && e.data?.payload) {
        const raw = typeof e.data.payload === "string"
          ? e.data.payload
          : JSON.stringify(e.data.payload);
        applyExtImport(raw);
      }
    };
    window.addEventListener("message", onMessage);

    return () => {
      clearInterval(pollTimer);
      document.removeEventListener("ro-ext-import", onDocEvent);
      window.removeEventListener("message", onMessage);
      delete (window as any).__RO_APPLY_IMPORT;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ref in sync so closures always see the latest resumeText
  useEffect(() => { resumeTextRef.current = resumeText; }, [resumeText]);

  useEffect(() => {
    if (!persistedLoaded) return; // don't overwrite storage before we've read it
    savePersisted({
      resumeText, jdText, role, years, stylePref, font, fontSize, template,
      editedResume, mustIncludeKeywords,
    });
  }, [persistedLoaded, resumeText, jdText, role, years, stylePref, font, fontSize, template, editedResume, mustIncludeKeywords]);

  const onBuild = async (opts: { extraKeywords?: string[]; resumeOverride?: any } = {}) => {
    if (!resumeText && !role) {
      setBuildError("Upload your resume or type a role first.");
      return;
    }
    setBuilding(true); setBuildError(""); setOriginalAtsScore(null);
    let res: any = null;
    try {
      const kws = Array.from(new Set([...(mustIncludeKeywords || []), ...(opts.extraKeywords || [])]));
      if (opts.extraKeywords?.length) setMustIncludeKeywords(kws);
      res = await buildResume({
        session_id: sid, profile_text: resumeText, jd_text: jdText,
        template, font, font_size: fontSize,
        must_include_keywords: kws,
        resume_override: opts.resumeOverride || null,
      });
      setBuildResult(res);
      if (!opts.resumeOverride) setEditedResume(res.resume);
    } catch (e: any) {
      setBuildError(e.message || "Build failed");
      setBuilding(false);
      return;
    }

    // Build succeeded — downstream analyses are best-effort, never block the UI.
    const jobs: Promise<any>[] = [];
    if (jdText) jobs.push(runXray(res.resume, jdText).then(setXray).catch(e => console.warn("xray failed", e)));
    const tailoredText = resumeJsonToText(res.resume) || resumeText;
    // Score the tailored resume (primary) and the original baseline in parallel
    jobs.push(atsScore(tailoredText, jdText, res.files_base64?.styled_pdf)
      .then(a => { setAtsDetail(a); setAtsScoreNum(a.composite ?? 0); })
      .catch(e => console.warn("ats-score failed", e)));
    if (res.original_resume && jdText) {
      const origText = resumeJsonToText(res.original_resume) || resumeText;
      jobs.push(atsScore(origText, jdText, res.files_base64?.original_pdf)
        .then(a => setOriginalAtsScore(a.composite ?? null))
        .catch(() => {}));
    }
    jobs.push(runScan(res.resume).then(setScan).catch(e => console.warn("scan failed", e)));
    await Promise.allSettled(jobs);
    hasBuiltOnce.current = true;
    setBuilding(false);
  };
  onBuildRef.current = onBuild;

  const revertToOriginal = () => {
    if (!buildResult?.original_resume) return;
    setMustIncludeKeywords([]);
    setLastAutoAdded([]);
    onBuild({ resumeOverride: buildResult.original_resume });
  };

  const autoOptimize = async () => {
    if (!buildResult || !jdText) {
      setBuildError("Build with a JD first, then auto-optimize.");
      return;
    }
    setAutoOptimizing(true);
    setBuildError("");
    try {
      let xr = xray;
      if (!xr) {
        xr = await runXray(buildResult.resume, jdText);
        setXray(xr);
      }
      const missing: string[] = xr?.missing_keywords || [];
      const lc = resumeText.toLowerCase();
      const plausible = missing.filter((k) => {
        const kw = (k || "").toLowerCase().trim();
        if (!kw) return false;
        if (lc.includes(kw)) return true;
        if (kw.endsWith("s") && lc.includes(kw.slice(0, -1))) return true;
        if (lc.includes(kw + "s")) return true;
        const words = kw.split(/\s+/).filter((w) => w.length > 2);
        if (words.length > 1 && words.every((w) => lc.includes(w))) return true;
        return false;
      });
      const toAdd = Array.from(new Set(plausible));
      if (toAdd.length === 0) {
        setBuildError("No plausible keywords to auto-add — your resume already covers what it can.");
        setAutoOptimizing(false);
        return;
      }
      setLastAutoAdded(toAdd);
      await onBuild({ extraKeywords: toAdd });
    } catch (e: any) {
      setBuildError(e.message || "Auto-optimize failed");
    } finally {
      setAutoOptimizing(false);
    }
  };

  // Auto-rebuild when the user changes template, font, or size after the first build.
  useEffect(() => {
    if (!hasBuiltOnce.current || building) return;
    const t = setTimeout(() => onBuildRef.current(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, font, fontSize]);

  const [previewMode, setPreviewMode] = useState<"tailored" | "original">("tailored");
  const styledPdfB64 = buildResult?.files_base64?.styled_pdf;
  const atsPdfB64 = buildResult?.files_base64?.ats_pdf;
  const originalPdfB64 = buildResult?.files_base64?.original_pdf;
  const hasOriginal = Boolean(originalPdfB64);
  const previewPdf = previewMode === "original" && originalPdfB64 ? originalPdfB64 : styledPdfB64;

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---------- auth + history (extracted into hooks) ----------
  const { user: authUser, setUser: setAuthUser, checked: authChecked } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const { extracting: extractingProfile, reset: resetProfileExtract } =
    useProfileExtraction(authUser, resumeText, setAuthUser);
  useSessionAutoSave(authUser, sid, {
    resumeText, jdText, role, stylePref, font, fontSize, template, years, mustIncludeKeywords, editedResume,
  });

  const loadSavedSession = (full: any) => {
    setSid(full.id);
    setResumeText(full.resume_text || "");
    setJdText(full.jd_text || "");
    setRole(full.role || "");
    const s = full.state || {};
    if (s.stylePref) setStylePref(s.stylePref);
    if (s.font) setFont(s.font);
    if (typeof s.fontSize === "number") setFontSize(s.fontSize);
    if (s.template) setTemplate(s.template);
    if (typeof s.years === "number") setYears(s.years);
    setMustIncludeKeywords(s.mustIncludeKeywords || []);
    setEditedResume(s.editedResume || null);
    setBuildResult(null);
    setXray(null); setScan(null); setAtsDetail(null); setAtsScoreNum(0);
  };

  const startNewSession = async () => {
    try {
      const s = await newSession();
      setSid(s.session_id);
      setResumeText(""); setJdText(""); setRole(""); setYears(0);
      setMustIncludeKeywords([]); setEditedResume(null); setBuildResult(null);
      setXray(null); setScan(null); setAtsDetail(null); setAtsScoreNum(0);
      setLastAutoAdded([]);
      resetProfileExtract();
    } catch (e) { console.warn("new session failed", e); }
  };

  if (authChecked && !authUser) {
    return <AuthModal onAuthed={(u) => { setAuthUser(u); }} />;
  }

  return (
    <main className="flex flex-col md:flex-row gap-4 p-3 md:p-4 min-h-screen">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden glass rounded-xl px-4 py-2 text-sm font-medium flex items-center justify-between"
        aria-label="Toggle inputs panel"
      >
        <span>{sidebarOpen ? "↑ Hide inputs" : "☰ Resume + JD inputs"}</span>
        {resumeText && <span className="text-[10px] text-emerald-300">✓ resume loaded</span>}
      </button>
      <div className={`${sidebarOpen ? "block" : "hidden"} md:block`}>
      <Sidebar
        meta={meta}
        resumeText={resumeText} setResumeText={setResumeText}
        jdText={jdText} setJdText={setJdText}
        role={role} setRole={setRole}
        years={years} setYears={setYears}
        stylePref={stylePref} setStylePref={setStylePref}
        font={font} setFont={setFont}
        fontSize={fontSize} setFontSize={setFontSize}
        template={template} setTemplate={setTemplate}
        onBuild={onBuild}
        building={building}
      />
      </div>

      <section className="flex-1 space-y-4 min-w-0">
        {extToast && (
          <div className="glass rounded-xl px-4 py-2.5 text-sm text-indigo-200 flex items-center gap-2 animate-pulse-once">
            {extToast}
          </div>
        )}
        {authUser && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-white/50 truncate">
              Signed in as <span className="text-white/80">{authUser.name || authUser.email}</span>
              {extractingProfile && <span className="ml-2 text-indigo-300">· extracting experience…</span>}
              {authUser.profile?.years_experience ? <span className="ml-2">· {authUser.profile.years_experience}y {authUser.profile.seniority}</span> : null}
            </div>
            <UserMenu
              user={authUser}
              onLogout={() => { setAuthUser(null); }}
              onOpenHistory={() => setShowHistory(true)}
            />
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <ATSDial score={atsScoreNum} label="Composite ATS Score" />
            {originalAtsScore !== null && atsScoreNum > 0 && (
              <div className="text-center text-sm text-white/60">
                Before tailoring: <span className="text-white/80 font-mono">{originalAtsScore}</span>
                {atsScoreNum > originalAtsScore && (
                  <span className="ml-2 text-emerald-400 font-semibold">▲ +{atsScoreNum - originalAtsScore} improved</span>
                )}
              </div>
            )}
            {buildResult && jdText && (
              <button
                onClick={autoOptimize}
                disabled={autoOptimizing || building}
                className="w-full px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium transition"
              >
                {autoOptimizing ? "Auto-optimizing…" : "✨ Auto-optimize ATS score"}
              </button>
            )}
            {buildResult?.original_resume && (
              <button
                onClick={revertToOriginal}
                disabled={building}
                className="w-full px-4 py-1.5 rounded-xl hairline text-xs text-white/70 hover:text-white hover:border-white/40 disabled:opacity-50 transition"
                title="Discard AI edits + keyword injections; rebuild from the clean original"
              >
                ↺ Revert to original (no AI tailoring)
              </button>
            )}
            {lastAutoAdded.length > 0 && (
              <div className="text-[11px] text-white/50 px-1">
                Added {lastAutoAdded.length} keyword{lastAutoAdded.length === 1 ? "" : "s"}: {lastAutoAdded.slice(0, 6).join(", ")}{lastAutoAdded.length > 6 ? "…" : ""}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="glass rounded-2xl p-5 glow h-full">
              <div className="text-xs uppercase tracking-widest text-white/50">Session</div>
              <div className="font-mono text-xs text-white/70 mt-1">{sid || "…"}</div>
              {buildResult && (
                <div className="mt-3 text-sm">
                  <div className="text-white/60">Template: <span className="text-white">{template}</span></div>
                  <div className="text-white/60">Styled font: <span className="text-white">{buildResult.styled_font}</span></div>
                  <div className="text-white/60">ATS font: <span className="text-white">{buildResult.ats_font}</span></div>
                  <div className={`mt-1 text-xs ${buildResult.preflight_styled.pass ? "text-emerald-300" : "text-amber-300"}`}>
                    Styled preflight: {buildResult.preflight_styled.pass ? "pass" : "issues"}
                  </div>
                  {buildResult.preflight_styled.issues?.map((i: string, n: number) => (
                    <div key={n} className="text-xs text-amber-300/80">· {i}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                tab === t ? "bg-indigo-500 text-white" : "hairline text-white/70 hover:border-white/30"
              }`}>{t}</button>
          ))}
        </div>

        {buildError && (
          <div className="text-red-400 text-sm px-1">{buildError}</div>
        )}

        {/* ── BUILD ──────────────────────────────────────────── */}
        {tab === "Build" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[60vh] md:h-[78vh] flex flex-col gap-2">
              {hasOriginal && (
                <div className="flex items-center gap-1 hairline rounded-xl p-1 w-fit">
                  <button onClick={() => setPreviewMode("original")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${previewMode === "original" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}>
                    Original
                  </button>
                  <button onClick={() => setPreviewMode("tailored")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition ${previewMode === "tailored" ? "bg-indigo-500 text-white" : "text-white/60 hover:text-white"}`}>
                    Tailored to JD
                  </button>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <LivePreview pdfBase64={previewPdf} filename={previewMode === "original" ? "resume_original.pdf" : "resume_styled.pdf"} />
              </div>
            </div>
            <div className="space-y-4">
              {buildResult && (
                <div className="glass rounded-2xl p-5 glow">
                  <div className="text-lg font-semibold mb-2">Downloads</div>
                  <div className="text-[11px] text-white/50 mb-2">Styled = pretty for humans · ATS = plain for applicant tracking systems</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(["styled_pdf","styled_docx","ats_pdf","ats_docx"] as const).map((k) => (
                      <button key={k}
                        onClick={() => {
                          const fn = `resume_${k}.${k.endsWith("pdf") ? "pdf" : "docx"}`;
                          downloadFile(buildResult.files_base64[k], fn, k.endsWith("pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
                          if (authUser) logDownload(k, fn, sid).catch(() => {});
                        }}
                        className="hairline rounded-lg p-2 text-center hover:border-indigo-400 transition">
                        {k.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {atsDetail && <ATSBreakdown data={atsDetail} />}
              <ScoreHistory currentScore={atsScoreNum} sessionId={sid} />
              <TemplateGallery role={role} years={years} stylePref={stylePref} onPick={setTemplate} selected={template} allTemplates={meta?.templates || []} />
            </div>
          </div>
        )}

        {/* ── OPTIMIZE ───────────────────────────────────────── */}
        {tab === "Optimize" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <XrayOverlay report={xray} applying={building} onApplyKeywords={(kws) => onBuild({ extraKeywords: kws })} />
              <LivePreview pdfBase64={atsPdfB64} filename="resume_ats.pdf" />
            </div>
            <TailoringDiff original={buildResult?.original_resume || null} tailored={buildResult?.resume || null} />
            <ResumeEditor
              resume={editedResume} resumeText={resumeText} jdText={jdText} role={role}
              onChange={setEditedResume}
              onRebuild={() => { if (!editedResume) return; onBuild({ resumeOverride: editedResume }); }}
              rebuilding={building}
            />
            <ResumeAssist resumeText={resumeText} setResumeText={setResumeText} />
          </div>
        )}

        {/* ── ANALYZE ────────────────────────────────────────── */}
        {tab === "Analyze" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResumeCritiquePanel resumeText={resumeText} role={role} jdText={jdText} />
              <JDAnalyzer jdText={jdText} />
            </div>
            <MultiResumeCompare jdText={jdText} />
            <ParserTest styledPdfB64={styledPdfB64} atsPdfB64={atsPdfB64} />
            <details className="glass rounded-2xl p-4">
              <summary className="text-sm font-semibold cursor-pointer text-white/80">ATS scan simulator</summary>
              <div className="mt-3"><ScanSimulator data={scan} /></div>
            </details>
            <details className="glass rounded-2xl p-4">
              <summary className="text-sm font-semibold cursor-pointer text-white/80">Persona review — how a recruiter reads it</summary>
              <div className="mt-3"><PersonaReview resumeText={resumeText} jdText={jdText} /></div>
            </details>
            <details className="glass rounded-2xl p-4">
              <summary className="text-sm font-semibold cursor-pointer text-white/80">Battle: your resume vs. JD</summary>
              <div className="mt-3"><BattleMode profileText={resumeText} jdText={jdText} /></div>
            </details>
          </div>
        )}

        {/* ── AI ANALYZER ────────────────────────────────────── */}
        {tab === "AI Analyzer" && (
          <div className="h-[78vh] flex flex-col">
            <AIAnalyzer
              resumeText={resumeText}
              jdText={jdText}
              role={role}
              builtResume={buildResult?.resume || editedResume}
              onApplyResumeText={(text) => setResumeText(text)}
            />
          </div>
        )}

        {/* ── AI EDITOR ──────────────────────────────────────── */}
        {tab === "AI Editor" && (
          <div className="space-y-6">
            <ResumeEditor
              resume={editedResume} resumeText={resumeText} jdText={jdText} role={role}
              onChange={setEditedResume}
              onRebuild={() => { if (!editedResume) return; onBuild({ resumeOverride: editedResume }); }}
              rebuilding={building}
            />
            <ResumeAssist resumeText={resumeText} setResumeText={setResumeText} />
          </div>
        )}

        {/* ── INTERVIEW ──────────────────────────────────────── */}
        {tab === "Interview" && (
          <div className="space-y-4">
            <InterviewPrep resumeText={resumeText} jdText={jdText} role={role} />
            <MockInterview resumeText={resumeText} jdText={jdText} role={role} />
          </div>
        )}

        {/* ── GENERATE ───────────────────────────────────────── */}
        {tab === "Generate" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CoverLetterCard resumeText={resumeText} jdText={jdText} />
              <EmailApplyHelper resumeText={resumeText} jdText={jdText} />
            </div>
            <LinkedInPackCard resumeText={resumeText} role={role} />
          </div>
        )}

        {/* ── TOOLS ──────────────────────────────────────────── */}
        {tab === "Tools" && (
          <div className="space-y-4">
            <LinkedInImport onImport={(text) => setResumeText(text)} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GithubImport role={role} />
              <AchievementMiner resumeText={resumeText} role={role} />
              <SalaryBand resumeText={resumeText} role={role} years={years} />
            </div>
            <OfferCompare />
            <VersionCompare sid={sid} />
            <UsagePanel />
          </div>
        )}
      </section>

      <ChatPanel
        sessionId={sid}
        resumeText={resumeText}
        jdText={jdText}
        onResumeParsed={(text) => setResumeText(text)}
      />

      <SessionHistory
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onLoad={loadSavedSession}
        onNew={startNewSession}
        currentSessionId={sid}
      />
    </main>
  );
}
