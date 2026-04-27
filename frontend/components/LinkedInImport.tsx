"use client";
import { useState } from "react";

interface ParsedExperience {
  title: string;
  org: string;
  dates: string;
}

interface LinkedInResult {
  name?: string;
  headline?: string;
  experience?: ParsedExperience[];
  skills?: string[];
  resume_text?: string;
}

function Spinner() {
  return (
    <span className="inline-flex items-center gap-1 text-white/50 text-sm">
      <span className="animate-bounce delay-0">.</span>
      <span className="animate-bounce delay-75">.</span>
      <span className="animate-bounce delay-150">.</span>
    </span>
  );
}

export default function LinkedInImport({ onImport }: { onImport: (resumeText: string) => void }) {
  const [profileText, setProfileText] = useState("");
  const [result, setResult] = useState<LinkedInResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imported, setImported] = useState(false);

  const convert = async () => {
    if (!profileText.trim()) {
      setError("Please paste your LinkedIn profile text first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setImported(false);
    try {
      const res = await fetch("/api/linkedin-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_text: profileText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Import failed");
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (result?.resume_text) {
      onImport(result.resume_text);
      setImported(true);
    }
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-1">LinkedIn Import</div>
      <p className="text-xs text-white/40 mb-3">
        Copy your LinkedIn <span className="text-white/60 font-medium">About section</span> +{" "}
        <span className="text-white/60 font-medium">all Experience entries</span> and paste here.
      </p>

      <textarea
        className="hairline rounded-lg p-2 bg-transparent text-sm w-full resize-none focus:outline-none focus:border-indigo-500/60 transition mb-3"
        rows={7}
        value={profileText}
        onChange={(e) => setProfileText(e.target.value)}
        placeholder={`John Doe\nSenior Software Engineer at Acme Corp\n\nAbout\nPassionate engineer with 8 years of experience…\n\nExperience\nSenior Software Engineer · Acme Corp\nJan 2020 – Present · 4 yrs 4 mos\nLed a team of 6 engineers…`}
      />

      <button
        onClick={convert}
        disabled={loading}
        className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? <span className="flex items-center gap-2">Importing <Spinner /></span> : "Import & Convert"}
      </button>

      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

      {result && (
        <div className="mt-4 space-y-4">
          {/* Name + Headline */}
          {(result.name || result.headline) && (
            <div className="hairline rounded-lg p-3">
              {result.name && <div className="font-semibold text-white">{result.name}</div>}
              {result.headline && <div className="text-sm text-white/60 mt-0.5">{result.headline}</div>}
            </div>
          )}

          {/* Experience */}
          {result.experience && result.experience.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Experience
              </div>
              <ul className="space-y-2">
                {result.experience.map((exp, i) => (
                  <li key={i} className="hairline rounded-lg p-2.5">
                    <div className="text-sm font-medium text-white">{exp.title}</div>
                    <div className="text-xs text-white/60 mt-0.5">
                      {exp.org}
                      {exp.dates && <span className="ml-2 text-white/40">· {exp.dates}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skills */}
          {result.skills && result.skills.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Use button / success state */}
          {result.resume_text && (
            <div>
              {imported ? (
                <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Resume imported successfully
                </div>
              ) : (
                <button
                  onClick={handleUse}
                  className="px-4 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium"
                >
                  Use this resume
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
