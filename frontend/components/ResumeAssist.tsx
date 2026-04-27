"use client";
import { useState } from "react";
import { Wand2, Loader2, Check, X } from "lucide-react";
import { assistResume } from "@/lib/api";

type Example = { label: string; instruction: string; group: string };

const EXAMPLES: Example[] = [
  // Summary
  { group: "Summary", label: "Rewrite summary for senior SWE",
    instruction: "Rewrite the summary for a senior software engineer role, 3 lines max, lead with strongest impact." },
  { group: "Summary", label: "Shorten summary",
    instruction: "Shorten the summary to 2 lines, keep the strongest achievement." },
  { group: "Summary", label: "Add a headline",
    instruction: "Add a one-line headline above the summary that captures my target role and years of experience." },

  // Experience
  { group: "Experience", label: "Add metrics to bullets",
    instruction: "Tighten the experience bullets and add realistic [metric] placeholders where numbers are missing." },
  { group: "Experience", label: "Stronger action verbs",
    instruction: "Rewrite experience bullets to start with strong action verbs (Led, Built, Shipped, Reduced, Scaled). Remove passive voice and 'responsible for'." },
  { group: "Experience", label: "Add a bullet to latest job",
    instruction: "Add one new bullet to my most recent role about mentoring or code review impact. Use [metric] placeholder." },

  // Projects
  { group: "Projects", label: "Add project: chat app",
    instruction: "Add a project: built a real-time chat app using React, Node, and Socket.IO. 2 bullets, include latency/user-count [metric] placeholders." },
  { group: "Projects", label: "Add project: URL shortener",
    instruction: "Add a project: URL shortener with Go, Redis, and 99.9% uptime. 2 bullets." },
  { group: "Projects", label: "Add side project from GitHub",
    instruction: "Add a new Projects section with one bullet about my top GitHub repo. Use [repo-name] and [metric] placeholders." },

  // Skills
  { group: "Skills", label: "Add backend skills",
    instruction: "Add Python, Go, AWS, Docker, Kubernetes, PostgreSQL to skills. Group by category." },
  { group: "Skills", label: "Add frontend skills",
    instruction: "Add React, TypeScript, Next.js, Tailwind CSS to skills. Group by category." },
  { group: "Skills", label: "Organize skills by category",
    instruction: "Reorganize the skills section into categories (Languages, Frameworks, Cloud, Tools). Keep everything I already have." },

  // Certifications
  { group: "Certifications", label: "AWS SAA",
    instruction: "Add a certification: AWS Solutions Architect Associate, 2024." },
  { group: "Certifications", label: "GCP ACE",
    instruction: "Add a certification: Google Cloud Associate Cloud Engineer, 2024." },
  { group: "Certifications", label: "CKA",
    instruction: "Add a certification: Certified Kubernetes Administrator (CKA), 2024." },

  // Education
  { group: "Education", label: "Add relevant coursework",
    instruction: "Under Education, add relevant coursework: Distributed Systems, Machine Learning, Databases, Operating Systems." },
  { group: "Education", label: "Add GPA + honors",
    instruction: "Under Education, add GPA [value] and honors like Dean's List if applicable. Use [placeholder] if unknown." },

  // Awards
  { group: "Awards", label: "Hackathon winner",
    instruction: "Add an Awards section: Hackathon winner at MLH 2023." },
  { group: "Awards", label: "Employee of the quarter",
    instruction: "Add an Awards section with: Employee of the Quarter at [Company], [Year]." },

  // Structure
  { group: "Structure", label: "Reorder: experience first",
    instruction: "Reorder sections so Experience comes right after Summary, then Projects, Skills, Education, Certifications." },
  { group: "Structure", label: "Fix tense consistency",
    instruction: "Make verb tense consistent: past tense for past roles, present tense only for my current role." },
];

const GROUPS = ["Summary", "Experience", "Projects", "Skills", "Certifications", "Education", "Awards", "Structure"] as const;

export default function ResumeAssist({
  resumeText, setResumeText,
}: {
  resumeText: string; setResumeText: (v: string) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ updated: string; summary: string } | null>(null);
  const [err, setErr] = useState("");
  const [activeGroup, setActiveGroup] = useState<typeof GROUPS[number]>("Summary");

  const run = async () => {
    setErr("");
    if (!resumeText.trim()) { setErr("Upload or paste your resume first."); return; }
    if (!instruction.trim()) { setErr("Tell me what to add or change."); return; }
    setLoading(true);
    try {
      const r = await assistResume(resumeText, instruction);
      // Guard: LLM occasionally returns updated_resume as an object instead of plain text
      const updatedText = typeof r.updated_resume === "string"
        ? r.updated_resume
        : (r.updated_resume ? Object.values(r.updated_resume as Record<string,string>).join("\n\n") : resumeText);
      setPreview({ updated: updatedText, summary: typeof r.summary === "string" ? r.summary : "" });
    } catch (e: any) {
      setErr(e.message || "Assist failed");
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!preview) return;
    setResumeText(preview.updated);
    setPreview(null);
    setInstruction("");
  };

  const discard = () => {
    setPreview(null);
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="text-indigo-400" size={18} />
        <div className="text-lg font-semibold">Ask AI to edit your resume</div>
      </div>
      <p className="text-[12px] text-white/50 mb-3">
        Give a short instruction. The AI will update your resume text and show a preview before applying.
      </p>

      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={2}
        placeholder="e.g. Add a project: built a URL shortener with Go, Redis, and 99.9% uptime"
        className="w-full hairline rounded-lg p-2 bg-transparent text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      />

      <div className="mb-2">
        <div className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Quick examples by section</div>
        <div className="flex flex-wrap gap-1 mb-2">
          {GROUPS.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`text-[10px] rounded-md px-2 py-1 transition ${
                activeGroup === g
                  ? "bg-indigo-500 text-white"
                  : "hairline text-white/60 hover:text-white hover:border-white/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mb-3">
          {EXAMPLES.filter((e) => e.group === activeGroup).map((ex) => (
            <button
              key={ex.label}
              onClick={() => setInstruction(ex.instruction)}
              title={ex.instruction}
              className="text-[10px] hairline rounded-md px-2 py-1 text-white/60 hover:text-white hover:border-white/30"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading || !instruction.trim()}
        className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2"
      >
        {loading ? <><Loader2 className="animate-spin" size={14} /> Thinking…</> : <>✨ Generate edit</>}
      </button>

      {err && <div className="text-sm text-red-300 mt-2">{err}</div>}

      {preview && (
        <div className="mt-4 space-y-2">
          <div className="text-xs uppercase tracking-widest text-white/50">Proposed change</div>
          {preview.summary && (
            <div className="hairline rounded-lg p-2 text-sm text-white/80 bg-indigo-500/5 border-indigo-400/30">
              {preview.summary}
            </div>
          )}
          <div className="hairline rounded-lg p-3 bg-black/30 max-h-72 overflow-y-auto">
            <pre className="text-[11px] text-white/80 whitespace-pre-wrap font-mono">{preview.updated}</pre>
          </div>
          <div className="flex gap-2">
            <button
              onClick={apply}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium"
            >
              <Check size={14} /> Apply to resume
            </button>
            <button
              onClick={discard}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hairline text-white/70 hover:text-white text-sm"
            >
              <X size={14} /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
