"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Eye, Check, ChevronDown, ChevronUp, LayoutTemplate } from "lucide-react";
import { suggestTemplates } from "@/lib/api";
import TemplatePreview from "@/components/TemplatePreview";

const REGIONAL_KEYWORDS = ["india", "uk", "germany", "japan", "middle east", "dach"];

type FilterTab = "all" | "ats" | "modern" | "creative" | "regional" | "consulting";

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all",        label: "All" },
  { id: "ats",        label: "ATS-Safe" },
  { id: "modern",     label: "Modern" },
  { id: "creative",   label: "Creative" },
  { id: "regional",   label: "Regional" },
  { id: "consulting", label: "Consulting / Finance" },
];

function applyFilter(items: any[], tab: FilterTab): any[] {
  if (tab === "all") return items;
  const cat = (t: any) => (t.category || "").toLowerCase();
  const sty = (t: any) => (t.style || "").toLowerCase();
  const ats = (t: any) => (t.ats_score || "").toLowerCase();
  if (tab === "ats")        return items.filter(t => ats(t) === "high");
  if (tab === "modern")     return items.filter(t => sty(t) === "modern");
  if (tab === "creative")   return items.filter(t => sty(t) === "creative");
  if (tab === "regional")   return items.filter(t =>
    ["global", "regional"].includes(cat(t)) ||
    REGIONAL_KEYWORDS.some(kw => (t.name || "").toLowerCase().includes(kw))
  );
  if (tab === "consulting") return items.filter(t =>
    ["consulting", "finance"].includes(cat(t))
  );
  return items;
}

export default function TemplateGallery({
  role, years, stylePref, onPick, selected, allTemplates = [],
}: {
  role: string; years: number; stylePref: string;
  onPick: (n: string) => void; selected: string;
  allTemplates?: any[];
}) {
  // Start with every template from meta (always full set of 39).
  // suggestTemplates only re-orders by relevance — never reduces the pool.
  const [sortOrder, setSortOrder] = useState<string[]>([]);
  const [zoomed, setZoomed] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [open, setOpen] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Re-rank whenever role/years/style change
  useEffect(() => {
    if (!allTemplates.length) return;
    (async () => {
      try {
        const r = await suggestTemplates({ role, years, style_pref: stylePref, ats_priority: "low", limit: 50 });
        // Store just the order (by id/name) so we can re-sort allTemplates
        setSortOrder((r.templates || []).map((t: any) => t.id || t.name));
      } catch {
        setSortOrder([]);
      }
    })();
  }, [role, years, stylePref, allTemplates.length]);

  // Merge: sort allTemplates by the suggested order, append any not in the suggestion
  const items = (() => {
    if (!sortOrder.length) return allTemplates;
    const idx = new Map(sortOrder.map((id, i) => [id, i]));
    const keyed = (t: any) => idx.has(t.id) ? idx.get(t.id)! : idx.has(t.name) ? idx.get(t.name)! : 9999;
    return [...allTemplates].sort((a, b) => keyed(a) - keyed(b));
  })();

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setZoomed(null); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const filtered = applyFilter(items, activeTab);

  return (
    <div className="glass rounded-2xl glow overflow-hidden">
      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition"
      >
        <div className="flex items-center gap-2">
          <LayoutTemplate size={15} className="text-indigo-400 shrink-0" />
          <span className="text-sm font-semibold">Templates</span>
          <span className="text-[11px] text-white/40 font-normal">
            {selected
              ? <span className="text-indigo-300">{selected}</span>
              : `${items.length} available`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">click to {open ? "collapse" : "browse"}</span>
          {open
            ? <ChevronUp size={14} className="text-white/40" />
            : <ChevronDown size={14} className="text-white/40" />}
        </div>
      </button>

      {!open && (
        <div className="px-5 pb-3 -mt-1 flex flex-wrap gap-1.5">
          {FILTER_TABS.slice(1).map(tab => (
            <span key={tab.id} className="text-[10px] text-white/30 hairline px-2 py-0.5 rounded-full">
              {tab.label} ({applyFilter(items, tab.id).length})
            </span>
          ))}
        </div>
      )}

      {open && <div className="px-5 pb-5 border-t border-white/5">
        <div className="flex justify-end pt-3 pb-3">
          <div className="text-xs text-white/30">click preview to zoom · click name to select</div>
        </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              activeTab === tab.id
                ? "bg-indigo-500 text-white"
                : "hairline text-white/60 hover:border-indigo-400 hover:text-white"
            }`}
          >
            {tab.label}
            {tab.id !== "all" && (
              <span className="ml-1.5 opacity-60">
                ({applyFilter(items, tab.id).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.length === 0 && (
          <div className="col-span-3 text-sm text-white/40 py-4 text-center">
            No templates match this filter.
          </div>
        )}
        {filtered.map((t) => (
          <div key={t.id}
            className={`hairline rounded-xl p-3 transition ${
              selected === t.name ? "ring-2 ring-indigo-400" : "hover:border-indigo-400"
            }`}>

            <button type="button" onClick={() => setZoomed(t)}
              className="relative w-full group rounded overflow-hidden mb-2 border border-white/10 block"
              aria-label="Preview full size">
              {/* --tp-scale: 520px inner width → ~150px thumbnail ≈ 0.28 */}
              <div style={{ "--tp-scale": "0.28" } as React.CSSProperties}>
                <TemplatePreview template={t} />
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100" style={{ fontSize: 12 }}>
                <span className="flex items-center gap-1 text-xs bg-white/90 text-black px-2 py-1 rounded-full">
                  <Eye size={12} /> Preview
                </span>
              </div>
            </button>

            <button type="button" onClick={() => onPick(t.name)}
              className="w-full text-left">
              <div className="flex items-center gap-1.5">
                <div className="text-sm font-semibold">{t.name}</div>
                {selected === t.name && <Check size={14} className="text-emerald-400" />}
              </div>
              <div className="text-xs text-white/50">{t.category} · ATS {t.ats_score}</div>
              <div className="text-xs text-white/60 mt-2 line-clamp-2">{t.notes}</div>
              <div className="text-[10px] text-indigo-300 mt-2 font-mono">{t.fonts.join(" · ")}</div>
            </button>
          </div>
        ))}
      </div>
      </div>}

      {zoomed && mounted && createPortal(
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setZoomed(null)}>
          <div className="relative max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setZoomed(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white flex items-center gap-1 text-sm">
              <X size={16} /> Close
            </button>
            <div className="grid md:grid-cols-[1fr_320px] gap-5">
              <div className="bg-black/40 rounded-xl p-4 shadow-2xl max-h-[85vh] overflow-y-auto">
                <div style={{ maxWidth: 520, margin: "0 auto", "--tp-scale": "1" } as React.CSSProperties}>
                  <TemplatePreview template={zoomed} />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/50">Template</div>
                  <div className="text-xl font-bold">{zoomed.name}</div>
                </div>
                <div className="text-sm text-white/70">{zoomed.notes}</div>
                <div className="space-y-1 text-sm">
                  <div className="text-white/60">Category: <span className="text-white">{zoomed.category}</span></div>
                  <div className="text-white/60">Style: <span className="text-white">{zoomed.style}</span></div>
                  <div className="text-white/60">ATS score: <span className="text-white">{zoomed.ats_score}</span></div>
                  <div className="text-white/60">Pages: <span className="text-white">{zoomed.pages}</span></div>
                  <div className="text-white/60">Fonts: <span className="text-white">{zoomed.fonts.join(", ")}</span></div>
                  {zoomed.best_for && (
                    <div className="text-white/60">Best for: <span className="text-white">{zoomed.best_for.join(", ")}</span></div>
                  )}
                </div>
                <button onClick={() => { onPick(zoomed.name); setZoomed(null); }}
                  className="w-full py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold">
                  Use this template
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
