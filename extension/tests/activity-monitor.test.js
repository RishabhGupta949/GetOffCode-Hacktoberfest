/**
 * Pure logic tests for the activity monitor: opt-in, aggregation, the
 * 15-second demo trigger, normal-mode intervals, cooldowns, idle/focus
 * behavior, tab-switch windows, and service-worker restart rehydration.
 *
 * Run: node --test extension/tests/
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CONFIG,
  createMonitorState,
  recordSample,
  recordTabSwitch,
  tabSwitchesInWindow,
  shouldEvaluate,
  markEvaluated,
  markSuggested,
} from "../activity-monitor.js";

const T0 = 1_800_000_000_000; // fixed epoch ms for determinism

function optedIn(now = T0) {
  return { ...createMonitorState(now), optIn: true };
}

/** Feed `seconds` of active, focused samples, one per second. */
function feedActive(state, seconds, { idle = false, focused = true } = {}) {
  let s = state;
  for (let i = 0; i < seconds; i++) {
    s = recordSample(s, { now: s.lastSampleAt + 1000, idle, focused });
  }
  return s;
}

test("evaluation requires opt-in even when the demo trigger would fire", () => {
  const s = feedActive(createMonitorState(T0), 20);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), false);
});

test("demo trigger fires once after 15s of active activity, not before", () => {
  let s = feedActive(optedIn(), 14);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), false);
  s = feedActive(s, 1);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), true);
  // Evaluating once consumes the window: no duplicate until more activity.
  s = markEvaluated(s, s.lastSampleAt);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), false);
  s = feedActive(s, 15);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), true);
});

test("normal mode uses the activity interval, not the 15s demo trigger", () => {
  let s = feedActive(optedIn(), 15);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: false }), false);
  s = feedActive(s, 60 * 4); // 4 more minutes: still under the 5-minute interval
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: false }), false);
  s = feedActive(s, 60); // crosses 5 minutes of accumulated activity
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: false }), true);
});

test("cooldown after a suggestion blocks re-evaluation until it elapses (demo)", () => {
  let s = feedActive(optedIn(), 15);
  s = markSuggested(s, s.lastSampleAt);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), false);
  // Still inside the cooldown 59s later.
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt + 59_000, demo: true }), false);
  // Cooldown elapsed.
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt + 61_000, demo: true }), true);
});

test("normal-mode cooldown is 30 minutes", () => {
  let s = feedActive(optedIn(), 60 * 5);
  s = markSuggested(s, s.lastSampleAt);
  const after = s.lastSampleAt + 29 * 60_000;
  assert.equal(shouldEvaluate(s, { now: after, demo: false }), false);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt + 31 * 60_000, demo: false }), true);
});

test("idle periods accumulate no active time and never trigger", () => {
  const s = feedActive(optedIn(), 30, { idle: true });
  assert.equal(s.activeMs, 0);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), false);
});

test("unfocused browser time accumulates no active time", () => {
  const s = feedActive(optedIn(), 30, { focused: false });
  assert.equal(s.activeMs, 0);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), false);
});

test("only active, focused, non-idle intervals count", () => {
  let s = feedActive(optedIn(), 10);
  s = feedActive(s, 10, { idle: true });
  s = feedActive(s, 10, { focused: false });
  assert.equal(s.activeMs, 10_000);
  s = feedActive(s, 5);
  assert.equal(s.activeMs, 15_000);
  assert.equal(shouldEvaluate(s, { now: s.lastSampleAt, demo: true }), true);
});

test("tab switches are counted inside the 5-minute window and pruned outside it", () => {
  let s = createMonitorState(T0);
  s = recordTabSwitch(s, T0 + 1000);
  s = recordTabSwitch(s, T0 + 2000);
  s = recordTabSwitch(s, T0 + 3000);
  assert.equal(tabSwitchesInWindow(s, T0 + 4000, DEFAULT_CONFIG.windowMs), 3);
  // Entries older than the window drop out.
  assert.equal(tabSwitchesInWindow(s, T0 + 10 * 60_000, DEFAULT_CONFIG.windowMs), 0);
});

test("state survives a service-worker restart through JSON round-trip", () => {
  let s = feedActive(optedIn(), 10);
  s = recordTabSwitch(s, T0 + 9000);
  s = markSuggested(s, T0 + 10_000);

  // Service worker restarted: state rehydrated from chrome.storage.local.
  const restored = { ...createMonitorState(T0), ...JSON.parse(JSON.stringify(s)) };
  assert.equal(restored.optIn, true);
  assert.equal(restored.activeMs, 10_000);

  // Cooldown from before the restart is still honored.
  assert.equal(shouldEvaluate(restored, { now: T0 + 11_000, demo: false }), false);
  // And activity accumulated before the restart still counts toward the
  // trigger once the demo cooldown has elapsed.
  const more = feedActive(restored, 5);
  assert.equal(more.activeMs, 15_000);
  assert.equal(shouldEvaluate(more, { now: more.lastSampleAt + 61_000, demo: true }), true);
});
