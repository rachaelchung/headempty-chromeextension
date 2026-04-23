/**
 * Extension variant: bottom creature lane + local economy; no Home / tracker hooks.
 * Spawns into #extCreatureLane; forbidden UI is #extForbiddenBar.
 */

const ExtGame = (() => {
  const IS_LANE = typeof window !== 'undefined' && window.name === 'henn-lane';

  let food = 0;
  let coins = 0;
  let caught = 0;
  let foodAccumulator = 0;

  let spawnTimeout = null;
  let forbidden = false;

  const ECONOMY_STORAGE_KEY = 'henn_ext_game_economy_v1';
  let _economySaveTimer = null;

  function _scheduleEconomySave() {
    if (_economySaveTimer) clearTimeout(_economySaveTimer);
    _economySaveTimer = setTimeout(() => {
      _economySaveTimer = null;
      try {
        localStorage.setItem(
          ECONOMY_STORAGE_KEY,
          JSON.stringify({ food, coins, caught, foodAccumulator })
        );
      } catch {
        /* no-op */
      }
    }, 320);
  }

  function onFocusTick() {
    foodAccumulator++;
    if (foodAccumulator % 10 === 0) {
      food++;
      _scheduleEconomySave();
    }
  }

  function _burstPointForCatch() {
    if (IS_LANE && window._hennBurstFromTimer) {
      const p = window._hennBurstFromTimer;
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        const w = window.innerWidth || 400;
        const h = window.innerHeight || 72;
        return {
          x: Math.min(Math.max(p.x, 8), w - 8),
          y: Math.min(Math.max(p.y, 8), h - 8),
        };
      }
    }
    const el = document.getElementById('timerDock');
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 2) {
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
    }
    return { x: window.innerWidth / 2, y: Math.min(window.innerHeight * 0.2, 160) };
  }

  function spawnRewardBurst(clientX, clientY, text, variant = 'catch') {
    const el = document.createElement('div');
    el.setAttribute('role', 'presentation');
    el.className = `ext-reward-burst ext-reward-burst--${variant}`;
    el.textContent = text;
    el.style.left = `${Math.round(clientX)}px`;
    el.style.top = `${Math.round(clientY)}px`;
    document.body.appendChild(el);
    const done = () => {
      if (el.parentNode) el.parentNode.removeChild(el);
    };
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 980);
  }

  function setForbidden(isForbidden) {
    forbidden = isForbidden;
    const bar = document.getElementById('extForbiddenBar');
    if (bar) {
      bar.hidden = !forbidden;
    } else if (IS_LANE && parent !== window) {
      try {
        parent.postMessage(
          { source: 'henn-lane', type: 'henn-timer-forbidden-ui', hidden: !forbidden },
          '*'
        );
      } catch {
        /* no-op */
      }
    }
    if (forbidden) {
      _clearSpawnQueue();
      _removeAllCreatures();
    }
  }

  function isForbidden() {
    return forbidden;
  }

  function startSpawning() {
    if (forbidden) return;
    _scheduleNextSpawn();
  }

  /** Re-arm a spawn if the queue is empty; does not reset an existing schedule (avoids spam on repeated focus-guard messages). */
  function ensureSpawning() {
    if (forbidden) return;
    if (spawnTimeout != null) return;
    _scheduleNextSpawn();
  }

  function stopSpawning() {
    _clearSpawnQueue();
    _removeAllCreatures();
  }

  function _scheduleNextSpawn() {
    _clearSpawnQueue();
    /* 8–20s */
    const delay = 8000 + Math.random() * 12000;
    spawnTimeout = setTimeout(_spawnCreature, delay);
  }

  function _spawnCreature() {
    /* The setTimeout that invoked this has fired; keep the handle cleared so
     * ensureSpawning() can re-arm after early returns (e.g. forbidden / missing DOM). */
    spawnTimeout = null;

    if (forbidden) return;

    const hab = document.getElementById('extCreatureLane');
    if (!hab) {
      spawnTimeout = setTimeout(_spawnCreature, 200);
      return;
    }
    const habW = hab.offsetWidth || window.innerWidth;
    const habH = hab.offsetHeight || 72;

    const type = pickRandomCreatureType();
    /* Catalog may still be loading after overlay init; without a reschedule the chain would stop forever. */
    if (!type) {
      spawnTimeout = setTimeout(_spawnCreature, 500);
      return;
    }

    const goRight = Math.random() > 0.5;
    const size = 36 + Math.floor(Math.random() * 22);
    const bottomPx = 4 + Math.floor(Math.random() * 12);

    const startX = goRight ? -60 : habW + 10;
    const endX = goRight ? habW + 60 : -70;

    const el = document.createElement('div');
    el.className = 'ext-creature';
    el.dataset.typeId = type.id;
    el.innerHTML = buildCreatureSVG(type, size);
    el.style.cssText = `left:${startX}px;bottom:${bottomPx}px;position:absolute;`;
    el.addEventListener('click', () => _catchCreature(el, type));

    hab.appendChild(el);
    const duration = 10000 + Math.random() * 8000;
    /* Force a layout pass so the browser records the starting `left` before
     * we set the transition + final value. Without this, Chrome coalesces
     * both writes into a single style resolution on freshly-appended nodes
     * and skips the transition entirely — the creature silently jumps from
     * off-screen-left to off-screen-right and gets removed unseen. The
     * reason "leaving and coming back" appears to fix it is that the wake
     * from a hidden tab forces a style recalc before pending rAFs fire, so
     * a starting value happens to exist by the time `left` changes. */
    void el.offsetWidth;
    el.style.transition = `left ${duration}ms linear`;
    el.style.left = `${endX}px`;
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, duration + 300);

    _scheduleNextSpawn();
  }

  function _syncPendingCatchToBackend(type) {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;
    try {
      chrome.runtime.sendMessage(
        { type: 'henn-pending-catch', typeId: type && type.id ? String(type.id) : '' },
        () => {
          void chrome.runtime.lastError;
        }
      );
    } catch {
      /* no-op */
    }
  }

  function _catchCreature(el, type) {
    caught++;
    _scheduleEconomySave();
    _syncPendingCatchToBackend(type);
    const p = _burstPointForCatch();
    spawnRewardBurst(p.x, p.y, '🌟 +1 🐾', 'catch');
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  function _removeAllCreatures() {
    const hab = document.getElementById('extCreatureLane');
    if (!hab) return;
    hab.querySelectorAll('.ext-creature').forEach((c) => c.remove());
  }

  function _clearSpawnQueue() {
    clearTimeout(spawnTimeout);
    spawnTimeout = null;
  }

  function showNotif(message) {
    if (IS_LANE && parent !== window) {
      try {
        parent.postMessage(
          { source: 'henn-lane', type: 'henn-timer-notif', message: String(message) },
          '*'
        );
      } catch {
        /* no-op */
      }
      return;
    }
    const n = document.getElementById('extNotif');
    if (!n) return;
    n.textContent = message;
    n.classList.add('ext-notif--show');
    setTimeout(() => n.classList.remove('ext-notif--show'), 2500);
  }

  function initEconomy() {
    try {
      const raw = localStorage.getItem(ECONOMY_STORAGE_KEY);
      if (raw) {
        const o = JSON.parse(raw);
        if (Number.isFinite(o.food)) food = o.food;
        if (Number.isFinite(o.coins)) coins = o.coins;
        if (Number.isFinite(o.caught)) caught = o.caught;
        if (Number.isFinite(o.foodAccumulator)) foodAccumulator = o.foodAccumulator;
      }
    } catch {
      /* use defaults */
    }
  }

  return {
    onFocusTick,
    setForbidden,
    isForbidden,
    startSpawning,
    ensureSpawning,
    stopSpawning,
    showNotif,
    initEconomy,
  };
})();
