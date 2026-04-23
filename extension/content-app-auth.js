/**
 * Runs only on the app’s own origins (see manifest). When you sign in on the
 * site (including Google → app.html#tracker_auth=…), localStorage gets
 * henn_tracker_jwt; we copy it into extension storage for API calls.
 */
(function () {
  const TYPE = 'henn-auth-sync-from-page';
  const SOURCE = 'henn-content-sync';

  function readApiBase() {
    try {
      if (typeof window.HENN_REMOTE_API_BASE === 'string' && window.HENN_REMOTE_API_BASE.trim()) {
        return window.HENN_REMOTE_API_BASE.trim().replace(/\/$/, '');
      }
    } catch {
      /* no-op */
    }
    const t = document.querySelector('meta[name="tracker-api-base"]');
    const a = document.querySelector('meta[name="api-base"]');
    const tC = t && t.getAttribute('content') && t.getAttribute('content').trim();
    const aC = a && a.getAttribute('content') && a.getAttribute('content').trim();
    if (tC) return tC.replace(/\/$/, '');
    if (aC) return aC.replace(/\/$/, '');
    try {
      if (typeof window.TRACKER_API_BASE === 'string' && window.TRACKER_API_BASE.trim()) {
        return window.TRACKER_API_BASE.trim().replace(/\/$/, '');
      }
    } catch {
      /* no-op */
    }
    return '';
  }

  function readJwt() {
    try {
      return (localStorage.getItem('henn_tracker_jwt') || '').trim();
    } catch {
      return '';
    }
  }

  function looksLikeJwt(s) {
    if (!s || s.length < 24) return false;
    return s.split('.').length === 3;
  }

  function push() {
    const jwt = readJwt();
    if (!jwt || !looksLikeJwt(jwt)) return;
    const apiBase = readApiBase();
    const payload = { type: TYPE, source: SOURCE, jwt, ...(apiBase ? { apiBase } : {}) };
    try {
      chrome.runtime.sendMessage(payload, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      /* not running in extension (e.g. page opened without add-on) */
    }
  }

  function go() {
    push();
    setTimeout(push, 400);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', go);
  } else {
    go();
  }
})();
