/**
 * timer.js
 * Manages the pomodoro phase cycle, countdown, and UI ring/badge updates.
 * Fires callbacks so game.js can react without coupling.
 */

const PHASES = [
  { name: 'focus',      duration: 25 * 60, badgeClass: '',           ringColor: '#ff6b4a' },
  { name: 'break',      duration:  5 * 60, badgeClass: 'break',      ringColor: '#5ad18b' },
  { name: 'focus',      duration: 25 * 60, badgeClass: '',           ringColor: '#ff6b4a' },
  { name: 'break',      duration:  5 * 60, badgeClass: 'break',      ringColor: '#5ad18b' },
  { name: 'focus',      duration: 25 * 60, badgeClass: '',           ringColor: '#ff6b4a' },
  { name: 'break',      duration:  5 * 60, badgeClass: 'break',      ringColor: '#5ad18b' },
  { name: 'focus',      duration: 25 * 60, badgeClass: '',           ringColor: '#ff6b4a' },
  { name: 'long break', duration: 15 * 60, badgeClass: 'long-break', ringColor: '#4ec6e6' },
];

const RING_CIRCUMFERENCE = 2 * Math.PI * 50; // r=50 in the SVG

const Timer = (() => {
  let phaseIndex = 0;
  let timeLeft   = PHASES[0].duration;
  let running    = false;
  let interval   = null;

  // callbacks — assigned by main.js
  let onTick       = () => {};  // called every second while running & not forbidden
  let onPhaseEnd   = () => {};  // called when a phase completes
  let onBreakWarn  = () => {};  // called at 60 s remaining in a break

  /* ── public API ─────────────────────────────── */

  function start() {
    if (running) return;
    running = true;
    interval = setInterval(_tick, 1000);
    _updateUI();
  }

  function pause() {
    if (!running) return;
    running = false;
    clearInterval(interval);
    interval = null;
  }

  function reset() {
    pause();
    phaseIndex = 0;
    timeLeft   = PHASES[0].duration;
    _updateUI();
  }

  function isRunning()  { return running; }
  function isFocus()    { return PHASES[phaseIndex].name === 'focus'; }
  function isBreak()    { return !isFocus(); }
  function phaseName()  { return PHASES[phaseIndex].name; }

  function setCallbacks(callbacks) {
    if (callbacks.onTick)      onTick      = callbacks.onTick;
    if (callbacks.onPhaseEnd)  onPhaseEnd  = callbacks.onPhaseEnd;
    if (callbacks.onBreakWarn) onBreakWarn = callbacks.onBreakWarn;
  }

  /* ── private ─────────────────────────────────── */

  function _tick() {
    try {
      onTick({ phaseName: phaseName(), isFocus: isFocus() });
    } catch (e) {
      console.error('[ext timer] onTick', e);
    }

    timeLeft--;

    if (timeLeft <= 0) {
      _nextPhase();
      return;
    }

    if (timeLeft === 60 && isBreak()) {
      onBreakWarn({ phaseName: phaseName() });
    }

    _updateUI();
  }

  function _nextPhase() {
    const completedPhase = PHASES[phaseIndex];
    phaseIndex = (phaseIndex + 1) % PHASES.length;
    timeLeft   = PHASES[phaseIndex].duration;
    onPhaseEnd({ completedPhase, newPhase: PHASES[phaseIndex] });
    _updateUI();
  }

  function _updateUI() {
    const phase    = PHASES[phaseIndex];
    const progress = 1 - (timeLeft / phase.duration);

    // time display
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    document.getElementById('timerDisplay').textContent =
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    // ring
    const ring = document.getElementById('progressRing');
    ring.style.strokeDashoffset = RING_CIRCUMFERENCE * progress;
    ring.style.stroke = phase.ringColor;

    // phase badge
    const badge = document.getElementById('phaseBadge');
    badge.className = 'phase-badge ' + phase.badgeClass;
    badge.textContent = phase.name;

    // session dots  (focus sessions are at indices 0,2,4,6)
    const focusSessionIndex = Math.floor(phaseIndex / 2);
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById('sd' + i);
      if (i < focusSessionIndex) {
        dot.className = 'session-dot done';
      } else if (i === focusSessionIndex && isFocus()) {
        dot.className = 'session-dot active';
      } else {
        dot.className = 'session-dot';
      }
    }
  }

  return { start, pause, reset, isRunning, isFocus, isBreak, phaseName, setCallbacks };
})();
