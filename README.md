# ☺︎ head empty — focus overlay (chrome extension)

*for all those assignments you forget to do…and don't want to do.*

A floating pomodoro timer and creature habitat that rides along while you browse. When you visit a site you've marked as off-limits, it takes over the page so you can get back to work.

This extension is the companion to the [head empty web app](https://rachaelchung.github.io/113Capstone/). You can use the extension on its own, or sign in to sync your collection, coins, and assignment tracker across devices.

---

## features

- **floating pomodoro timer** — 25 / 5 / 25 / 5 / 25 / 5 / 25 / 15 (long break) cycle
- **creature lane overlay** — little critters spawn during focus sessions; click to catch them
- **focus guard** — on sites you mark off-limits, a full-page overlay replaces the distraction with your habitat + timer
- **optional sign-in** — syncs to the web app (collection, coins, assignments)
- **works offline** — no account required for the timer + creatures

---

## installation

The extension isn't on the Chrome Web Store yet, so install it unpacked:

1. **Download the code** — either clone this repo or click *Code → Download ZIP* and unzip it.

   ```bash
   git clone https://github.com/<your-username>/<this-repo>.git
   ```

2. **Open the extensions page** in Chrome (or any Chromium browser — Edge, Brave, Arc, etc.):

   ```
   chrome://extensions
   ```

3. **Turn on Developer mode** (toggle in the top-right corner).

4. Click **Load unpacked** and select the folder containing `manifest.json` (the root of this repo).

5. Pin **head empty** to your toolbar so you can get to the popup and options page easily.

That's it — the timer popup and the in-page overlay are now live.

---

## using it

### toolbar popup
Click the extension icon to open the popup. You'll see the pomodoro timer and a mini habitat lane. Start / pause / reset controls live here.

### focus guard (off-limits sites)
Out of the box, the extension treats these sites as off-limits during focus phases:

- youtube.com, youtu.be
- reddit.com (including old.reddit.com)
- twitter.com, x.com
- tiktok.com
- twitch.tv
- facebook.com, instagram.com
- netflix.com

When you land on one of these during a focus session, a full-page overlay slides in with the habitat and timer.

You can edit this list from the options page (see below).

### options page

Right-click the extension icon → **Options**, or open `chrome://extensions` and click **Details → Extension options**.

From there you can:

- Sign in to sync with the web app
- Override the API base URL (for local dev)
- Verify an existing session (useful after signing in with Google on the web app)

---

## signing in (optional)

You can use the extension anonymously — the timer and creature lane work with no account. Sign in if you want your collection, coins, and assignment tracker to sync.

### with email + password
1. Open the options page.
2. Enter your email/username and password.
3. Click **sign in →**.

### with Google
1. Sign in on the [web app](https://rachaelchung.github.io/113Capstone/) in the same browser.
2. Open the options page in the extension.
3. Click **verify session**. The extension picks up the session cookie automatically.

If verification fails, refresh the web app tab once and try again.

---

## using a self-hosted backend

By default the extension talks to the hosted API at `https://one13capstone.onrender.com`.

To point it at a different backend (for example your own Render deploy or a local Flask dev server):

**Option A — options page (per-install)**
1. Open the options page.
2. Expand **advanced: override api base url**.
3. Paste your API URL (no trailing slash, e.g. `https://my-api.example.com`) and sign in.

**Option B — edit the code (for distribution)**
1. Open `background.js`.
2. Change `HENN_REMOTE_API_BASE` to your URL:

   ```js
   const HENN_REMOTE_API_BASE = 'https://my-api.example.com';
   ```

3. If your site lives on a custom domain, also add it to `manifest.json` under `content_scripts` → `content-app-auth.js` matches:

   ```json
   "matches": [
     "http://127.0.0.1/*",
     "http://localhost/*",
     "https://my-site.example.com/*"
   ]
   ```

4. Reload the unpacked extension from `chrome://extensions`.

When developing locally, the extension automatically probes `http://127.0.0.1:8001/health` and `http://localhost:8001/health` and uses whichever responds. Otherwise it falls back to `HENN_REMOTE_API_BASE`.

---

## project layout

```
extension/
├── manifest.json               # Manifest V3 config
├── background.js               # service worker: auth bridge, messaging, forbidden-host tracking
├── popup.html / popup.js       # toolbar popup (timer + mini habitat)
├── options.html / options.js   # account + API settings
├── content.js                  # runs on every page, injects overlay on forbidden sites
├── content-app-auth.js         # bridges sign-in cookies from the web app
├── overlay.html / overlay.js / overlay.css  # full-page focus overlay
├── overlay-timer.html / overlay-timer.js    # floating timer iframe
├── overlay-lane.html  / overlay-lane.js     # creature lane iframe
├── timer.html                  # standalone timer page
├── lane.html                   # standalone lane page
├── css/
│   ├── timer-embed.css
│   └── lane-embed.css
├── lib/                        # shared logic (timer, creatures, game loop)
│   ├── timer.js
│   ├── creatures.js
│   ├── extGame.js
│   ├── timer-embed.js
│   └── lane-embed.js
├── data/
│   └── creatures.json
└── icons/
    └── icon-512.png
```

## troubleshooting

- **"verify session" says I'm not signed in** — open the web app in the same browser, sign in there, then come back and verify again. Sessions don't cross browsers or profiles.
- **Overlay doesn't appear on an off-limits site** — make sure the timer is in a **focus** phase (the overlay is suppressed during breaks). Also try reloading the page after installing.
- **Custom domain isn't bridging auth** — add it to `content_scripts` in `manifest.json` and reload the extension.
- **API errors after editing `background.js`** — make sure there's no trailing slash on the URL and that CORS is configured on the backend to allow the extension origin (`chrome-extension://<your-id>`).

---

## related

- **Web app + backend:** https://github.com/rachaelchung/113Capstone
- **Live site:** https://rachaelchung.github.io/113Capstone/
