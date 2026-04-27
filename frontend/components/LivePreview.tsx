"use client";

export default function LivePreview({ pdfBase64, filename = "resume.pdf" }: { pdfBase64?: string; filename?: string }) {
  if (!pdfBase64) {
    return (
      <div className="glass rounded-2xl p-8 glow h-full flex flex-col items-center justify-center text-center text-white/50">
        <div className="text-xs uppercase tracking-widest mb-2">Live Preview</div>
        <div className="text-sm">Your generated resume will render here.</div>
      </div>
    );
  }
  const src = `data:application/pdf;base64,${pdfBase64}`;
  return (
    <div className="glass rounded-2xl p-3 glow h-full flex flex-col">
      <div className="flex justify-between items-center px-2 py-1">
        <div className="text-xs uppercase tracking-widest text-white/50">Live Preview</div>
        <a href={src} download={filename} className="text-xs text-indigo-300 hover:text-indigo-200">Download</a>
      </div>
      <iframe src={src} className="w-full flex-1 rounded-lg bg-white" title="Resume PDF" />
    </div>
  );
}
