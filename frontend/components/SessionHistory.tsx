"use client";
import { useEffect, useState } from "react";
import { X, Trash2, Clock, FileText, Loader2, Plus } from "lucide-react";
import { listMySessions, deleteMySession, getMySession, type SessionSummary } from "@/lib/api";

export default function SessionHistory({
  open,
  onClose,
  onLoad,
  onNew,
  currentSessionId,
}: {
  open: boolean;
  onClose: () => void;
  onLoad: (session: any) => void;
  onNew: () => void;
  currentSessionId?: string;
}) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string>("");

  const refresh = async () => {
    setLoading(true);
    try { setSessions(await listMySessions()); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (open) refresh(); }, [open]);

  if (!open) return null;

  const pick = async (id: string) => {
    setLoadingId(id);
    try {
      const full = await getMySession(id);
      onLoad(full);
      onClose();
    } catch (e: any) { alert("Load failed: " + e.message); }
    finally { setLoadingId(""); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    try { await deleteMySession(id); refresh(); } catch (e: any) { alert("Delete failed: " + e.message); }
  };

  const fmtDate = (t: number) => {
    const d = new Date(t * 1000);
    const now = new Date();
    const diffHrs = (now.getTime() - d.getTime()) / 3600000;
    if (diffHrs < 1) return `${Math.round(diffHrs * 60)}m ago`;
    if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
    if (diffHrs < 48) return "yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-10 p-4">
      <div className="glass rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-indigo-400" />
            <div className="font-semibold">Session history</div>
            {loading && <Loader2 size={14} className="animate-spin text-white/40" />}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onNew(); onClose(); }}
              className="text-xs hairline rounded-lg px-2 py-1 hover:bg-white/5 flex items-center gap-1">
              <Plus size={12} /> New
            </button>
            <button onClick={onClose} className="text-white/40 hover:text-white/80">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!loading && sessions.length === 0 && (
            <div className="text-center text-white/40 text-sm py-10">
              No saved sessions yet. Build a resume to create one.
            </div>
          )}
          {sessions.map((s) => {
            const isCurrent = s.id === currentSessionId;
            return (
              <div key={s.id}
                className={`hairline rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-white/5 ${isCurrent ? "border-indigo-400/40 bg-indigo-500/5" : ""}`}>
                <button onClick={() => pick(s.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-indigo-400 shrink-0" />
                    <div className="text-sm font-medium truncate">
                      {s.label || s.role || "Untitled session"}
                    </div>
                    {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-100">current</span>}
                  </div>
                  <div className="text-[11px] text-white/50 line-clamp-1">
                    {s.jd_preview ? s.jd_preview.slice(0, 100) + (s.jd_preview.length >= 100 ? "…" : "") : "No JD"}
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">
                    {fmtDate(s.updated_at)} · {s.resume_chars} resume chars
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  {loadingId === s.id && <Loader2 size={14} className="animate-spin text-white/40" />}
                  <button onClick={() => del(s.id)}
                    className="p-1.5 text-white/40 hover:text-rose-300 rounded-lg hover:bg-rose-500/10">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
