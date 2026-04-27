# Ro Resume Agent

An AI-powered resume optimization and career management platform. Tailor resumes to job descriptions, score ATS compatibility, practice mock interviews, track applications, and generate cover letters — all from one tool.

---

## Features

- **Resume Tailoring** — LLM-powered bullet rewriting matched to a target JD, with hallucination detection
- **ATS Scoring** — composite scoring, preflight checks, template/font recommendations, real parser ground truth
- **Gap Analysis** — compare your profile against a JD and surface weak or missing signals
- **AI Chat Consultant** — streaming chat with full resume + JD context injected
- **Interview Prep** — question generation + interactive mock interview with feedback
- **Cover Letter Generator** — JD-specific, 3-paragraph, under 250 words
- **LinkedIn Pack** — headline, about, skills, and bullet reframes in one shot
- **Achievement Miner** — Socratic Q&A to pull forgotten metrics and impact statements
- **Role Fit Radar** — visual match strength across key dimensions
- **GitHub Import** — fetch repos and auto-summarize for resume bullets
- **Persona Review** — see feedback from a startup CTO, enterprise recruiter, or hiring manager
- **Application Tracker** — save jobs with status, salary, and notes
- **Chrome Extension** — one-click JD scraping from LinkedIn, Greenhouse, Lever, Indeed, and more
- **Version History** — save and diff resume iterations within a session
- **Export** — styled DOCX/PDF + ATS-safe plain versions

---

## Tech Stack

| Layer | Stack |
|---|---|
| Backend | FastAPI, Uvicorn, Python 3.12+ |
| LLM Routing | Groq → OpenRouter (free) → OpenAI → Anthropic |
| Document Processing | pypdf, python-docx, reportlab, pytesseract, BeautifulSoup |
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Charts / Animation | recharts, framer-motion |
| Browser Extension | Chrome Manifest V3, vanilla JS |
| Auth | JWT tokens |

---

## Project Structure

```
.
├── backend/
│   ├── main.py              # 80+ FastAPI endpoints
│   ├── agent.py             # LLM fallback chain (Groq → OpenRouter → OpenAI → Anthropic)
│   ├── prompts.py           # System prompts
│   ├── tools/               # Feature modules (ATS, coach, battle, radar, export, ...)
│   ├── library/             # Static data (fonts, templates, personas, action verbs)
│   ├── auth.py              # JWT auth
│   ├── db.py                # Session & application persistence
│   ├── usage.py             # Token/cost tracking
│   ├── rate_limit.py        # Per-tier rate limiting
│   └── requirements.txt
├── frontend/
│   ├── app/                 # Next.js app router
│   └── components/          # 40+ UI components
└── extension/
    ├── manifest.json         # Manifest V3
    ├── scrape.js             # Per-ATS selectors + generic fallback
    ├── content.js            # App tab bridge
    └── popup.html/js/css     # Extension popup UI
```

---

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- A free [Groq API key](https://console.groq.com) (primary LLM — fast and free)
- Optionally: OpenRouter, OpenAI, or Anthropic keys for fallback

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in your API keys
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # runs on http://localhost:3000
```

### 3. Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Click the extension icon on any job posting and hit **Analyze in App**

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
# Required — at least one LLM provider
GROQ_API_KEY=            # free tier, fastest
OPENROUTER_API_KEY=      # free models available
OPENAI_API_KEY=          # optional fallback
ANTHROPIC_API_KEY=       # optional fallback

# App
SECRET_KEY=              # random string for JWT signing
APP_URL=http://localhost:3000

# Email (optional — for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

---

## LLM Routing

The backend tries providers in order and falls back automatically:

1. **Groq** — `llama-3.1-8b-instant`, `llama-3.3-70b-versatile` (sub-300ms, free tier)
2. **OpenRouter** — free Llama, Gemma, Qwen, DeepSeek, Mistral models
3. **OpenAI** — `gpt-4o-mini`, `gpt-4o`
4. **Anthropic** — `claude-haiku-4-5`, `claude-sonnet-4-6`

You only need one key to get started. Groq alone is sufficient for most features.

---

## Extension — Supported Job Boards

LinkedIn · Greenhouse · Lever · Ashby · Indeed · Wellfound · Workable · SmartRecruiters · Y Combinator · generic fallback for any other site

---

## License

MIT
