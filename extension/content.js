// content.js — injected into localhost:3010 at document_idle.
// Reads a pending payload from chrome.storage.local (written by popup.js)
// and passes it to the React app via localStorage + CustomEvent.
//
// This runs AFTER the page has loaded (document_idle ≈ window.onload),
// which means React has hydrated and its event listeners are registered.

(function () {
  chrome.storage.local.get(["ro_import", "ro_import_ts"], function (result) {
    const payload = result.ro_import;
    const ts = result.ro_import_ts;

    if (!payload || !ts) return;

    // Ignore stale payloads (older than 60 seconds)
    if (Date.now() - ts > 60000) {
      chrome.storage.local.remove(["ro_import", "ro_import_ts"]);
      return;
    }

    // Clear from extension storage so it's only consumed once
    chrome.storage.local.remove(["ro_import", "ro_import_ts"]);

    // 1. Set in page localStorage — React polls this after mount
    try { localStorage.setItem("ro-ext-import", payload); } catch (_) {}

    // 2. Fire CustomEvent on document — React listener picks this up immediately
    try {
      document.dispatchEvent(new CustomEvent("ro-ext-import", { detail: payload }));
    } catch (_) {}

  });
})();
