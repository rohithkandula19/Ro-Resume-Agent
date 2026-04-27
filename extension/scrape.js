// Injected via chrome.scripting.executeScript. Returns { company, role, jd_url, jd_text }.
// Heuristics per known ATS; falls back to smart generic extraction.
(() => {
  const host = location.hostname;
  const url  = location.href;

  // txt: short single-line values — collapse whitespace
  const txt = (el) => (el?.textContent || "").trim().replace(/\s+/g, " ");

  // jtxt: JD body — use innerText to preserve visual line breaks
  const jtxt = (el) => {
    if (!el) return "";
    const t = (el.innerText || el.textContent || "").trim();
    return t.replace(/\t/g, " ").replace(/ {3,}/g, "  ").replace(/\n{4,}/g, "\n\n\n");
  };

  const metaProp = (p) =>
    document.querySelector(`meta[property="${p}"],meta[name="${p}"]`)?.content || "";

  const firstTxt = (sels) => {
    for (const s of sels) {
      try {
        const el = document.querySelector(s);
        if (el && txt(el)) return txt(el);
      } catch {}
    }
    return "";
  };

  const firstJtxt = (sels) => {
    for (const s of sels) {
      try {
        const el = document.querySelector(s);
        if (el && jtxt(el).length > 50) return jtxt(el);
      } catch {}
    }
    return "";
  };

  // --- Smart generic JD extractor ---
  // Finds the largest text block that looks like a job description.
  const genericJD = () => {
    // Priority: known semantic containers
    const priority = [
      // Semantic
      '[role="main"]', 'main', 'article',
      // Common job-description class fragments
      '[class*="job-description"]', '[class*="jobDescription"]', '[class*="job_description"]',
      '[id*="job-description"]',   '[id*="jobDescription"]',   '[id*="job_description"]',
      '[class*="job-details"]',    '[class*="jobDetails"]',
      '[class*="description"]',    '[id*="description"]',
      '[class*="posting"]',        '[id*="posting"]',
      '[class*="content"]',        '#content', '#main-content', '#main',
    ];
    for (const s of priority) {
      try {
        const el = document.querySelector(s);
        if (!el) continue;
        const t = jtxt(el);
        // Must be long enough to be a real job description
        if (t.length > 300) return t;
      } catch {}
    }
    // Last resort: body innerText (trim headers/footers heuristically)
    return jtxt(document.body);
  };

  let company = "", role = "", jd = "";

  // ── Google Careers ────────────────────────────────────────────────────────
  if (host.endsWith("google.com") && (location.pathname.includes("/careers/") || location.pathname.includes("/jobs/"))) {
    role = firstTxt([
      "h1.gc-job-detail-name",
      ".gc-job-detail-name",
      "[class*='job-detail-name']",
      "[class*='jobDetailName']",
      "h1",
    ]);
    company = "Google";
    jd = firstJtxt([
      ".gc-job-detail-description",
      "[class*='job-detail-description']",
      "[class*='jobDetailDescription']",
      "[class*='qualifications']",
      "[class*='responsibilities']",
      "main",
      '[role="main"]',
    ]);
  }

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  else if (host.endsWith("linkedin.com")) {
    role = firstTxt([
      ".job-details-jobs-unified-top-card__job-title",
      ".topcard__title",
      ".jobs-unified-top-card__job-title",
      "h1",
    ]);
    company = firstTxt([
      ".job-details-jobs-unified-top-card__company-name",
      ".topcard__org-name-link",
      ".jobs-unified-top-card__company-name",
      "a[data-tracking-control-name='public_jobs_topcard-org-name']",
    ]);
    jd = firstJtxt([
      "#job-details",
      ".jobs-description__content",
      ".show-more-less-html__markup",
      ".description__text",
    ]);
  }

  // ── Greenhouse ────────────────────────────────────────────────────────────
  else if (host.endsWith("greenhouse.io")) {
    role    = firstTxt([".app-title", ".job-title", "h1.section-header", "h1"]);
    company = firstTxt([".company-name", ".header .section-header a"]) ||
      (document.title.split(" - ").pop() || "").trim();
    const logo = document.querySelector(".company-logo img, header img");
    if (!company && logo?.alt) company = logo.alt.trim();
    jd = firstJtxt(["#content", "#main_content", ".content", ".section.page-centered"]);
  }

  // ── Lever ─────────────────────────────────────────────────────────────────
  else if (host.endsWith("lever.co")) {
    role = firstTxt([".posting-headline h2", ".posting-header h2", "h2", "h1"]);
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length) company = parts[0].replace(/-/g, " ");
    company = firstTxt([".main-header-logo img", ".main-header-text"]) || company;
    jd = firstJtxt([".posting-page", ".content-wrapper", ".section-wrapper"]);
  }

  // ── Ashby ─────────────────────────────────────────────────────────────────
  else if (host.endsWith("ashbyhq.com")) {
    role = firstTxt(["h1", "._jobPostingHeader_"]);
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length) company = parts[0].replace(/-/g, " ");
    jd = firstJtxt(["._descriptionText_", ".ashby-job-posting-description", "main"]);
  }

  // ── Indeed ────────────────────────────────────────────────────────────────
  else if (host.endsWith("indeed.com")) {
    role = firstTxt([
      'h1[data-testid="jobsearch-JobInfoHeader-title"]',
      "h1.jobsearch-JobInfoHeader-title",
      "h1",
    ]);
    company = firstTxt([
      '[data-testid="inlineHeader-companyName"] a',
      '[data-testid="inlineHeader-companyName"]',
      ".jobsearch-CompanyInfoContainer a",
    ]);
    jd = firstJtxt(["#jobDescriptionText", ".jobsearch-jobDescriptionText"]);
  }

  // ── Naukri ────────────────────────────────────────────────────────────────
  else if (host.endsWith("naukri.com")) {
    role = firstTxt([
      "h1.jd-header-title",
      ".job-tittle h1",
      '[class*="jd-header"] h1',
      "h1",
    ]);
    company = firstTxt([
      ".jd-header-comp-name a",
      '[class*="comp-name"]',
      "a.comp-name",
    ]);
    jd = firstJtxt([
      ".job-desc",
      "#job-description",
      '[class*="jd-desc"]',
      '[class*="job-desc"]',
      ".dang-inner-html",
    ]);
  }

  // ── Glassdoor ─────────────────────────────────────────────────────────────
  else if (host.endsWith("glassdoor.com") || host.endsWith("glassdoor.co.in")) {
    role = firstTxt([
      '[data-test="job-title"]',
      ".jobTitle",
      "h1",
    ]);
    company = firstTxt([
      '[data-test="employer-name"]',
      ".employerName",
      '[class*="EmployerProfile"]',
    ]);
    jd = firstJtxt([
      '[class*="JobDetails_jobDescription"]',
      '[data-test="description"]',
      ".jobDescriptionContent",
      '[class*="desc"]',
    ]);
  }

  // ── Workday (*.myworkdayjobs.com / *.wd*.myworkdayjobs.com) ──────────────
  else if (host.includes("myworkdayjobs.com") || host.includes("workday.com")) {
    role = firstTxt([
      '[data-automation-id="jobPostingHeader"] h2',
      '[data-automation-id="jobPostingHeader"] h1',
      ".css-19uc56f",
      "h2",
      "h1",
    ]);
    company = metaProp("og:site_name") ||
      (document.title.includes(" - ") ? document.title.split(" - ").pop() : "").trim() ||
      host.split(".")[0];
    jd = firstJtxt([
      '[data-automation-id="jobPostingDescription"]',
      '[class*="job-description"]',
      ".css-rdyjdf",
      ".css-cygeeu",
      '[class*="jobDescription"]',
    ]);
  }

  // ── iCIMS ─────────────────────────────────────────────────────────────────
  else if (host.includes("icims.com")) {
    role    = firstTxt(["#iCIMS_Header h1", ".iCIMS-Header h1", "h1"]);
    company = metaProp("og:site_name") ||
      (document.title.includes(" - ") ? document.title.split(" - ").pop() : "").trim();
    jd = firstJtxt([
      "#iCIMS_Content_Anchor",
      ".iCIMS-Description",
      '[class*="description"]',
    ]);
  }

  // ── Oracle Taleo ──────────────────────────────────────────────────────────
  else if (host.includes("taleo.net") || host.includes("oracle.com")) {
    role = firstTxt(["#JDTitle", ".requisitionTitle", "h1"]);
    company = metaProp("og:site_name") ||
      (document.title.includes(" - ") ? document.title.split(" - ").pop() : "").trim();
    jd = firstJtxt([
      ".rteSectionContentInner",
      "#positionDescriptionInterface",
      "#JDFieldTitle",
      ".jobPositionDescription",
    ]);
  }

  // ── SmartRecruiters ───────────────────────────────────────────────────────
  else if (host.includes("smartrecruiters.com")) {
    role    = firstTxt(["h1.job-title", "h1"]);
    company = firstTxt([".company-name", ".employer-name"]);
    jd = firstJtxt(["#st-jobDescription", ".job-description", "main"]);
  }

  // ── Wellfound / AngelList ─────────────────────────────────────────────────
  else if (host.endsWith("wellfound.com") || host.endsWith("angel.co")) {
    role    = firstTxt(["h1", '[data-test="JobTitle"]']);
    company = firstTxt(['[data-test="StartupName"]', 'a[href*="/company/"]', "h2 a"]);
    jd = firstJtxt(['[data-test="JobDescription"]', "main"]);
  }

  // ── Workable ─────────────────────────────────────────────────────────────
  else if (host.endsWith("workable.com")) {
    role = firstTxt(["h1", '[data-ui="job-title"]']);
    const parts = location.pathname.split("/").filter(Boolean);
    if (parts.length) company = parts[0].replace(/-/g, " ");
    jd = firstJtxt(['[data-ui="job-description"]', "main", ".main"]);
  }

  // ── Y Combinator Work at a Startup ───────────────────────────────────────
  else if (host.endsWith("ycombinator.com")) {
    role    = firstTxt(["h1", ".job-title"]);
    company = firstTxt([".company-name", "h2 a"]);
    jd = firstJtxt([".prose", "main"]);
  }

  // ── Internshala ───────────────────────────────────────────────────────────
  else if (host.endsWith("internshala.com")) {
    role    = firstTxt([".profile", "h1.heading_4_5", "h1"]);
    company = firstTxt([".company_name", ".company-name", "a.link_display_like_text"]);
    jd = firstJtxt([".internship_details", ".job_details_section", ".about_company_text_container", "main"]);
  }

  // ── Monster / Foundit ─────────────────────────────────────────────────────
  else if (host.endsWith("monster.com") || host.endsWith("foundit.in") || host.endsWith("monsterindia.com")) {
    role    = firstTxt(["h1.job-tittle", "h1.title", "h1"]);
    company = firstTxt([".company-name", ".recruiter-name", "a.company-name"]);
    jd = firstJtxt(["#JobDescription", ".job-description", '[class*="description"]', "main"]);
  }

  // ── Cutshort ──────────────────────────────────────────────────────────────
  else if (host.endsWith("cutshort.io")) {
    role    = firstTxt(["h1", ".job-title"]);
    company = firstTxt([".company-name", "h2 a"]);
    jd = firstJtxt([".job-description", ".description-block", "main"]);
  }

  // ── Generic fallback (company career pages, Workday custom domains, etc.) ─
  // Falls through to here for any unrecognised ATS or portal.

  // --- Fill in missing fields using generic heuristics ---
  if (!role) {
    role =
      metaProp("og:title") ||
      document.querySelector("h1")?.textContent?.trim() ||
      document.title;
  }
  if (!company) {
    company =
      metaProp("og:site_name") ||
      (document.title.includes(" at ") ? document.title.split(" at ").pop()?.trim() : "") ||
      (document.title.includes(" - ") ? document.title.split(" - ").pop()?.trim() : "") ||
      host.replace(/^www\./, "").split(".").slice(0, -1).join(".") || "";
  }
  if (!jd) {
    jd = genericJD();
  }

  // Clean up role: "Software Engineer - Company" → drop trailing company suffix
  if (role && company) {
    const cLow = company.toLowerCase();
    if (role.toLowerCase().includes(` - ${cLow}`))
      role = role.split(/\s-\s/)[0].trim();
    if (role.toLowerCase().endsWith(` | ${cLow}`))
      role = role.split(" | ")[0].trim();
    if (role.toLowerCase().endsWith(` at ${cLow}`))
      role = role.split(/\s+at\s+/i)[0].trim();
  }

  // Normalize JD whitespace
  jd = (jd || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")      // trailing spaces
    .replace(/\n{4,}/g, "\n\n\n")    // max 3 blank lines
    .trim();

  if (jd.length > 12000) jd = jd.slice(0, 12000);

  return {
    company:  (company || "").slice(0, 200).trim(),
    role:     (role    || "").slice(0, 200).trim(),
    jd_url:   url,
    jd_text:  jd,
  };
})();
