"use client";
import { useEffect, useMemo, useState } from "react";
import { Scale, Plus, Trash2, Loader2, Check } from "lucide-react";
import { listOffers, upsertOffer, deleteOffer, type Offer } from "@/lib/api";

const DEFAULT_WEIGHTS = { comp: 4, growth: 2, culture: 2, wlb: 2, learning: 1 };

function fmt(n: number) {
  if (!n) return "$0";
  return "$" + Math.round(n).toLocaleString();
}

function totalComp(o: Offer) {
  const base = o.base_salary || 0;
  const bonus = (o.bonus_target || 0) * base / 100;
  return base + bonus + (o.equity_per_year || 0) + (o.signing_bonus || 0);
}

export default function OfferCompare() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Offer> | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);

  const load = async () => {
    try { setOffers(await listOffers()); } catch (e: any) { setErr(String(e.message || e).slice(0, 160)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing || !editing.company?.trim() || !editing.role?.trim()) {
      setErr("Company and role are required."); return;
    }
    setBusy(true); setErr("");
    try {
      await upsertOffer({
        id: editing.id,
        company: editing.company.trim(),
        role: editing.role.trim(),
        location: editing.location || "",
        base_salary: Number(editing.base_salary || 0),
        bonus_target: Number(editing.bonus_target || 0),
        equity_per_year: Number(editing.equity_per_year || 0),
        signing_bonus: Number(editing.signing_bonus || 0),
        benefits_note: editing.benefits_note || "",
        growth: Number(editing.growth || 0),
        culture: Number(editing.culture || 0),
        wlb: Number(editing.wlb || 0),
        learning: Number(editing.learning || 0),
        notes: editing.notes || "",
        decision: editing.decision || "",
      });
      setEditing(null);
      await load();
    } catch (e: any) { setErr(String(e.message || e).slice(0, 160)); }
    finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this offer?")) return;
    try { await deleteOffer(id); await load(); } catch {}
  };

  // Weighted score: normalize each factor to 0-1 across offers, then weight.
  const scored = useMemo(() => {
    if (offers.length === 0) return [];
    const totals = offers.map(totalComp);
    const maxTotal = Math.max(...totals, 1);
    return offers.map((o, i) => {
      const compScore = totals[i] / maxTotal;             // 0-1
      const g = (o.growth || 0) / 10;
      const c = (o.culture || 0) / 10;
      const w = (o.wlb || 0) / 10;
      const l = (o.learning || 0) / 10;
      const wt = weights;
      const sumW = wt.comp + wt.growth + wt.culture + wt.wlb + wt.learning || 1;
      const score = (compScore * wt.comp + g * wt.growth + c * wt.culture + w * wt.wlb + l * wt.learning) / sumW;
      return { offer: o, total: totals[i], score: Math.round(score * 100) };
    }).sort((a, b) => b.score - a.score);
  }, [offers, weights]);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="text-indigo-400" size={18} />
        <div className="font-semibold">Offer Compare</div>
        <button onClick={() => setEditing({ company: "", role: "", base_salary: 0, bonus_target: 0, growth: 0, culture: 0, wlb: 0, learning: 0 })}
          className="ml-auto text-xs px-2 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white flex items-center gap-1">
          <Plus size={12} /> Add offer
        </button>
      </div>

      {err && <div className="text-xs text-rose-300 mb-2">{err}</div>}

      <div className="mb-3 flex flex-wrap gap-x-3 gap-y-2 text-[11px] items-center">
        <div className="text-white/50 uppercase tracking-widest w-full sm:w-auto">Weights</div>
        {(["comp", "growth", "culture", "wlb", "learning"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1">
            <span className="text-white/60">{k}</span>
            <input type="number" min={0} max={10} value={weights[k]}
              onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })}
              className="w-12 hairline rounded bg-transparent px-1 py-0.5 text-center" />
          </label>
        ))}
      </div>

      {loading ? (
        <div className="text-xs text-white/50 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Loading…</div>
      ) : scored.length === 0 ? (
        <div className="text-xs text-white/50">No offers yet. Add your first to start comparing.</div>
      ) : (
        <>
          {/* Desktop/tablet: dense table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="text-[12px] w-full">
              <thead>
                <tr className="text-white/50 text-[10px] uppercase tracking-widest">
                  <th className="text-left pr-3">Rank</th>
                  <th className="text-left pr-3">Company</th>
                  <th className="text-right pr-3">Base</th>
                  <th className="text-right pr-3">Bonus %</th>
                  <th className="text-right pr-3">Equity/yr</th>
                  <th className="text-right pr-3">Signing</th>
                  <th className="text-right pr-3">Total/yr1</th>
                  <th className="text-right pr-3">G</th>
                  <th className="text-right pr-3">C</th>
                  <th className="text-right pr-3">W</th>
                  <th className="text-right pr-3">L</th>
                  <th className="text-right pr-3">Score</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {scored.map((s, i) => (
                  <tr key={s.offer.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="pr-3 py-1.5">
                      {i === 0
                        ? <span className="text-emerald-300 font-bold">★ #1</span>
                        : <span className="text-white/50">#{i + 1}</span>}
                    </td>
                    <td className="pr-3">
                      <button onClick={() => setEditing(s.offer)} className="text-left hover:text-indigo-300">
                        <div className="font-semibold">{s.offer.company}</div>
                        <div className="text-[10px] text-white/50">{s.offer.role} · {s.offer.location}</div>
                      </button>
                    </td>
                    <td className="pr-3 text-right">{fmt(s.offer.base_salary)}</td>
                    <td className="pr-3 text-right">{s.offer.bonus_target || 0}%</td>
                    <td className="pr-3 text-right">{fmt(s.offer.equity_per_year)}</td>
                    <td className="pr-3 text-right">{fmt(s.offer.signing_bonus)}</td>
                    <td className="pr-3 text-right font-semibold">{fmt(s.total)}</td>
                    <td className="pr-3 text-right">{s.offer.growth || 0}</td>
                    <td className="pr-3 text-right">{s.offer.culture || 0}</td>
                    <td className="pr-3 text-right">{s.offer.wlb || 0}</td>
                    <td className="pr-3 text-right">{s.offer.learning || 0}</td>
                    <td className="pr-3 text-right">
                      <span className="font-bold text-indigo-300">{s.score}</span>
                    </td>
                    <td>
                      <button onClick={() => remove(s.offer.id)} className="text-white/40 hover:text-rose-300">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="md:hidden space-y-2">
            {scored.map((s, i) => (
              <div key={s.offer.id} className="hairline rounded-lg p-3 text-[12px]">
                <div className="flex items-center gap-2 mb-2">
                  {i === 0
                    ? <span className="text-emerald-300 font-bold text-xs">★ #1</span>
                    : <span className="text-white/50 text-xs">#{i + 1}</span>}
                  <button onClick={() => setEditing(s.offer)} className="text-left hover:text-indigo-300 flex-1 min-w-0">
                    <div className="font-semibold truncate">{s.offer.company}</div>
                    <div className="text-[10px] text-white/50 truncate">{s.offer.role}{s.offer.location ? ` · ${s.offer.location}` : ""}</div>
                  </button>
                  <span className="font-bold text-indigo-300 text-sm">{s.score}</span>
                  <button onClick={() => remove(s.offer.id)} className="text-white/40 hover:text-rose-300">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <Field label="Base" value={fmt(s.offer.base_salary)} />
                  <Field label="Total/yr1" value={fmt(s.total)} bold />
                  <Field label="Equity/yr" value={fmt(s.offer.equity_per_year)} />
                  <Field label="Signing" value={fmt(s.offer.signing_bonus)} />
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5 text-[10px] text-white/60">
                  <span>G {s.offer.growth || 0}</span>
                  <span>C {s.offer.culture || 0}</span>
                  <span>W {s.offer.wlb || 0}</span>
                  <span>L {s.offer.learning || 0}</span>
                  <span className="ml-auto">Bonus {s.offer.bonus_target || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editing && (
        <div className="fixed inset-0 z-[90] bg-black/70 flex items-center justify-center p-4"
          onClick={() => !busy && setEditing(null)}>
          <div className="glass rounded-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="font-semibold mb-3 flex items-center gap-2">
              <Scale size={16} className="text-indigo-400" />
              {editing.id ? "Edit offer" : "New offer"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <TextInput label="Company" value={editing.company || ""} onChange={(v) => setEditing({ ...editing, company: v })} />
              <TextInput label="Role" value={editing.role || ""} onChange={(v) => setEditing({ ...editing, role: v })} />
              <TextInput label="Location" value={editing.location || ""} onChange={(v) => setEditing({ ...editing, location: v })} />
              <NumInput label="Base salary $" value={editing.base_salary || 0} onChange={(v) => setEditing({ ...editing, base_salary: v })} />
              <NumInput label="Target bonus %" value={editing.bonus_target || 0} onChange={(v) => setEditing({ ...editing, bonus_target: v })} />
              <NumInput label="Equity / year $" value={editing.equity_per_year || 0} onChange={(v) => setEditing({ ...editing, equity_per_year: v })} />
              <NumInput label="Signing $" value={editing.signing_bonus || 0} onChange={(v) => setEditing({ ...editing, signing_bonus: v })} />
              <NumInput label="Growth (0-10)" value={editing.growth || 0} onChange={(v) => setEditing({ ...editing, growth: v })} />
              <NumInput label="Culture (0-10)" value={editing.culture || 0} onChange={(v) => setEditing({ ...editing, culture: v })} />
              <NumInput label="Work-life balance (0-10)" value={editing.wlb || 0} onChange={(v) => setEditing({ ...editing, wlb: v })} />
              <NumInput label="Learning (0-10)" value={editing.learning || 0} onChange={(v) => setEditing({ ...editing, learning: v })} />
              <label className="block sm:col-span-2">
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Notes</div>
                <textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="w-full hairline rounded-lg p-2 bg-transparent text-sm min-h-[60px]" />
              </label>
              <label className="block sm:col-span-2">
                <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Decision</div>
                <select value={editing.decision || ""} onChange={(e) => setEditing({ ...editing, decision: e.target.value })}
                  className="hairline rounded-lg p-1.5 bg-black/20 text-sm">
                  <option value="">Undecided</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={save} disabled={busy}
                className="flex-1 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
              </button>
              <button onClick={() => setEditing(null)} disabled={busy}
                className="px-4 py-2 rounded-xl hairline text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full hairline rounded-lg p-2 bg-transparent text-sm" />
    </label>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-white/40 uppercase tracking-widest text-[9px]">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-widest text-white/50 mb-1">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full hairline rounded-lg p-2 bg-transparent text-sm" />
    </label>
  );
}
