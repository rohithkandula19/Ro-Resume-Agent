"use client";
import { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink, Loader2, Calendar, DollarSign, X, Edit3 } from "lucide-react";
import {
  listApplications, createApplication, updateApplication, deleteApplication,
  type Application, type AppStatus,
} from "@/lib/api";

const COLUMNS: { key: AppStatus; label: string; color: string }[] = [
  { key: "saved", label: "Saved", color: "text-white/70" },
  { key: "applied", label: "Applied", color: "text-indigo-300" },
  { key: "interview", label: "Interview", color: "text-amber-300" },
  { key: "offer", label: "Offer", color: "text-emerald-300" },
  { key: "rejected", label: "Rejected", color: "text-rose-300" },
];

function fmtDate(t: number | null) {
  if (!t) return "";
  const d = new Date(t * 1000);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ApplicationsTracker({
  currentRole,
  currentJd,
  currentSessionId,
  resumeChars,
}: {
  currentRole: string;
  currentJd: string;
  currentSessionId: string;
  resumeChars: number;
}) {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { setApps(await listApplications()); }
    catch (e: any) { console.warn("listApplications failed", e); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const changeStatus = async (a: Application, status: AppStatus) => {
    setApps((xs) => xs.map((x) => x.id === a.id ? { ...x, status } : x));
    const patch: any = { status };
    if (status === "applied" && !a.applied_at) patch.applied_at = Math.floor(Date.now() / 1000);
    try { await updateApplication(a.id, patch); } catch (e: any) { alert("Update failed: " + e.message); refresh(); }
  };

  const save = async (draft: Partial<Application>) => {
    try {
      if (editing) {
        await updateApplication(editing.id, draft);
      } else {
        await createApplication({
          ...draft,
          session_id: currentSessionId,
        } as any);
      }
      setEditing(null); setCreating(false);
      refresh();
    } catch (e: any) { alert("Save failed: " + e.message); }
  };

  const remove = async (a: Application) => {
    if (!confirm(`Delete application to ${a.company}?`)) return;
    try { await deleteApplication(a.id); refresh(); }
    catch (e: any) { alert("Delete failed: " + e.message); }
  };

  const grouped = Object.fromEntries(COLUMNS.map((c) => [c.key, [] as Application[]]));
  for (const a of apps) {
    if (a.status === "withdrawn") continue;
    (grouped[a.status] || grouped["saved"]).push(a);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">Applications</div>
          <div className="text-xs text-white/50">{apps.length} tracked · drag via the status dropdown on each card</div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium"
        >
          <Plus size={14} /> New application
        </button>
      </div>

      {loading && <div className="text-sm text-white/50 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {COLUMNS.map((col) => (
          <div key={col.key} className="glass rounded-2xl p-3 min-h-[240px]">
            <div className="flex items-center justify-between mb-3">
              <div className={`text-xs uppercase tracking-widest font-semibold ${col.color}`}>{col.label}</div>
              <div className="text-xs text-white/40">{grouped[col.key].length}</div>
            </div>
            <div className="space-y-2">
              {grouped[col.key].map((a) => (
                <div key={a.id} className="hairline rounded-lg p-2.5 bg-white/[0.02] hover:bg-white/[0.04] group">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{a.company}</div>
                      <div className="text-xs text-white/60 truncate">{a.role}</div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditing(a)} className="p-1 text-white/40 hover:text-white">
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => remove(a)} className="p-1 text-white/40 hover:text-rose-300">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  {a.jd_url && (
                    <a href={a.jd_url} target="_blank" rel="noreferrer"
                       className="text-[10px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1 mb-1">
                      <ExternalLink size={10} /> JD
                    </a>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-white/40 mb-2">
                    {a.applied_at && <span className="flex items-center gap-0.5"><Calendar size={10} /> {fmtDate(a.applied_at)}</span>}
                    {a.salary_band && <span className="flex items-center gap-0.5"><DollarSign size={10} /> {a.salary_band}</span>}
                  </div>
                  <select
                    value={a.status}
                    onChange={(e) => changeStatus(a, e.target.value as AppStatus)}
                    className="w-full text-[10px] hairline rounded bg-transparent px-1.5 py-1"
                  >
                    {COLUMNS.map((c) => <option key={c.key} value={c.key} className="bg-black">{c.label}</option>)}
                    <option value="withdrawn" className="bg-black">Withdrawn</option>
                  </select>
                </div>
              ))}
              {grouped[col.key].length === 0 && (
                <div className="text-center text-[11px] text-white/30 py-6">empty</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <ApplicationModal
          initial={editing || {
            company: "",
            role: currentRole,
            status: "saved",
            jd_url: "",
            notes: currentJd ? currentJd.slice(0, 200) : "",
            salary_band: "",
          }}
          onSave={save}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ApplicationModal({
  initial,
  onSave,
  onClose,
}: {
  initial: Partial<Application>;
  onSave: (draft: Partial<Application>) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Partial<Application>>(initial);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof Application, v: any) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async () => {
    if (!draft.company?.trim() || !draft.role?.trim()) { alert("Company and role required"); return; }
    setBusy(true);
    try { await onSave(draft); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-2xl w-full max-w-md p-5 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white/80">
          <X size={18} />
        </button>
        <div className="font-semibold mb-4">{initial.id ? "Edit application" : "New application"}</div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Company">
              <input value={draft.company || ""} onChange={(e) => set("company", e.target.value)}
                className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="Acme" />
            </Field>
            <Field label="Role">
              <input value={draft.role || ""} onChange={(e) => set("role", e.target.value)}
                className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="SWE" />
            </Field>
          </div>
          <Field label="Status">
            <select value={draft.status || "saved"} onChange={(e) => set("status", e.target.value)}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm">
              {["saved","applied","interview","offer","rejected","withdrawn"].map((s) =>
                <option key={s} value={s} className="bg-black">{s}</option>)}
            </select>
          </Field>
          <Field label="JD URL">
            <input value={draft.jd_url || ""} onChange={(e) => set("jd_url", e.target.value)}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="https://…" />
          </Field>
          <Field label="Salary band">
            <input value={draft.salary_band || ""} onChange={(e) => set("salary_band", e.target.value)}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="$140k–$180k" />
          </Field>
          <Field label="Notes">
            <textarea value={draft.notes || ""} onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm resize-none" placeholder="Referral, interview rounds, recruiter name…" />
          </Field>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
          <button onClick={submit} disabled={busy}
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
            {busy && <Loader2 size={12} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{label}</div>
      {children}
    </label>
  );
}
