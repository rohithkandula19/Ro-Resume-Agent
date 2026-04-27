// Typed API client for RO Resume Agent backend.

import { auth } from "./firebase";

const BASE = "/api"; // proxied by next.config.js in dev; Firebase Hosting rewrites in prod

export async function getAuthToken(): Promise<string> {
  try {
    return (await auth.currentUser?.getIdToken()) ?? "";
  } catch {
    return "";
  }
}

// Kept for compatibility with any callers that set/get a token manually.
export function setAuthToken(_token: string) {}
export function getAuthToken_legacy(): string { return ""; }

async function authHeaders(): Promise<Record<string, string>> {
  const t = await getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function handle401() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ro-auth-expired"));
  }
}

async function post<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (r.status === 401) handle401();
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error(`${path} ${r.status}:`, text);
    throw new Error(`${path} failed: ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: await authHeaders() });
  if (r.status === 401) handle401();
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error(`${path} ${r.status}:`, text);
    throw new Error(`${path} failed: ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function del<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { method: "DELETE", headers: await authHeaders() });
  if (r.status === 401) handle401();
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${path} failed: ${r.status} ${text.slice(0, 200)}`);
  }
  return r.json();
}

// ---------- auth ----------
export type AuthUser = {
  id: string;  // Firebase UID
  email: string;
  name: string;
  created_at: number;
  profile: null | {
    years_experience: number;
    current_title: string;
    target_roles: string[];
    top_skills: string[];
    domains: string[];
    seniority: string;
    headline: string;
  };
};

export async function authLogout() {
  await auth.signOut().catch(() => {});
}
export async function authMe() {
  return get<AuthUser>("/auth/me");
}
export async function authExtractProfile(resume_text: string) {
  return post<{ profile: AuthUser["profile"] }>("/auth/extract-profile", { resume_text });
}

// ---------- per-user sessions ----------
export type SessionSummary = {
  id: string;
  label: string;
  created_at: number;
  updated_at: number;
  role: string;
  jd_preview: string;
  resume_chars: number;
};

export async function listMySessions() {
  return get<SessionSummary[]>("/me/sessions");
}
export async function upsertMySession(body: {
  id?: string; label?: string; role?: string; jd_text?: string; resume_text?: string; state?: any;
}) {
  return post<{ id: string; updated_at: number }>("/me/sessions", body);
}
export async function getMySession(sid: string) {
  return get<any>(`/me/sessions/${sid}`);
}
export async function deleteMySession(sid: string) {
  return del<any>(`/me/sessions/${sid}`);
}
export async function logDownload(kind: string, filename: string, session_id = "") {
  return post<any>("/me/downloads", { kind, filename, session_id });
}
export async function listDownloads() {
  return get<any[]>("/me/downloads");
}

// ---------- applications tracker ----------
export type AppStatus = "saved" | "applied" | "interview" | "offer" | "rejected" | "withdrawn";
export type Application = {
  id: string;  // Firestore document ID
  session_id: string | null;
  company: string;
  role: string;
  status: AppStatus;
  jd_url: string;
  applied_at: number | null;
  next_step_at: number | null;
  notes: string;
  salary_band: string;
  created_at: number;
  updated_at: number;
};

export async function listApplications() {
  return get<Application[]>("/me/applications");
}
export async function createApplication(body: Partial<Application>) {
  return post<{ id: string; updated_at: number }>("/me/applications", body);
}
export async function updateApplication(id: string, body: Partial<Application>) {
  const path = `/me/applications/${id}`;
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (r.status === 401) handle401();
  if (!r.ok) throw new Error(`patch failed: ${r.status}`);
  return r.json() as Promise<{ ok: boolean; updated_at: number }>;
}
export async function deleteApplication(id: string) {
  return del<any>(`/me/applications/${id}`);
}

// ---------- offers ----------
export type Offer = {
  id: string;  // Firestore document ID
  company: string;
  role: string;
  location: string;
  base_salary: number;
  bonus_target: number;
  equity_per_year: number;
  signing_bonus: number;
  benefits_note: string;
  growth: number;
  culture: number;
  wlb: number;
  learning: number;
  notes: string;
  decision: string;
  created_at: number;
  updated_at: number;
};

export async function listOffers() {
  return get<Offer[]>("/me/offers");
}
export async function upsertOffer(body: Partial<Offer> & { company: string; role: string }) {
  return post<{ id: string; updated_at: number }>("/me/offers", body);
}
export async function deleteOffer(id: string) {
  return del<any>(`/me/offers/${id}`);
}

// ---------- LLM usage ----------
export type UsageSummary = {
  totals: { calls?: number; prompt?: number; completion?: number; total?: number; cost?: number };
  by_endpoint: Array<{ endpoint: string; calls: number; tokens: number; cost: number }>;
  by_model: Array<{ provider: string; model: string; calls: number; tokens: number; cost: number }>;
  recent: Array<{ endpoint: string; provider: string; model: string; total_tokens: number; cost_usd: number; created_at: number }>;
};

export async function getUsage() {
  return get<UsageSummary>("/me/usage");
}

// ---------- interview prep ----------
export type InterviewQ = { q: string; why_asked: string; angle: string };
export type StarStory = { prompt: string; situation: string; task: string; action: string; result: string };
export type WeakSpot = { issue: string; how_to_address: string };
export type InterviewPrep = {
  behavioral: InterviewQ[];
  technical: InterviewQ[];
  resume_digs: InterviewQ[];
  star_stories: StarStory[];
  weak_spots: WeakSpot[];
  questions_to_ask: string[];
  error?: string;
};

export async function runInterviewPrep(resume_text: string, jd_text: string, role: string) {
  return post<InterviewPrep>("/interview-prep", { resume_text, jd_text, role });
}

// ---------- mock interview (conversational) ----------
export type MockTurn = { role: "interviewer" | "candidate"; content: string };
export type MockFeedback = {
  score: number;
  strengths: string[];
  weaknesses: string[];
  star_check: { situation: boolean; task: boolean; action: boolean; result: boolean };
  stronger_version: string;
  followup_the_interviewer_will_ask: string;
  error?: string;
};

export async function mockInterviewTurn(body: {
  resume_text: string; jd_text: string; role: string;
  history: MockTurn[]; stage: string;
}) {
  return post<{ question: string; stage?: string; error?: string }>("/mock-interview/turn", body);
}

export async function mockInterviewFeedback(body: {
  question: string; answer: string;
  resume_text: string; jd_text: string; role: string;
}) {
  return post<MockFeedback>("/mock-interview/feedback", body);
}

export async function fetchMeta() {
  return get<any>("/meta");
}

export async function newSession() {
  return post<{ session_id: string }>("/session/new", {});
}

export async function sendChat(session_id: string, message: string, history: any[]) {
  return post<{ reply: string }>("/chat", { session_id, message, history });
}

export async function uploadResume(file: File) {
  const t0 = performance.now();
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/parse-resume`, { method: "POST", body: fd });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    console.error("parse-resume", r.status, text);
    throw new Error(`${r.status} ${text.slice(0, 200)}`);
  }
  const data = await r.json() as { text: string; chars: number; filename: string };
  console.log(`Upload + parse: ${Math.round(performance.now() - t0)}ms for ${data.chars} chars`);
  return data;
}

export async function analyzeJD(jd_text: string) {
  return post<any>("/analyze-jd", { jd_text });
}

export type ResumeCritique = {
  overall_score: number;
  verdict: string;
  issues: {
    section: "summary" | "skills" | "experience" | "projects" | "education" | "ats" | "structure";
    severity: "high" | "medium" | "low";
    issue: string;
    fix: string;
    example?: string;
  }[];
  strengths: string[];
};

export async function critiqueResume(resume_text: string, target_role = "", jd_text = "") {
  return post<ResumeCritique>("/resume-critique", { resume_text, target_role, jd_text });
}

export async function assistResume(resume_text: string, instruction: string) {
  return post<{ updated_resume: string; summary: string; added_section: string }>(
    "/resume-assist", { resume_text, instruction },
  );
}
export async function gapAnalysis(resume_text: string, jd_text: string) {
  return post<any>("/gap-analysis", { resume_text, jd_text });
}
export async function suggestTemplates(body: any) {
  return post<{ templates: any[] }>("/suggest-templates", body);
}
export async function buildResume(body: any) {
  return post<any>("/build", body);
}
export async function runBattle(profile_text: string, jd_text: string) {
  return post<any>("/battle", { profile_text, jd_text });
}
export async function runXray(resume: any, jd_text: string) {
  return post<any>("/xray", { resume, jd_text });
}
export async function runRadar(resume_text: string, role: string, jd_text = "") {
  return post<any>("/radar", { resume_text, role, jd_text });
}
export async function runPersona(resume_text: string, persona_key: string, jd_text = "") {
  return post<any>("/persona", { resume_text, persona_key, jd_text });
}
export async function runScan(resume: any) {
  return post<any>("/scan", { resume });
}
export async function coverLetter(resume_text: string, jd_text: string, company: string, tone = "confident") {
  return post<{ letter: string }>("/cover-letter", { resume_text, jd_text, company, tone });
}
export async function linkedin(resume_text: string, target_role: string) {
  return post<any>("/linkedin", { resume_text, target_role });
}
export async function redFlags(resume_text: string) {
  return post<any>("/red-flags", { resume_text });
}
export async function achievementMine(resume_text: string, role: string) {
  return post<any>("/achievement-mine", { resume_text, role });
}
export async function salaryBand(role: string, years: number, location: string, resume_text: string) {
  return post<any>("/salary", { role, years, location, resume_text });
}
export async function githubImport(handle_or_url: string, role: string) {
  return post<any>("/github", { handle_or_url, role });
}
export async function titleOpt(current_title: string, target_role: string, resume_text: string) {
  return post<any>("/title-optimizer", { current_title, target_role, resume_text });
}
export async function listVersions(sid: string) {
  return get<any[]>(`/session/${sid}/versions`);
}
export async function compareVersions(sid: string, a: string, b: string) {
  return get<{
    a: { id: string; label: string; created_at: number };
    b: { id: string; label: string; created_at: number };
    diffs: Array<{
      section: string; item: string; original: string; rewritten: string;
      similarity_percent: number; word_delta: number; added_metrics: boolean;
    }>;
  }>(`/session/${sid}/compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
}
export async function atsScore(resume_text: string, jd_text = "", pdf_base64?: string) {
  return post<any>("/ats-score", { resume_text, jd_text, pdf_base64 });
}
export async function aiEditBullet(bullet: string, action: string, opts: { jd_text?: string; role?: string; instruction?: string; resume_text?: string } = {}) {
  return post<{ bullet: string; hallucinations?: string[]; error?: string }>("/ai-edit-bullet", {
    bullet, action,
    jd_text: opts.jd_text || "",
    role: opts.role || "",
    instruction: opts.instruction || "",
    resume_text: opts.resume_text || "",
  });
}
export async function aiSuggestSummary(resume_text: string, current_summary: string, jd_text: string, role: string) {
  return post<{ summary: string; error?: string }>("/ai-suggest-summary", { resume_text, current_summary, jd_text, role });
}
export async function aiSuggestSkills(resume_text: string, current_skills: string[], jd_text: string, role: string) {
  return post<{ add: string[]; error?: string }>("/ai-suggest-skills", { resume_text, current_skills, jd_text, role });
}
export async function aiSuggestBullet(item_title: string, item_org: string, existing_bullets: string[], jd_text: string, role: string) {
  return post<{ bullet: string; error?: string }>("/ai-suggest-bullet", { item_title, item_org, existing_bullets, jd_text, role });
}
export async function parserTest(pdf_base64: string) {
  return post<any>("/parser-test", { pdf_base64 });
}
export async function coverLetterPdf(text: string, company: string) {
  return post<{ pdf_base64: string }>("/cover-letter-pdf", { text, company });
}

// ---------- new features ----------

export async function analyzeJDDeep(jd_text: string) {
  return post<{
    culture_signals: string[];
    red_flags: { flag: string; reason: string }[];
    green_flags: { flag: string; reason: string }[];
    negotiation_tips: string[];
    urgency: "high" | "medium" | "low";
    urgency_reason: string;
    ideal_traits: string[];
    interview_style: string;
    comp_hints: string;
    questions_to_ask: string[];
  }>("/jd-analyze", { jd_text });
}

export async function multiCompare(resume_a: string, resume_b: string, jd_text = "") {
  return post<{
    winner: "A" | "B" | "tie";
    score_a: number;
    score_b: number;
    verdict: string;
    a_strengths: string[];
    b_strengths: string[];
    a_weaknesses: string[];
    b_weaknesses: string[];
    recommendation: string;
  }>("/multi-compare", { resume_a, resume_b, jd_text });
}

export async function emailDraft(resume_text: string, jd_text: string, company: string, role: string, tone = "confident") {
  return post<{ subject: string; body: string }>("/email-draft", { resume_text, jd_text, company, role, tone });
}

export async function linkedinImport(linkedin_text: string) {
  return post<{
    name: string;
    headline: string;
    summary: string;
    experience: { title: string; org: string; dates: string; bullets: string[] }[];
    education: { degree: string; school: string; dates: string }[];
    skills: string[];
    resume_text: string;
  }>("/linkedin-import", { linkedin_text });
}
