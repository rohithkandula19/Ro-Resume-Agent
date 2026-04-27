"use client";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { authExtractProfile, upsertMySession, type AuthUser } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setChecked(true);
        return;
      }
      // Map Firebase user → AuthUser
      const base: AuthUser = {
        id: fbUser.uid,
        email: fbUser.email || "",
        name: fbUser.displayName || "",
        created_at: Math.floor(
          new Date(fbUser.metadata.creationTime || 0).getTime() / 1000,
        ),
        profile: null,
      };
      // Fetch full profile (incl. AI-extracted data) from backend
      try {
        const token = await fbUser.getIdToken();
        const me = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => (r.ok ? r.json() : null));
        if (me) base.profile = me.profile ?? null;
      } catch {}
      setUser(base);
      setChecked(true);
    });
    return unsub;
  }, []);

  return { user, setUser, checked };
}

/** Extracts an AI-generated experience summary once per unique resume. */
export function useProfileExtraction(
  user: AuthUser | null,
  resumeText: string,
  setUser: (u: AuthUser | null | ((p: AuthUser | null) => AuthUser | null)) => void,
) {
  const [extracting, setExtracting] = useState(false);
  const lastKey = useRef("");

  useEffect(() => {
    if (!user || !resumeText || resumeText.length < 200) return;
    const key = resumeText.slice(0, 200);
    if (lastKey.current === key) return;
    if (user.profile && user.profile.top_skills?.length) return;
    lastKey.current = key;
    setExtracting(true);
    authExtractProfile(resumeText)
      .then((r) => setUser((u: any) => (u ? { ...u, profile: r.profile } : u)))
      .catch(() => {})
      .finally(() => setExtracting(false));
  }, [user, resumeText, setUser]);

  const reset = () => {
    lastKey.current = "";
  };
  return { extracting, reset };
}

/** Debounced per-user session auto-save. */
export function useSessionAutoSave(
  user: AuthUser | null,
  sid: string,
  snapshot: {
    resumeText: string;
    jdText: string;
    role: string;
    stylePref: string;
    font: string;
    fontSize: number;
    template: string;
    years: number;
    mustIncludeKeywords: string[];
    editedResume: any;
  },
) {
  const timer = useRef<any>(null);
  useEffect(() => {
    if (!user || !sid) return;
    if (!snapshot.resumeText && !snapshot.jdText && !snapshot.role) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      upsertMySession({
        id: sid,
        label:
          snapshot.role ||
          (snapshot.jdText ? snapshot.jdText.slice(0, 40) : "Untitled"),
        role: snapshot.role,
        jd_text: snapshot.jdText,
        resume_text: snapshot.resumeText,
        state: {
          stylePref: snapshot.stylePref,
          font: snapshot.font,
          fontSize: snapshot.fontSize,
          template: snapshot.template,
          years: snapshot.years,
          mustIncludeKeywords: snapshot.mustIncludeKeywords,
          editedResume: snapshot.editedResume,
        },
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user,
    sid,
    snapshot.resumeText,
    snapshot.jdText,
    snapshot.role,
    snapshot.stylePref,
    snapshot.font,
    snapshot.fontSize,
    snapshot.template,
    snapshot.years,
    snapshot.mustIncludeKeywords,
    snapshot.editedResume,
  ]);
}
