"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface EmailDraftResult {
  subject?: string;
  body?: string;
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

const TONES = ["confident", "warm", "formal", "direct"] as const;
type Tone = (typeof TONES)[number];

export default function EmailApplyHelper({
  resumeText,
  jdText,
}: {
  resumeText: string;
  jdText: string;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState<Tone>("confident");
  const [result, setResult] = useState<EmailDraftResult | null>(null);
  const [editableBody, setEditableBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);

  const draft = async () => {
    if (!company.trim() || !role.trim()) {
      setError("Please fill in company name and role.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/email-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          jd_text: jdText,
          company,
          role,
          tone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Draft failed");
      setResult(data);
      setEditableBody(data.body ?? "");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copySubject = async () => {
    if (!result?.subject) return;
    try {
      await navigator.clipboard.writeText(result.subject);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 1500);
    } catch {}
  };

  const copyFull = async () => {
    const text = `Subject: ${result?.subject ?? ""}\n\n${editableBody}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 1500);
    } catch {}
  };

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-3">Email Apply Helper</div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <input
          className="hairline rounded-lg p-2 bg-transparent text-sm col-span-1 focus:outline-none focus:border-indigo-500/60 transition"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Company name"
        />
        <input
          className="hairline rounded-lg p-2 bg-transparent text-sm col-span-1 focus:outline-none focus:border-indigo-500/60 transition"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role / position"
        />
        <select
          className="hairline rounded-lg p-2 bg-transparent text-sm focus:outline-none focus:border-indigo-500/60 transition"
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
        >
          {TONES.map((t) => (
            <option key={t} value={t} className="bg-black capitalize">
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={draft}
        disabled={loading}
        className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50"
      >
        {loading ? <span className="flex items-center gap-2">Drafting <Spinner /></span> : "Draft Email"}
      </button>

      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}

      {result && (
        <div className="mt-4 space-y-3">
          {/* Subject line */}
          {result.subject && (
            <div className="hairline rounded-lg p-3 flex items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
                  Subject
                </div>
                <div className="text-sm text-white font-medium">{result.subject}</div>
              </div>
              <button
                onClick={copySubject}
                className="shrink-0 hairline rounded-lg px-2.5 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5"
              >
                {copiedSubject ? (
                  <><Check size={11} className="text-emerald-300" /> Copied</>
                ) : (
                  <><Copy size={11} /> Copy</>
                )}
              </button>
            </div>
          )}

          {/* Email body */}
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
              Body
            </div>
            <textarea
              className="hairline rounded-lg p-3 bg-transparent text-sm w-full resize-none focus:outline-none focus:border-indigo-500/60 transition font-sans"
              rows={14}
              value={editableBody}
              onChange={(e) => setEditableBody(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={copyFull}
              className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5"
            >
              {copiedFull ? (
                <><Check size={11} className="text-emerald-300" /> Copied</>
              ) : (
                <><Copy size={11} /> Copy full email</>
              )}
            </button>
            <button
              onClick={draft}
              disabled={loading}
              className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition disabled:opacity-50"
            >
              {loading ? "…" : "Regenerate"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
