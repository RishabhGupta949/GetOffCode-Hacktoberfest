/**
 * TouchGrass - Break Overlay Content Script
 * Injects a full-screen, non-modal overlay during BREAK_ACTIVE state.
 * Shows break timer with circular progress indicator. No technical content allowed.
 */

let overlay = null;
let animationFrameId = null;
let currentBreakId = null;
let breakEndsAt = null;
let breakDuration = null;

const SVG_NS = "http://www.w3.org/2000/svg";
const CIRCLE_RADIUS = 120;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const STROKE_WIDTH = 10;

function createOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "tg-break-overlay";
  overlay.style.cssText = `
    position: fixed !important;
    top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important;
    z-index: 2147483647 !important;
    background: linear-gradient(180deg, #87ceeb 0%, #b3e0f2 30%, #a8d8a8 65%, #5a9e4f 85%, #3d7a35 100%) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    font-family: system-ui, -apple-system, sans-serif !important;
    color: #1a3d1a !important;
    pointer-events: auto !important;
    overflow: hidden !important;
  `;

  // Sunlight glow (top right)
  const sun = document.createElement("div");
  sun.style.cssText = `
    position: absolute !important;
    top: -80px !important; right: -80px !important;
    width: 320px !important; height: 320px !important;
    background: radial-gradient(circle, rgba(255,255,200,0.9) 0%, rgba(255,255,150,0.5) 30%, transparent 70%) !important;
    border-radius: 50% !important;
    animation: tg-sun-pulse 8s ease-in-out infinite !important;
    pointer-events: none !important;
  `;
  overlay.appendChild(sun);

  // Floating soft particles (pollen/light specks)
  const particles = document.createElement("div");
  particles.style.cssText = `
    position: absolute !important; inset: 0 !important;
    overflow: hidden !important; pointer-events: none !important;
  `;
  for (let i = 0; i < 14; i++) {
    const p = document.createElement("div");
    const size = 4 + Math.random() * 8;
    p.style.cssText = `
      position: absolute !important;
      width: ${size}px !important; height: ${size}px !important;
      border-radius: 50% !important;
      background: rgba(255, 255, 220, ${0.3 + Math.random() * 0.4}) !important;
      left: ${Math.random() * 100}% !important;
      top: ${Math.random() * 100}% !important;
      animation: tg-drift ${18 + Math.random() * 25}s linear infinite !important;
      animation-delay: -${Math.random() * 25}s !important;
    `;
    particles.appendChild(p);
  }
  overlay.appendChild(particles);

  // Rolling hills (background)
  const hills = document.createElement("div");
  hills.style.cssText = `
    position: absolute !important;
    bottom: 0 !important; left: 0 !important; right: 0 !important;
    height: 38vh !important;
    pointer-events: none !important;
    overflow: hidden !important;
  `;
  hills.innerHTML = `
    <svg viewBox="0 0 1440 320" preserveAspectRatio="none" style="position:absolute;bottom:0;left:0;width:100%;height:100%;">
      <path d="M0,220 C240,160 480,260 720,200 C960,140 1200,220 1440,180 L1440,320 L0,320 Z" fill="#4a9e3f" opacity="0.6"/>
      <path d="M0,260 C300,210 600,290 900,240 C1100,210 1300,270 1440,250 L1440,320 L0,320 Z" fill="#3d8a35" opacity="0.8"/>
      <path d="M0,290 C360,260 720,310 1080,280 C1260,265 1380,295 1440,290 L1440,320 L0,320 Z" fill="#2e6b28"/>
    </svg>
  `;
  overlay.appendChild(hills);

  // Grass blades along the bottom (swaying)
  const grass = document.createElement("div");
  grass.style.cssText = `
    position: absolute !important;
    bottom: 0 !important; left: 0 !important; right: 0 !important;
    height: 14vh !important;
    pointer-events: none !important;
    overflow: hidden !important;
  `;
  const blades = 40;
  let grassSvg = `<svg viewBox="0 0 1440 160" preserveAspectRatio="none" style="position:absolute;bottom:0;left:0;width:100%;height:100%;">`;
  for (let i = 0; i < blades; i++) {
    const x = (i / blades) * 1440 + (Math.random() * 20 - 10);
    const h = 50 + Math.random() * 70;
    const sway = 6 + Math.random() * 8;
    const dur = 3 + Math.random() * 3;
    const delay = Math.random() * 3;
    const shade = ["#3d8a35", "#4a9e3f", "#5cb84e", "#2e6b28"][Math.floor(Math.random() * 4)];
    grassSvg += `
      <g style="transform-origin:${x}px 160px; animation: tg-sway ${dur}s ease-in-out ${delay}s infinite alternate;">
        <path d="M${x},160 Q${x + sway / 2},${160 - h / 2} ${x + sway},${160 - h}" stroke="${shade}" stroke-width="${3 + Math.random() * 3}" fill="none" stroke-linecap="round"/>
      </g>
    `;
  }
  grassSvg += `</svg>`;
  grass.innerHTML = grassSvg;
  overlay.appendChild(grass);

  // Person walking toward / touching grass (centered above content, lightweight SVG)
  const person = document.createElement("div");
  person.className = "tg-break-person";
  person.style.cssText = `
    position: relative !important;
    width: 160px !important;
    height: 140px !important;
    margin-bottom: 8px !important;
    animation: tg-walk-bob 2.4s ease-in-out infinite !important;
    pointer-events: none !important;
    z-index: 2 !important;
  `;
  person.innerHTML = `
    <svg viewBox="0 0 160 140" width="160" height="140" xmlns="http://www.w3.org/2000/svg">
      <!-- shadow -->
      <ellipse cx="80" cy="132" rx="34" ry="7" fill="rgba(0,0,0,0.18)"/>
      <!-- legs (walking) -->
      <g style="transform-origin:74px 92px; animation: tg-leg-front 2.4s ease-in-out infinite;">
        <path d="M74,92 L64,122 L58,130" stroke="#2d4a7a" stroke-width="8" fill="none" stroke-linecap="round"/>
      </g>
      <g style="transform-origin:86px 92px; animation: tg-leg-back 2.4s ease-in-out infinite;">
        <path d="M86,92 L96,122 L102,130" stroke="#243c66" stroke-width="8" fill="none" stroke-linecap="round"/>
      </g>
      <!-- torso -->
      <path d="M68,50 Q80,46 92,50 L94,94 Q80,98 66,94 Z" fill="#e07a3f"/>
      <!-- arm reaching down to touch grass -->
      <g style="transform-origin:70px 58px; animation: tg-arm-reach 2.4s ease-in-out infinite;">
        <path d="M70,58 L52,86 L48,104" stroke="#f0c8a0" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="47" cy="107" r="5" fill="#f0c8a0"/>
      </g>
      <!-- other arm swinging -->
      <g style="transform-origin:92px 58px; animation: tg-arm-swing 2.4s ease-in-out infinite;">
        <path d="M92,58 L104,84 L108,100" stroke="#f0c8a0" stroke-width="7" fill="none" stroke-linecap="round"/>
        <circle cx="109" cy="103" r="5" fill="#f0c8a0"/>
      </g>
      <!-- head -->
      <circle cx="80" cy="34" r="17" fill="#f0c8a0"/>
      <!-- hair -->
      <path d="M63,30 Q66,14 80,14 Q94,14 97,30 Q92,22 80,22 Q68,22 63,30" fill="#3d2b1f"/>
      <!-- small leaf in hand (touching grass) -->
      <g style="transform-origin:47px 107px; animation: tg-leaf 2.4s ease-in-out infinite;">
        <path d="M47,107 Q36,100 32,90 Q44,92 47,107" fill="#4a9e3f"/>
        <path d="M47,107 Q42,98 38,92" stroke="#2e6b28" stroke-width="1.5" fill="none"/>
      </g>
    </svg>
  `;
  overlay.appendChild(person);

  // Content card
  const card = document.createElement("div");
  card.style.cssText = `
    position: relative !important;
    background: rgba(255, 255, 255, 0.82) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    border: 1px solid rgba(255, 255, 255, 0.6) !important;
    border-radius: 24px !important;
    padding: 36px 56px 40px !important;
    text-align: center !important;
    max-width: 92vw !important;
    box-shadow: 0 24px 60px -16px rgba(20, 60, 20, 0.35) !important;
    z-index: 3 !important;
  `;

  const title = document.createElement("h1");
  title.id = "tg-break-title";
  title.style.cssText = `
    margin: 0 0 4px !important;
    font-size: 24px !important;
    font-weight: 700 !important;
    line-height: 1.3 !important;
    color: #1a4d1a !important;
  `;
  card.appendChild(title);

  const type = document.createElement("div");
  type.id = "tg-break-type";
  type.style.cssText = `
    font-size: 13px !important;
    color: #4a7a45 !important;
    margin-bottom: 20px !important;
    text-transform: capitalize !important;
    letter-spacing: 0.5px !important;
  `;
  card.appendChild(type);

  // Timer container with circular progress
  const timerContainer = document.createElement("div");
  timerContainer.id = "tg-timer-container";
  timerContainer.style.cssText = `
    position: relative !important;
    width: ${CIRCLE_RADIUS * 2 + STROKE_WIDTH}px !important;
    height: ${CIRCLE_RADIUS * 2 + STROKE_WIDTH}px !important;
    margin: 0 auto 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  `;

  // SVG for circular progress
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", CIRCLE_RADIUS * 2 + STROKE_WIDTH);
  svg.setAttribute("height", CIRCLE_RADIUS * 2 + STROKE_WIDTH);
  svg.style.cssText = `
    transform: rotate(-90deg) !important;
    overflow: visible !important;
    filter: drop-shadow(0 4px 12px rgba(30, 80, 30, 0.2)) !important;
  `;

  // Background circle (track)
  const bgCircle = document.createElementNS(SVG_NS, "circle");
  bgCircle.setAttribute("cx", CIRCLE_RADIUS + STROKE_WIDTH / 2);
  bgCircle.setAttribute("cy", CIRCLE_RADIUS + STROKE_WIDTH / 2);
  bgCircle.setAttribute("r", CIRCLE_RADIUS);
  bgCircle.setAttribute("fill", "none");
  bgCircle.setAttribute("stroke", "rgba(45, 100, 45, 0.15)");
  bgCircle.setAttribute("stroke-width", STROKE_WIDTH);
  svg.appendChild(bgCircle);

  // Progress circle (foreground)
  const progressCircle = document.createElementNS(SVG_NS, "circle");
  progressCircle.id = "tg-progress-circle";
  progressCircle.setAttribute("cx", CIRCLE_RADIUS + STROKE_WIDTH / 2);
  progressCircle.setAttribute("cy", CIRCLE_RADIUS + STROKE_WIDTH / 2);
  progressCircle.setAttribute("r", CIRCLE_RADIUS);
  progressCircle.setAttribute("fill", "none");
  progressCircle.setAttribute("stroke", "#3d8a35");
  progressCircle.setAttribute("stroke-width", STROKE_WIDTH);
  progressCircle.setAttribute("stroke-linecap", "round");
  progressCircle.setAttribute("stroke-dasharray", CIRCLE_CIRCUMFERENCE);
  progressCircle.setAttribute("stroke-dashoffset", 0);
  progressCircle.style.cssText = `
    transition: stroke-dashoffset 0.5s linear, stroke 0.3s ease !important;
    filter: drop-shadow(0 0 6px rgba(61, 138, 53, 0.55)) !important;
  `;
  svg.appendChild(progressCircle);

  timerContainer.appendChild(svg);

  // Timer text in center of circle
  const timerText = document.createElement("div");
  timerText.id = "tg-break-timer";
  timerText.style.cssText = `
    position: absolute !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    font-size: 56px !important;
    font-weight: 800 !important;
    font-variant-numeric: tabular-nums !important;
    color: #1a4d1a !important;
    font-family: ui-monospace, SFMono-Regular, monospace !important;
    letter-spacing: -1px !important;
    text-shadow: 0 0 24px rgba(61, 138, 53, 0.35) !important;
  `;
  timerText.textContent = "00:00";
  timerContainer.appendChild(timerText);

  // small label under time inside ring
  const timerLabel = document.createElement("div");
  timerLabel.style.cssText = `
    position: absolute !important;
    top: calc(50% + 34px) !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 2px !important;
    text-transform: uppercase !important;
    color: #4a7a45 !important;
  `;
  timerLabel.textContent = "remaining";
  timerContainer.appendChild(timerLabel);

  card.appendChild(timerContainer);

  const msg = document.createElement("p");
  msg.style.cssText = `
    margin: 0 0 24px !important;
    font-size: 16px !important;
    color: #2e5e2a !important;
    max-width: 380px !important;
    line-height: 1.6 !important;
    font-weight: 500 !important;
  `;
  msg.textContent = "Your brain is outside now. 🌿 Nothing to debug right now.";
  card.appendChild(msg);

  const backBtn = document.createElement("button");
  backBtn.id = "tg-back-btn";
  backBtn.textContent = "I'm Back";
  backBtn.style.cssText = `
    padding: 14px 40px !important;
    font-size: 16px !important;
    font-weight: 700 !important;
    background: #2e6b28 !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 999px !important;
    cursor: pointer !important;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s !important;
    box-shadow: 0 6px 18px -6px rgba(46, 107, 40, 0.6) !important;
    letter-spacing: 0.3px !important;
  `;
  backBtn.onmouseenter = () => {
    backBtn.style.background = "#245a20";
    backBtn.style.transform = "translateY(-1px)";
  };
  backBtn.onmouseleave = () => {
    backBtn.style.background = "#2e6b28";
    backBtn.style.transform = "translateY(0)";
  };
  card.appendChild(backBtn);

  overlay.appendChild(card);

  // Keyframes
  const style = document.createElement("style");
  style.textContent = `
    @keyframes tg-drift {
      0% { transform: translateY(0) translateX(0); opacity: 0; }
      8% { opacity: 1; }
      92% { opacity: 1; }
      100% { transform: translateY(-100vh) translateX(30px); opacity: 0; }
    }
    @keyframes tg-sway {
      0% { transform: rotate(-3deg); }
      100% { transform: rotate(3deg); }
    }
    @keyframes tg-sun-pulse {
      0%, 100% { transform: scale(1); opacity: 0.9; }
      50% { transform: scale(1.08); opacity: 1; }
    }
    @keyframes tg-walk-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    @keyframes tg-leg-front {
      0%, 100% { transform: rotate(-14deg); }
      50% { transform: rotate(14deg); }
    }
    @keyframes tg-leg-back {
      0%, 100% { transform: rotate(14deg); }
      50% { transform: rotate(-14deg); }
    }
    @keyframes tg-arm-swing {
      0%, 100% { transform: rotate(12deg); }
      50% { transform: rotate(-12deg); }
    }
    @keyframes tg-arm-reach {
      0%, 100% { transform: rotate(0deg); }
      50% { transform: rotate(4deg); }
    }
    @keyframes tg-leaf {
      0%, 100% { transform: rotate(-6deg); }
      50% { transform: rotate(6deg); }
    }
    @media (max-height: 700px) {
      #tg-timer-container { transform: scale(0.8); }
      .tg-break-person { display: none; }
    }
  `;
  overlay.appendChild(style);

  document.documentElement.appendChild(overlay);
  return overlay;
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  breakEndsAt = null;
  breakDuration = null;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function updateTimer() {
  if (!breakEndsAt) return;

  const timerEl = document.getElementById("tg-break-timer");
  const progressCircle = document.getElementById("tg-progress-circle");
  if (!timerEl || !progressCircle) return;

  const now = Date.now();
  const remainingMs = breakEndsAt - now;
  const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

  // Update timer text
  timerEl.textContent = formatTime(remainingSec);

  // Update circular progress
  if (breakDuration && breakDuration > 0) {
    const progress = Math.max(0, Math.min(1, remainingMs / breakDuration));
    const offset = CIRCLE_CIRCUMFERENCE * (1 - progress);
    progressCircle.setAttribute("stroke-dashoffset", offset);

    // Change color as time runs low
    if (remainingSec <= 10) {
      progressCircle.setAttribute("stroke", "#d97706");
      progressCircle.style.filter = "drop-shadow(0 0 8px rgba(217, 119, 6, 0.55))";
      timerEl.style.color = "#92400e";
      timerEl.style.textShadow = "0 0 20px rgba(217, 119, 6, 0.45)";
    } else if (remainingSec <= 30) {
      progressCircle.setAttribute("stroke", "#65a30d");
      progressCircle.style.filter = "drop-shadow(0 0 8px rgba(101, 163, 13, 0.55))";
      timerEl.style.color = "#3f6212";
      timerEl.style.textShadow = "0 0 20px rgba(101, 163, 13, 0.45)";
    } else {
      progressCircle.setAttribute("stroke", "#3d8a35");
      progressCircle.style.filter = "drop-shadow(0 0 8px rgba(61, 138, 53, 0.55))";
      timerEl.style.color = "#1a4d1a";
      timerEl.style.textShadow = "0 0 24px rgba(61, 138, 53, 0.35)";
    }
  }

  // Continue animation if time remains
  if (remainingSec > 0) {
    animationFrameId = requestAnimationFrame(updateTimer);
  } else {
    // Time's up - background will handle state transition
    // Overlay stays until state changes
    animationFrameId = null;
  }
}

function showBreak(breakData) {
  const o = createOverlay();
  document.getElementById("tg-break-title").textContent = breakData.title || "Take a Break";
  document.getElementById("tg-break-type").textContent = breakData.type?.replace("_", " ") || "";

  // Store break timing for authoritative countdown
  breakEndsAt = breakData.ends_at * 1000; // Convert to ms
  breakDuration = breakData.duration_sec * 1000; // Convert to ms
  currentBreakId = breakData.break_id;

  // Initialize timer display immediately to avoid flash
  const timerEl = document.getElementById("tg-break-timer");
  const progressCircle = document.getElementById("tg-progress-circle");
  if (timerEl && progressCircle && breakDuration > 0) {
    const totalSec = Math.ceil(breakDuration / 1000);
    timerEl.textContent = formatTime(totalSec);
    progressCircle.setAttribute("stroke-dashoffset", 0);
  }

  // Start smooth animation loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  updateTimer();
}

async function handleBackClick() {
  // Notify background we're back early
  try {
    await chrome.runtime.sendMessage({ type: "BREAK_END_EARLY" });
  } catch {}
  // The background will handle state transition and remove overlay via storage listener
}

// Listen for break state from background via storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.tg_break) {
    const breakData = changes.tg_break.newValue;
    if (breakData) {
      showBreak(breakData);
    } else {
      removeOverlay();
    }
  }

  if (changes.tg_state) {
    const state = changes.tg_state.newValue;
    if (state !== "BREAK_ACTIVE") {
      removeOverlay();
    }
  }
});

// Initialize: check current break state
chrome.storage.local.get(["tg_break", "tg_state"], (data) => {
  if (data.tg_break && data.tg_state === "BREAK_ACTIVE") {
    showBreak(data.tg_break);
  }
});

// Button handler
document.addEventListener("click", (e) => {
  if (e.target.id === "tg-back-btn") {
    handleBackClick();
  }
});

console.log("TouchGrass break overlay loaded");
