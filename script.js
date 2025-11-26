// ========== GLOBAL STATE ==========
let subjects = [];
let allProgramsFlat = [];
let currentSubject = null;
let currentProgram = null;

// DOM refs
const subjectGridEl = document.getElementById("subjectGrid");
const subjectTitleEl = document.getElementById("subjectTitle");
const subjectDescriptionEl = document.getElementById("subjectDescription");
const tagFilterEl = document.getElementById("tagFilter");
const languageFilterEl = document.getElementById("languageFilter");
const programListEl = document.getElementById("programList");
const programDetailEl = document.getElementById("programDetail");
const programDetailTitleEl = document.getElementById("programDetailTitle");
const programDetailMetaEl = document.getElementById("programDetailMeta");
const programDetailProblemEl = document.getElementById("programDetailProblem");
const programCodeEl = document.getElementById("programCode");
const copyCodeBtn = document.getElementById("copyCodeBtn");
const runCodeBtn = document.getElementById("runCodeBtn");
const runOutputEl = document.getElementById("runOutput");
const runOutputNoteEl = document.getElementById("runOutputNote");
const htmlRunnerEl = document.getElementById("htmlRunner");
const toastEl = document.getElementById("toast");
const yearEl = document.getElementById("year");
const globalSearchInputEl = document.getElementById("globalSearchInput");
const searchFormEl = document.getElementById("searchForm");
const searchSummaryEl = document.getElementById("searchSummary");
const allProgramsListEl = document.getElementById("allProgramsList");
const notesListEl = document.getElementById("notesList");
const themeToggleBtn = document.getElementById("themeToggle");
const backToSubjectsBtn = document.getElementById("backToSubjectsBtn");
const backToProgramsBtn = document.getElementById("backToProgramsBtn");
const filtersRowEl = document.getElementById("filtersRow");

// ========== UTILITIES ==========

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  toastEl.classList.add("visible");
  setTimeout(() => {
    toastEl.classList.remove("visible");
    toastEl.classList.add("hidden");
  }, 1600);
}

// Combine html+css+js to one runnable HTML snippet.
function combineHtmlCssJs(prog) {
  if (prog.code) return prog.code; // Return pure code if it exists
  const hasParts = prog.html || prog.css || prog.js;
  if (!hasParts) return "";

  let html =
    prog.html || "<!DOCTYPE html><html><head></head><body></body></html>";
  const css = prog.css || "";
  const js = prog.js || "";

  if (css) {
    if (html.includes("</head>")) {
      html = html.replace("</head>", "<style>\n" + css + "\n</style>\n</head>");
    } else {
      html = "<style>\n" + css + "\n</style>\n" + html;
    }
  }

  if (js) {
    if (html.includes("</body>")) {
      html = html.replace(
        "</body>",
        "<script>\n" + js + "\n</script>\n</body>"
      );
    } else {
      html = html + "<script>\n" + js + "\n</script>";
    }
  }
  return html;
}

function runHtmlSnippet(html) {
  if (!htmlRunnerEl) return;
  htmlRunnerEl.classList.remove("hidden");
  htmlRunnerEl.srcdoc = html;
  runOutputEl.textContent = "";
}

function runJavaScriptInSandbox(code, outputEl) {
  try {
    let logs = [];
    const originalLog = console.log;
    console.log = function (...args) {
      logs.push(args.join(" "));
      originalLog.apply(console, args);
    };
    const result = new Function(code)();
    console.log = originalLog;

    let text = "";
    if (logs.length) text += "Console:\n" + logs.join("\n") + "\n";
    if (result !== undefined) text += "\nResult:\n" + String(result);
    if (!text) text = "Executed successfully (no output).";
    outputEl.textContent = text;
  } catch (err) {
    outputEl.textContent = "Error:\n" + err;
  }
}

// ========== NAVIGATION & THEME ==========

function switchSection(targetId) {
  document.querySelectorAll("main .section").forEach((sec) => {
    sec.classList.toggle("active", sec.id === targetId);
  });
  document.querySelectorAll(".main-nav .nav-link").forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-section-target") === targetId
    );
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initNavigation() {
  document.querySelectorAll("[data-section-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-section-target");
      if (target) switchSection(target);
    });
  });

  // Back Button Logic
  if (backToSubjectsBtn) {
    backToSubjectsBtn.addEventListener("click", () => {
      switchSection("subjects");
    });
  }

  if (backToProgramsBtn) {
    backToProgramsBtn.addEventListener("click", () => {
      // Go back to the list view within the subject detail
      programDetailEl.classList.add("hidden");
      programListEl.classList.remove("hidden");
      if (filtersRowEl) filtersRowEl.classList.remove("hidden");

      // Scroll to top of section
      document
        .getElementById("subject-detail")
        .scrollIntoView({ behavior: "smooth" });
    });
  }
}

function initTheme() {
  const root = document.documentElement;
  const stored = localStorage.getItem("labhub_theme") || "dark";
  root.setAttribute("data-theme", stored);
  themeToggleBtn.textContent = stored === "dark" ? "🌙" : "☀️";

  themeToggleBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("labhub_theme", next);
    themeToggleBtn.textContent = next === "dark" ? "🌙" : "☀️";
  });
}

// ========== RENDER LOGIC ==========

function renderSubjects() {
  if (!subjectGridEl) return;
  subjectGridEl.innerHTML = "";
  subjects.forEach((subj) => {
    const card = document.createElement("article");
    card.className = "card subject-card";
    card.innerHTML = `
      <h3>${subj.name}</h3>
      <p class="muted">${subj.short || ""}</p>
      <div class="card-footer-row">
        <span class="muted small-text">${
          (subj.programs || []).length
        } programs</span>
        <button class="secondary-btn small">View</button>
      </div>
    `;
    card.addEventListener("click", () => openSubject(subj.id));
    subjectGridEl.appendChild(card);
  });
}

function openSubject(subjectId) {
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return;
  currentSubject = subj;

  switchSection("subject-detail");
  // Reset view to list
  programListEl.classList.remove("hidden");
  programDetailEl.classList.add("hidden");
  if (filtersRowEl) filtersRowEl.classList.remove("hidden");

  subjectTitleEl.textContent = subj.name;
  subjectDescriptionEl.textContent = subj.short || "";

  // Filters logic
  const tagsSet = new Set();
  const langsSet = new Set();
  (subj.programs || []).forEach((p) => {
    (p.tags || []).forEach((t) => tagsSet.add(t));
    if (p.language) langsSet.add(p.language);
    else if (p.html || p.css || p.js) langsSet.add("HTML/CSS/JS");
  });

  tagFilterEl.innerHTML = `<option value="">All tags</option>`;
  tagsSet.forEach(
    (t) => (tagFilterEl.innerHTML += `<option value="${t}">${t}</option>`)
  );

  languageFilterEl.innerHTML = `<option value="">All languages</option>`;
  langsSet.forEach(
    (l) => (languageFilterEl.innerHTML += `<option value="${l}">${l}</option>`)
  );

  renderProgramList(subj);
}

function renderProgramList(subj) {
  programListEl.innerHTML = "";
  const tagFilter = tagFilterEl.value;
  const langFilter = languageFilterEl.value;

  (subj.programs || []).forEach((p) => {
    if (tagFilter && !(p.tags || []).includes(tagFilter)) return;
    const langLabel =
      p.language || (p.html || p.css || p.js ? "HTML/CSS/JS" : "Unknown");
    if (langFilter && langLabel !== langFilter) return;

    const card = document.createElement("article");
    card.className = "card program-card";
    card.innerHTML = `
      <h3>${p.title || "Untitled"}</h3>
      <p class="card-subtitle">${langLabel}</p>
      <button class="primary-btn small" style="margin-top:10px;">View Code</button>
    `;
    card.addEventListener("click", () => openProgramDetail(subj.id, p.id));
    programListEl.appendChild(card);
  });
}

function openProgramDetail(subjectId, programId) {
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return;
  const prog = (subj.programs || []).find((p) => p.id === programId);
  if (!prog) return;

  currentSubject = subj;
  currentProgram = prog;

  // UI State: Hide List, Show Detail
  programListEl.classList.add("hidden");
  if (filtersRowEl) filtersRowEl.classList.add("hidden");
  programDetailEl.classList.remove("hidden");

  programDetailTitleEl.textContent = prog.title;
  const langLabel = prog.language || "HTML/CSS/JS";
  programDetailMetaEl.textContent = `${subj.name} • ${langLabel}`;
  programDetailProblemEl.textContent = prog.problem || "";

  // Combine and show code
  const combined = combineHtmlCssJs(prog);
  programCodeEl.textContent = combined;

  // Reset runner
  runOutputEl.textContent = "";
  if (htmlRunnerEl) {
    htmlRunnerEl.classList.add("hidden");
    htmlRunnerEl.srcdoc = "";
  }

  // Auto-scroll to code view
  setTimeout(() => {
    programDetailEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 100);
}

// ========== SEARCH & RUN ==========

if (runCodeBtn) {
  runCodeBtn.addEventListener("click", () => {
    if (!currentProgram) return;
    const code = combineHtmlCssJs(currentProgram);
    const lang = (currentProgram.language || "").toLowerCase();

    runOutputEl.textContent = "";
    if (htmlRunnerEl) {
      htmlRunnerEl.classList.add("hidden");
      htmlRunnerEl.srcdoc = "";
    }

    if (currentProgram.html || currentProgram.css || currentProgram.js) {
      runOutputNoteEl.textContent = "Rendering HTML/CSS/JS...";
      runHtmlSnippet(code);
      return;
    }
    if (lang === "javascript" || lang === "js") {
      runOutputNoteEl.textContent = "Running JS...";
      runJavaScriptInSandbox(code, runOutputEl);
      return;
    }
    runOutputNoteEl.textContent = "View only.";
    runOutputEl.textContent =
      "Execution available only for JS and HTML snippets.";
  });
}

if (copyCodeBtn) {
  copyCodeBtn.addEventListener("click", () => {
    navigator.clipboard
      .writeText(programCodeEl.textContent)
      .then(() => showToast("Copied to clipboard!"))
      .catch(() => showToast("Failed to copy"));
  });
}

function renderAllPrograms(filter) {
  allProgramsListEl.innerHTML = "";
  const q = filter.toLowerCase();
  let count = 0;
  allProgramsFlat.forEach((p) => {
    const text = (
      p.title +
      " " +
      p.subjectName +
      " " +
      (p.tags || []).join(" ")
    ).toLowerCase();
    if (q && !text.includes(q)) return;

    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<h3>${p.title}</h3><p class="muted small-text">${p.subjectName}</p>`;
    card.addEventListener("click", () => {
      openSubject(p.subjectId);
      openProgramDetail(p.subjectId, p.id);
    });
    allProgramsListEl.appendChild(card);
    count++;
  });
  searchSummaryEl.textContent = `Found ${count} programs.`;
}

if (searchFormEl) {
  searchFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    renderAllPrograms(globalSearchInputEl.value);
    switchSection("all-programs");
  });
}

// ========== INIT ==========

document.addEventListener("DOMContentLoaded", () => {
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  initNavigation();
  initTheme();

  if (tagFilterEl)
    tagFilterEl.addEventListener("change", () =>
      renderProgramList(currentSubject)
    );
  if (languageFilterEl)
    languageFilterEl.addEventListener("change", () =>
      renderProgramList(currentSubject)
    );

  fetch("programs.json")
    .then((res) => res.json())
    .then((data) => {
      subjects = data.subjects || [];
      renderSubjects();
      // Build flat list for search
      subjects.forEach((s) => {
        (s.programs || []).forEach((p) =>
          allProgramsFlat.push({ ...p, subjectId: s.id, subjectName: s.name })
        );
      });
      renderAllPrograms("");
    })
    .catch((err) => console.error(err));
});
