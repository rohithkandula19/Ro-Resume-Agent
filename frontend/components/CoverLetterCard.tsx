"use client";
import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { coverLetter, coverLetterPdf } from "@/lib/api";

function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadB64(b64: string, filename: string, mime: string) {
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

export default function CoverLetterCard({ resumeText, jdText }: { resumeText: string; jdText: string }) {
  const [company, setCompany] = useState("");
  const [tone, setTone] = useState("confident");
  const [letter, setLetter] = useState("");
  const [aiLetter, setAiLetter] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  const run = async () => {
    if (!resumeText || !jdText || !company) return alert("Need resume, JD, and company name.");
    setLoading(true); setError(""); setEditing(false);
    try {
      const r = await coverLetter(resumeText, jdText, company, tone);
      const generated = r?.letter || "";
      setLetter(generated);
      setAiLetter(generated);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally { setLoading(false); }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { console.warn("copy failed", e); }
  };

  const startEdit = () => {
    setDraftText(letter);
    setEditing(true);
  };

  const doneEdit = () => {
    setLetter(draftText);
    setEditing(false);
  };

  const resetEdit = () => {
    setLetter(aiLetter);
    setEditing(false);
  };

  const slug = (company || "cover-letter").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div className="glass rounded-2xl p-5 glow">
      <div className="text-lg font-semibold mb-3">Cover Letter</div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <input className="hairline rounded-lg p-2 bg-transparent text-sm col-span-2"
          value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
        <select className="hairline rounded-lg p-2 bg-transparent text-sm"
          value={tone} onChange={(e) => setTone(e.target.value)}>
          {["confident","warm","formal","punchy"].map((t) => <option key={t} className="bg-black">{t}</option>)}
        </select>
      </div>
      <button onClick={run} disabled={loading}
        className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50">
        {loading ? "Writing…" : "Generate cover letter"}
      </button>
      {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      {letter && (
        <>
          <div className="flex gap-2 mt-3 flex-wrap">
            {!editing ? (
              <button
                onClick={startEdit}
                className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={doneEdit}
                  className="rounded-lg px-3 py-1.5 text-xs bg-indigo-500 hover:bg-indigo-400 text-white transition flex items-center gap-1.5"
                >
                  Done
                </button>
                <button
                  onClick={resetEdit}
                  className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-rose-400 text-rose-300 transition flex items-center gap-1.5"
                >
                  Reset
                </button>
              </>
            )}
            <button
              onClick={copy}
              className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5"
            >
              {copied ? <><Check size={12} className="text-emerald-300" /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
            <button
              onClick={async () => {
                setPdfBusy(true);
                try {
                  const r = await coverLetterPdf(letter, company);
                  downloadB64(r.pdf_base64, `cover-letter-${slug}.pdf`, "application/pdf");
                } catch (e: any) {
                  setError(e.message || "PDF export failed");
                } finally { setPdfBusy(false); }
              }}
              disabled={pdfBusy}
              className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download size={12} /> {pdfBusy ? "…" : ".pdf"}
            </button>
            <button
              onClick={() => downloadText(letter, `cover-letter-${slug}.txt`, "text/plain")}
              className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5"
            >
              <Download size={12} /> .txt
            </button>
            <button
              onClick={() => {
                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${
                  letter.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, "<br/>").replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`).join("")
                }</body></html>`;
                downloadText(html, `cover-letter-${slug}.doc`, "application/msword");
              }}
              className="hairline rounded-lg px-3 py-1.5 text-xs hover:border-indigo-400 transition flex items-center gap-1.5"
            >
              <Download size={12} /> .doc
            </button>
          </div>
          {editing ? (
            <textarea
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              className="mt-3 w-full min-h-[24rem] hairline rounded-lg p-3 bg-white/5 text-sm text-white/90 font-sans leading-relaxed resize-y focus:outline-none focus:border-indigo-400 transition"
            />
          ) : (
            <pre className="mt-3 whitespace-pre-wrap text-sm text-white/80 hairline rounded-lg p-3 font-sans">{letter}</pre>
          )}
        </>
      )}
    </div>
  );
}
