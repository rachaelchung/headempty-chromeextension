/**
 * Bottom creature lane. Receives game commands from the timer frame via the content script.
 */

(function () {
  function onApplyGuard(d) {
    if (!d) return;
    if (!d.focus) {
      if (ExtGame.isForbidden()) ExtGame.setForbidden(false);
      return;
    }
    if (d.badUrl) {
      ExtGame.setForbidden(true);
    } else {
      ExtGame.setForbidden(false);
      if (d.isRunning && d.focus) {
        ExtGame.ensureSpawning();
      }
    }
  }

  function handleTimerCmd(d) {
    if (!d || d.source !== 'henn-timer' || d.type !== 'henn-lane-cmd') return;
    switch (d.cmd) {
      case 'onFocusTick':
        ExtGame.onFocusTick();
        break;
      case 'startSpawning':
        ExtGame.startSpawning();
        break;
      case 'stopSpawning':
        ExtGame.stopSpawning();
        break;
      case 'showNotif':
        if (d.message) ExtGame.showNotif(d.message);
        break;
      default:
    }
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (d && d.type === 'henn-burst-rect' && typeof d.cx === 'number' && typeof d.cy === 'number') {
      window._hennBurstFromTimer = { x: d.cx, y: d.cy };
      return;
    }
    if (d && d.type === 'henn-lane-apply-guard') {
      onApplyGuard(d);
      return;
    }
    if (d && d.source === 'henn-timer' && d.type === 'henn-lane-cmd') {
      handleTimerCmd(d);
    }
  });

  function start() {
    ExtGame.initEconomy();
    const dataUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL('data/creatures.json')
      : 'data/creatures.json';
    void loadCreatureCatalog(dataUrl).then(() => {
      /* caller may fire startSpawning via henn-lane-apply-guard */
    });
  }
  start();
})();
