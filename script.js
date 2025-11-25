// ========== GLOBAL STATE ==========
let subjects = [];
let allProgramsFlat = [];
let currentSubject = null;
let currentProgram = null;

// DOM refs
const subjectGridEl = document.getElementById("subjectGrid");
const subjectDetailSection = document.getElementById("subject-detail");
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
const saveUserCodeBtn = document.getElementById("saveUserCodeBtn");
const copyUserCodeBtn = document.getElementById("copyUserCodeBtn");
const userCodeInputEl = document.getElementById("userCodeInput");
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

function programUserKey(subjectId, programId) {
  return `labhub_usercode_${subjectId}_${programId}`;
}

// Combine html+css+js to one runnable HTML snippet.
// If prog.code exists (Python, JS etc.), just return that.
function combineHtmlCssJs(prog) {
  if (prog.code) return prog.code;

  const hasParts = prog.html || prog.css || prog.js;
  if (!hasParts) return "";

  let html =
    prog.html ||
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Program</title></head><body><h1>Program</h1></body></html>';
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

// Run HTML snippet in iframe
function runHtmlSnippet(html) {
  if (!htmlRunnerEl) return;
  htmlRunnerEl.classList.remove("hidden");
  htmlRunnerEl.srcdoc = html;
  runOutputEl.textContent = "";
}

// Simple JS sandbox (evaluation) for pure JS programs
function runJavaScriptInSandbox(code, outputEl) {
  try {
    // Capture console.log
    let logs = [];
    const originalLog = console.log;
    console.log = function (...args) {
      logs.push(args.join(" "));
      originalLog.apply(console, args);
    };

    // Run code
    const result = new Function(code)();
    console.log = originalLog;

    let text = "";
    if (logs.length) {
      text += "Console output:\n" + logs.join("\n") + "\n";
    }
    if (result !== undefined) {
      text += "\nReturn value:\n" + String(result);
    }
    if (!text) text = "Code executed.";
    outputEl.textContent = text;
  } catch (err) {
    outputEl.textContent = "Error while executing JavaScript:\n" + err;
  }
}

// ========== NAVIGATION & THEME ==========

function switchSection(targetId) {
  const sections = document.querySelectorAll("main .section");
  sections.forEach((sec) => {
    if (sec.id === targetId) {
      sec.classList.add("active");
    } else {
      sec.classList.remove("active");
    }
  });

  const navLinks = document.querySelectorAll(
    ".main-nav .nav-link, .hero-actions button"
  );
  navLinks.forEach((btn) => {
    const target = btn.getAttribute("data-section-target");
    if (target === targetId) {
      btn.classList.add("active");
    } else if (btn.classList.contains("nav-link")) {
      btn.classList.remove("active");
    }
  });
}

function initNavigation() {
  const navButtons = document.querySelectorAll("[data-section-target]");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-section-target");
      if (target) {
        switchSection(target);
      }
    });
  });
}

function initTheme() {
  const root = document.documentElement;
  const stored = localStorage.getItem("labhub_theme");
  if (stored) {
    root.setAttribute("data-theme", stored);
    if (stored === "dark") {
      themeToggleBtn.textContent = "🌙";
    } else {
      themeToggleBtn.textContent = "☀️";
    }
  }

  themeToggleBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("labhub_theme", next);
    themeToggleBtn.textContent = next === "dark" ? "🌙" : "☀️";
  });
}

// ========== RENDER SUBJECTS ==========

function renderSubjects() {
  if (!subjectGridEl) return;
  subjectGridEl.innerHTML = "";

  subjects.forEach((subj) => {
    const card = document.createElement("article");
    card.className = "card subject-card";
    card.dataset.subjectId = subj.id;

    card.innerHTML = `
      <h3>${subj.name}</h3>
      <p class="muted">${subj.short || ""}</p>
      <div class="card-footer-row">
        <span class="muted small-text">${
          (subj.programs || []).length
        } programs</span>
        <button class="secondary-btn small">View lab programs</button>
      </div>
    `;

    const open = () => openSubject(subj.id);
    card.addEventListener("click", (e) => {
      // Avoid double-trigger if button clicked
      if (e.target.tagName.toLowerCase() === "button") return;
      open();
    });
    const btn = card.querySelector("button");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });

    subjectGridEl.appendChild(card);
  });
}

function openSubject(subjectId) {
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return;
  currentSubject = subj;

  switchSection("subject-detail");

  subjectTitleEl.textContent = subj.name;
  subjectDescriptionEl.textContent = subj.short || "";

  const tagsSet = new Set();
  const langsSet = new Set();

  (subj.programs || []).forEach((p) => {
    (p.tags || []).forEach((t) => tagsSet.add(t));
    if (p.language) langsSet.add(p.language);
    else if (p.html || p.css || p.js) langsSet.add("HTML/CSS/JS");
  });

  tagFilterEl.innerHTML = `<option value="">All tags</option>`;
  Array.from(tagsSet)
    .sort()
    .forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagFilterEl.appendChild(opt);
    });

  languageFilterEl.innerHTML = `<option value="">All languages</option>`;
  Array.from(langsSet)
    .sort()
    .forEach((l) => {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      languageFilterEl.appendChild(opt);
    });

  tagFilterEl.value = "";
  languageFilterEl.value = "";

  renderProgramList(subj);
  programDetailEl.classList.add("hidden");
}

// ========== RENDER PROGRAMS IN SUBJECT ==========

function renderProgramList(subj) {
  programListEl.innerHTML = "";

  const tagFilter = tagFilterEl.value;
  const langFilter = languageFilterEl.value;

  (subj.programs || []).forEach((p) => {
    if (tagFilter && !(p.tags || []).includes(tagFilter)) return;
    const langLabel =
      p.language ||
      (p.html || p.css || p.js ? "HTML/CSS/JS" : "Language not set");
    if (langFilter && langLabel !== langFilter) return;

    const card = document.createElement("article");
    card.className = "card program-card";
    card.dataset.programId = p.id;

    card.innerHTML = `
      <h3>${p.title || "Untitled Program"}</h3>
      <p class="card-subtitle">${langLabel}</p>
      <p class="muted small-text">${(p.tags || []).join(", ")}</p>
      <button class="primary-btn small">View details</button>
    `;

    const open = () => openProgramDetail(subj.id, p.id);
    card.addEventListener("click", (e) => {
      if (e.target.tagName.toLowerCase() === "button") return;
      open();
    });
    card.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      open();
    });

    programListEl.appendChild(card);
  });
}

// ========== PROGRAM DETAIL ==========

function openProgramDetail(subjectId, programId) {
  const subj = subjects.find((s) => s.id === subjectId);
  if (!subj) return;
  const prog = (subj.programs || []).find((p) => p.id === programId);
  if (!prog) return;

  currentSubject = subj;
  currentProgram = prog;

  programDetailEl.classList.remove("hidden");

  programDetailTitleEl.textContent = prog.title || "Untitled Program";
  const langLabel =
    prog.language ||
    (prog.html || prog.css || prog.js ? "HTML/CSS/JS" : "Language not set");
  programDetailMetaEl.textContent = `${subj.name} • ${langLabel}`;
  programDetailProblemEl.textContent = prog.problem || "";

  const combined = combineHtmlCssJs(prog);
  programCodeEl.textContent = combined;

  runOutputEl.textContent = "";
  runOutputNoteEl.textContent =
    "JavaScript and HTML/CSS/JS snippets run inside the browser. Python/C are view-only.";
  if (htmlRunnerEl) {
    htmlRunnerEl.classList.add("hidden");
    htmlRunnerEl.srcdoc = "";
  }

  const key = programUserKey(subjectId, programId);
  const stored = localStorage.getItem(key);
  userCodeInputEl.value = stored || combined;
  document.getElementById("saveStatus").textContent = "";
}

// ========== ALL PROGRAMS (GLOBAL SEARCH) ==========

function buildFlatPrograms() {
  allProgramsFlat = [];
  subjects.forEach((subj) => {
    (subj.programs || []).forEach((p) => {
      allProgramsFlat.push({
        subjectId: subj.id,
        subjectName: subj.name,
        ...p,
      });
    });
  });
}

function renderAllPrograms(filterText = "") {
  allProgramsListEl.innerHTML = "";
  const q = filterText.trim().toLowerCase();

  let count = 0;
  allProgramsFlat.forEach((p) => {
    const langLabel =
      p.language ||
      (p.html || p.css || p.js ? "HTML/CSS/JS" : "Language not set");

    const hay = (
      (p.title || "") +
      " " +
      (p.problem || "") +
      " " +
      (p.tags || []).join(" ") +
      " " +
      p.subjectName +
      " " +
      langLabel
    ).toLowerCase();

    if (q && !hay.includes(q)) return;

    const card = document.createElement("article");
    card.className = "card program-card";

    card.innerHTML = `
      <h3>${p.title || "Untitled Program"}</h3>
      <p class="card-subtitle">${p.subjectName} • ${langLabel}</p>
      <p class="muted small-text">${(p.tags || []).join(", ")}</p>
      <button class="primary-btn small">Open</button>
    `;

    card.addEventListener("click", (e) => {
      if (e.target.tagName.toLowerCase() === "button") return;
      openSubject(p.subjectId);
      openProgramDetail(p.subjectId, p.id);
      switchSection("subject-detail");
    });
    card.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      openSubject(p.subjectId);
      openProgramDetail(p.subjectId, p.id);
      switchSection("subject-detail");
    });

    allProgramsListEl.appendChild(card);
    count++;
  });

  if (q) {
    searchSummaryEl.textContent = `Found ${count} program(s) for "${filterText}".`;
  } else {
    searchSummaryEl.textContent = `Showing all ${count} programs.`;
  }
}

// ========== NOTES ==========

function renderNotes() {
  // for now just info card
  notesListEl.innerHTML = `
    <article class="card note-card">
      <h3>How to use this hub</h3>
      <p class="muted small-text">
        Select a subject, open a program, copy the code or edit your own version.
        Your changes are stored locally in this browser.
      </p>
    </article>
  `;
}

// ========== EVENT BINDINGS ==========

if (tagFilterEl && languageFilterEl) {
  tagFilterEl.addEventListener("change", () => {
    if (currentSubject) renderProgramList(currentSubject);
  });
  languageFilterEl.addEventListener("change", () => {
    if (currentSubject) renderProgramList(currentSubject);
  });
}

if (copyCodeBtn) {
  copyCodeBtn.addEventListener("click", async () => {
    const text = programCodeEl.textContent || "";
    try {
      await navigator.clipboard.writeText(text);
      showToast("Provided code copied!");
    } catch {
      showToast("Could not copy.");
    }
  });
}

if (copyUserCodeBtn) {
  copyUserCodeBtn.addEventListener("click", async () => {
    const text = userCodeInputEl.value || "";
    try {
      await navigator.clipboard.writeText(text);
      showToast("Your code copied!");
    } catch {
      showToast("Could not copy.");
    }
  });
}

if (saveUserCodeBtn) {
  saveUserCodeBtn.addEventListener("click", () => {
    if (!currentSubject || !currentProgram) return;
    const key = programUserKey(currentSubject.id, currentProgram.id);
    localStorage.setItem(key, userCodeInputEl.value);
    const statusEl = document.getElementById("saveStatus");
    if (statusEl) {
      statusEl.textContent = "Saved locally";
      setTimeout(() => {
        statusEl.textContent = "";
      }, 1500);
    }
    showToast("Code saved in this browser.");
  });
}

if (runCodeBtn) {
  runCodeBtn.addEventListener("click", () => {
    if (!currentProgram) {
      runOutputEl.textContent = "No program selected.";
      if (htmlRunnerEl) htmlRunnerEl.classList.add("hidden");
      return;
    }

    const defaultSource = combineHtmlCssJs(currentProgram);
    const codeToRun = userCodeInputEl.value.trim() || defaultSource || "";
    const lang = (currentProgram.language || "").toLowerCase();

    runOutputEl.textContent = "";
    if (htmlRunnerEl) {
      htmlRunnerEl.classList.add("hidden");
      htmlRunnerEl.srcdoc = "";
    }

    // Programs defined using html/css/js parts -> run as HTML snippet
    if (currentProgram.html || currentProgram.css || currentProgram.js) {
      runOutputNoteEl.textContent =
        "Rendering HTML/CSS/JS snippet in the frame below.";
      runHtmlSnippet(codeToRun);
      return;
    }

    // Plain JavaScript language programs
    if (lang === "javascript" || lang === "js") {
      runOutputNoteEl.textContent =
        "Running JavaScript directly in the browser.";
      runJavaScriptInSandbox(codeToRun, runOutputEl);
      return;
    }

    // Python / C / others: view-only
    if (lang === "python" || lang === "py" || lang === "c") {
      runOutputNoteEl.textContent =
        "Python/C execution requires a browser interpreter (Pyodide/WebAssembly) or backend service.";
      runOutputEl.textContent =
        "Execution is enabled only for JavaScript and HTML/CSS/JS snippets.\n" +
        "For " +
        (currentProgram.language || "this language") +
        " programs, please use an external compiler/IDE.";
      return;
    }

    runOutputNoteEl.textContent =
      "This language is not configured for execution. Code is view-only.";
    runOutputEl.textContent =
      "Execution is not available for language: " +
      (currentProgram.language || "Unknown") +
      ".";
  });
}

// Global search
if (searchFormEl) {
  searchFormEl.addEventListener("submit", (e) => {
    e.preventDefault();
    renderAllPrograms(globalSearchInputEl.value || "");
    switchSection("all-programs");
  });
}

// ========== INITIAL LOAD ==========

document.addEventListener("DOMContentLoaded", () => {
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  initNavigation();
  initTheme();
  renderNotes();

  fetch("programs.json")
    .then((res) => res.json())
    .then((data) => {
      subjects = data.subjects || [];
      renderSubjects();
      buildFlatPrograms();
      renderAllPrograms("");
    })
    .catch((err) => {
      console.error("Error loading programs.json", err);
      showToast("Failed to load programs.json");
    });
});
