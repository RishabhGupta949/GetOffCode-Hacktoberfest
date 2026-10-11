/**
 * TouchGrass - Background Service Worker (MV3)
 * Coordinates: activity sampling, alarms, backend comms, break state, reflection flow
 */

import {
  createMonitorState, hydrateMonitorState, setOptIn, recordTabSwitch,
  tabSwitchesInWindow, recordSample, shouldEvaluate, markEvaluated,
  markSuggested,
} from "./activity-monitor.js";

const API_BASE = "https://touchgrass-api-vat6.onrender.com/api/v1";
const SAMPLE_INTERVAL_MS = 60_000; // 1 minute
const SESSION_ID_KEY = "tg_session_id";
const STATE_KEY = "tg_state";
const BREAK_KEY = "tg_break"; // { break_id, ends_at, title, type, demo }
const DEMO_KEY = "tg_demo_mode";
const MONITOR_KEY = "tg_monitor"; // persisted monitor state (survives SW restarts)
const OFFER_META_KEY = "tg_offer_meta"; // { reason, source, demo_trigger } for the offer page
const DEMO_SAMPLE_MS = 2_000; // demo cadence so the 15s trigger is predictable
const IDLE_QUERY_SEC = 15;
const SUGGESTABLE_STATES = ["IDLE", "WORKING", "POSSIBLY_STUCK"];

let samplingAlarm = "tg_activity_sample";
let breakEndAlarm = "tg_break_end";

async function safeJson(resp) {
  const text = await resp.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {}
  if (!resp.ok) {
    // FastAPI errors are {"detail": {"error": ..., "code": ...}}
    const detail = parsed && typeof parsed === "object" ? parsed.detail : null;
    return {
      error: (detail && typeof detail === "object" ? detail.error : null)
             || (typeof detail === "string" ? detail : null)
             || text
             || `HTTP ${resp.status}`,
      code: detail && typeof detail === "object" ? detail.code : undefined,
      status: resp.status,
    };
  }
  if (parsed === null) {
    return { error: "Invalid server response", status: 500 };
  }
  return parsed;
}

function genSessionId() {
  return "sess_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

async function getSessionId() {
  const data = await chrome.storage.local.get(SESSION_ID_KEY);
  if (data[SESSION_ID_KEY]) return data[SESSION_ID_KEY];
  const id = genSessionId();
  await chrome.storage.local.set({ [SESSION_ID_KEY]: id });
  return id;
}

async function setState(state) {
  await chrome.storage.local.set({ [STATE_KEY]: state });
  // Notify any open popup/reflection
  chrome.runtime.sendMessage({ type: "STATE_CHANGED", state }).catch(() => {});
}

async function getState() {
  const data = await chrome.storage.local.get(STATE_KEY);
  return data[STATE_KEY] || "IDLE";
}

async function setBreak(breakData) {
  if (breakData) {
    await chrome.storage.local.set({ [BREAK_KEY]: breakData });
    // Schedule break end alarm using 'when' (timestamp in ms) for sub-minute precision
    const when = breakData.ends_at * 1000;
    chrome.alarms.create(breakEndAlarm, { when });
  } else {
    await chrome.storage.local.remove(BREAK_KEY);
    chrome.alarms.clear(breakEndAlarm);
  }
}

async function getBreak() {
  const data = await chrome.storage.local.get(BREAK_KEY);
  return data[BREAK_KEY] || null;
}

async function setDemoMode(demo) {
  await chrome.storage.local.set({ [DEMO_KEY]: demo });
}

async function isDemoMode() {
  const data = await chrome.storage.local.get(DEMO_KEY);
  return data[DEMO_KEY] === true;
}

// ---------- Activity monitoring (P1) ----------
// Opt-in aggregation of lightweight browser signals only: active session
// duration, tab switches + frequency, window focus, idle/active state.
// Never collected: page text, keystrokes, screenshots, cookies, full history.
// All state lives in chrome.storage.local so a service-worker restart cannot
// reset session tracking, cooldowns, or create duplicate evaluations.
let monitor = createMonitorState(Date.now());
const monitorReady = loadMonitor();
let evaluating = false;       // in-flight guard against duplicate evaluations
let demoTimerId = null;
let openBreakOfferTabId = null;

async function loadMonitor() {
  const data = await chrome.storage.local.get(MONITOR_KEY);
  monitor = hydrateMonitorState(data[MONITOR_KEY], Date.now());
}

function persistMonitor() {
  return chrome.storage.local.set({ [MONITOR_KEY]: monitor });
}

async function getActiveDomain() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.url && !tabs[0].url.startsWith("chrome://")) {
      return new URL(tabs[0].url).hostname;
    }
  } catch {}
  return null;
}

async function queryIdleMs() {
  try {
    const idleState = await chrome.idle.queryState(IDLE_QUERY_SEC);
    return idleState === "idle" ? 5 * 60 * 1000
         : idleState === "locked" ? 10 * 60 * 1000 : 0;
  } catch {
    return 0;
  }
}

function noteTabSwitch() {
  monitor = recordTabSwitch(monitor, Date.now());
  persistMonitor().catch(() => {});
}

async function fetchSuggestion(demo) {
  const sessionId = await getSessionId();
  const state = await getState();
  // Never duplicate an evaluation while an offer/break/reflection is live.
  if (!SUGGESTABLE_STATES.includes(state)) return null;
  const resp = await fetch(`${API_BASE}/activity/suggest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      active_domain: await getActiveDomain(),
      idle_ms: await queryIdleMs(),
      tab_switches_5m: tabSwitchesInWindow(monitor, Date.now()),
      demo,
    }),
  });
  return await safeJson(resp);
}

async function openBreakOfferPage() {
  if (openBreakOfferTabId !== null) {
    try {
      chrome.tabs.update(openBreakOfferTabId, { active: true, focused: true });
      return;
    } catch {}
    openBreakOfferTabId = null;
  }
  const url = chrome.runtime.getURL("break-offer.html");
  chrome.tabs.create({ url, active: true }, (tab) => {
    if (tab && tab.id) openBreakOfferTabId = tab.id;
  });
}

async function sampleAndMaybeEvaluate(demo) {
  await monitorReady;
  if (!monitor.optIn || evaluating) return;
  const now = Date.now();
  const idleMs = await queryIdleMs();
  monitor = recordSample(monitor, { now, idle: idleMs > 0, focused: monitor.focused });
  await persistMonitor();
  if (!shouldEvaluate(monitor, { now, demo })) return;

  evaluating = true;
  try {
    monitor = markEvaluated(monitor, now);
    const data = await fetchSuggestion(demo);
    if (data?.suggest && data.state === "BREAK_OFFERED") {
      monitor = markSuggested(monitor, Date.now());
      await persistMonitor();
      await setState(data.state);
      await chrome.storage.local.set({
        tg_break_offer: data.offer,
        tg_snapshot_id: data.snapshot_id,
        [OFFER_META_KEY]: {
          reason: data.reason || "",
          source: data.source || "",
          demo_trigger: data.demo_trigger === true,
        },
      });
      stopDemoLoop(); // the suggestion is live; pause the fast demo loop
      await openBreakOfferPage();
    }
  } catch (e) {
    console.warn("TouchGrass activity evaluation failed:", e);
  } finally {
    evaluating = false;
  }
}

function startDemoLoop() {
  if (demoTimerId !== null) return;
  const tick = async () => {
    try {
      await sampleAndMaybeEvaluate(true);
    } finally {
      demoTimerId = setTimeout(tick, DEMO_SAMPLE_MS);
    }
  };
  demoTimerId = setTimeout(tick, DEMO_SAMPLE_MS);
}

function stopDemoLoop() {
  if (demoTimerId !== null) {
    clearTimeout(demoTimerId);
    demoTimerId = null;
  }
}

async function refreshDemoLoop() {
  await monitorReady;
  const demo = await isDemoMode();
  if (demo && monitor.optIn) startDemoLoop();
  else stopDemoLoop();
}

monitorReady.then(refreshDemoLoop);

// ---------- Activity Sampling ----------
let lastActiveTabId = null;

async function sampleActivity() {
  try {
    const sessionId = await getSessionId();
    const state = await getState();

    // Only sample in working-like states
    if (!["IDLE", "WORKING", "POSSIBLY_STUCK"].includes(state)) return;

    // Get active tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let activeDomain = null;
    if (tabs[0] && tabs[0].url && !tabs[0].url.startsWith("chrome://")) {
      try {
        activeDomain = new URL(tabs[0].url).hostname;
      } catch {}
    }

    // Idle state
    const idleState = await chrome.idle.queryState(15); // 15s threshold
    const idleMs = idleState === "idle" ? 5 * 60 * 1000 : (idleState === "locked" ? 10 * 60 * 1000 : 0);

    // Send to backend
    const resp = await fetch(`${API_BASE}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        active_domain: activeDomain,
        idle_ms: idleMs,
        tab_switches_5m: tabSwitchesInWindow(monitor, Date.now()),
        explicit_stuck: false
      })
    });

    if (!resp.ok) return;
    const data = await safeJson(resp);
    if (data.error) return;

    // Handle state transitions from activity
    if (data.state !== state) {
      await setState(data.state);
    }

    // If candidate and we're in WORKING, show badge (optional UX)
    if (data.candidate && state === "WORKING") {
      chrome.action.setBadgeText({ text: "⚠" });
      chrome.action.setBadgeBackgroundColor({ color: "#e67e22" });
    } else {
      chrome.action.setBadgeText({ text: "" });
    }

  } catch (e) {
    console.warn("TouchGrass activity sample failed:", e);
  }
}

// Start periodic sampling
chrome.alarms.create(samplingAlarm, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === samplingAlarm) {
    await sampleActivity();
    // Automatic activity evaluation (no-op unless monitoring is opted in).
    await sampleAndMaybeEvaluate(false);
  } else if (alarm.name === breakEndAlarm) {
    await handleBreakEnd();
  }
});

// ---------- Tab tracking ----------
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (lastActiveTabId !== null && lastActiveTabId !== activeInfo.tabId) {
    noteTabSwitch();
  }
  lastActiveTabId = activeInfo.tabId;
});

// Window focus is a lightweight signal: an unfocused browser is "away".
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  const focused = windowId !== chrome.windows.WINDOW_ID_NONE;
  await monitorReady;
  monitor = recordSample(monitor, { now: Date.now(), idle: monitor.idle, focused });
  persistMonitor().catch(() => {});
});

// Idle detection: idle periods never count as active activity.
chrome.idle.setDetectionInterval(IDLE_QUERY_SEC);
chrome.idle.onStateChanged.addListener(async (newState) => {
  const idle = newState !== "active";
  await monitorReady;
  monitor = recordSample(monitor, { now: Date.now(), idle, focused: monitor.focused });
  persistMonitor().catch(() => {});
});

chrome.tabs.onRemoved.addListener(() => {
  // Tab closed, could count as switch if user was actively moving
});

// Track currently open break page tab ID
let openBreakTabId = null;

// When a break page is opened, record its tab ID
function setOpenBreakTabId(tabId) {
  openBreakTabId = tabId;
}

// When the break page is closed, clear the tracking
function clearOpenBreakTabId() {
  if (openBreakTabId !== null) {
    chrome.tabs.get(openBreakTabId, () => {
      // Tab may already be gone; ignore errors
    });
  }
  openBreakTabId = null;
}

// When a break page is opened, record its tab ID
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === openBreakTabId) {
    clearOpenBreakTabId();
  }
  if (tabId === openBreakOfferTabId) {
    openBreakOfferTabId = null;
  }
});

// When the break end alarm fires
async function handleBreakEnd(early = false) {
  const sessionId = await getSessionId();
  const state = await getState();
  if (state !== "BREAK_ACTIVE") return;

  try {
    const resp = await fetch(`${API_BASE}/break/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, early: early })
    });
    if (!resp.ok) return;
    const data = await safeJson(resp);
    if (data.error) return;
    await setState(data.state);
    await setBreak(null);
    await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
    // Open reflection page
    openReflectionPage();
    // Close the break page if one is open
    if (openBreakTabId !== null) {
      try {
        chrome.tabs.remove(openBreakTabId);
      } catch {}
      clearOpenBreakTabId();
    }
  } catch (e) {
    console.warn("TouchGrass break end failed:", e);
  }
}

function openReflectionPage() {
  const url = chrome.runtime.getURL("reflection.html");
  chrome.tabs.create({ url, active: true });
}

async function showBreakOverlay(breakData) {
  // The content script listens for storage changes and shows overlay
  // Just ensure break data is stored
  await setBreak(breakData);
  await setState("BREAK_ACTIVE");
}

// Show the running break: focus its tab, or open the page if untracked.
function openOrFocusBreakPage() {
  if (openBreakTabId !== null) {
    try {
      chrome.tabs.update(openBreakTabId, { active: true, focused: true });
      return;
    } catch {}
  }
  const url = chrome.runtime.getURL("break.html");
  chrome.tabs.create({ url, active: true }, (tab) => {
    if (tab && tab.id) setOpenBreakTabId(tab.id);
  });
}

// ---------- Message handling ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    const sessionId = await getSessionId();

    try {
      switch (msg.type) {
        case "GET_STATE": {
          const state = await getState();
          const breakData = await getBreak();
          sendResponse({ state, break: breakData, demo: await isDemoMode() });
          break;
        }

        case "EXPLICIT_STUCK": {
          // Called from popup when user clicks "I'm stuck"
          const resp = await fetch(`${API_BASE}/stuck`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: sessionId,
              problem: msg.problem || "",
              error: msg.error || ""
            })
          });
          const data = await safeJson(resp);
          if (data.error) {
            // A break is in the way: never trap the user. Point them at the
            // path that resolves it (running break or the reflection flow).
            const code = data.code || (data.status === 409 && "INVALID_TRANSITION");
            if (code === "BREAK_STILL_ACTIVE") {
              openOrFocusBreakPage();
              sendResponse({ error: "A break is in progress — returning you to it." });
              break;
            }
            if (code === "BREAK_RECOVERED") {
              await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
              openReflectionPage();
              sendResponse({ state: "REFLECTION", recovered: true });
              break;
            }
            sendResponse(data);
            break;
          }
          if (data.state === "BREAK_OFFERED") {
            await setState(data.state);
            // Store break offer data for break-offer page to show
            await chrome.storage.local.set({ tg_break_offer: data.offer, tg_snapshot_id: data.snapshot_id });
            // Open persistent break offer page (survives popup closure)
            openBreakOfferPage();
          }
          sendResponse(data);
          break;
        }

        case "ACCEPT_BREAK": {
          const resp = await fetch(`${API_BASE}/break/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await safeJson(resp);
          if (data.error) {
            // Duplicate click, or a stale break was just recovered: never show
            // a dead-end error, route the user to the live flow instead.
            const code = data.code || (data.status === 409 && "INVALID_TRANSITION");
            if (code === "BREAK_STILL_ACTIVE") {
              await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
              openOrFocusBreakPage();
              sendResponse({ state: "BREAK_ACTIVE" });
              break;
            }
            if (code === "BREAK_RECOVERED") {
              await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
              openReflectionPage();
              sendResponse({ state: "REFLECTION", recovered: true });
              break;
            }
            sendResponse(data);
            break;
          }
          if (data.state === "BREAK_ACTIVE") {
            // Store break data and state for break.html initialization
            await setBreak(data);
            await setState("BREAK_ACTIVE");
            await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
            // Avoid duplicate break pages
            if (openBreakTabId !== null) {
              try { chrome.tabs.update(openBreakTabId, { active: true, focused: true }); } catch {}
            } else {
              const url = chrome.runtime.getURL("break.html");
              chrome.tabs.create({ url, active: true }, (tab) => {
                if (tab && tab.id) setOpenBreakTabId(tab.id);
              });
            }
          }
          sendResponse(data);
          break;
        }

        case "DISMISS_BREAK": {
          const resp = await fetch(`${API_BASE}/break/dismiss`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await safeJson(resp);
          if (!data.error) {
            await setState(data.state);
            await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
          }
          sendResponse(data);
          break;
        }

        case "REFLECT": {
          const resp = await fetch(`${API_BASE}/reflect`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, choice: msg.choice })
          });
          const data = await safeJson(resp);
          if (!data.error) {
            await setState(data.state);
          }
          sendResponse(data);
          break;
        }

        case "REQUEST_HYPOTHESIS": {
          const resp = await fetch(`${API_BASE}/hypothesis`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await safeJson(resp);
          sendResponse(data);
          break;
        }

        case "SUBMIT_FEEDBACK": {
          const resp = await fetch(`${API_BASE}/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, hypothesis_id: msg.hypothesis_id, outcome: msg.outcome })
          });
          const data = await safeJson(resp);
          if (!data.error) {
            await setState(data.state);
            await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
          }
          sendResponse(data);
          break;
        }

        case "BREAK_END_EARLY": {
          const resp = await fetch(`${API_BASE}/break/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, early: true })
          });
          const data = await safeJson(resp);
          if (!data.error) {
            await setState(data.state);
            await setBreak(null);
            await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
            openReflectionPage();
            // Close the break page if one is open
            if (openBreakTabId !== null) {
              try {
                chrome.tabs.remove(openBreakTabId);
              } catch {}
              clearOpenBreakTabId();
            }
          }
          sendResponse(data);
          break;
        }

        case "OPEN_REFLECTION": {
          openReflectionPage();
          sendResponse({ ok: true });
          break;
        }

        case "RESUME_WORK": {
          const resp = await fetch(`${API_BASE}/resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId })
          });
          const data = await resp.json();
          await setState(data.state);
          await chrome.storage.local.remove(["tg_break_offer", "tg_snapshot_id", OFFER_META_KEY]);
          sendResponse(data);
          break;
        }

        case "SET_DEMO_MODE": {
          await setDemoMode(msg.demo === true);
          await refreshDemoLoop();
          sendResponse({ ok: true });
          break;
        }

        case "GET_MONITORING": {
          await monitorReady;
          sendResponse({
            ok: true,
            optIn: monitor.optIn,
            active: monitor.optIn && monitor.idle !== true,
            activeMs: monitor.activeMs,
            demo: await isDemoMode(),
          });
          break;
        }

        case "SET_MONITORING": {
          await monitorReady;
          monitor = setOptIn(monitor, msg.optIn === true);
          if (monitor.optIn) {
            monitor = recordSample(monitor, {
              now: Date.now(), idle: monitor.idle, focused: monitor.focused,
            });
          }
          await persistMonitor();
          await refreshDemoLoop();
          sendResponse({ ok: true, optIn: monitor.optIn });
          break;
        }

        default:
          sendResponse({ error: "unknown message" });
      }
    } catch (e) {
      console.error("TouchGrass message error:", e);
      sendResponse({ error: e.message });
    }
  })();
  return true; // async response
});

// ---------- Initialization ----------
chrome.runtime.onInstalled.addListener(async () => {
  await setState("IDLE");
  await setBreak(null);
  console.log("TouchGrass installed");
});

chrome.runtime.onStartup.addListener(async () => {
  await setState("IDLE");
  await setBreak(null);
  console.log("TouchGrass startup");
});

console.log("TouchGrass background loaded");
