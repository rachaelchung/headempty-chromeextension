/**
 * Timer panel (fixed top-right; minimize/expand only). Talks to the creature lane via parent.postMessage.
 */

(function () {
  const STORAGE_DOCK_MIN = 'henn_ext_timerDockMin';

  let badUrl = false;
  let pausedForBadUrl = false;
  let wasRunningForBadUrl = false;

  function postLane(cmd, extra) {
    try {
      parent.postMessage({ source: 'henn-timer', type: 'henn-lane-cmd', cmd, ...extra }, '*');
    } catch {
      /* no-op */
    }
  }

  function emitLaneSync() {
    try {
      parent.postMessage(
        {
          source: 'henn-timer',
          type: 'henn-lane-apply-guard',
          focus: Timer.isFocus(),
          badUrl,
          isRunning: Timer.isRunning(),
        },
        '*'
      );
    } catch {
      /* no-op */
    }
  }

  function showNotif(message) {
    const n = document.getElementById('extNotif');
    if (!n) return;
    n.textContent = message;
    n.classList.add('ext-notif--show');
    setTimeout(() => n.classList.remove('ext-notif--show'), 2500);
  }

  function applyFocusGuard() {
    const focus = Timer.isFocus();
    if (!focus) {
      if (pausedForBadUrl) {
        pausedForBadUrl = false;
        if (wasRunningForBadUrl) {
          Timer.start();
          if (startBtn) {
            startBtn.textContent = 'pause';
            startBtn.classList.add('running');
          }
        }
        wasRunningForBadUrl = false;
      }
      emitLaneSync();
      return;
    }

    if (badUrl) {
      emitLaneSync();
      if (Timer.isRunning() && !pausedForBadUrl) {
        wasRunningForBadUrl = true;
        pausedForBadUrl = true;
        Timer.pause();
        if (startBtn) {
          startBtn.textContent = 'start';
          startBtn.classList.remove('running');
        }
      }
    } else {
      if (pausedForBadUrl) {
        pausedForBadUrl = false;
        if (wasRunningForBadUrl) {
          Timer.start();
          if (startBtn) {
            startBtn.textContent = 'pause';
            startBtn.classList.add('running');
          }
        }
        wasRunningForBadUrl = false;
      }
      emitLaneSync();
    }
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (d && d.source === 'henn-ext' && d.type === 'henn-lane-ready') {
      applyFocusGuard();
      return;
    }
    if (d && d.source === 'henn-ext' && d.type === 'henn-timer-forbidden-ui' && d.hidden != null) {
      const bar = document.getElementById('extForbiddenBar');
      if (bar) bar.hidden = d.hidden;
      return;
    }
    if (d && d.source === 'henn-ext' && d.type === 'henn-timer-notif' && d.message) {
      showNotif(d.message);
      return;
    }
    if (d && d.source === 'henn-ext' && d.type === 'henn-forbidden') {
      badUrl = !!d.active;
      applyFocusGuard();
    }
  });

  const timerDock = document.getElementById('timerDock');
  const startBtn = document.getElementById('startBtn');
  const timerDockShell = document.getElementById('timerDockShell');

  function applyTimerDockMinimized(dock, on, opts) {
    if (!dock) return;
    const skipStorage = opts && opts.skipStorage;
    dock.classList.toggle('timer-dock--minimized', on);
    const btn = document.getElementById('timerDockMinBtn');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '⟨' : '⟩';
      btn.setAttribute('aria-label', on ? 'Expand timer' : 'Minimize timer to a side tab');
      btn.setAttribute('title', on ? 'expand timer' : 'minimize to side tab');
    }
    if (on) {
      dock.style.left = '';
      dock.style.top = '';
      dock.style.right = '';
      dock.style.bottom = '';
    } else {
      dock.style.left = '';
      dock.style.top = '';
      dock.style.right = '';
      dock.style.bottom = '';
    }
    if (!skipStorage) {
      try {
        localStorage.setItem(STORAGE_DOCK_MIN, on ? '1' : '0');
      } catch {
        /* no-op */
      }
    }
  }

  let _boundsKey = '';

  function pushTimerToParent() {
    const d = document.getElementById('timerDock');
    if (!d) return;
    const r = d.getBoundingClientRect();
    const l = r.left;
    const t = r.top;
    const w = Math.max(r.width, d.offsetWidth || 0, d.clientWidth || 0);
    const h = Math.max(
      r.height,
      d.offsetHeight || 0,
      d.clientHeight || 0,
      d.scrollHeight || 0
    );
    const k = [l, t, w, h].join(',');
    if (k === _boundsKey) return;
    _boundsKey = k;
    try {
      parent.postMessage(
        {
          source: 'henn-timer',
          type: 'henn-timer-iframe-bounds',
          l,
          t,
          w,
          h,
          min: d.classList && d.classList.contains('timer-dock--minimized'),
        },
        '*'
      );
      parent.postMessage(
        { source: 'henn-timer', type: 'henn-burst-rect', cx: l + w / 2, cy: t + h / 2 },
        '*'
      );
    } catch {
      /* no-op */
    }
  }

  function syncBounds() {
    requestAnimationFrame(() => {
      requestAnimationFrame(pushTimerToParent);
    });
  }

  function wire() {
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (Timer.isRunning()) {
          Timer.pause();
          postLane('stopSpawning');
          pausedForBadUrl = false;
          wasRunningForBadUrl = false;
          startBtn.textContent = 'start';
          startBtn.classList.remove('running');
        } else {
          if (badUrl) {
            applyFocusGuard();
            return;
          }
          Timer.start();
          startBtn.textContent = 'pause';
          startBtn.classList.add('running');
          if (Timer.isFocus() && !badUrl) {
            postLane('startSpawning');
          }
        }
        applyFocusGuard();
      });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Timer.reset();
        postLane('stopSpawning');
        pausedForBadUrl = false;
        wasRunningForBadUrl = false;
        if (startBtn) {
          startBtn.textContent = 'start';
          startBtn.classList.remove('running');
        }
        applyFocusGuard();
      });
    }

    Timer.setCallbacks({
      onTick({ isFocus: tickFocus }) {
        if (tickFocus) postLane('onFocusTick');
      },
      onPhaseEnd({ newPhase }) {
        const name = newPhase.name;
        if (name === 'focus') {
          showNotif('back to focus! time to work.');
          if (!badUrl) {
            if (Timer.isRunning()) postLane('startSpawning');
          }
        } else if (name === 'long break') {
          showNotif('long break — you earned it!');
          postLane('stopSpawning');
        } else {
          showNotif('short break time!');
          postLane('stopSpawning');
        }
        applyFocusGuard();
      },
      onBreakWarn({ phaseName }) {
        const label = phaseName === 'long break' ? 'long break' : 'break';
        showNotif(`${label} ending soon!`);
      },
    });

    if (timerDock) {
      let startDockMin = false;
      try {
        startDockMin = localStorage.getItem(STORAGE_DOCK_MIN) === '1';
      } catch {
        startDockMin = false;
      }
      if (startDockMin) {
        applyTimerDockMinimized(timerDock, true, { skipStorage: true });
      }

      const minBtn = document.getElementById('timerDockMinBtn');
      if (minBtn) {
        minBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const next = !timerDock.classList.contains('timer-dock--minimized');
          applyTimerDockMinimized(timerDock, next);
        });
      }
      if (timerDockShell) {
        timerDockShell.addEventListener('click', (e) => {
          if (!timerDock.classList.contains('timer-dock--minimized')) return;
          if (e.target.closest && e.target.closest('.timer-dock__pin-btn')) return;
          applyTimerDockMinimized(timerDock, false);
        });
      }
    }
  }

  (function init() {
    const dock = document.getElementById('timerDock');
    if (typeof ResizeObserver !== 'undefined' && dock) {
      const ro = new ResizeObserver(() => {
        pushTimerToParent();
      });
      ro.observe(dock);
    } else {
      (function raf() {
        pushTimerToParent();
        requestAnimationFrame(raf);
      })();
    }
    window.addEventListener('resize', () => {
      _boundsKey = '';
      syncBounds();
    });
    wire();
    applyFocusGuard();
    syncBounds();
  })();
})();
