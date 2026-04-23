/**
 * Wires Timer + ExtGame, drag/minimize, and focus-guard messages from the content script.
 */

(function () {
  const STORAGE_DOCK_MIN = 'henn_ext_timerDockMin';
  const STORAGE_DOCK_POS = 'henn_ext_timerDockPos';

  let badUrl = false;
  let pausedForBadUrl = false;
  let wasRunningForBadUrl = false;

  function applyFocusGuard() {
    const focus = Timer.isFocus();
    if (!focus) {
      if (ExtGame.isForbidden()) ExtGame.setForbidden(false);
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
      return;
    }

    if (badUrl) {
      ExtGame.setForbidden(true);
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
      ExtGame.setForbidden(false);
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
      /* setForbidden(true) clears the queue; re-arm if the timer is running in focus. */
      if (Timer.isRunning() && Timer.isFocus()) {
        ExtGame.ensureSpawning();
      }
    }
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || d.source !== 'henn-ext' || d.type !== 'henn-forbidden') return;
    badUrl = !!d.active;
    applyFocusGuard();
  });

  const timerDock = document.getElementById('timerDock');
  const startBtn = document.getElementById('startBtn');
  const timerDockShell = document.getElementById('timerDockShell');

  function readSavedDockPos() {
    try {
      const raw = localStorage.getItem(STORAGE_DOCK_POS);
      if (!raw) return null;
      const { l, t } = JSON.parse(raw);
      if (typeof l !== 'number' || typeof t !== 'number' || Number.isNaN(l) || Number.isNaN(t)) {
        return null;
      }
      return { l, t };
    } catch {
      return null;
    }
  }

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
      const saved = readSavedDockPos();
      if (saved) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => layoutDock(saved.l, saved.t, dock));
        });
      }
    }
    if (!skipStorage) {
      try {
        localStorage.setItem(STORAGE_DOCK_MIN, on ? '1' : '0');
      } catch {
        /* no-op */
      }
    }
  }

  const margin = 8;

  function savePos(l, t) {
    try {
      localStorage.setItem(STORAGE_DOCK_POS, JSON.stringify({ l: Math.round(l), t: Math.round(t) }));
    } catch {
      /* no-op */
    }
  }

  function layoutDock(left, top, dock) {
    const w = dock.offsetWidth;
    const h = dock.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!w || !h) {
      dock.style.left = `${Math.round(left)}px`;
      dock.style.top = `${Math.round(top)}px`;
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
      return { l: left, t: top };
    }
    const maxL = Math.max(margin, vw - w - margin);
    const maxT = Math.max(margin, vh - h - margin);
    const cl = Math.min(Math.max(margin, left), maxL);
    const ct = Math.min(Math.max(margin, top), maxT);
    dock.style.left = `${Math.round(cl)}px`;
    dock.style.top = `${Math.round(ct)}px`;
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';
    return { l: cl, t: ct };
  }

  function initTimerDockDrag(dock) {
    const handle = document.getElementById('timerDockHandle');
    if (!handle) return;

    const saved = readSavedDockPos();
    if (saved) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => layoutDock(saved.l, saved.t, dock));
      });
    }

    function clampFromResize() {
      if (dock.classList.contains('timer-dock--minimized')) return;
      if (dock.style.left === '') return;
      const l = parseFloat(dock.style.left);
      const t = parseFloat(dock.style.top);
      if (Number.isNaN(l) || Number.isNaN(t)) return;
      layoutDock(l, t, dock);
    }

    window.addEventListener('resize', () => {
      requestAnimationFrame(clampFromResize);
    });

    let drag = null;

    handle.addEventListener('pointerdown', (e) => {
      if (e.target.closest && e.target.closest('.timer-dock__pin-btn')) return;
      if (dock.classList.contains('timer-dock--minimized')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const r = dock.getBoundingClientRect();
      drag = {
        id: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        l0: r.left,
        t0: r.top,
      };
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* no-op */
      }
      dock.classList.add('timer-dock--dragging');
      document.body.classList.add('is-timer-dragging');
      e.preventDefault();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0;
      const dy = e.clientY - drag.y0;
      layoutDock(drag.l0 + dx, drag.t0 + dy, dock);
    });

    function endDrag(e) {
      if (!drag) return;
      if (e && typeof e.pointerId === 'number' && e.pointerId !== drag.id) return;
      const pid = drag.id;
      try {
        handle.releasePointerCapture(pid);
      } catch {
        /* no-op */
      }
      const l = parseFloat(dock.style.left);
      const t = parseFloat(dock.style.top);
      if (!Number.isNaN(l) && !Number.isNaN(t)) savePos(l, t);
      dock.classList.remove('timer-dock--dragging');
      document.body.classList.remove('is-timer-dragging');
      drag = null;
    }

    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  }

  function wire() {
    ExtGame.initEconomy();
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (Timer.isRunning()) {
          Timer.pause();
          ExtGame.stopSpawning();
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
          if (Timer.isFocus() && !ExtGame.isForbidden()) {
            ExtGame.startSpawning();
          }
        }
        applyFocusGuard();
      });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        Timer.reset();
        ExtGame.stopSpawning();
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
      onTick({ isFocus }) {
        if (isFocus) ExtGame.onFocusTick();
      },
      onPhaseEnd({ newPhase }) {
        const name = newPhase.name;
        if (name === 'focus') {
          ExtGame.showNotif('back to focus! time to work.');
          if (!ExtGame.isForbidden()) {
            if (Timer.isRunning()) ExtGame.startSpawning();
          }
        } else if (name === 'long break') {
          ExtGame.showNotif('long break — you earned it!');
          ExtGame.stopSpawning();
        } else {
          ExtGame.showNotif('short break time!');
          ExtGame.stopSpawning();
        }
        applyFocusGuard();
      },
      onBreakWarn({ phaseName }) {
        const label = phaseName === 'long break' ? 'long break' : 'break';
        ExtGame.showNotif(`${label} ending soon!`);
      },
    });

    if (timerDock) {
      let startDockMin = false;
      try {
        startDockMin = localStorage.getItem(STORAGE_DOCK_MIN) === '1';
      } catch {
        startDockMin = false;
      }
      initTimerDockDrag(timerDock);
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

  /* Like the split `timer.html` path: wire the timer immediately. The lane there loaded
   * creatures async; the unified shell used to `await` first and could delay the timer. */
  (function init() {
    const dataUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL('data/creatures.json')
      : 'data/creatures.json';
    wire();
    applyFocusGuard();
    void loadCreatureCatalog(dataUrl).then(() => {
      if (Timer.isRunning() && Timer.isFocus() && !ExtGame.isForbidden()) {
        ExtGame.startSpawning();
      }
    });
  })();
})();
