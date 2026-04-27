# RO Resume Agent

An AI-powered resume building platform that tailors your resume to any job description, scores it against ATS systems, and helps you land more interviews.

**Live demo:** https://ro-resume-agent937.web.app

---

## What it does

- **AI Resume Builder** — paste your experience + a job description, get a fully tailored resume in seconds
- **ATS Score** — composite score across 6 ATS dimensions with actionable breakdown
- **Battle Mode** — compare your resume head-to-head against the job description
- **X-Ray Overlay** — visualize exactly which keywords land and which miss
- **ATS Scan Simulator** — see your resume as an ATS parser sees it
- **Persona Reviews** — get feedback from Google, Amazon, McKinsey, startup founder personas
- **Cover Letter Generator** — tailored cover letters with tone control
- **LinkedIn Pack** — headline, summary, and about section optimized for your target role
- **Interview Prep** — role-specific questions, STAR stories, weak spots, and mock interviews
- **Offer Compare** — weighted scoring across comp, growth, culture, WLB, and learning
- **Application Tracker** — track saved, applied, interview, offer, and rejected applications
- **Resume Editor** — AI-assisted bullet rewrites, summary drafts, skill suggestions
- **Session History** — every version saved with diff comparison
- **40+ resume templates** — FAANG, consulting, finance, creative, global formats

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), Uvicorn |
| Auth | Firebase Authentication (Google + email/password) |
| Database | Firestore (NoSQL) |
| AI / LLM | Groq (primary, sub-300ms) → OpenRouter free models (fallback) |
| Hosting | Firebase Hosting (frontend) + Cloud Run (backend) |
| PDF Export | ReportLab + python-docx |

---

## Project structure

```
RO resume-agent/
├── frontend/               # Next.js app
│   ├── app/                # App router (page.tsx is the main shell)
│   ├── components/         # 37 feature components
│   ├── hooks/              # useAuth, useProfileExtraction, useSessionAutoSave
│   └── lib/                # api.ts (typed API client), firebase.ts
│
├── backend/                # FastAPI server
│   ├── main.py             # All API routes
│   ├── agent.py            # LLM orchestrator (Groq → OpenRouter)
│   ├── auth.py             # Firebase token verification
│   ├── db.py               # Firestore data layer
│   ├── firebase_init.py    # Firebase Admin SDK init
│   ├── routers/me.py       # Auth + per-user endpoints
│   ├── tools/              # 20+ AI tools (battle, xray, cover letter, etc.)
│   └── library/            # Templates, personas, fonts, skills taxonomy
│
├── firebase.json           # Hosting config + Cloud Run rewrite
└── .firebaserc             # Firebase project binding
```

---

## Running locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- Firebase project with Auth + Firestore enabled
- Groq API key (free at console.groq.com)

### 1. Clone and install

```bash
git clone https://github.com/rohithkandula19/Ro-Resume-Agent.git
cd Ro-Resume-Agent
```

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure environment

**`frontend/.env.local`**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**`backend/.env`**
```env
GROQ_API_KEY=your_groq_key
OPENROUTER_API_KEY=your_openrouter_key   # optional
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-adminsdk.json
```

### 3. Start both servers

**Backend** (port 8010):
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --port 8010
```

**Frontend** (port 3010):
```bash
cd frontend
npm run dev:webpack
```

Open http://localhost:3010

---

## Deployment

### Backend → Cloud Run

```bash
cd backend
gcloud run deploy ro-resume-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300
```

### Frontend → Firebase Hosting

```bash
cd frontend
OUTPUT=export npm run build
firebase deploy --only hosting
```

---

## API overview

| Method | Path | Description |
|---|---|---|
| GET | `/api/meta` | Templates, fonts, personas |
| POST | `/api/session/new` | Create anonymous session |
| POST | `/api/build` | Generate + export resume |
| POST | `/api/ats-score` | Composite ATS score |
| POST | `/api/chat` | Consultant chat |
| POST | `/api/battle` | Battle mode analysis |
| POST | `/api/xray` | Keyword overlay |
| POST | `/api/cover-letter` | Generate cover letter |
| POST | `/api/interview-prep` | Interview questions + STAR stories |
| POST | `/api/mock-interview/turn` | Mock interview turn |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/auth/applications` | Job applications list |
| GET | `/api/auth/offers` | Offers list |

Full API: see `backend/main.py` and `backend/routers/me.py`

---

## Firebase setup

1. Create a Firebase project at console.firebase.google.com
2. Enable **Authentication** → Email/Password + Google
3. Create a **Firestore** database in production mode
4. Generate a **service account key** (Project Settings → Service Accounts)
5. Register a **Web app** and copy the config to `frontend/.env.local`

---

## License

MIT
