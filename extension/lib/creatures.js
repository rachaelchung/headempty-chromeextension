/**
 * creatures.js
 * Loads creature definitions from data/creatures.json (spawn table + catalog).
 * Fallback: original five creatures if fetch fails (e.g. file://).
 * Visuals: buildCreatureSVG() — landing-style “head empty” creatures (thick ink outline,
 * flat fills, big eyes). Silhouette is optional `silhouette` on each row; otherwise
 * derived deterministically from `id` so the same species always looks the same.
 */

let CREATURE_TYPES = [];

/** @type {{ rareTop: number, uncommonTop: number }} */
let _spawnThresholds = { rareTop: 0.1, uncommonTop: 0.4 };

const LANDING_INK = '#1a1208';
const LANDING_ACCENT = '#f5c518';

const _SILHOUETTES = ['blob', 'spiky', 'chubby', 'antenna', 'ghost'];

const _FALLBACK_CREATURES = [
  { id: 'blobby', label: 'blobby', color: '#ff7043', eyeWhite: '#ffffff', pupil: '#1a1208', shape: 'round', silhouette: 'blob', rarity: 'common', spawnWeight: 1 },
  { id: 'squish', label: 'squish', color: '#ab47bc', eyeWhite: '#ffffff', pupil: '#1a1208', shape: 'wide', silhouette: 'ghost', rarity: 'common', spawnWeight: 1 },
  { id: 'bouncy', label: 'bouncy', color: '#26a69a', eyeWhite: '#ffffff', pupil: '#1a1208', shape: 'tall', silhouette: 'antenna', rarity: 'common', spawnWeight: 1 },
  { id: 'sparky', label: 'sparky', color: '#ffd600', eyeWhite: '#ffffff', pupil: '#1a1208', shape: 'round', silhouette: 'spiky', rarity: 'uncommon', spawnWeight: 1 },
  { id: 'raro', label: 'raro', color: '#ec407a', eyeWhite: '#ffffff', pupil: '#1a1208', shape: 'wide', silhouette: 'chubby', rarity: 'rare', spawnWeight: 1 },
];

/**
 * @param {string} s
 * @returns {number} non-negative int
 */
function _hashString(s) {
  let h = 0;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function _silhouetteFor(type) {
  const raw = type && type.silhouette;
  if (typeof raw === 'string' && _SILHOUETTES.includes(raw)) return raw;
  const idx = _hashString(type.id || type.label || '') % _SILHOUETTES.length;
  return _SILHOUETTES[idx];
}

/**
 * Load catalog from JSON. Safe to call multiple times; last successful load wins.
 * @param {string} [url='data/creatures.json']
 * @returns {Promise<void>}
 */
async function loadCreatureCatalog(url = 'data/creatures.json') {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data.creatures) ? data.creatures : [];
    if (!list.length) throw new Error('empty creatures');

    CREATURE_TYPES = list.map(_normalizeCreatureRow);

    const st = data.spawnTable || {};
    const rareTop = typeof st.rareTop === 'number' ? st.rareTop : 0.1;
    const uncommonTop = typeof st.uncommonTop === 'number' ? st.uncommonTop : 0.4;
    _spawnThresholds = {
      rareTop: Math.min(1, Math.max(0, rareTop)),
      uncommonTop: Math.min(1, Math.max(0, uncommonTop)),
    };
    if (_spawnThresholds.uncommonTop < _spawnThresholds.rareTop) {
      _spawnThresholds.uncommonTop = _spawnThresholds.rareTop;
    }
  } catch (err) {
    console.warn('[creatures] using fallback catalog:', err && err.message ? err.message : err);
    CREATURE_TYPES = _FALLBACK_CREATURES.map(_normalizeCreatureRow);
    _spawnThresholds = { rareTop: 0.1, uncommonTop: 0.4 };
  }
}

function _normalizeCreatureRow(row) {
  const w = row.spawnWeight;
  const spawnWeight = typeof w === 'number' && w > 0 && Number.isFinite(w) ? w : 1;
  return { ...row, spawnWeight };
}

/* Synchronous so spawns can run before fetch of data/creatures.json completes (or if it stalls). */
CREATURE_TYPES = _FALLBACK_CREATURES.map(_normalizeCreatureRow);

/** Big cartoon eyes (landing hero style). */
function _eyesLand(ink, eyeWhite, pupil, cx, cy, gap, eyeR, pupilR) {
  const lx = cx - gap / 2;
  const rx = cx + gap / 2;
  const swE = Math.max(1, eyeR * 0.32);
  const off = pupilR * 0.28;
  return `
    <circle cx="${lx}" cy="${cy}" r="${eyeR}" fill="${eyeWhite}" stroke="${ink}" stroke-width="${swE}"/>
    <circle cx="${rx}" cy="${cy}" r="${eyeR}" fill="${eyeWhite}" stroke="${ink}" stroke-width="${swE}"/>
    <circle cx="${lx + off}" cy="${cy}" r="${pupilR}" fill="${pupil}"/>
    <circle cx="${rx + off}" cy="${cy}" r="${pupilR}" fill="${pupil}"/>
  `;
}

function _smileLand(ink, cx, y, w, strokeW) {
  const hw = w / 2;
  const dip = w * 0.28;
  return `<path d="M${cx - hw} ${y} Q${cx} ${y + dip} ${cx + hw} ${y}" stroke="${ink}" stroke-width="${strokeW}" fill="none" stroke-linecap="round"/>`;
}

function _blushLand(lx, ly, rx, ry) {
  return `
    <ellipse cx="${lx}" cy="${ly}" rx="5" ry="2.8" fill="#ffaaaa" opacity="0.48"/>
    <ellipse cx="${rx}" cy="${ry}" rx="5" ry="2.8" fill="#ffaaaa" opacity="0.48"/>
  `;
}

/** Sparkle for rare / uncommon tiers. */
function _sparkle(cx, cy, r, fill) {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + Math.cos(angle) * rad},${cy + Math.sin(angle) * rad}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${LANDING_INK}" stroke-width="1.1"/>`;
}

function _halo(cx, cy, r, stroke) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.32}" fill="none" stroke="${stroke}" stroke-width="1.6" opacity="0.75"/>`;
}

function _tierExtras(cx, isRare, isUncommon, lightFill) {
  if (isRare) {
    return (
      _sparkle(cx + 22, 10, 4.2, LANDING_ACCENT) +
      _sparkle(cx - 20, 12, 2.8, LANDING_ACCENT) +
      _halo(cx, 14, 12, LANDING_ACCENT)
    );
  }
  if (isUncommon) {
    return _sparkle(cx + 20, 11, 3.2, lightFill) + _sparkle(cx - 18, 13, 2.2, lightFill);
  }
  return '';
}

/**
 * @param {string} c body fill
 * @param {string} e eye white
 * @param {string} p pupil (also used only as fallback; smile uses ink)
 */
function _svgBlob(c, e, p, ink, isRare, isUncommon) {
  const sw = 2.35;
  const cx = 32;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="14" cy="20" rx="6.5" ry="8.5" fill="${c}" stroke="${ink}" stroke-width="${sw}" transform="rotate(-14 14 20)"/>
    <ellipse cx="50" cy="20" rx="6.5" ry="8.5" fill="${c}" stroke="${ink}" stroke-width="${sw}" transform="rotate(14 50 20)"/>
    <ellipse cx="${cx}" cy="38" rx="24" ry="20" fill="${c}" stroke="${ink}" stroke-width="${sw}"/>
    ${_eyesLand(ink, e, p, cx, 33, 15, 4.2, 2.1)}
    ${_smileLand(ink, cx, 44, 13, 1.85)}
    ${_blushLand(19, 41, 45, 41)}
    ${_tierExtras(cx, isRare, isUncommon, '#dbeafe')}
  </svg>`;
}

function _svgSpiky(c, e, p, ink, isRare, isUncommon) {
  const sw = 2.35;
  const cx = 32;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${cx}" cy="36" rx="21" ry="21" fill="${c}" stroke="${ink}" stroke-width="${sw}"/>
    <polygon points="32,7 36.5,19 27.5,19" fill="${c}" stroke="${ink}" stroke-width="1.85" stroke-linejoin="round"/>
    <polygon points="51,15 46.5,26.5 39.5,21.5" fill="${c}" stroke="${ink}" stroke-width="1.85" stroke-linejoin="round"/>
    <polygon points="13,15 17.5,26.5 24.5,21.5" fill="${c}" stroke="${ink}" stroke-width="1.85" stroke-linejoin="round"/>
    ${_eyesLand(ink, e, p, cx, 32, 13.5, 3.6, 1.85)}
    ${_smileLand(ink, cx, 42, 11, 1.75)}
    ${_tierExtras(cx, isRare, isUncommon, LANDING_ACCENT)}
  </svg>`;
}

function _svgChubby(c, e, p, ink, isRare, isUncommon) {
  const sw = 2.35;
  const cx = 32;
  const leg = 2.6;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="${cx}" cy="38" rx="27" ry="24" fill="${c}" stroke="${ink}" stroke-width="${sw}"/>
    <line x1="17" y1="60" x2="15" y2="63.5" stroke="${ink}" stroke-width="${leg}" stroke-linecap="round"/>
    <line x1="26" y1="61.5" x2="24" y2="63.5" stroke="${ink}" stroke-width="${leg}" stroke-linecap="round"/>
    <line x1="38" y1="61.5" x2="36" y2="63.5" stroke="${ink}" stroke-width="${leg}" stroke-linecap="round"/>
    <line x1="47" y1="60" x2="45" y2="63.5" stroke="${ink}" stroke-width="${leg}" stroke-linecap="round"/>
    ${_eyesLand(ink, e, p, cx, 34, 17, 4.6, 2.25)}
    ${_smileLand(ink, cx, 46, 15, 1.95)}
    ${_blushLand(18, 43, 46, 43)}
    ${_tierExtras(cx, isRare, isUncommon, '#fde8e8')}
  </svg>`;
}

function _svgAntenna(c, e, p, ink, accent, isRare, isUncommon) {
  const sw = 2.35;
  const cx = 32;
  return `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg">
    <rect x="9" y="18" width="46" height="40" rx="17" fill="${c}" stroke="${ink}" stroke-width="${sw}"/>
    <line x1="${cx}" y1="18" x2="${cx}" y2="6" stroke="${ink}" stroke-width="${sw}" stroke-linecap="round"/>
    <circle cx="${cx}" cy="4.5" r="4.2" fill="${accent}" stroke="${ink}" stroke-width="2"/>
    ${_eyesLand(ink, e, p, cx, 34, 15, 3.8, 1.9)}
    ${_smileLand(ink, cx, 44, 12, 1.75)}
    ${_tierExtras(cx, isRare, isUncommon, '#dcfce7')}
  </svg>`;
}

function _svgGhost(c, e, p, ink, isRare, isUncommon) {
  const sw = 2.35;
  const cx = 32;
  return `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg">
    <path d="M32 6 C15 6 7 19 7 33 L7 56 L15 50 L23 56 L32 50 L41 56 L49 50 L57 56 L57 33 C57 19 49 6 32 6Z" fill="${c}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>
    ${_eyesLand(ink, e, p, cx, 30, 15, 4, 2)}
    ${_smileLand(ink, cx, 40, 13, 1.75)}
    ${_tierExtras(cx, isRare, isUncommon, '#f0e8ff')}
  </svg>`;
}

/**
 * Build landing-style SVG for a creature.
 * @param {object} type
 * @param {number} [displayWidth]
 * @returns {string}
 */
function buildCreatureSVG(type, displayWidth = 40) {
  const dw =
    typeof displayWidth === 'number' && displayWidth > 0 && Number.isFinite(displayWidth)
      ? displayWidth
      : 40;
  if (!type) {
    const s = Math.round(dw);
    return `<svg width="${s}" height="${s}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  const c = type.color || '#aaaaaa';
  const e = type.eyeWhite || '#ffffff';
  const p = type.pupil || LANDING_INK;
  const ink = LANDING_INK;
  const accent = typeof type.accent === 'string' ? type.accent : LANDING_ACCENT;

  const isRare = type.rarity === 'rare';
  const isUncommon = type.rarity === 'uncommon';
  const silhouette = _silhouetteFor(type);

  const vbW = 64;
  const vbH = silhouette === 'antenna' || silhouette === 'ghost' ? 72 : 64;

  let inner = '';
  switch (silhouette) {
    case 'spiky':
      inner = _svgSpiky(c, e, p, ink, isRare, isUncommon);
      break;
    case 'chubby':
      inner = _svgChubby(c, e, p, ink, isRare, isUncommon);
      break;
    case 'antenna':
      inner = _svgAntenna(c, e, p, ink, accent, isRare, isUncommon);
      break;
    case 'ghost':
      inner = _svgGhost(c, e, p, ink, isRare, isUncommon);
      break;
    case 'blob':
    default:
      inner = _svgBlob(c, e, p, ink, isRare, isUncommon);
      break;
  }

  const w = Math.round(dw);
  const h = Math.round((vbH / vbW) * dw);

  return inner.replace(/^<svg\s+/, `<svg width="${w}" height="${h}" `).trim();
}

function _weightedPick(pool) {
  if (!pool.length) return null;
  const weights = pool.map((t) => t.spawnWeight);
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/**
 * Pick a random creature type: rarity tier from spawnTable, then weighted within tier.
 * @returns {object|null}
 */
function pickRandomCreatureType() {
  if (!CREATURE_TYPES.length) return null;

  const roll = Math.random();
  const { rareTop, uncommonTop } = _spawnThresholds;

  const pool =
    roll < rareTop
      ? CREATURE_TYPES.filter((t) => t.rarity === 'rare')
      : roll < uncommonTop
        ? CREATURE_TYPES.filter((t) => t.rarity === 'uncommon')
        : CREATURE_TYPES.filter((t) => t.rarity === 'common');

  const chosen = _weightedPick(pool.length ? pool : CREATURE_TYPES);
  return chosen || CREATURE_TYPES[0];
}
