/**
 * TouchGrass - Break Offer Page
 * Persistent page for accepting/dismissing a break offer.
 * Stays open until user acts (unlike popup).
 */

const API_BASE = "https://touchgrass-api-vat6.onrender.com/api/v1";

async function sendMsg(msg) {
  return new Promise(resolve => chrome.runtime.sendMessage(msg, resolve));
}

function showError(msg) {
  const el = document.getElementById("errorMsg");
  el.textContent = msg;
  setTimeout(() => { el.textContent = ""; }, 5000);
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = loading === true ? "Loading..." : loading;
  } else if (btn.dataset.originalText) {
    btn.textContent = btn.dataset.originalText;
  }
}

async function loadOffer() {
  const resp = await sendMsg({ type: "GET_STATE" });
  if (!resp || resp.error) {
    showError("Failed to load break offer");
    return;
  }

  if (resp.demo) {
    document.getElementById("demoBadge").classList.remove("hidden");
  }

  // Get break offer from storage
  const storage = await chrome.storage.local.get(["tg_break_offer", "tg_snapshot_id", "tg_offer_meta"]);
  if (!storage.tg_break_offer) {
    // No offer - maybe already accepted/dismissed
    window.close();
    return;
  }

  const offer = storage.tg_break_offer;
  document.getElementById("offerTitle").textContent = offer.title;
  document.getElementById("offerDesc").textContent = offer.type.replace("_", " ");
  document.getElementById("offerDuration").textContent = formatDuration(offer.duration_sec);
  document.getElementById("offerType").textContent = offer.type.replace("_", " ");

  // Why the agent suggested this (auto-suggestions carry a reason + source).
  const meta = storage.tg_offer_meta || {};
  const reasonEl = document.getElementById("offerReason");
  const sourceEl = document.getElementById("offerSource");
  if (meta.reason) {
    reasonEl.textContent = meta.reason;
  } else {
    reasonEl.style.display = "none";
  }
  if (meta.source === "ai" || meta.source === "fallback") {
    sourceEl.textContent = meta.source === "ai" ? "AI suggestion" : "Offline fallback (AI unavailable)";
    sourceEl.classList.add(meta.source);
  }
  if (meta.demo_trigger) {
    // Demo trigger: make it obvious this came from the 15-second demo, not normal mode.
    document.getElementById("demoBadge").classList.remove("hidden");
    const demoNote = document.getElementById("demoNote");
    if (demoNote) demoNote.style.display = "block";
  }

function formatDuration(sec) {
  if (sec < 60) return `${sec} second${sec !== 1 ? 's' : ''}`;
  const min = Math.round(sec / 60);
  return `${min} minute${min !== 1 ? 's' : ''}`;
}
}

let userActed = false;

// Mark that user acted (accepted or dismissed)
function markUserActed() {
  userActed = true;
}

// Handler for "Start Break" button
async function doHandleAccept() {
  setLoading("btnAccept", "Starting...");
  document.getElementById("btnDismiss").disabled = true;

  try {
    const resp = await sendMsg({ type: "ACCEPT_BREAK" });
    if (resp?.state === "BREAK_ACTIVE" || resp?.recovered) {
      // Started (or the background already routed a recovered/duplicate case
      // to the live break/reflection flow). This page's job is done.
      window.close();
    } else {
      showError(resp?.error || "Failed to start break");
      setLoading("btnAccept", false);
      document.getElementById("btnDismiss").disabled = false;
    }
  } catch (e) {
    showError("Backend unreachable. Is the server running?");
    setLoading("btnAccept", false);
    document.getElementById("btnDismiss").disabled = false;
  }
}

// Handler for "Not Now" button
async function doHandleDismiss() {
  setLoading("btnDismiss", "Dismissing...");
  document.getElementById("btnAccept").disabled = true;

  try {
    const resp = await sendMsg({ type: "DISMISS_BREAK" });
    if (resp?.state === "WORKING") {
      window.close();
    } else {
      showError(resp?.error || "Failed to dismiss");
      setLoading("btnDismiss", false);
      document.getElementById("btnAccept").disabled = false;
    }
  } catch (e) {
    showError("Backend unreachable");
    setLoading("btnDismiss", false);
    document.getElementById("btnAccept").disabled = false;
  }
}

// Wrapper handlers that mark user acted before delegating
async function handleAccept() {
  markUserActed();
  return doHandleAccept();
}

async function handleDismiss() {
  markUserActed();
  return doHandleDismiss();
}

document.getElementById("btnAccept").addEventListener("click", handleAccept);
document.getElementById("btnDismiss").addEventListener("click", handleDismiss);

// If window loses focus, don't close (unlike popup)
// But handle case where offer was already acted upon in another tab
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.tg_break_offer && !changes.tg_break_offer.newValue) {
    // Offer was removed (accepted or dismissed)
    window.close();
  }
});

// If user closes the page without acting, dismiss the offer via background
window.addEventListener("pagehide", () => {
  if (!userActed) {
    chrome.runtime.sendMessage({ type: "DISMISS_BREAK" }).catch(() => {});
  }
});

// Init
loadOffer();