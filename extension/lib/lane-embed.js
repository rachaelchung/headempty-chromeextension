/**
 * Creature lane: receives commands from the timer frame via the content script bridge.
 */

(function () {
  const pending = [];
  let ready = false;

  function runCmd(d) {
    if (!d || !d.type) return;
    switch (d.type) {
      case 'setForbidden':
        ExtGame.setForbidden(!!d.value);
        break;
      case 'startSpawn':
        ExtGame.startSpawning();
        break;
      case 'stopSpawning':
        ExtGame.stopSpawning();
        break;
      case 'focusTick':
        ExtGame.onFocusTick();
        break;
      default:
        break;
    }
  }

  window.addEventListener('message', (e) => {
    if (!e.data || e.data.source !== 'henn-timer' || e.data.target !== 'lane') return;
    if (!ready) {
      pending.push(e.data);
      return;
    }
    runCmd(e.data);
  });

  (async function init() {
    const dataUrl = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
      ? chrome.runtime.getURL('data/creatures.json')
      : 'data/creatures.json';
    await loadCreatureCatalog(dataUrl);
    ExtGame.initEconomy();
    ready = true;
    while (pending.length) {
      runCmd(pending.shift());
    }
  })();
})();
