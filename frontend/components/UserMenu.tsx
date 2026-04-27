"use client";
import { useState } from "react";
import { User, LogOut, ChevronDown, History, Chrome, Check } from "lucide-react";
import { authLogout, getAuthToken, type AuthUser } from "@/lib/api";

export default function UserMenu({
  user,
  onLogout,
  onOpenHistory,
}: {
  user: AuthUser;
  onLogout: () => void;
  onOpenHistory: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  const copyToken = async () => {
    const t = await getAuthToken();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 hairline rounded-lg px-2 py-1.5 hover:bg-white/5"
      >
        <div className="w-7 h-7 rounded-full bg-indigo-500/80 flex items-center justify-center text-xs font-bold">
          {initials}
        </div>
        <div className="hidden sm:block text-sm text-white/80 max-w-[140px] truncate">{user.name || user.email}</div>
        <ChevronDown size={14} className="text-white/40" />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 glass rounded-xl p-2 z-50 shadow-xl">
          <div className="px-2 py-2 border-b border-white/5 mb-1">
            <div className="text-sm font-semibold truncate">{user.name || "—"}</div>
            <div className="text-xs text-white/50 truncate">{user.email}</div>
            {user.profile?.headline && (
              <div className="text-[11px] text-indigo-300/80 mt-1 line-clamp-2">{user.profile.headline}</div>
            )}
            {user.profile && (
              <div className="text-[10px] text-white/40 mt-1">
                {user.profile.years_experience}y · {user.profile.seniority}
                {user.profile.current_title && ` · ${user.profile.current_title.slice(0, 30)}`}
              </div>
            )}
          </div>

          <button
            onClick={() => { setOpen(false); onOpenHistory(); }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-white/5"
          >
            <History size={14} /> Session history
          </button>

          <button
            onClick={copyToken}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-white/5"
            title="Copy your auth token to paste into the Chrome extension"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Chrome size={14} />}
            {copied ? "Copied — paste into extension" : "Connect extension"}
          </button>

          <button
            onClick={async () => { setOpen(false); await authLogout(); onLogout(); }}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-white/5 text-rose-300"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
