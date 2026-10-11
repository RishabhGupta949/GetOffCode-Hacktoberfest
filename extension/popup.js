/**
 * TouchGrass - Popup UI
 * Shows status, handles explicit stuck, break offer, reflection/resume actions
 */

const API_BASE = "https://touchgrass-api-vat6.onrender.com";

const stateLabels = {
  IDLE: { text: "IDLE", class: "badge-idle" },
  WORKING: { text: "WORKING", class: "badge-working" },
  POSSIBLY_STUCK: { text: "STUCK?", class: "badge-stuck" },
  BREAK_OFFERED: { text: "BREAK OFFERED", class: "badge-break" },
  BREAK_ACTIVE: { text: "ON BREAK", class: "badge-break" },
  RETURNED: { text: "RETURNED", class: "badge-reflection" },
  REFLECTION: { text: "REFLECTING", class: "badge-reflection" },
  USER_HAS_IDEA: { text: "GOT AN IDEA", class: "badge-reflection" },
  AI_ASSISTANCE_ALLOWED: { text: "AI HELP?", class: "badge-ai" },
  SUGGESTION_PROVIDED: { text: "AI SUGGESTED", class: "badge-ai" },
  FEEDBACK_CAPTURED: { text: "DONE", class: "badge-reflection" }
};

async function sendMsg(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = msg;
  el.classList.add("visible");
  setTimeout(() => el.classList.remove("visible"), 5000);
}

function updateStateUI(state) {
  const badge = document.getElementById("statusBadge");
  const info = stateLabels[state] || { text: state, class: "badge-idle" };
  badge.textContent = info.text;
  badge.className = "badge " + info.class;

  // Show/hide elements based on state
  const stuckBtn = document.getElementById("btnStuck");
  const stuckForm = document.getElementById("stuckForm");
  const btnReflection = document.getElementById("btnReflection");
  const btnResume = document.getElementById("btnResume");

  // Reset
  stuckBtn.style.display = "block";
  stuckForm.classList.remove("visible");
  btnReflection.style.display = "none";
  btnResume.style.display = "none";

  switch (state) {
    case "IDLE":
    case "WORKING":
    case "POSSIBLY_STUCK":
    case "BREAK_OFFERED":
      stuckBtn.style.display = "block";
      break;
    case "BREAK_ACTIVE":
      stuckBtn.style.display = "none";
      break;
    case "REFLECTION":
    case "AI_ASSISTANCE_ALLOWED":
      btnReflection.style.display = "block";
      break;
    case "USER_HAS_IDEA":
      btnResume.style.display = "block";
      break;
    case "SUGGESTION_PROVIDED":
      btnResume.style.display = "block";
      break;
  }
}

async function loadInitial() {
  const resp = await sendMsg({ type: "GET_STATE" });
  if (resp?.state) {
    updateStateUI(resp.state);
  }
  if (resp?.demo) {
    document.getElementById("demoBadge").style.display = "inline-block";
  }
  if (resp?.break) {
    // Break is active, overlay handles it
  }
  await loadMonitoring();
}

async function loadMonitoring() {
  const resp = await sendMsg({ type: "GET_MONITORING" });
  if (!resp) return;
  const optIn = resp.optIn === true;
  document.getElementById("btnMonitoring").checked = optIn;
  document.getElementById("btnDemoMode").checked = resp.demo === true;
  document.getElementById("demoHint").style.display = resp.demo ? "block" : "none";
  const status = document.getElementById("monitorStatus");
  if (!optIn) {
    status.textContent = "Off";
  } else if (resp.active) {
    status.textContent = "On — watching activity";
  } else {
    status.textContent = "On — idle";
  }
}

document.getElementById("btnMonitoring").addEventListener("change", async (e) => {
  const resp = await sendMsg({ type: "SET_MONITORING", optIn: e.target.checked });
  if (resp?.ok) {
    await loadMonitoring();
  } else {
    showError("Failed to change monitoring");
    e.target.checked = !e.target.checked;
  }
});

document.getElementById("btnDemoMode").addEventListener("change", async (e) => {
  const resp = await sendMsg({ type: "SET_DEMO_MODE", demo: e.target.checked });
  if (resp?.ok) {
    await loadMonitoring();
  } else {
    showError("Failed to change demo mode");
    e.target.checked = !e.target.checked;
  }
});

document.getElementById("btnStuck").addEventListener("click", () => {
  document.getElementById("btnStuck").style.display = "none";
  document.getElementById("stuckForm").classList.add("visible");
  document.getElementById("stuckProblem").focus();
});

document.getElementById("btnCancelStuck").addEventListener("click", () => {
  document.getElementById("stuckForm").classList.remove("visible");
  document.getElementById("btnStuck").style.display = "block";
});

document.getElementById("btnSubmitStuck").addEventListener("click", async () => {
  const problem = document.getElementById("stuckProblem").value.trim();
  const error = document.getElementById("stuckError").value.trim();
  const btn = document.getElementById("btnSubmitStuck");
  btn.disabled = true;
  btn.textContent = "Checking...";

  try {
    const resp = await sendMsg({ type: "EXPLICIT_STUCK", problem, error });
    if (resp?.state === "BREAK_OFFERED") {
      updateStateUI("BREAK_OFFERED");
    } else if (resp?.recovered) {
      // A stale break was recovered; the background opened the reflection page.
      updateStateUI("REFLECTION");
    } else {
      showError(resp?.error || "Failed to register stuck state");
      document.getElementById("stuckForm").classList.remove("visible");
      document.getElementById("btnStuck").style.display = "block";
    }
  } catch (e) {
    showError("Backend unreachable. Is the server running?");
    document.getElementById("stuckForm").classList.remove("visible");
    document.getElementById("btnStuck").style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit";
  }
});

document.getElementById("btnReflection").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "OPEN_REFLECTION" }); // handled by background
  window.close();
});

document.getElementById("btnResume").addEventListener("click", async () => {
  try {
    const resp = await sendMsg({ type: "RESUME_WORK" });
    if (resp?.state) {
      updateStateUI(resp.state);
    }
  } catch (e) {
    showError("Failed to resume");
  }
});

// Listen for state changes from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_CHANGED") {
    updateStateUI(msg.state);
  }
});

// Init
loadInitial();

// Refresh state periodically while popup open
setInterval(loadInitial, 5000);