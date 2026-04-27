"use client";
import { useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { authLogin, authSignup, setAuthToken, authRequestReset, authResetPassword, type AuthUser } from "@/lib/api";

export default function AuthModal({
  onAuthed,
  onClose,
  allowClose = false,
}: {
  onAuthed: (u: AuthUser) => void;
  onClose?: () => void;
  allowClose?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (busy) return;
    setError(""); setInfo("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        if (!email.includes("@")) { setError("Enter a valid email"); setBusy(false); return; }
        const r = await authRequestReset(email.trim());
        if (r.dev_token) {
          setResetToken(r.dev_token);
          setInfo("Dev mode: reset token generated below. Enter a new password.");
          setMode("reset");
        } else {
          setInfo(r.message);
        }
        return;
      }
      if (mode === "reset") {
        if (!resetToken) { setError("Missing reset token"); setBusy(false); return; }
        if (password.length < 8) { setError("Password must be 8+ characters"); setBusy(false); return; }
        await authResetPassword(resetToken, password);
        setInfo("Password reset. Log in with your new password.");
        setMode("login"); setPassword(""); setResetToken("");
        return;
      }
      if (!email.includes("@")) { setError("Enter a valid email"); setBusy(false); return; }
      if (password.length < 8) { setError("Password must be 8+ characters"); setBusy(false); return; }
      const r = mode === "signup"
        ? await authSignup(email.trim(), password, name.trim())
        : await authLogin(email.trim(), password);
      setAuthToken(r.token);
      onAuthed(r.user);
    } catch (e: any) {
      const msg = String(e.message || e);
      if (msg.includes("409")) setError("Email already registered. Try logging in.");
      else if (msg.includes("401")) setError("Invalid email or password.");
      else if (msg.includes("400")) setError("Invalid or expired reset token.");
      else setError(msg.slice(0, 140));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-2xl w-full max-w-sm p-6 relative">
        {allowClose && onClose && (
          <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white/80">
            <X size={18} />
          </button>
        )}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-indigo-400" size={20} />
          <div className="text-lg font-bold">RO Resume Agent</div>
        </div>
        <div className="text-sm text-white/70 mb-4">
          {mode === "signup" && "Create an account to save sessions, track applications, and get AI-extracted experience."}
          {mode === "login" && "Welcome back. Sign in to continue."}
          {mode === "forgot" && "Enter your email to get a password reset link."}
          {mode === "reset" && "Enter a new password."}
        </div>

        {mode === "signup" && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="Your name" />
          </label>
        )}

        {(mode === "signup" || mode === "login" || mode === "forgot") && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Email</div>
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mode === "forgot" && submit()}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm" placeholder="you@example.com" />
          </label>
        )}

        {mode === "reset" && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Reset token</div>
            <input value={resetToken} onChange={(e) => setResetToken(e.target.value)}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm font-mono text-[11px]" />
          </label>
        )}

        {(mode === "signup" || mode === "login" || mode === "reset") && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">
              {mode === "reset" ? "New password" : "Password"}
            </div>
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm"
              placeholder={mode === "login" ? "••••••••" : "At least 8 characters"} />
          </label>
        )}

        {error && (
          <div className="mb-3 text-xs text-rose-300 bg-rose-500/10 hairline rounded-lg p-2">{error}</div>
        )}
        {info && (
          <div className="mb-3 text-xs text-emerald-300 bg-emerald-500/10 hairline rounded-lg p-2">{info}</div>
        )}

        <button onClick={submit} disabled={busy}
          className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "signup" && "Create account"}
          {mode === "login" && "Sign in"}
          {mode === "forgot" && "Send reset link"}
          {mode === "reset" && "Set new password"}
        </button>

        <div className="mt-4 text-xs text-white/50 text-center space-y-1">
          {mode === "login" && (
            <>
              <div>
                New here?{" "}
                <button onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                  className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline">
                  Create an account
                </button>
              </div>
              <div>
                <button onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                  className="text-white/50 hover:text-white/80">
                  Forgot password?
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Already have an account?{" "}
              <button onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline">
                Log in
              </button>
            </div>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline">
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
