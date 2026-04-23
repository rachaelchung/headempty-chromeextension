const $ = (id) => document.getElementById(id);

function setStatus(type, text) {
  const el = $('status');
  el.textContent = text;
  el.className = 'status' + (type ? ' status--' + type : '');
}

function loadState() {
  chrome.runtime.sendMessage({ type: 'henn-auth-status' }, (res) => {
    if (chrome.runtime.lastError) {
      setStatus('error', chrome.runtime.lastError.message);
      return;
    }
    if (res && res.apiBase) {
      $('apiBase').value = res.apiBase;
      document.getElementById('apiAdvanced').open = true;
    } else {
      $('apiBase').value = '';
    }
    if (res && res.hasJwt) {
      setStatus('ok', 'Saved session token is present. Use “Verify session” to test the API.');
    } else {
      setStatus('', 'Sign in with the same account you use on the site.');
    }
  });
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiBase = $('apiBase').value.trim();
  const emailOrUsername = $('ident').value.trim();
  const password = $('password').value;
  if (emailOrUsername && !String(password).trim()) {
    setStatus(
      'error',
      'Enter your password, or for Google: open the app in this browser (e.g. app.html) so your session can sync, then use “Verify session”.',
    );
    return;
  }
  if (!emailOrUsername) {
    setStatus('error', 'Enter email or username, or use the Google + browser flow above instead of this form.');
    return;
  }
  setStatus('', 'Signing in…');
  chrome.runtime.sendMessage(
    { type: 'henn-auth-login', apiBase, emailOrUsername, password },
    (res) => {
      if (chrome.runtime.lastError) {
        setStatus('error', chrome.runtime.lastError.message);
        return;
      }
      if (res && res.ok) {
        $('password').value = '';
        const u = res.user;
        const label =
          u && (u.displayName || u.username)
            ? String(u.displayName || u.username).trim()
            : 'account';
        setStatus('ok', 'Signed in as ' + label + '.');
      } else {
        setStatus('error', (res && res.error) || 'Login failed');
      }
    }
  );
});

$('logoutBtn').addEventListener('click', () => {
  setStatus('', '…');
  chrome.runtime.sendMessage({ type: 'henn-auth-logout' }, (res) => {
    if (chrome.runtime.lastError) {
      setStatus('error', chrome.runtime.lastError.message);
      return;
    }
    if (res && res.ok) {
      setStatus('', 'Logged out. Token was removed from this extension.');
    }
  });
});

$('verifyBtn').addEventListener('click', () => {
  setStatus('', 'Checking…');
  chrome.runtime.sendMessage({ type: 'henn-auth-test-me' }, (res) => {
    if (chrome.runtime.lastError) {
      setStatus('error', chrome.runtime.lastError.message);
      return;
    }
    if (res && res.ok) {
      const u = res.user;
      const un = u && u.username ? u.username : '';
      setStatus('ok', 'API session OK' + (un ? ' — ' + un : '') + '.');
    } else {
      setStatus('error', (res && res.error) || 'Verify failed');
    }
  });
});

loadState();
