/**
 * Injects two iframes (timer + bottom lane) under a pass-through host.
 * The full-viewport host uses pointer-events: none so the page receives clicks
 * except where the smaller iframes sit (Chromium can target the full iframe
 * even when the subdocument is all pointer-events: none).
 */

if (window.top !== window) {
} else {
  (function () {
    const ID = 'henn-chrome-ext-host';
    const LOCK_ID = 'henn-chrome-ext-lock';
    if (document.getElementById(ID)) return;

    const extOrigin = 'chrome-extension://' + chrome.runtime.id;

    if (!document.getElementById(LOCK_ID)) {
      const lock = document.createElement('style');
      lock.id = LOCK_ID;
      lock.textContent = `
#${ID} {
  position: fixed !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  max-height: none !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  z-index: 2147483000 !important;
  pointer-events: none !important;
  background: transparent !important;
  display: block !important;
  box-sizing: border-box !important;
  opacity: 1 !important;
  transform: none !important;
  filter: none !important;
  overflow: visible !important;
  isolation: auto !important;
  mix-blend-mode: normal !important;
  contain: none !important;
}
#henn-timer-iframe,
#henn-lane-iframe {
  border: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  pointer-events: auto !important;
  background: transparent !important;
  opacity: 1 !important;
  visibility: visible !important;
  color-scheme: light !important;
  box-sizing: border-box !important;
}
#henn-timer-iframe {
  position: fixed !important;
  z-index: 2147483001 !important;
  right: 10px !important;
  top: 12px !important;
  left: auto !important;
  width: min(520px, calc(100vw - 20px)) !important;
  min-height: 120px !important;
  height: 240px !important;
}
#henn-lane-iframe {
  position: fixed !important;
  z-index: 2147483000 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  top: auto !important;
  width: 100% !important;
  height: 95px !important;
  min-width: 0 !important;
  min-height: 0 !important;
}
`;
      (document.head || document.documentElement).appendChild(lock);
    }

    const host = document.createElement('div');
    host.id = ID;
    host.setAttribute(
      'style',
      'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;border:0;margin:0;padding:0;background:transparent;'
    );

    const frameTimer = document.createElement('iframe');
    frameTimer.id = 'henn-timer-iframe';
    frameTimer.name = 'henn-timer';
    frameTimer.src = chrome.runtime.getURL('overlay-timer.html');
    frameTimer.setAttribute('title', 'head empty — focus timer');
    frameTimer.setAttribute('allowtransparency', 'true');
    frameTimer.setAttribute(
      'style',
      'position:fixed;z-index:2147483001;right:10px;top:12px;left:auto;width:min(520px,calc(100vw - 20px));min-height:120px;height:240px;border:0;margin:0;padding:0;background:transparent;pointer-events:auto;opacity:1;'
    );

    const frameLane = document.createElement('iframe');
    frameLane.id = 'henn-lane-iframe';
    frameLane.name = 'henn-lane';
    frameLane.src = chrome.runtime.getURL('overlay-lane.html');
    frameLane.setAttribute('title', 'head empty — creature lane');
    frameLane.setAttribute('allowtransparency', 'true');
    frameLane.setAttribute(
      'style',
      'position:fixed;z-index:2147483000;left:0;right:0;bottom:0;width:100%;height:72px;border:0;margin:0;padding:0;background:transparent;pointer-events:auto;opacity:1;'
    );

    host.appendChild(frameTimer);
    host.appendChild(frameLane);
    (document.documentElement || document.body).appendChild(host);

    function forwardToTimer(d) {
      if (!frameTimer.contentWindow) return;
      try {
        frameTimer.contentWindow.postMessage(d, extOrigin);
      } catch {
        /* no-op */
      }
    }

    function forwardToLane(d) {
      if (!frameLane.contentWindow) return;
      try {
        frameLane.contentWindow.postMessage(d, extOrigin);
      } catch {
        /* no-op */
      }
    }

    function postForbiddenToTimer(active) {
      forwardToTimer({ source: 'henn-ext', type: 'henn-forbidden', active: !!active });
    }

    window.addEventListener(
      'message',
      (ev) => {
        if (ev.origin !== extOrigin) return;
        if (ev.source === window) return;
        if (ev.source !== frameTimer.contentWindow && ev.source !== frameLane.contentWindow) return;
        const d = ev.data;
        if (!d || typeof d !== 'object') return;

        /* Size only: position is one of two fixed states (right edge), not p.top+d.t from
         * the subdoc — that mixed iframe origin with dock insets and drifted after minimize. */
        if (d.source === 'henn-timer' && d.type === 'henn-timer-iframe-bounds' && d.w != null && d.h != null) {
          if (d.w < 8 || d.h < 8) return;
          const isMin = d.min === true || d.w <= 72;
          const ww = isMin
            ? d.w
            : Math.min(Math.max(d.w, 380), window.innerWidth - 16);
          const hh = isMin ? d.h : Math.max(d.h + 32, 240);
          frameTimer.style.setProperty('left', 'auto', 'important');
          frameTimer.style.setProperty('right', '10px', 'important');
          if (isMin) {
            frameTimer.style.setProperty('top', '50%', 'important');
            frameTimer.style.setProperty('transform', 'translateY(-50%)', 'important');
          } else {
            frameTimer.style.setProperty('top', '12px', 'important');
            frameTimer.style.setProperty('transform', 'none', 'important');
          }
          frameTimer.style.setProperty('width', `${Math.round(ww)}px`, 'important');
          frameTimer.style.setProperty('height', `${Math.round(hh)}px`, 'important');
          frameTimer.style.setProperty('min-height', '0', 'important');
          return;
        }
        if (d.source === 'henn-timer' && d.type === 'henn-burst-rect' && typeof d.cx === 'number' && typeof d.cy === 'number') {
          const pT = frameTimer.getBoundingClientRect();
          const pL = frameLane.getBoundingClientRect();
          const cxS = pT.left + d.cx;
          const cyS = pT.top + d.cy;
          forwardToLane({
            source: 'henn-ext',
            type: 'henn-burst-rect',
            cx: cxS - pL.left,
            cy: cyS - pL.top,
          });
          return;
        }
        if (d.source === 'henn-timer' && d.type === 'henn-lane-apply-guard') {
          forwardToLane(d);
          return;
        }
        if (d.source === 'henn-timer' && d.type === 'henn-lane-cmd') {
          forwardToLane(d);
          return;
        }
        if (d.source === 'henn-lane' && d.type === 'henn-timer-forbidden-ui') {
          forwardToTimer({ source: 'henn-ext', type: 'henn-timer-forbidden-ui', hidden: d.hidden });
          return;
        }
        if (d.source === 'henn-lane' && d.type === 'henn-timer-notif' && d.message) {
          forwardToTimer({ source: 'henn-ext', type: 'henn-timer-notif', message: d.message });
        }
      },
      false
    );

    function onTimerReady() {
      try {
        chrome.runtime.sendMessage({ type: 'henn-get-forbidden' }, (res) => {
          if (chrome.runtime.lastError) return;
          if (res && res.active != null) postForbiddenToTimer(res.active);
        });
      } catch {
        /* no-op */
      }
      /* Timer init may run before the lane iframe has a message listener; retry shortly. */
      setTimeout(() => {
        forwardToTimer({ source: 'henn-ext', type: 'henn-lane-ready' });
      }, 300);
    }

    frameTimer.addEventListener('load', onTimerReady);
    /* Lane often loads after the timer; early postMessage to the lane is dropped.
     * When the lane finishes loading, nudge the timer to re-send guard + spawn state. */
    frameLane.addEventListener('load', () => {
      forwardToTimer({ source: 'henn-ext', type: 'henn-lane-ready' });
    });
    /* lane may load later; timer drives forbidden. */

    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || msg.type !== 'henn-forbidden') return;
      postForbiddenToTimer(msg.active);
    });
  })();
}
