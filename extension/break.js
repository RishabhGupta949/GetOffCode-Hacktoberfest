/**
 * TouchGrass - Break Page
 * Full-screen break timer with circular progress. External script (MV3 CSP
 * blocks inline scripts on extension pages).
 */

const API_BASE = "https://touchgrass-api-vat6.onrender.com/api/v1";

async function sendMsg(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  if (el) { el.textContent = msg; setTimeout(() => { el.textContent = ""; }, 5000); }
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) { btn.dataset.originalText = btn.textContent; btn.textContent = loading === true ? "Loading..." : loading; }
  else if (btn.dataset.originalText) { btn.textContent = btn.dataset.originalText; }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

let breakEndsAt = null;
let breakDuration = null;
let animationFrameId = null;

function updateTimer() {
  if (breakEndsAt == null) return;

  const now = Date.now();
  const remainingMs = breakEndsAt - now;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

  const timerEl = document.getElementById("tg-break-timer");
  const progressCircle = document.getElementById("tg-progress-circle");
  if (!timerEl || !progressCircle) return;

  timerEl.textContent = formatTime(remainingSec);

  if (breakDuration && breakDuration > 0) {
    const progress = Math.max(0, Math.min(1, remainingMs / breakDuration));
    const circumference = 2 * Math.PI * 110;
    const offset = circumference * (1 - progress);
    progressCircle.setAttribute("stroke-dashoffset", offset);

    if (remainingSec <= 10) {
      progressCircle.setAttribute("stroke", "#ef4444");
      timerEl.style.color = "#ef4444";
      timerEl.style.textShadow = "0 0 20px rgba(239, 68, 68, 0.5)";
    } else if (remainingSec <= 30) {
      progressCircle.setAttribute("stroke", "#f59e0b");
      timerEl.style.color = "#f59e0b";
      timerEl.style.textShadow = "0 0 20px rgba(245, 158, 11, 0.5)";
    } else {
      progressCircle.setAttribute("stroke", "#3d8a35");
      timerEl.style.color = "#f1f5f9";
      timerEl.style.textShadow = "0 0 24px rgba(61, 138, 53, 0.35)";
    }
  }

  if (remainingSec > 0) {
    animationFrameId = requestAnimationFrame(updateTimer);
  } else {
    animationFrameId = null;
  }
}

function showBreak(breakData) {
  document.getElementById("tg-break-title").textContent = breakData.title || "Take a Break";
  document.getElementById("tg-break-type").textContent = breakData.type?.replace("_", " ") || "";

  breakEndsAt = breakData.ends_at * 1000;
  breakDuration = breakData.duration_sec * 1000;

  const expired = breakEndsAt <= Date.now();
  if (expired) {
    // Break already elapsed (e.g. the tab was closed or the machine slept).
    // The timer reads 00:00 and the button returns the user immediately.
    document.getElementById("tg-break-msg").textContent =
      "Break time is up. Tap I'm Back to continue.";
  }

  // Initialize timer display immediately to avoid flash of "00:00"
  const timerEl = document.getElementById("tg-break-timer");
  const progressCircle = document.getElementById("tg-progress-circle");
  if (timerEl && progressCircle && breakDuration > 0) {
    const totalSec = Math.ceil(breakDuration / 1000);
    timerEl.textContent = formatTime(totalSec);
    progressCircle.setAttribute("stroke-dashoffset", 0);
  }

  if (animationFrameId) { cancelAnimationFrame(animationFrameId); }
  updateTimer();
}

async function fetchBreakStateFromBackend() {
  try {
    const sessionResp = await sendMsg({ type: "GET_STATE" });
    if (sessionResp?.break?.ends_at && sessionResp?.break?.duration_sec) {
      return sessionResp.break;
    }
  } catch {}
  return null;
}

async function handleBackClick() {
  const btn = document.getElementById("tg-back-btn");
  // Prevent duplicate submissions while a request is in flight.
  if (btn?.disabled) return;
  if (btn) { btn.disabled = true; btn.textContent = "Ending break..."; }
  try {
    const resp = await chrome.runtime.sendMessage({ type: "BREAK_END_EARLY" });
    console.log("BREAK_END_EARLY response:", resp);
    if (resp?.error) {
      console.error("BREAK_END_EARLY error:", resp.error);
      alert("Failed to end break: " + resp.error);
      if (btn) { btn.disabled = false; btn.textContent = "I'm Back"; }
      return;
    }
  } catch (e) {
    console.error("BREAK_END_EARLY message failed:", e);
    alert("Failed to communicate with background: " + e.message);
    if (btn) { btn.disabled = false; btn.textContent = "I'm Back"; }
    return;
  }
  // Success: the reflection tab is now active. Close this break tab; the
  // background also removes it via chrome.tabs.remove() when it tracks it.
  window.close();
}

// Load break state from storage, fallback to backend /state endpoint
chrome.storage.local.get(["tg_break", "tg_state"], async (data) => {
  let breakData = data.tg_break;

  if (breakData && data.tg_state === "BREAK_ACTIVE" && breakData.ends_at && breakData.duration_sec) {
    showBreak(breakData);
  } else {
    // Fallback: fetch authoritative break state from backend
    breakData = await fetchBreakStateFromBackend();
    if (breakData && breakData.ends_at && breakData.duration_sec) {
      showBreak(breakData);
    } else {
      window.close();
    }
  }
});

// "I'm Back" button
document.getElementById("tg-back-btn").addEventListener("click", handleBackClick);
