"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { parserTest } from "@/lib/api";

type Props = {
  styledPdfB64?: string;
  atsPdfB64?: string;
};

export default function ParserTest({ styledPdfB64, atsPdfB64 }: Props) {
  const [which, setWhich] = useState<"styled" | "ats">("ats");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const pdf = which === "ats" ? atsPdfB64 : styledPdfB64;
  const hasPdf = Boolean(pdf);

  const run = async () => {
    if (!pdf) return;
    setLoading(true); setError("");
    try {
      const r = await parserTest(pdf);
      setResult(r);
    } catch (e: any) {
      setError(e.message || "Parser test failed");
    } finally {
      setLoading(false);
    }
  };

  if (!hasPdf) {
    return (
      <div className="glass rounded-2xl p-5 text-sm text-white/50">
        Build your resume first, then come back here to test how real ATS parsers read your PDF.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-5 glow">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-lg font-semibold">Parser Test</div>
            <div className="text-xs text-white/50 mt-1 max-w-2xl">
              Runs the same open-source PDF extraction that Workday, Greenhouse, and Lever use under the hood.
              The output is <span className="text-white/80">ground truth</span> — exactly what an ATS sees when it reads your file.
              This tests parseability, not ranking.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1 hairline rounded-xl p-1">
            <button
              onClick={() => setWhich("ats")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                which === "ats" ? "bg-indigo-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              ATS PDF
            </button>
            <button
              onClick={() => setWhich("styled")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                which === "styled" ? "bg-indigo-500 text-white" : "text-white/60 hover:text-white"
              }`}
            >
              Styled PDF
            </button>
          </div>
          <button
            onClick={run}
            disabled={loading || !pdf}
            className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium"
          >
            {loading ? "Parsing…" : "Run Parser Test"}
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
      </div>

      {result && <ResultView data={result} />}
    </div>
  );
}

function ResultView({ data }: { data: any }) {
  const score = data.parse_quality_percent;
  const scoreColor = score >= 80 ? "text-emerald-300" : score >= 60 ? "text-amber-300" : "text-rose-300";

  return (
    <>
      <div className="glass rounded-2xl p-5">
        <div className="flex justify-between items-baseline mb-3">
          <div className="text-sm font-semibold">Parse Quality</div>
          <div className={`text-3xl font-bold ${scoreColor}`}>{score}%</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Check label="Text extractable" ok={data.scorecard.text_extractable} />
          <Check label="Name parsed" ok={data.scorecard.name_parsed} />
          <Check label="Email parsed" ok={data.scorecard.email_parsed} />
          <Check label="Phone parsed" ok={data.scorecard.phone_parsed} />
          <Check label="Experience section" ok={data.scorecard.experience_section_found} />
          <Check label="Education section" ok={data.scorecard.education_section_found} />
          <Check label="Skills section" ok={data.scorecard.skills_section_found} />
          <Check label={`Experience blocks (${data.scorecard.experience_blocks_detected})`} ok={data.scorecard.experience_blocks_detected > 0} />
        </div>
      </div>

      {data.warnings?.length > 0 && (
        <div className="glass rounded-2xl p-5 border border-amber-400/30">
          <div className="flex items-center gap-2 mb-2 text-amber-300">
            <AlertTriangle size={14} />
            <div className="text-sm font-semibold">Warnings</div>
          </div>
          <ul className="space-y-1 text-xs text-amber-100/80">
            {data.warnings.map((w: string, i: number) => <li key={i}>· {w}</li>)}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold mb-2">Contact extraction</div>
          <div className="space-y-1 text-sm">
            <ContactRow label="Name"     value={data.contact.name} />
            <ContactRow label="Email"    value={data.contact.email} />
            <ContactRow label="Phone"    value={data.contact.phone} />
            <ContactRow label="LinkedIn" value={data.contact.linkedin} />
            <ContactRow label="GitHub"   value={data.contact.github} />
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold mb-2">Sections found</div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.keys(data.sections.found).map((s) => (
              <span key={s} className="text-xs bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full">
                ✓ {s}
              </span>
            ))}
            {data.sections.missing_critical.map((s: string) => (
              <span key={s} className="text-xs bg-rose-500/10 border border-rose-400/30 text-rose-300 px-2 py-0.5 rounded-full">
                ✗ {s} missing
              </span>
            ))}
          </div>
          <div className="text-[11px] text-white/50">
            Missing critical sections mean the ATS won't populate those fields on your profile — recruiters filter on them.
          </div>
        </div>
      </div>

      {data.experience_blocks?.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <div className="text-sm font-semibold mb-2">Experience blocks detected</div>
          <div className="text-[11px] text-white/50 mb-3">
            Each date range the parser found in your Experience section, with the line above it (usually role + company).
          </div>
          <div className="space-y-2">
            {data.experience_blocks.map((b: any, i: number) => (
              <div key={i} className="hairline rounded-lg p-2.5 text-sm">
                <div className="text-white/80">{b.context}</div>
                <div className="text-xs text-indigo-300 mt-1">{b.dates}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-white/60" />
          <div className="text-sm font-semibold">Raw text ATS sees (first 1500 chars)</div>
        </div>
        <div className="text-[11px] text-white/40 mb-2">
          This is the exact byte stream a naive parser pulls out. If the order looks scrambled, your layout is fighting the parser.
        </div>
        <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-3 max-h-80 overflow-y-auto">
          {data.extraction.preview}
        </pre>
        <div className="text-[11px] text-white/40 mt-2">
          {data.extraction.chars} chars · {data.extraction.lines} lines · {data.extraction.pages} page{data.extraction.pages === 1 ? "" : "s"}
        </div>
      </div>
    </>
  );
}

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 ${ok ? "text-emerald-300" : "text-rose-300"}`}>
      {ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      <span className="text-white/80">{label}</span>
    </div>
  );
}

function ContactRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <div className="text-white/50 text-xs uppercase tracking-wider">{label}</div>
      <div className={`text-sm text-right truncate ${value ? "text-white" : "text-rose-300"}`}>
        {value || "not found"}
      </div>
    </div>
  );
}
