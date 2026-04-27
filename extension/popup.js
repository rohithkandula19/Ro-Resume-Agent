const DEFAULT_API = "http://localhost:8010";
const DEFAULT_APP = "http://localhost:3010";

const $ = (id) => document.getElementById(id);

// ── helpers ──────────────────────────────────────────────────────────────────

async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["ro_token", "ro_api", "ro_app"], (v) => {
      resolve({
        token: v.ro_token || "",
        api: v.ro_api || DEFAULT_API,
        app: v.ro_app || DEFAULT_APP,
      });
    });
  });
}

async function saveConfig(token, api, app) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { ro_token: token, ro_api: api, ro_app: app || DEFAULT_APP },
      resolve
    );
  });
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function runScraper(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    files: ["scrape.js"],
  });
  return result?.result || null;
}

function setMsg(el, text, kind) {
  el.textContent = text || "";
  el.className = "msg" + (kind ? ` ${kind}` : "");
}

// ── scraped state ─────────────────────────────────────────────────────────────

let _scraped = null; // { company, role, jd_url, jd_text }

async function doScrape(showTarget) {
  const tab = await currentTab();
  const url = tab?.url || "";
  const host = url ? (() => { try { return new URL(url).hostname; } catch { return url; } })() : "—";

  $("page-host").textContent = host;
  if (showTarget) {
    $("save-host").textContent = host;
  }

  if (!/^https?:/.test(url)) {
    $("scraped-preview").textContent = "Open a job page to auto-fill.";
    return;
  }

  $("scraped-preview").textContent = "Scanning page…";
  try {
    _scraped = (tab?.id ? await runScraper(tab.id) : null) || null;
    if (_scraped) {
      const preview = [_scraped.role, _scraped.company].filter(Boolean).join(" @ ");
      $("scraped-preview").textContent = preview || "Page scanned.";
      $("page-title").textContent = preview ? `Found: ${preview}` : "Page scanned";

      if (showTarget) {
        // Fill the save-job form too
        $("company").value = _scraped.company || "";
        $("role").value = _scraped.role || "";
        $("jd").value = _scraped.jd_text || "";
        $("jdCount").textContent = _scraped.jd_text ? `(${_scraped.jd_text.length} chars)` : "";
        $("save-title").textContent = _scraped.role ? `Save: ${_scraped.role}` : "Save job";
      }
    } else {
      $("scraped-preview").textContent = "Couldn't read page — open a job listing.";
    }
  } catch (e) {
    $("scraped-preview").textContent = "Can't scrape this page.";
  }
}

// ── "Analyze this job in app" (no auth needed) ────────────────────────────────

async function analyzeInApp() {
  const { app } = await loadConfig();
  const appUrl = app || DEFAULT_APP;

  const btn = $("analyze-btn");
  btn.disabled = true;
  setMsg($("analyzeMsg"), "Scanning…", "info");

  try {
    const tab = await currentTab();
    let data = { company: "", role: "", jd_text: "", jd_url: "" };

    if (tab?.id && /^https?:/.test(tab?.url || "")) {
      try { data = await runScraper(tab.id) || data; } catch (_) {}
    }

    const chars = data.jd_text?.length || 0;
    if (chars > 0) {
      setMsg($("analyzeMsg"), `Scraped: ${data.role || "role"} · ${chars} chars`, "ok");
    } else {
      setMsg($("analyzeMsg"), "⚠ JD not captured — app will open", "info");
    }

    const payload = JSON.stringify({
      company: data.company || "",
      role: data.role || "",
      jd_text: data.jd_text || "",
      jd_url: data.jd_url || tab?.url || "",
      ts: Date.now(),
    });

    // ── Step 1: store payload in extension storage ──────────────────────────
    // content.js (running in the app tab) reads this at document_idle and
    // writes it to the page's localStorage + dispatches a CustomEvent.
    // React polls localStorage and listens for the CustomEvent.
    await chrome.storage.local.set({ ro_import: payload, ro_import_ts: Date.now() });

    // ── Step 2: open / navigate the app tab ─────────────────────────────────
    // Navigating (even to the same URL) triggers a fresh page load so the
    // content script runs cleanly and React mounts fresh to read localStorage.
    const appTabs = await chrome.tabs.query({ url: appUrl + "/*" });

    if (appTabs.length > 0) {
      const appTab = appTabs[0];
      // Navigate to same URL → reloads the tab with content script running fresh
      await chrome.tabs.update(appTab.id, { active: true, url: appUrl });
      try { await chrome.windows.update(appTab.windowId, { focused: true }); } catch (_) {}
    } else {
      await chrome.tabs.create({ url: appUrl });
    }

    setMsg($("analyzeMsg"), "Opening app…", "info");
    setTimeout(() => window.close(), 1000);
  } catch (e) {
    setMsg($("analyzeMsg"), "Error: " + (e.message || String(e)), "err");
    btn.disabled = false;
  }
}

// ── save job (requires auth) ──────────────────────────────────────────────────

async function saveJob() {
  const { token, api } = await loadConfig();
  if (!token) {
    setMsg($("scanMsg"), "Not connected. Sign in first.", "err");
    return;
  }
  const company = $("company").value.trim();
  const role = $("role").value.trim();
  if (!company || !role) {
    setMsg($("scanMsg"), "Company and role are required.", "err");
    return;
  }
  const tab = await currentTab();
  const body = {
    company,
    role,
    status: $("status").value,
    jd_url: tab?.url || "",
    notes: $("notes").value.trim(),
  };
  $("save").disabled = true;
  setMsg($("scanMsg"), "Saving…", "");
  try {
    const r = await fetch(`${api}/api/me/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (r.status === 401) {
      setMsg($("scanMsg"), "Token expired. Sign in again.", "err");
      await saveConfig("", api);
      showConnect();
      return;
    }
    if (!r.ok) {
      const t = await r.text();
      setMsg($("scanMsg"), `Error ${r.status}: ${t.slice(0, 120)}`, "err");
      return;
    }
    const data = await r.json();
    setMsg($("scanMsg"), `Saved (#${data.id}) ✓`, "ok");
  } catch (e) {
    setMsg($("scanMsg"), "Network error: " + (e.message || e), "err");
  } finally {
    $("save").disabled = false;
  }
}

// ── auth UI ──────────────────────────────────────────────────────────────────

function showConnect() {
  $("connect").classList.remove("hidden");
  $("scan").classList.add("hidden");
}
function showScan() {
  $("connect").classList.add("hidden");
  $("scan").classList.remove("hidden");
}

// ── init ─────────────────────────────────────────────────────────────────────

async function init() {
  const { token, api, app } = await loadConfig();
  $("apiBase").value = api || DEFAULT_API;

  // "Open app" always goes to the frontend
  const appUrl = app || DEFAULT_APP;
  $("openApp").href = appUrl;
  $("openApp").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: appUrl });
  });

  // Always show the quick-analyze section
  // Scrape in background
  doScrape(!!token);

  if (!token) {
    showConnect();
  } else {
    showScan();
  }
}

// ── event listeners ──────────────────────────────────────────────────────────

$("analyze-btn").addEventListener("click", analyzeInApp);
$("rescan-quick").addEventListener("click", () => doScrape(false));

$("saveToken").addEventListener("click", async () => {
  const t = $("token").value.trim();
  const a = ($("apiBase").value.trim() || DEFAULT_API).replace(/\/+$/, "");
  if (!t) { setMsg($("connectMsg"), "Paste a token.", "err"); return; }
  try {
    const r = await fetch(`${a}/api/auth/me`, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!r.ok) {
      setMsg($("connectMsg"), `Verify failed (${r.status}). Check the token.`, "err");
      return;
    }
    await saveConfig(t, a, DEFAULT_APP);
    setMsg($("connectMsg"), "Connected ✓", "ok");
    setTimeout(() => { showScan(); doScrape(true); }, 400);
  } catch (e) {
    setMsg($("connectMsg"), "Can't reach backend: " + (e.message || e), "err");
  }
});

$("disconnect").addEventListener("click", async () => {
  const { api, app } = await loadConfig();
  await saveConfig("", api, app);
  showConnect();
});

$("save").addEventListener("click", saveJob);
$("rescan").addEventListener("click", () => doScrape(true));

init();
