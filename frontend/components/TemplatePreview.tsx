"use client";
import { Fragment as ReactFragment } from "react";

/** Realistic HTML preview of each template rendering sample resume content. */

type Template = {
  id: string;
  name: string;
  style: string;
  category: string;
  fonts: string[];
  best_for?: string[];
};

const INNER_W = 520;
const INNER_H = 680;

/* ------------ per-template visual config ------------ */

const ACCENT: Record<string, string> = {
  google_xyz:          "#1a73e8",
  meta_engineering:    "#1877f2",
  amazon_lp:           "#ff9900",
  apple_minimal:       "#111111",
  microsoft_modern:    "#0078d4",
  shopify_commerce:    "#008060",
  fresher_student:     "#7c3aed",
  netflix_senior_ic:   "#e50914",
  us_standard:         "#222222",
  international_global:"#0d9488",
  swe_backend:         "#4f46e5",
  devops_sre:          "#0ea5e9",
  stripe_eng:          "#635bff",
  uber_pm:             "#000000",
  linkedin_recruiter:  "#0a66c2",
  mckinsey_consulting: "#003366",
  bcg_bain:            "#00563f",
  goldman_ib:          "#b45309",
  big4:                "#c8102e",
  europass:            "#003399",
  uk_cv:               "#1f2937",
  dach_lebenslauf:     "#374151",
  india_standard:      "#ea580c",
  middle_east:         "#0f766e",
  balanced_hybrid:     "#0d9488",
  modern_classic:      "#334155",
  academic_cv:         "#7f1d1d",
  career_change:       "#9333ea",
  frontend_ui:         "#ec4899",
  data_ml:             "#2563eb",
  ro_signature:        "#1a1a1a",
  airbnb_design:       "#ff5a5f",
  japan_rirekisho:     "#1d4ed8",
  two_column_safe:     "#0f766e",
  creative_modern:     "#7c3aed",
  designer_portfolio:  "#db2777",
  marketing_bold:      "#dc2626",
  pm_modern:           "#0369a1",
  sales_bd:            "#b45309",
};

type Layout =
  | "minimal" | "minimal-left"
  | "modern-bar" | "modern-top"
  | "serif-classic" | "serif-split"
  | "sidebar" | "sidebar-right"
  | "banner" | "banner-split"
  | "structured" | "bordered" | "two-col"
  | "shaded-header" | "creative-split"
  | "timeline" | "infographic" | "executive" | "magazine" | "gradient-header"
  | "card-photo" | "terminal-dark" | "serif-prestige" | "clean-ats" | "nordic"
  | "oxford" | "hybrid-grid" | "portfolio" | "dach-cv" | "serif-formal";

const LAYOUT: Record<string, Layout> = {
  google_xyz:          "minimal",
  meta_engineering:    "clean-ats",
  amazon_lp:           "modern-bar",
  apple_minimal:       "executive",
  microsoft_modern:    "modern-top",
  shopify_commerce:    "banner",
  fresher_student:     "bordered",
  netflix_senior_ic:   "magazine",
  us_standard:         "minimal-left",
  international_global:"two-col",
  swe_backend:         "nordic",
  devops_sre:          "terminal-dark",
  stripe_eng:          "banner-split",
  uber_pm:             "magazine",
  linkedin_recruiter:  "card-photo",
  mckinsey_consulting: "serif-classic",
  bcg_bain:            "serif-split",
  goldman_ib:          "serif-prestige",
  big4:                "serif-formal",
  europass:            "structured",
  uk_cv:               "oxford",
  dach_lebenslauf:     "dach-cv",
  india_standard:      "sidebar",
  middle_east:         "minimal",
  balanced_hybrid:     "hybrid-grid",
  modern_classic:      "serif-split",
  academic_cv:         "serif-classic",
  career_change:       "sidebar-right",
  frontend_ui:         "timeline",
  data_ml:             "infographic",
  ro_signature:        "shaded-header",
  airbnb_design:       "gradient-header",
  japan_rirekisho:     "structured",
  two_column_safe:     "two-col",
  creative_modern:     "creative-split",
  designer_portfolio:  "portfolio",
  marketing_bold:      "magazine",
  pm_modern:           "gradient-header",
  sales_bd:            "modern-bar",
};

const accentFor  = (t: Template) => ACCENT[t.id] || "#111";
const layoutFor  = (t: Template): Layout => {
  if (LAYOUT[t.id]) return LAYOUT[t.id];
  const s = t.style.toLowerCase();
  const c = t.category.toLowerCase();
  if (s === "premium" || c === "consulting" || c === "finance") return "serif-classic";
  if (s === "modern") return "modern-bar";
  if (s === "creative") return "sidebar";
  if (s === "structured") return "structured";
  return "minimal";
};
const fontFamily = (t: Template) => {
  const f = (t.fonts?.[0] || "Inter").replace(/\s+\(.*?\)/g, "").trim();
  return `'${f}', system-ui, sans-serif`;
};
const isSerifFont = (t: Template) => {
  const f = (t.fonts?.[0] || "").toLowerCase();
  return ["times", "garamond", "cambria", "georgia", "merriweather", "playfair", "lora", "baskerville"]
    .some(k => f.includes(k));
};

/* ------------ shared sample data ------------ */

const EXP = [
  { role: "Senior ML Engineer", org: "Optum Insight", dates: "2024 – Present",
    bullets: ["Led migration of 12 ML pipelines to Kubeflow, reducing training cost 38%.",
              "Built RAG system serving 2M daily queries at P99 < 250ms."] },
  { role: "ML Engineer", org: "UnitedHealth Group", dates: "2022 – 2024",
    bullets: ["Shipped claims-fraud model driving $14M recovery in FY23.",
              "Owned end-to-end feature store adopted across 6 teams."] },
];
const SKILLS = "Python · PyTorch · TensorFlow · LangChain · AWS · Kubernetes · Airflow · MLflow";
const SUMMARY = "Senior AI/ML engineer with 4+ yrs shipping production ML systems. Expert in PyTorch, LLM fine-tuning, MLOps. Delivered $2M annual savings at scale.";

/* ================================================================
   LAYOUTS
   ================================================================ */

/* 1. MINIMAL — centered header, colored underline section titles */
function Minimal({ accent, ff, serif }: { accent: string; ff: string; serif: boolean }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "28px 36px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.45 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: serif ? 1 : 0 }}>Alex Morgan</div>
        <div style={{ fontSize: 9.5, color: "#555", marginTop: 5 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · github.com/alexmorgan · New York, NY</div>
        <div style={{ width: 48, height: 2, background: accent, margin: "8px auto 0" }} />
      </div>
      {(["Summary", "Experience", "Skills", "Education"] as const).map((section) => (
        <div key={section} style={{ marginBottom: 13 }}>
          <div style={{ color: accent, fontWeight: 700, borderBottom: `0.8px solid ${accent}`, paddingBottom: 2, marginBottom: 6, fontSize: 9.5, textTransform: "uppercase", letterSpacing: 1.2 }}>{section}</div>
          {section === "Summary"   && <div style={{ color: "#333", fontSize: 10 }}>{SUMMARY}</div>}
          {section === "Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} · {x.org}</span>
                <span style={{ color: "#666", fontSize: 9 }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {section === "Skills"    && <div style={{ color: "#333", fontSize: 10 }}>{SKILLS}</div>}
          {section === "Education" && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
              <span style={{ fontWeight: 600 }}>M.S. Computer Science — Stevens Institute of Technology</span>
              <span style={{ color: "#666" }}>2022</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* 2. MINIMAL-LEFT — left-aligned, bold black section headers, full-width rule */
function MinimalLeft({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "28px 32px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.45 }}>
      <div style={{ borderLeft: `3px solid ${accent}`, paddingLeft: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Alex Morgan</div>
        <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 2 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 9, color: "#555", marginTop: 3 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
      </div>
      {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3, color: "#111" }}>{s}</div>
          <div style={{ height: 0.8, background: "#222", marginBottom: 6 }} />
          {s === "Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
          {s === "Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role}, {x.org}</span>
                <span style={{ color: "#666", fontSize: 9 }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
          {s === "Education" && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens Institute of Technology · <span style={{ color: "#666" }}>2022</span></div>}
        </div>
      ))}
    </div>
  );
}

/* 3. MODERN-BAR — left border header, square colored icon before section title */
function ModernBar({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "26px 30px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.45 }}>
      <div style={{ borderLeft: `4px solid ${accent}`, paddingLeft: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>Alex Morgan</div>
        <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 2 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 9, color: "#555", marginTop: 2 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
      </div>
      {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <div style={{ width: 9, height: 9, background: accent, borderRadius: 2 }} />
            <div style={{ fontWeight: 800, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2 }}>{s}</div>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>
          {s === "Summary"   && <div style={{ color: "#333", fontSize: 10 }}>{SUMMARY}</div>}
          {s === "Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} <span style={{ color: accent }}>@ {x.org}</span></span>
                <span style={{ color: "#666", fontSize: 9 }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {s === "Skills"    && <div style={{ color: "#333", fontSize: 10 }}>{SKILLS}</div>}
          {s === "Education" && <div style={{ fontSize: 10 }}><span style={{ fontWeight: 600 }}>M.S. Computer Science</span> — Stevens · <span style={{ color: "#666" }}>2022</span></div>}
        </div>
      ))}
    </div>
  );
}

/* 4. MODERN-TOP — thin accent stripe at top, two-column header, ▸ bullets */
function ModernTop({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ height: 8, background: accent }} />
      <div style={{ padding: "20px 30px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Alex Morgan</div>
            <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>Senior AI/ML Engineer</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 9, color: "#555", lineHeight: 1.6 }}>
            alex.morgan@email.com<br />linkedin.com/in/alexmorgan<br />New York, NY
          </div>
        </div>
        {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, borderBottom: `2px solid ${accent}`, display: "inline-block", paddingBottom: 2, marginBottom: 5 }}>{s}</div>
            {s === "Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ fontWeight: 700, fontSize: 10 }}>{x.role} — {x.org} <span style={{ color: "#666", fontWeight: 400 }}>· {x.dates}</span></div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>▸ {b}</div>)}
              </div>
            ))}
            {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
            {s === "Education" && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens · <span style={{ color: "#666" }}>2022</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 5. SERIF-CLASSIC — centered uppercase name, centered all-caps section headings */
function SerifClassic({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#1a1a1a", background: "#fff", width: INNER_W, height: INNER_H, padding: "36px 48px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.55 }}>
      <div style={{ textAlign: "center", borderBottom: `1.5px solid ${accent}`, paddingBottom: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>Alex Morgan</div>
        <div style={{ fontSize: 9, color: "#555", marginTop: 5, fontStyle: "italic" }}>alex.morgan@email.com  ·  linkedin.com/in/alexmorgan  ·  New York, NY</div>
      </div>
      {(["Professional Summary", "Experience", "Education", "Skills"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 14 }}>
          <div style={{ textAlign: "center", fontSize: 9.5, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: accent, marginBottom: 8 }}>{s}</div>
          {s === "Professional Summary" && <div style={{ color: "#333", fontSize: 10, fontStyle: "italic", textAlign: "center" }}>{SUMMARY}</div>}
          {s === "Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10.5 }}>{x.org}</span>
                <span style={{ color: "#555", fontSize: 9, fontStyle: "italic" }}>{x.dates}</span>
              </div>
              <div style={{ fontStyle: "italic", fontSize: 10, color: "#444", marginBottom: 3 }}>{x.role}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 12, fontSize: 10 }}>— {b}</div>)}
            </div>
          ))}
          {s === "Education" && (
            <div style={{ fontSize: 10, textAlign: "center" }}>
              <span style={{ fontWeight: 700 }}>Stevens Institute of Technology</span> · M.S. Computer Science · <span style={{ fontStyle: "italic", color: "#555" }}>2022</span>
            </div>
          )}
          {s === "Skills" && <div style={{ color: "#333", fontSize: 10, textAlign: "center" }}>{SKILLS}</div>}
        </div>
      ))}
    </div>
  );
}

/* 6. SERIF-SPLIT — horizontal rule header, left-border section labels */
function SerifSplit({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#1a1a1a", background: "#fff", width: INNER_W, height: INNER_H, padding: "32px 40px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.55 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: `2px solid ${accent}`, paddingBottom: 10, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.5 }}>Alex Morgan</div>
          <div style={{ fontSize: 10, fontStyle: "italic", color: "#555" }}>Senior AI/ML Engineer</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 9, color: "#555" }}>
          alex.morgan@email.com<br />+1 551 xxx xxxx<br />New York, NY
        </div>
      </div>
      {(["Experience", "Education", "Skills"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: accent, marginBottom: 6, borderLeft: `3px solid ${accent}`, paddingLeft: 8 }}>{s}</div>
          {s === "Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><b>{x.role}</b>, <span style={{ fontStyle: "italic" }}>{x.org}</span></span>
                <span style={{ color: "#555", fontSize: 9 }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 12, fontSize: 10 }}>— {b}</div>)}
            </div>
          ))}
          {s === "Education" && <div style={{ fontSize: 10 }}><b>Stevens Institute of Technology</b> — M.S. Computer Science, <span style={{ fontStyle: "italic", color: "#555" }}>2022</span></div>}
          {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
        </div>
      ))}
    </div>
  );
}

/* 7. SIDEBAR — colored left column 36% */
function Sidebar({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11, display: "flex" }}>
      <div style={{ width: "36%", background: accent, color: "#fff", padding: "24px 18px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>Alex<br />Morgan</div>
        <div style={{ fontSize: 9, opacity: 0.9, marginTop: 6 }}>Senior AI/ML Engineer</div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.3)", margin: "14px 0" }} />
        {[
          { label: "CONTACT", rows: ["alex.morgan@email.com", "+1 551 xxx xxxx", "NYC, NY"] },
          { label: "SKILLS",  rows: ["Python · PyTorch", "LangChain · RAG", "AWS · Kubernetes", "MLflow · Airflow"] },
          { label: "EDUCATION", rows: ["M.S. Computer Science", "Stevens Tech, 2022"] },
        ].map((b, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.8, opacity: 0.85 }}>{b.label}</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.3)", margin: "4px 0 6px" }} />
            {b.rows.map((r, j) => <div key={j} style={{ fontSize: 9, marginBottom: 2 }}>{r}</div>)}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, padding: "24px 22px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Profile</div>
        <div style={{ fontSize: 10, color: "#333", marginBottom: 14 }}>{SUMMARY}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Experience</div>
        {EXP.map((x, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 10 }}>{x.role}</div>
            <div style={{ fontSize: 9, color: accent, fontWeight: 600 }}>{x.org} · {x.dates}</div>
            {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 8, fontSize: 9.5, marginTop: 2 }}>• {b}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 8. SIDEBAR-RIGHT — colored right column */
function SidebarRight({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11, display: "flex" }}>
      <div style={{ flex: 1, padding: "24px 22px" }}>
        <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>Alex Morgan</div>
        <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 2, marginBottom: 14 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Profile</div>
        <div style={{ fontSize: 10, color: "#333", marginBottom: 14 }}>{SUMMARY}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Experience</div>
        {EXP.map((x, i) => (
          <div key={i} style={{ marginBottom: 9 }}>
            <div style={{ fontWeight: 700, fontSize: 10 }}>{x.role}</div>
            <div style={{ fontSize: 9, color: "#555" }}>{x.org} · {x.dates}</div>
            {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 8, fontSize: 9.5, marginTop: 2 }}>• {b}</div>)}
          </div>
        ))}
      </div>
      <div style={{ width: "34%", background: accent, color: "#fff", padding: "24px 18px" }}>
        {[
          { label: "CONTACT",   rows: ["alex.morgan@email.com", "+1 551 xxx xxxx", "NYC, NY"] },
          { label: "SKILLS",    rows: ["Python · PyTorch", "LangChain · RAG", "AWS · Kubernetes"] },
          { label: "EDUCATION", rows: ["M.S. Computer Science", "Stevens Tech, 2022"] },
          { label: "LANGUAGES", rows: ["English", "Spanish (B2)"] },
        ].map((b, i) => (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: 1.8, opacity: 0.85 }}>{b.label}</div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.3)", margin: "4px 0 6px" }} />
            {b.rows.map((r, j) => <div key={j} style={{ fontSize: 9, marginBottom: 2 }}>{r}</div>)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 9. BANNER — full-width colored header band */
function Banner({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ background: accent, color: "#fff", padding: "22px 30px 18px" }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Alex Morgan</div>
        <div style={{ fontSize: 11, opacity: 0.95, marginTop: 3 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 9, opacity: 0.8, marginTop: 7 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · github.com/alexmorgan · NYC</div>
      </div>
      <div style={{ padding: "18px 30px" }}>
        {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 12 }}>
            <div style={{ color: accent, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{s}</div>
            {s === "Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role}, {x.org}</span>
                  <span style={{ color: "#666", fontSize: 9 }}>{x.dates}</span>
                </div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
              </div>
            ))}
            {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
            {s === "Education" && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens · <span style={{ color: "#666" }}>2022</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 10. BANNER-SPLIT — split-color header (accent left + dark right) */
function BannerSplit({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ display: "flex" }}>
        <div style={{ background: accent, color: "#fff", padding: "24px 26px", width: "58%" }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>Alex</div>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>Morgan</div>
          <div style={{ fontSize: 10, opacity: 0.95, marginTop: 6 }}>Senior AI/ML Engineer</div>
        </div>
        <div style={{ background: "#0f172a", color: "#fff", padding: "24px 20px", flex: 1, fontSize: 9 }}>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>alex.morgan@email.com</div>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>linkedin.com/in/alexmorgan</div>
          <div style={{ opacity: 0.85, marginBottom: 4 }}>github.com/alexmorgan</div>
          <div style={{ opacity: 0.85 }}>New York, NY</div>
        </div>
      </div>
      <div style={{ padding: "16px 28px" }}>
        {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 10 }}>
            <div style={{ color: accent, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{s}</div>
            {s === "Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} — {x.org}</span>
                  <span style={{ color: "#666", fontSize: 9 }}>{x.dates}</span>
                </div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
              </div>
            ))}
            {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
            {s === "Education" && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens · 2022</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 11. STRUCTURED — Europass/form-grid rows label | value */
function Structured({ accent, ff }: { accent: string; ff: string }) {
  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 10, borderBottom: "1px solid #e5e7eb", padding: "6px 0" }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#222" }}>{value}</div>
    </div>
  );
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "28px 32px", boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ background: accent, color: "#fff", padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Alex Morgan</div>
        <div style={{ fontSize: 9, opacity: 0.9, marginTop: 2 }}>Curriculum Vitae</div>
      </div>
      <Row label="Name"        value="Alex Morgan" />
      <Row label="Email"       value="alex.morgan@email.com" />
      <Row label="Location"    value="New York, NY, United States" />
      <Row label="Nationality" value="American" />
      <Row label="Profile"     value={SUMMARY} />
      <Row label="Experience"  value={
        <div>{EXP.map((x, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <b>{x.role}</b> — {x.org} · <span style={{ color: "#555" }}>{x.dates}</span>
          </div>
        ))}</div>
      } />
      <Row label="Education"   value="M.S. Computer Science — Stevens Institute of Technology, 2022" />
      <Row label="Skills"      value={SKILLS} />
      <Row label="Languages"   value="English (Native) · Spanish (B2)" />
    </div>
  );
}

/* 12. BORDERED — entire content inside a border frame */
function Bordered({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: 16, boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ border: `2px solid ${accent}`, height: "100%", padding: "22px 28px", boxSizing: "border-box", position: "relative" }}>
        <div style={{ position: "absolute", top: -10, left: 24, background: "#fff", padding: "0 10px", fontSize: 10, fontWeight: 800, color: accent, letterSpacing: 1.5 }}>CURRICULUM VITAE</div>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 24, fontWeight: 800 }}>Alex Morgan</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 600 }}>Senior AI/ML Engineer</div>
          <div style={{ fontSize: 9, color: "#555", marginTop: 3 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
          <div style={{ margin: "8px auto 0", width: 50, height: 2, background: accent }} />
        </div>
        {(["Summary", "Experience", "Education", "Skills"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: accent, marginBottom: 4 }}>{s}</div>
            {s === "Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10 }}><b>{x.role}</b> — {x.org} · <span style={{ color: "#666" }}>{x.dates}</span></div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
              </div>
            ))}
            {s === "Education" && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens Institute of Technology · 2022</div>}
            {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 13. TWO-COL — right-aligned label column + left-bordered content column */
function TwoCol({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "28px 30px", boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 700 }}>Alex Morgan</div>
        <div style={{ fontSize: 9, color: "#555", marginTop: 3 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
      </div>
      <div style={{ height: 1, background: accent, marginBottom: 12 }} />
      {(["Summary", "Experience", "Education", "Skills"] as const).map((s) => (
        <div key={s} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14, marginBottom: 10, alignItems: "start" }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: accent, textTransform: "uppercase", letterSpacing: 1.2, textAlign: "right", paddingTop: 1 }}>{s}</div>
          <div style={{ borderLeft: `1px solid ${accent}33`, paddingLeft: 12 }}>
            {s === "Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10 }}><b>{x.role}</b> — {x.org}</div>
                <div style={{ fontSize: 9, color: "#666", marginBottom: 2 }}>{x.dates}</div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", fontSize: 10 }}>• {b}</div>)}
              </div>
            ))}
            {s === "Education" && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens · 2022</div>}
            {s === "Skills"    && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* 14. SHADED-HEADER — gray shaded section header bars */
function ShadedHeader({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "28px 36px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Alex Morgan</div>
        <div style={{ fontSize: 10, color: "#444", fontStyle: "italic", marginTop: 2 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 9, color: "#555", marginTop: 4 }}>alex.morgan@email.com · linkedin.com/alexmorgan · github.com/alexmorgan · NYC</div>
        <div style={{ height: 1, background: "#1a1a1a", marginTop: 8 }} />
      </div>
      {(["Professional Summary", "Areas of Expertise", "Professional Experience", "Education"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 10 }}>
          <div style={{ background: "#e9e9e9", padding: "2px 6px", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#1a1a1a", marginBottom: 5 }}>{s}</div>
          {s === "Professional Summary"   && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
          {s === "Areas of Expertise"     && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
          {s === "Professional Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} — {x.org}</span>
                <span style={{ color: "#555", fontSize: 9, fontStyle: "italic" }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {s === "Education" && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}><b>M.S. Computer Science — Stevens Institute of Technology</b><span style={{ color: "#555" }}>2022</span></div>}
        </div>
      ))}
    </div>
  );
}

/* 15. CREATIVE-SPLIT — thin accent strip on left, bold split-color name */
function CreativeSplit({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11, display: "flex" }}>
      <div style={{ width: 12, background: accent, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: "28px 28px 28px 20px" }}>
        <div style={{ borderBottom: `3px solid ${accent}`, paddingBottom: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 30, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5, color: "#111" }}>Alex</div>
          <div style={{ fontSize: 30, fontWeight: 900, textTransform: "uppercase", letterSpacing: -0.5, color: accent }}>Morgan</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 4, fontWeight: 600 }}>SENIOR AI/ML ENGINEER</div>
          <div style={{ fontSize: 9, color: "#666", marginTop: 4 }}>alex.morgan@email.com · NYC</div>
        </div>
        {(["About", "Experience", "Skills"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 12 }}>
            <div style={{ display: "inline-block", background: accent, color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 8px", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{s}</div>
            {s === "About"      && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ fontWeight: 800, fontSize: 10, color: accent }}>{x.role}</div>
                <div style={{ fontSize: 9, color: "#555" }}>{x.org} · {x.dates}</div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 8, fontSize: 10 }}>▸ {b}</div>)}
              </div>
            ))}
            {s === "Skills"     && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   NEW LAYOUTS
   ================================================================ */

/* 16. TIMELINE — vertical timeline dots for experience entries */
function Timeline({ accent, ff }: { accent: string; ff: string }) {
  const tags = ["Python", "PyTorch", "TensorFlow", "LangChain", "AWS", "Kubernetes", "Airflow", "MLflow"];
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "26px 32px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.45 }}>
      {/* Header */}
      <div style={{ paddingBottom: 12, borderBottom: `3px solid ${accent}`, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>Alex Morgan</div>
            <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 2 }}>Senior AI/ML Engineer</div>
          </div>
          <div style={{ fontSize: 9, color: "#666", textAlign: "right", lineHeight: 1.7 }}>
            alex.morgan@email.com<br />linkedin.com/in/alexmorgan<br />New York, NY
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 4 }}>About</div>
        <div style={{ fontSize: 10, color: "#444" }}>{SUMMARY}</div>
      </div>

      {/* Timeline Experience */}
      <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 10 }}>Experience</div>
      <div style={{ position: "relative", paddingLeft: 22 }}>
        <div style={{ position: "absolute", left: 7, top: 6, bottom: 20, width: 2, background: `${accent}33` }} />
        {EXP.map((x, i) => (
          <div key={i} style={{ position: "relative", marginBottom: 14 }}>
            <div style={{ position: "absolute", left: -18, top: 3, width: 12, height: 12, borderRadius: "50%", background: "#fff", border: `2.5px solid ${accent}`, boxSizing: "border-box" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role}</span>
              <span style={{ fontSize: 8.5, color: "#fff", background: accent, padding: "1px 7px", borderRadius: 10, fontWeight: 600 }}>{x.dates}</span>
            </div>
            <div style={{ fontSize: 9, color: accent, fontWeight: 600, marginBottom: 4 }}>{x.org}</div>
            {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", paddingLeft: 10, fontSize: 9.5 }}>• {b}</div>)}
          </div>
        ))}
      </div>

      {/* Skill tags */}
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 8 }}>Skills</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {tags.map((s, i) => (
            <span key={i} style={{ fontSize: 9, background: `${accent}18`, color: accent, padding: "2px 9px", borderRadius: 12, fontWeight: 600, border: `1px solid ${accent}33` }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Education */}
      <div style={{ marginTop: 12, fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 4 }}>Education</div>
      <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens Institute of Technology · <span style={{ color: "#888" }}>2022</span></div>
    </div>
  );
}

/* 17. INFOGRAPHIC — skill progress bars, two-column body */
function Infographic({ accent, ff }: { accent: string; ff: string }) {
  const skills = [
    { name: "Python / PyTorch",  pct: 95 },
    { name: "AWS / Kubernetes",  pct: 85 },
    { name: "LangChain / RAG",   pct: 90 },
    { name: "MLflow / Airflow",  pct: 80 },
  ];
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: accent, color: "#fff", padding: "20px 28px 16px", flexShrink: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 800 }}>Alex Morgan</div>
        <div style={{ fontSize: 10, opacity: 0.92, marginTop: 2 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 8.5, opacity: 0.75, marginTop: 5 }}>alex.morgan@email.com · NYC, NY · github.com/alexmorgan</div>
      </div>

      {/* Body two-column */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left sidebar */}
        <div style={{ width: "38%", background: "#f8f9fa", padding: "16px 16px", borderRight: "1px solid #e5e7eb", flexShrink: 0 }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Skills</div>
          {skills.map((sk, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, marginBottom: 3 }}>
                <span style={{ fontWeight: 600 }}>{sk.name}</span>
                <span style={{ color: accent }}>{sk.pct}%</span>
              </div>
              <div style={{ height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${sk.pct}%`, height: "100%", background: accent, borderRadius: 3 }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Education</div>
            <div style={{ fontSize: 9, fontWeight: 700 }}>M.S. Computer Science</div>
            <div style={{ fontSize: 9, color: "#666" }}>Stevens Institute</div>
            <div style={{ fontSize: 9, color: accent, fontWeight: 600 }}>2022</div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Contact</div>
            {["alex.morgan@email.com", "+1 551 xxx xxxx", "NYC, New York"].map((c, i) => (
              <div key={i} style={{ fontSize: 9, marginBottom: 4, color: "#444" }}>{c}</div>
            ))}
          </div>
        </div>

        {/* Right main */}
        <div style={{ flex: 1, padding: "16px 20px" }}>
          <div style={{ fontSize: 8.5, fontWeight: 800, color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Profile</div>
          <div style={{ fontSize: 10, color: "#444", marginBottom: 14, lineHeight: 1.5 }}>{SUMMARY}</div>

          <div style={{ fontSize: 8.5, fontWeight: 800, color: accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Experience</div>
          {EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 11, paddingLeft: 10, borderLeft: `2.5px solid ${accent}` }}>
              <div style={{ fontWeight: 700, fontSize: 10 }}>{x.role}</div>
              <div style={{ fontSize: 9, color: "#888", marginBottom: 3 }}>{x.org} · {x.dates}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", fontSize: 9.5, marginTop: 2 }}>• {b}</div>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* 18. EXECUTIVE — wide margins, light-weight typography, monochrome elegance */
function Executive({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#1a1a1a", background: "#fff", width: INNER_W, height: INNER_H, padding: "40px 52px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.65 }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: 4, textTransform: "uppercase" }}>Alex Morgan</div>
        <div style={{ fontSize: 9.5, color: "#888", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 4 }}>Senior AI / ML Engineer</div>
        <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 9, color: "#aaa" }}>
          <span>alex.morgan@email.com</span>
          <span>·</span>
          <span>linkedin.com/in/alexmorgan</span>
          <span>·</span>
          <span>New York, NY</span>
        </div>
      </div>

      <div style={{ height: 0.5, background: "#d1d5db", marginBottom: 22 }} />

      {[
        {
          title: "Profile",
          content: <div style={{ fontSize: 10, color: "#555", lineHeight: 1.65 }}>{SUMMARY}</div>,
        },
        {
          title: "Experience",
          content: (
            <div>
              {EXP.map((x, i) => (
                <div key={i} style={{ marginBottom: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600, fontSize: 10 }}>{x.role}</span>
                    <span style={{ fontSize: 9, color: "#aaa" }}>{x.dates}</span>
                  </div>
                  <div style={{ fontSize: 9.5, color: "#999", marginBottom: 4 }}>{x.org}</div>
                  {x.bullets.map((b, j) => <div key={j} style={{ color: "#555", paddingLeft: 14, fontSize: 10 }}>— {b}</div>)}
                </div>
              ))}
            </div>
          ),
        },
        {
          title: "Core Competencies",
          content: <div style={{ fontSize: 10, color: "#555", letterSpacing: 0.3 }}>{SKILLS}</div>,
        },
        {
          title: "Education",
          content: <div style={{ fontSize: 10, color: "#555" }}><span style={{ fontWeight: 600 }}>M.S. Computer Science</span> · Stevens Institute of Technology · <span style={{ color: "#aaa" }}>2022</span></div>,
        },
      ].map(({ title, content }, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#bbb", marginBottom: 8 }}>{title}</div>
          {content}
          {i < 3 && <div style={{ height: 0.5, background: "#f0f0f0", marginTop: 16 }} />}
        </div>
      ))}
    </div>
  );
}

/* 19. MAGAZINE — bold overlapping header, two-column body grid */
function Magazine({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11, overflow: "hidden" }}>
      {/* Bold header */}
      <div style={{ position: "relative", background: "#111", color: "#fff", padding: "26px 30px 20px" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 110, height: "100%", background: accent }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5 }}>ALEX</div>
          <div style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5, color: accent }}>MORGAN</div>
          <div style={{ fontSize: 9, letterSpacing: 3, textTransform: "uppercase", opacity: 0.65, marginTop: 7 }}>Senior AI/ML Engineer</div>
          <div style={{ fontSize: 8.5, opacity: 0.45, marginTop: 4 }}>alex.morgan@email.com · github.com/alexmorgan · NYC</div>
        </div>
      </div>

      <div style={{ padding: "14px 28px" }}>
        {/* Summary callout */}
        <div style={{ borderLeft: `4px solid ${accent}`, paddingLeft: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#444", fontStyle: "italic", lineHeight: 1.55 }}>{SUMMARY}</div>
        </div>

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <div>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 8 }}>Experience</div>
            {EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 9.5 }}>{x.role}</div>
                <div style={{ fontSize: 9, color: accent, fontWeight: 600 }}>{x.org}</div>
                <div style={{ fontSize: 8.5, color: "#aaa", marginBottom: 3 }}>{x.dates}</div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", fontSize: 9, marginTop: 2 }}>› {b}</div>)}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 8 }}>Skills</div>
            {["Python · PyTorch", "TensorFlow", "LangChain · RAG", "AWS · Kubernetes", "MLflow · Airflow"].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, background: accent, borderRadius: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 9.5 }}>{s}</div>
              </div>
            ))}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase", color: accent, borderBottom: `2px solid ${accent}`, paddingBottom: 3, marginBottom: 8 }}>Education</div>
              <div style={{ fontSize: 9.5, fontWeight: 700 }}>M.S. Computer Science</div>
              <div style={{ fontSize: 9, color: "#888" }}>Stevens Institute · 2022</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 20. GRADIENT-HEADER — gradient header with decorative circles, icon-chip sections */
function GradientHeader({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11 }}>
      {/* Gradient header */}
      <div style={{
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 60%, ${accent}77 100%)`,
        color: "#fff",
        padding: "26px 30px 20px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -28, top: -28, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.12)" }} />
        <div style={{ position: "absolute", right: 22, bottom: -22, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Alex Morgan</div>
          <div style={{ fontSize: 11, opacity: 0.95, fontWeight: 500, marginTop: 3 }}>Senior AI/ML Engineer</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 9, fontSize: 9, opacity: 0.85 }}>
            <span>alex.morgan@email.com</span>
            <span>·</span>
            <span>linkedin.com/in/alexmorgan</span>
            <span>·</span>
            <span>New York, NY</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 30px" }}>
        {/* Summary bar */}
        <div style={{ background: `${accent}0e`, borderLeft: `3px solid ${accent}`, padding: "8px 12px", marginBottom: 14, borderRadius: "0 4px 4px 0" }}>
          <div style={{ fontSize: 10, color: "#333", lineHeight: 1.5 }}>{SUMMARY}</div>
        </div>

        {(["Experience", "Skills", "Education"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, background: accent, borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 9, height: 1.5, background: "#fff" }} />
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.2 }}>{s}</div>
            </div>
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 9, paddingLeft: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} — {x.org}</span>
                  <span style={{ fontSize: 9, color: accent, fontWeight: 600 }}>{x.dates}</span>
                </div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", paddingLeft: 8, fontSize: 10 }}>▸ {b}</div>)}
              </div>
            ))}
            {s === "Skills"    && <div style={{ fontSize: 10, color: "#444", paddingLeft: 28 }}>{SKILLS}</div>}
            {s === "Education" && <div style={{ fontSize: 10, paddingLeft: 28 }}><b>M.S. Computer Science</b> — Stevens Institute · <span style={{ color: "#aaa" }}>2022</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   NEW LAYOUTS (21-30)
   ================================================================ */

/* 21. CARD-PHOTO — circular photo placeholder + card-style header */
function CardPhoto({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "22px 30px", boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", padding: "16px 18px", background: "#f8f9fa", border: `1px solid ${accent}33`, borderRadius: 6, marginBottom: 16 }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: `${accent}18`, border: `2.5px solid ${accent}`, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${accent}44` }} />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Alex Morgan</div>
          <div style={{ fontSize: 10, color: accent, fontWeight: 600, marginTop: 2 }}>Senior AI/ML Engineer</div>
          <div style={{ fontSize: 8.5, color: "#666", marginTop: 5, lineHeight: 1.6 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
        </div>
      </div>
      {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <div style={{ height: 1.5, width: 16, background: accent, flexShrink: 0 }} />
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: "#111" }}>{s}</div>
            <div style={{ flex: 1, height: 0.5, background: "#e5e7eb" }} />
          </div>
          {s === "Summary"    && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
          {s === "Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} · {x.org}</span>
                <span style={{ fontSize: 8.5, color: "#fff", background: accent, padding: "1px 6px", borderRadius: 3 }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {s === "Skills"     && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
          {s === "Education"  && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens · <span style={{ color: "#888" }}>2022</span></div>}
        </div>
      ))}
    </div>
  );
}

/* 22. TERMINAL-DARK — dark header, monospace code-inspired aesthetic */
function TerminalDark({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "20px 28px 16px", fontFamily: "'Courier New', monospace" }}>
        <div style={{ fontSize: 10, color: accent, marginBottom: 4, opacity: 0.85 }}>$ whoami</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#f8fafc", letterSpacing: 0.5 }}>Alex Morgan</div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>Senior AI/ML Engineer <span style={{ color: accent }}>// DevOps & SRE</span></div>
        <div style={{ fontSize: 8.5, color: "#475569", marginTop: 6 }}>alex.morgan@email.com | github.com/alexmorgan | nyc.us</div>
      </div>
      <div style={{ padding: "14px 28px" }}>
        {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 11 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: accent, fontFamily: "monospace", fontWeight: 700 }}>##</span>
              <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{s}</span>
            </div>
            {s === "Summary"    && <div style={{ fontSize: 10, color: "#444", borderLeft: `2px solid ${accent}44`, paddingLeft: 10 }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: `2px solid ${accent}44` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} <span style={{ color: accent }}>@{x.org.split(" ")[0]}</span></span>
                  <span style={{ fontSize: 9, color: "#888", fontFamily: "monospace" }}>{x.dates}</span>
                </div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", fontSize: 10, marginTop: 2 }}>→ {b}</div>)}
              </div>
            ))}
            {s === "Skills"    && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {["Python","PyTorch","AWS","K8s","Airflow","MLflow","LangChain","TF"].map((sk, i) => (
                  <span key={i} style={{ fontFamily: "monospace", fontSize: 9, background: "#0f172a", color: accent, padding: "2px 7px", borderRadius: 3 }}>{sk}</span>
                ))}
              </div>
            )}
            {s === "Education" && <div style={{ fontSize: 10, paddingLeft: 10, borderLeft: `2px solid ${accent}44` }}><b>M.S. CS</b> — Stevens Institute · <span style={{ color: "#888" }}>2022</span></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 23. SERIF-PRESTIGE — double horizontal rules, monochrome, finance/banking */
function SerifPrestige({ ff }: { ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#1a1a1a", background: "#fff", width: INNER_W, height: INNER_H, padding: "36px 52px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.6 }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{ height: 1.5, background: "#1a1a1a", marginBottom: 9 }} />
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>Alex Morgan</div>
        <div style={{ fontSize: 9.5, color: "#555", letterSpacing: 1, marginTop: 4 }}>alex.morgan@email.com  ·  +1 551 xxx xxxx  ·  New York, NY</div>
        <div style={{ height: 0.5, background: "#1a1a1a", marginTop: 9 }} />
        <div style={{ height: 3 }} />
        <div style={{ height: 1.5, background: "#1a1a1a" }} />
      </div>
      {(["Professional Experience", "Education", "Skills & Interests"] as const).map((s, idx) => (
        <div key={s} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", textAlign: "center", marginBottom: 8, color: "#1a1a1a" }}>{s}</div>
          {s === "Professional Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10.5 }}>{x.org}</span>
                <span style={{ fontSize: 9, fontStyle: "italic", color: "#555" }}>{x.dates}</span>
              </div>
              <div style={{ fontStyle: "italic", fontSize: 10, color: "#444", marginBottom: 3 }}>{x.role}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 14, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {s === "Education"         && <div style={{ fontSize: 10, textAlign: "center" }}><b>Stevens Institute of Technology</b> — M.S. Computer Science <span style={{ fontStyle: "italic" }}>(2022)</span></div>}
          {s === "Skills & Interests" && <div style={{ fontSize: 10, color: "#333", textAlign: "center" }}>{SKILLS}</div>}
          {idx < 2 && <div style={{ height: 0.5, background: "#ccc", marginTop: 12 }} />}
        </div>
      ))}
    </div>
  );
}

/* 24. CLEAN-ATS — Arial only, zero decoration, max ATS compatibility */
function CleanATS({ ff }: { ff: string }) {
  return (
    <div style={{ fontFamily: "'Arial', sans-serif", color: "#000", background: "#fff", width: INNER_W, height: INNER_H, padding: "28px 36px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.4 }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>ALEX MORGAN</div>
        <div style={{ fontSize: 10, marginTop: 3 }}>alex.morgan@email.com | linkedin.com/in/alexmorgan | (551) xxx-xxxx | New York, NY</div>
      </div>
      <div style={{ height: 1.5, background: "#000", marginBottom: 12 }} />
      {(["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 11 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 3 }}>{s}</div>
          <div style={{ height: 0.5, background: "#000", marginBottom: 6 }} />
          {s === "SUMMARY"    && <div style={{ fontSize: 10 }}>{SUMMARY}</div>}
          {s === "EXPERIENCE" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} | {x.org}</span>
                <span style={{ fontSize: 9 }}>{x.dates}</span>
              </div>
              {x.bullets.map((b, j) => <div key={j} style={{ paddingLeft: 12, fontSize: 10 }}>- {b}</div>)}
            </div>
          ))}
          {s === "SKILLS"     && <div style={{ fontSize: 10 }}>{SKILLS}</div>}
          {s === "EDUCATION"  && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> | Stevens Institute of Technology | 2022</div>}
        </div>
      ))}
    </div>
  );
}

/* 25. NORDIC — generous whitespace, thin rules, understated Scandinavian */
function Nordic({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#2d2d2d", background: "#fff", width: INNER_W, height: INNER_H, padding: "38px 52px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.7 }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 28, fontWeight: 300, color: "#111", letterSpacing: 1 }}>Alex Morgan</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 5 }}>
          <div style={{ width: 24, height: 1.5, background: accent, flexShrink: 0 }} />
          <div style={{ fontSize: 10, color: "#999", letterSpacing: 1.5, textTransform: "lowercase" }}>senior ai/ml engineer</div>
        </div>
        <div style={{ fontSize: 9, color: "#bbb", marginTop: 8, letterSpacing: 0.5 }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
      </div>
      {(["about", "experience", "skills", "education"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "#ccc", marginBottom: 8 }}>{s}</div>
          {s === "about"      && <div style={{ fontSize: 10, color: "#666" }}>{SUMMARY}</div>}
          {s === "experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 11 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600, fontSize: 10, color: "#222" }}>{x.role}</span>
                <span style={{ fontSize: 9, color: "#ccc" }}>{x.dates}</span>
              </div>
              <div style={{ fontSize: 9.5, color: accent, marginBottom: 3 }}>{x.org}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#777", paddingLeft: 12, fontSize: 10 }}>– {b}</div>)}
            </div>
          ))}
          {s === "skills"     && <div style={{ fontSize: 10, color: "#777" }}>{SKILLS}</div>}
          {s === "education"  && <div style={{ fontSize: 10, color: "#555" }}><span style={{ fontWeight: 600 }}>M.S. Computer Science</span> · Stevens Institute · <span style={{ color: "#ccc" }}>2022</span></div>}
          <div style={{ height: 0.5, background: "#f0f0f0", marginTop: 14 }} />
        </div>
      ))}
    </div>
  );
}

/* 26. OXFORD — wide left-margin section labels, UK academic style */
function Oxford({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "30px 34px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.55 }}>
      <div style={{ marginBottom: 18, paddingBottom: 14, borderBottom: "1px solid #222" }}>
        <div style={{ fontSize: 26, fontWeight: 400, letterSpacing: 0.5 }}>Alex Morgan</div>
        <div style={{ fontSize: 10, color: "#555", marginTop: 3, fontStyle: "italic" }}>Senior AI/ML Engineer</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 6, fontSize: 9, color: "#777" }}>
          <span>alex.morgan@email.com</span>
          <span>+1 551 xxx xxxx</span>
          <span>New York, NY</span>
        </div>
      </div>
      {(["Profile", "Experience", "Education", "Skills"] as const).map((s) => (
        <div key={s} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 8.5, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1.5, paddingTop: 2, lineHeight: 1.4 }}>{s}</div>
          <div>
            {s === "Profile"    && <div style={{ fontSize: 10, color: "#444" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role}, {x.org}</span>
                  <span style={{ fontSize: 9, color: "#888", fontStyle: "italic" }}>{x.dates}</span>
                </div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
              </div>
            ))}
            {s === "Education"  && <div style={{ fontSize: 10 }}><b>Stevens Institute of Technology</b><br /><span style={{ color: "#666", fontStyle: "italic" }}>M.S. Computer Science, 2022</span></div>}
            {s === "Skills"     && <div style={{ fontSize: 10, color: "#444" }}>{SKILLS}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* 27. HYBRID-GRID — three metric boxes under header, PM/product style */
function HybridGrid({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11 }}>
      <div style={{ background: accent, color: "#fff", padding: "18px 28px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>Alex Morgan</div>
            <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>Senior AI/ML Engineer · Product & Technology</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 8.5, opacity: 0.8, lineHeight: 1.6 }}>
            alex.morgan@email.com<br />linkedin.com/in/alexmorgan<br />New York, NY
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: `2px solid ${accent}` }}>
        {[{ label: "Years Exp.", value: "4+" }, { label: "Models Shipped", value: "12+" }, { label: "Cost Saved", value: "$2M+" }].map((m, i) => (
          <div key={i} style={{ padding: "9px 16px", borderRight: i < 2 ? `1px solid ${accent}22` : "none", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: accent }}>{m.value}</div>
            <div style={{ fontSize: 7.5, color: "#999", textTransform: "uppercase", letterSpacing: 1 }}>{m.label}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 28px" }}>
        {(["Summary", "Experience", "Skills", "Education"] as const).map((s) => (
          <div key={s} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1.5, color: accent, marginBottom: 4 }}>{s}</div>
            {s === "Summary"    && <div style={{ fontSize: 10, color: "#333" }}>{SUMMARY}</div>}
            {s === "Experience" && EXP.map((x, i) => (
              <div key={i} style={{ marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, fontSize: 10 }}>{x.role} — {x.org}</span>
                  <span style={{ fontSize: 9, color: "#888" }}>{x.dates}</span>
                </div>
                {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 10, fontSize: 10 }}>• {b}</div>)}
              </div>
            ))}
            {s === "Skills"     && <div style={{ fontSize: 10, color: "#333" }}>{SKILLS}</div>}
            {s === "Education"  && <div style={{ fontSize: 10 }}><b>M.S. Computer Science</b> — Stevens · 2022</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 28. PORTFOLIO — top border accent, bold split-color name, icon contact row */
function Portfolio({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, boxSizing: "border-box", fontSize: 11, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 28px 0", borderTop: `6px solid ${accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>Alex<br /><span style={{ color: accent }}>Morgan</span></div>
            <div style={{ fontSize: 10, color: "#666", marginTop: 6 }}>Senior AI/ML Engineer</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginTop: 4 }}>
            {[["✉", "alex.morgan@email.com"], ["◎", "linkedin.com/in/alexmorgan"], ["⌘", "github.com/alexmorgan"], ["⚬", "New York, NY"]].map(([icon, text], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8.5, color: "#666" }}>
                <span style={{ color: accent }}>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 1, background: "#e5e7eb", marginTop: 14 }} />
      </div>
      <div style={{ padding: "12px 28px", flex: 1 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "inline-block", background: accent, color: "#fff", fontSize: 8.5, fontWeight: 700, padding: "1px 10px", borderRadius: 2, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>About</div>
          <div style={{ fontSize: 10, color: "#444" }}>{SUMMARY}</div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "inline-block", background: accent, color: "#fff", fontSize: 8.5, fontWeight: 700, padding: "1px 10px", borderRadius: 2, letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Experience</div>
          {EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 8, paddingLeft: 10, borderLeft: `2.5px solid ${accent}44` }}>
              <div style={{ fontWeight: 700, fontSize: 10 }}>{x.role}</div>
              <div style={{ fontSize: 9, color: accent, fontWeight: 600, marginBottom: 2 }}>{x.org} · {x.dates}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#444", fontSize: 9.5 }}>• {b}</div>)}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={{ display: "inline-block", background: accent, color: "#fff", fontSize: 8.5, fontWeight: 700, padding: "1px 10px", borderRadius: 2, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Skills</div>
            <div style={{ fontSize: 9.5, color: "#444" }}>{SKILLS}</div>
          </div>
          <div>
            <div style={{ display: "inline-block", background: accent, color: "#fff", fontSize: 8.5, fontWeight: 700, padding: "1px 10px", borderRadius: 2, letterSpacing: 1, textTransform: "uppercase", marginBottom: 5 }}>Education</div>
            <div style={{ fontSize: 9.5 }}><b>M.S. Computer Science</b><br />Stevens Institute · <span style={{ color: "#888" }}>2022</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 29. DACH-CV — German Lebenslauf style with personal details grid */
function DachCV({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#111", background: "#fff", width: INNER_W, height: INNER_H, padding: "26px 34px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 14, borderBottom: `2px solid ${accent}` }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#555", letterSpacing: 1 }}>Lebenslauf</div>
          <div style={{ fontSize: 16, fontWeight: 400, color: "#111", marginTop: 3 }}>Alex Morgan</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 9, color: "#555", lineHeight: 1.7 }}>
          <div style={{ fontWeight: 600, fontSize: 10 }}>alex.morgan@email.com</div>
          <div>New York, NY 10001</div>
          <div>+1 551 xxx xxxx</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Persönliche Daten</div>
        <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", rowGap: 3, fontSize: 9.5 }}>
          {[["Geburtstag:", "15. März 1995"], ["Nationalität:", "US-amerikanisch"], ["Sprachen:", "Englisch · Deutsch (B2)"]].map(([l, v], i) => (
            <ReactFragment key={i}>
              <div style={{ color: "#888" }}>{l}</div>
              <div>{v}</div>
            </ReactFragment>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Berufserfahrung</div>
        {EXP.map((x, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: "#888" }}>{x.dates}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 10 }}>{x.role}</div>
              <div style={{ fontSize: 9.5, color: "#555", marginBottom: 2 }}>{x.org}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ fontSize: 9.5, color: "#444" }}>• {b}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Ausbildung</div>
          <div style={{ fontSize: 9.5 }}><b>M.S. Computer Science</b><br /><span style={{ color: "#666" }}>Stevens Institute, 2022</span></div>
        </div>
        <div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>EDV-Kenntnisse</div>
          <div style={{ fontSize: 9.5, color: "#444" }}>Python · PyTorch · AWS<br />Kubernetes · MLflow</div>
        </div>
      </div>
    </div>
  );
}

/* 30. SERIF-FORMAL — centered rules flanking section titles, formal finance/Big4 */
function SerifFormal({ accent, ff }: { accent: string; ff: string }) {
  return (
    <div style={{ fontFamily: ff, color: "#1a1a1a", background: "#fff", width: INNER_W, height: INNER_H, padding: "32px 44px", boxSizing: "border-box", fontSize: 11, lineHeight: 1.55 }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Alex Morgan</div>
        <div style={{ fontSize: 9.5, color: "#555", marginTop: 4 }}>Senior AI/ML Engineer</div>
        <div style={{ fontSize: 9, color: "#777", marginTop: 4, fontStyle: "italic" }}>alex.morgan@email.com · linkedin.com/in/alexmorgan · New York, NY</div>
        <div style={{ margin: "10px auto 0", height: 2, background: accent }} />
        <div style={{ margin: "3px auto 0", height: 0.5, background: accent }} />
      </div>
      {(["Professional Experience", "Education", "Skills"] as const).map((s) => (
        <div key={s} style={{ marginBottom: 13 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <div style={{ flex: 1, height: 0.5, background: "#ccc" }} />
            <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, color: accent, margin: "0 12px" }}>{s}</div>
            <div style={{ flex: 1, height: 0.5, background: "#ccc" }} />
          </div>
          {s === "Professional Experience" && EXP.map((x, i) => (
            <div key={i} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700, fontSize: 10.5 }}>{x.org}</span>
                <span style={{ fontSize: 9, fontStyle: "italic", color: "#666" }}>{x.dates}</span>
              </div>
              <div style={{ fontStyle: "italic", fontSize: 10, color: "#555", marginBottom: 3 }}>{x.role}</div>
              {x.bullets.map((b, j) => <div key={j} style={{ color: "#333", paddingLeft: 12, fontSize: 10 }}>• {b}</div>)}
            </div>
          ))}
          {s === "Education" && <div style={{ fontSize: 10, textAlign: "center" }}><b>Stevens Institute of Technology</b> · M.S. Computer Science · <span style={{ fontStyle: "italic" }}>2022</span></div>}
          {s === "Skills"    && <div style={{ fontSize: 10, color: "#333", textAlign: "center" }}>{SKILLS}</div>}
        </div>
      ))}
    </div>
  );
}

/* ------------ entry ------------ */

export default function TemplatePreview({ template }: { template: Template }) {
  const accent = accentFor(template);
  const ff     = fontFamily(template);
  const layout = layoutFor(template);
  const serif  = isSerifFont(template);

  const paddingTop = `${(INNER_H / INNER_W) * 100}%`;

  return (
    <div style={{ position: "relative", width: "100%", paddingTop, background: "#fff", borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: INNER_W, height: INNER_H,
        transformOrigin: "top left",
        transform: "scale(var(--tp-scale, 0.28))",
      }}>
        {layout === "minimal"          && <Minimal         accent={accent} ff={ff} serif={serif} />}
        {layout === "minimal-left"     && <MinimalLeft     accent={accent} ff={ff} />}
        {layout === "modern-bar"       && <ModernBar       accent={accent} ff={ff} />}
        {layout === "modern-top"       && <ModernTop       accent={accent} ff={ff} />}
        {layout === "serif-classic"    && <SerifClassic    accent={accent} ff={ff} />}
        {layout === "serif-split"      && <SerifSplit      accent={accent} ff={ff} />}
        {layout === "sidebar"          && <Sidebar         accent={accent} ff={ff} />}
        {layout === "sidebar-right"    && <SidebarRight    accent={accent} ff={ff} />}
        {layout === "banner"           && <Banner          accent={accent} ff={ff} />}
        {layout === "banner-split"     && <BannerSplit     accent={accent} ff={ff} />}
        {layout === "structured"       && <Structured      accent={accent} ff={ff} />}
        {layout === "bordered"         && <Bordered        accent={accent} ff={ff} />}
        {layout === "two-col"          && <TwoCol          accent={accent} ff={ff} />}
        {layout === "shaded-header"    && <ShadedHeader    accent={accent} ff={ff} />}
        {layout === "creative-split"   && <CreativeSplit   accent={accent} ff={ff} />}
        {layout === "timeline"         && <Timeline        accent={accent} ff={ff} />}
        {layout === "infographic"      && <Infographic     accent={accent} ff={ff} />}
        {layout === "executive"        && <Executive       accent={accent} ff={ff} />}
        {layout === "magazine"         && <Magazine        accent={accent} ff={ff} />}
        {layout === "gradient-header"  && <GradientHeader  accent={accent} ff={ff} />}
        {layout === "card-photo"       && <CardPhoto       accent={accent} ff={ff} />}
        {layout === "terminal-dark"    && <TerminalDark    accent={accent} ff={ff} />}
        {layout === "serif-prestige"   && <SerifPrestige   ff={ff} />}
        {layout === "clean-ats"        && <CleanATS        ff={ff} />}
        {layout === "nordic"           && <Nordic          accent={accent} ff={ff} />}
        {layout === "oxford"           && <Oxford          accent={accent} ff={ff} />}
        {layout === "hybrid-grid"      && <HybridGrid      accent={accent} ff={ff} />}
        {layout === "portfolio"        && <Portfolio       accent={accent} ff={ff} />}
        {layout === "dach-cv"          && <DachCV          accent={accent} ff={ff} />}
        {layout === "serif-formal"     && <SerifFormal     accent={accent} ff={ff} />}
      </div>
    </div>
  );
}
