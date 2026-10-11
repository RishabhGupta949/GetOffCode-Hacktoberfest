/**
 * TouchGrass - Activity Monitor (pure logic)
 *
 * Aggregates lightweight browser signals into the smallest summary the
 * backend needs: accumulated active time, tab-switch frequency, idle and
 * focus state. Contains no Chrome APIs so it can run in the service worker
 * and under `node --test`.
 *
 * Collected: active session duration, tab switches + frequency, window
 * focus, idle/active. Never collected: page text, keystrokes, screenshots,
 * cookies, full history.
 */

export const DEFAULT_CONFIG = Object.freeze({
  windowMs: 5 * 60 * 1000,          // tab-switch counting window
  normalIntervalMs: 5 * 60 * 1000,  // normal mode: evaluate every 5 min of activity
  demoTriggerMs: 15 * 1000,         // demo mode: evaluate after 15s of active activity
  cooldownMs: 30 * 60 * 1000,       // after a suggestion: stay quiet for 30 min
  demoCooldownMs: 60 * 1000,        // demo: short cooldown so the demo can repeat
});

export function createMonitorState(now) {
  return {
    optIn: false,
    startedAt: now,
    activeMs: 0,
    lastSampleAt: now,
    lastEvalAt: 0,
    lastEvalActiveMs: 0,
    lastSuggestedAt: 0,
    lastDismissedAt: 0,
    idle: false,
    focused: true,
    tabSwitches: [],
  };
}

/** Restore persisted state after a service-worker restart, filling defaults. */
export function hydrateMonitorState(saved, now) {
  const base = createMonitorState(now);
  if (!saved || typeof saved !== "object") return base;
  return {
    ...base,
    ...saved,
    tabSwitches: Array.isArray(saved.tabSwitches) ? saved.tabSwitches : [],
  };
}

export function setOptIn(state, value) {
  return { ...state, optIn: value === true };
}

export function recordTabSwitch(state, now) {
  const cutoff = now - DEFAULT_CONFIG.windowMs;
  const tabSwitches = [...state.tabSwitches.filter((t) => t > cutoff), now];
  return { ...state, tabSwitches };
}

export function tabSwitchesInWindow(state, now, windowMs = DEFAULT_CONFIG.windowMs) {
  const cutoff = now - windowMs;
  return state.tabSwitches.filter((t) => t > cutoff).length;
}

/**
 * Fold one sampling tick into the state. Only focused, non-idle wall-clock
 * time counts as "active browser activity". Returns the new state.
 */
export function recordSample(state, { now, idle = false, focused = true }) {
  const delta = Math.max(0, now - state.lastSampleAt);
  const active = focused === true && idle !== true;
  return {
    ...state,
    lastSampleAt: now,
    idle: idle === true,
    focused: focused === true,
    activeMs: state.activeMs + (active ? delta : 0),
  };
}

/** True when it is time to ask the backend (and the AI agent) for a verdict. */
export function shouldEvaluate(state, { now, demo = false }) {
  if (state.optIn !== true) return false;
  if (state.idle === true) return false;
  const cooldownMs = demo ? DEFAULT_CONFIG.demoCooldownMs : DEFAULT_CONFIG.cooldownMs;
  if (state.lastSuggestedAt > 0 && now - state.lastSuggestedAt < cooldownMs) return false;
  const sinceEval = state.activeMs - state.lastEvalActiveMs;
  const threshold = demo ? DEFAULT_CONFIG.demoTriggerMs : DEFAULT_CONFIG.normalIntervalMs;
  return sinceEval >= threshold;
}

/** Mark that an evaluation ran: consumes the accumulated activity window. */
export function markEvaluated(state, now) {
  return { ...state, lastEvalAt: now, lastEvalActiveMs: state.activeMs };
}

/** Mark that a suggestion was shown: starts the cooldown. */
export function markSuggested(state, now) {
  return { ...state, lastSuggestedAt: now };
}

/** Mark that the user dismissed the offer (kept for cooldown tuning/analytics). */
export function markDismissed(state, now) {
  return { ...state, lastDismissedAt: now };
}
