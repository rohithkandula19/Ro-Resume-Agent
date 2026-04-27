"use client";
import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { Sparkles, X, Loader2 } from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import type { AuthUser } from "@/lib/api";

export default function AuthModal({
  onAuthed,
  onClose,
  allowClose = false,
}: {
  onAuthed: (u: AuthUser) => void;
  onClose?: () => void;
  allowClose?: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const mapUser = (fbUser: any): AuthUser => ({
    id: fbUser.uid,
    email: fbUser.email || "",
    name: fbUser.displayName || name.trim() || "",
    created_at: Math.floor(
      new Date(fbUser.metadata?.creationTime || 0).getTime() / 1000,
    ),
    profile: null,
  });

  const submit = async () => {
    if (busy) return;
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        if (!email.includes("@")) {
          setError("Enter a valid email");
          return;
        }
        await sendPasswordResetEmail(auth, email.trim());
        setInfo("Password reset email sent — check your inbox.");
        return;
      }
      if (!email.includes("@")) { setError("Enter a valid email"); return; }
      if (password.length < 8) { setError("Password must be 8+ characters"); return; }

      if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() });
        onAuthed(mapUser(cred.user));
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        onAuthed(mapUser(cred.user));
      }
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") setError("Email already registered. Try logging in.");
      else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential")
        setError("Invalid email or password.");
      else if (code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError(e?.message?.slice(0, 140) || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const signInGoogle = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onAuthed(mapUser(cred.user));
    } catch (e: any) {
      if (e?.code !== "auth/popup-closed-by-user") {
        setError(e?.message?.slice(0, 140) || "Google sign-in failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass rounded-2xl w-full max-w-sm p-6 relative">
        {allowClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/40 hover:text-white/80"
          >
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
        </div>

        {/* Google sign-in */}
        <button
          onClick={signInGoogle}
          disabled={busy}
          className="w-full mb-4 py-2 rounded-xl hairline bg-white/5 hover:bg-white/10 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 border-t border-white/10" />
          <span className="text-xs text-white/30">or</span>
          <div className="flex-1 border-t border-white/10" />
        </div>

        {mode === "signup" && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Name</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm"
              placeholder="Your name"
            />
          </label>
        )}

        {(mode === "signup" || mode === "login" || mode === "forgot") && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Email</div>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mode === "forgot" && submit()}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm"
              placeholder="you@example.com"
            />
          </label>
        )}

        {(mode === "signup" || mode === "login") && (
          <label className="block mb-3">
            <div className="text-[11px] uppercase tracking-widest text-white/50 mb-1">Password</div>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className="w-full hairline rounded-lg p-2 bg-transparent text-sm"
              placeholder={mode === "login" ? "••••••••" : "At least 8 characters"}
            />
          </label>
        )}

        {error && (
          <div className="mb-3 text-xs text-rose-300 bg-rose-500/10 hairline rounded-lg p-2">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-3 text-xs text-emerald-300 bg-emerald-500/10 hairline rounded-lg p-2">
            {info}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "signup" && "Create account"}
          {mode === "login" && "Sign in"}
          {mode === "forgot" && "Send reset link"}
        </button>

        <div className="mt-4 text-xs text-white/50 text-center space-y-1">
          {mode === "login" && (
            <>
              <div>
                New here?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(""); setInfo(""); }}
                  className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
                >
                  Create an account
                </button>
              </div>
              <div>
                <button
                  onClick={() => { setMode("forgot"); setError(""); setInfo(""); }}
                  className="text-white/50 hover:text-white/80"
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
          {mode === "signup" && (
            <div>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); setInfo(""); }}
                className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
              >
                Log in
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => { setMode("login"); setError(""); setInfo(""); }}
              className="text-indigo-300 hover:text-indigo-200 underline-offset-2 hover:underline"
            >
              Back to login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
