# RO Resume Agent — Chrome extension

One-click save jobs from LinkedIn, Greenhouse, Lever, Ashby, Indeed, Wellfound, Workable, SmartRecruiters, and Y Combinator directly into your RO Resume Agent applications tracker.

## Install (unpacked)

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked** and select this `extension/` folder
4. Pin the extension for quick access

## Connect to your account

1. Open the web app and sign in (`http://localhost:3000`)
2. Click your avatar → **Connect extension** (copies your token)
3. Click the extension icon → paste the token → **Save**

The extension stores the token in `chrome.storage.local`. The default API base is `http://localhost:8000`; change it in the connect screen if you run the backend elsewhere.

## Usage

Visit any supported job page and click the extension icon. It auto-scrapes company, role, and JD text. Pick a status (saved / applied / phone / onsite / offer / rejected), optionally tweak fields, and click **Save job**. The record appears in the Applications tracker in the web app.

## Files

- `manifest.json` — Manifest V3 config
- `popup.html` / `popup.css` / `popup.js` — popup UI
- `scrape.js` — injected content script with per-ATS selectors and a generic fallback
