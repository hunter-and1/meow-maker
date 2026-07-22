import './style.css';
import manifest from './manifest.json';
import { sfx } from './sfx.js';
import { game, onPortalMute, sdkReady, storage } from './sdk.js';

const SIZE = 500; // every part is authored on a 500x500 grid
const HEAD = '06-head'; // used as a ghost backdrop in part thumbnails
const SPARKLE = '14-sparkle'; // drawn over the character, but previewed like a background
const FUR = '07-face-fur'; // clipped to the head so no muzzle sticks out of the silhouette
const STORE = 'chibi-avatar:v7'; // codes are positional, so bump on a reorder or a pool change
const BUSY_DELAY = 120; // don't flash a spinner for renders that finish instantly

const layers = manifest.layers;
const headIndex = layers.findIndex((l) => l.id === HEAD);
const byId = (id) => layers.find((l) => l.id === id);
const poolOf = (layer) => (layer.optional ? [null, ...layer.files] : layer.files);
const isFaceLayer = (layer) => layers.indexOf(layer) > headIndex;
// full-canvas art: previewed on its own dark card instead of next to a ghost head
const isSceneLayer = (layer) => layer.id.includes('background') || layer.id === SPARKLE;

/**
 * The game has two orders and they want opposite things. `layers` is the manifest's
 * z-stack, bottom to top — the drawn avatar, the share code and the thumbnails all
 * stay on it. `steps` is the order the player walks the categories in, and painting
 * order makes a poor run: it opened on wallpaper and only reached the cat itself
 * halfway through. So the run starts at the head and works outwards — the animal,
 * then its face, then what it wears, then the scene it sits in.
 * Anything the manifest adds later is appended, so a new layer can't fall out of the run.
 */
const STEP_ORDER = [
  '06-head',
  '04-ears',
  '07-face-fur',
  '10-eyes',
  '11-nose',
  '08-mouth',
  '09-whiskers',
  '12-glasses',
  '13-hat',
  '05-neckwear',
  '01-background-base',
  '02-background-pattern',
  '03-background-frame',
  '14-sparkle',
];
const steps = [
  ...STEP_ORDER.map(byId).filter(Boolean),
  ...layers.filter((l) => !STEP_ORDER.includes(l.id)),
];

/** One glyph per slot, so the tab strip reads as gear icons like a loadout screen. */
const ICONS = {
  '01-background-base': '🎨',
  '02-background-pattern': '🌀',
  '03-background-frame': '🖼️',
  '04-ears': '👂',
  '05-neckwear': '🎀',
  '06-head': '🐱',
  '07-face-fur': '🧶',
  '08-mouth': '👄',
  '09-whiskers': '〰️',
  '10-eyes': '👀',
  '11-nose': '👃',
  '12-glasses': '👓',
  '13-hat': '🎩',
  '14-sparkle': '✨',
};

const $ = (id) => document.getElementById(id);
const canvas = $('canvas');
const art = $('art');
const tabs = $('tabs');
const toolbar = $('toolbar');
const grid = $('grid');

/* ------------------------------------------------------------------ state */

/**
 * The build is a run through the categories in order: the player styles one slot,
 * taps Next, and moves on. Nothing is rolled for them — every part on the cat is a
 * choice they made. The camera only unlocks once the last category is confirmed.
 */
const selection = {}; // layerId -> filename, or null for "none"
const LAST = steps.length - 1;
let step = 0; // category being styled right now
let reached = 0; // furthest category unlocked; Next walks it forward
let finished = false; // every category confirmed — the cat is ready to save

const activeId = () => steps[step].id;
// nothing picked anywhere: the run hasn't really begun, so there is no cat to number
// or photograph yet — the plate hides and the shutter stays locked
const isBlank = () => layers.every((l) => !selection[l.id]);

/* ----------------------------------------------------------------- assets */

const cache = new Map();

/** Fetch a part and keep only its inner markup, so parts stack inside one <svg>. */
function loadPart(layerId, file) {
  // relative on purpose: CrazyGames serves the bundle from a nested CDN path, where a
  // leading slash would resolve against the CDN root and 404 (see vite.config.js)
  const url = `parts/${layerId}/${file}`;
  if (!cache.has(url)) {
    cache.set(
      url,
      fetch(url)
        .then((r) => r.text())
        .then((svg) => svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''))
        .catch(() => '') // a missing part shouldn't take the whole avatar down
    );
  }
  return cache.get(url);
}

const wrapSvg = (inner, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" ${extra}>${inner}</svg>`;

/**
 * Fur is authored against one head shape, so on a wider or shorter head the muzzle
 * pokes out past the outline. Clipping it to the worn head keeps it inside every time.
 * Heads are a single filled path, and a <clipPath> only honours raw shapes (a <g>
 * inside one is ignored), so lift the path data out rather than reusing the markup.
 */
let clipSeq = 0;
function clipToHead(part, headMarkup) {
  const shapes = [...(headMarkup ?? '').matchAll(/<path\b[^>]*\bd="([^"]+)"/g)]
    .map((m) => `<path d="${m[1]}"/>`)
    .join('');
  if (!shapes) return part; // no head on this avatar — nothing to clip against
  const id = `head-clip-${++clipSeq}`; // ids are document-wide; thumbnails share the page
  return `<clipPath id="${id}">${shapes}</clipPath><g clip-path="url(#${id})">${part}</g>`;
}

/* ----------------------------------------------------------- share / save */

/** Selection as a compact code: one base36 pool index per layer, e.g. "1.a.0.p.…". */
function encode() {
  return layers.map((l) => poolOf(l).indexOf(selection[l.id]).toString(36)).join('.');
}

function decode(code) {
  const parts = code.split('.');
  return layers.every((layer, i) => {
    const pool = poolOf(layer);
    const idx = parseInt(parts[i], 36);
    if (!Number.isInteger(idx) || idx < 0 || idx >= pool.length) return false;
    selection[layer.id] = pool[idx];
    return true;
  });
}

const CODE_V = '6'; // shared links carry it, so a reorder can't silently restore a different avatar

/**
 * How far the run got is saved as category *ids*, not positions: the run order is a
 * design choice that can be re-cut, and a saved "3" would then resume somebody on a
 * different category. Ids survive that. The code itself is still positional, over the
 * z-stack, which only moves when the pools do — that's what `CODE_V` guards.
 */
function persist() {
  const state = { code: encode(), at: activeId(), reached: steps[reached].id, finished };
  storage.setItem(STORE, JSON.stringify(state));
  history.replaceState(null, '', `?a=${CODE_V}~${state.code}#${activeId()}`);
}

let fromLink = false; // a cat someone else built: shown, but not minted as ours

// an id from an older run order (or none at all) just starts the walk over
const stepOf = (id) => Math.max(steps.findIndex((l) => l.id === id), 0);

function restore() {
  const [version, fromUrl] = (new URLSearchParams(location.search).get('a') ?? '').split('~');
  if (version === CODE_V && fromUrl && decode(fromUrl)) {
    // someone else's finished cat: every category is already styled, so the whole
    // run is open for browsing and the camera works straight away
    finished = true;
    reached = step = LAST;
    return (fromLink = true);
  }
  try {
    const saved = JSON.parse(storage.getItem(STORE) ?? 'null');
    if (!saved?.code) return false;
    // a code from a pool that has since been re-cut can't be worn; drop it rather than
    // leave a run behind that every future boot will read and reject again
    if (!decode(saved.code)) {
      storage.removeItem(STORE);
      return false;
    }
    finished = saved.finished === true;
    reached = finished ? LAST : stepOf(saved.reached);
    step = Math.min(stepOf(saved.at), reached);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- avatar */

/**
 * Parts are drawn with a wide empty margin inside their 500x500 frame. On screen
 * `.art` zooms past it; an export of the raw frame instead came out ringed by dead
 * space. Cropping the viewBox by the same factor makes the PNG match the medallion.
 */
const ZOOM = 1.4; // keep in step with the .art transform in style.css
const CROP = SIZE / ZOOM;
const CROP_XY = (SIZE - CROP) / 2;

async function buildSvg({ crop = false } = {}) {
  const worn = layers.filter((l) => selection[l.id]);
  const parts = await Promise.all(worn.map((l) => loadPart(l.id, selection[l.id])));
  const head = parts[worn.findIndex((l) => l.id === HEAD)];
  const stack = worn.map((l, i) => (l.id === FUR ? clipToHead(parts[i], head) : parts[i]));
  const box = crop ? `${CROP_XY} ${CROP_XY} ${CROP} ${CROP}` : `0 0 ${SIZE} ${SIZE}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}"
    width="${SIZE}" height="${SIZE}">${stack.join('')}</svg>`;
}

let renderToken = 0;
async function render() {
  const token = ++renderToken;
  const busy = setTimeout(() => token === renderToken && canvas.classList.add('busy'), BUSY_DELAY);
  const svg = await buildSvg();
  clearTimeout(busy);
  if (token !== renderToken) return; // a newer render already won
  art.innerHTML = svg;
  canvas.classList.remove('busy');
}

/**
 * The starting cat, before the player has chosen anything. Deterministic on purpose:
 * two players opening the game see the same blank slate, and everything that makes a
 * cat theirs comes from the categories they walk through. Optional layers lead with
 * "none", so the avatar builds up piece by piece instead of arriving pre-dressed.
 */
function resetBuild() {
  layers.forEach((layer) => (selection[layer.id] = poolOf(layer)[0]));
  step = reached = 0;
  finished = false;
}

function choose(layerId, file) {
  selection[layerId] = file;
  sfx.pick();
  commit({ regrid: layerId === HEAD }); // thumbnails sit on the head, so it must redraw
}

/* --------------------------------------------------------------- run flow */

/** Jump to a category. Only ones already walked through are open. */
function goStep(next) {
  if (next === step || next < 0 || next > reached) return;
  step = next;
  sfx.step();
  commit({ regrid: true });
  grid.scrollTop = 0; // a fresh category starts at its first row
}

function nextStep() {
  if (step < LAST) {
    reached = Math.max(reached, step + 1);
    return goStep(step + 1);
  }
  if (finished) return; // already done; the camera is the way out
  finished = true;
  sfx.done();
  if (!isBlank()) game.happytime(); // the run is complete — the portal's cue to celebrate
  commit();
  toast(isBlank() ? 'Nothing picked yet — go back and dress your cat' : 'Your cat is ready — tap 📷 to save');
}

/**
 * The plate is a mint number, not a hash: the first cat a player builds is #00001,
 * the next #00002. Numbers are handed out on this device only — there is no server
 * — so it reads as "my seventh cat", not as a globally unique token.
 *
 * Cats the player arrives at through someone else's share link are shown with that
 * cat's own mint number if they've built it before, and otherwise are NOT minted:
 * opening a link shouldn't burn a number, and it shouldn't hand a visitor #00001
 * for a cat they didn't make.
 */
const MINTS = `${STORE}:mints`;
const MINT_CAP = 400; // plates the device remembers; the oldest fall off first

// loaded in boot() rather than here: storage can't be read until the SDK has settled
let mint = { next: 1, book: {} };

function loadMints() {
  try {
    const saved = JSON.parse(storage.getItem(MINTS) ?? 'null');
    if (Number.isInteger(saved?.next)) mint = { next: saved.next, book: saved.book ?? {} };
  } catch {
    /* corrupt or cleared storage just starts the collection over */
  }
}

/** The number this outfit already owns, or a fresh one when the player made it. */
function mintNumber(code, issue) {
  if (mint.book[code]) return mint.book[code];
  if (!issue) return null;

  mint.book[code] = mint.next++;
  const codes = Object.keys(mint.book);
  for (const old of codes.slice(0, codes.length - MINT_CAP)) delete mint.book[old];
  storage.setItem(MINTS, JSON.stringify(mint));
  return mint.book[code];
}

function renderSerial({ issue = true } = {}) {
  const blank = isBlank();
  $('serialPlate').hidden = blank; // an empty canvas never gets a plate, let alone a number
  if (blank) return;
  const n = mintNumber(encode(), issue);
  $('serial').textContent = n ? `#${String(n).padStart(5, '0')}` : '#?????';
}

/** Single place that pushes state to the screen, the URL and storage. */
function commit({ regrid = false, issue = true } = {}) {
  render();
  renderSerial({ issue });
  renderTabs();
  renderToolbar();
  renderProgress();
  renderShutter();
  if (regrid) renderGrid();
  else markSelected();
  persist();
}

/* -------------------------------------------------------------- tabs/grid */

/**
 * The strip doubles as the progress map: categories behind the player are ticked and
 * clickable, the current one is lit, and the ones ahead are dimmed until Next reaches
 * them — so the run always reads as "here's how far along the cat is".
 */
function renderTabs() {
  const wasAt = tabs.scrollLeft; // innerHTML wipes it, and every pick re-renders the strip
  tabs.innerHTML = steps
    .map((layer, i) => {
      const value = selection[layer.id];
      const state = i === step ? ' active' : i < reached || finished ? ' done' : ' ahead';
      const open = i <= reached;
      return `<button class="tab${state}" data-step="${i}" ${open ? '' : 'disabled'}
        title="${layer.label}: wearing ${value ? value.replace('.svg', '') : 'nothing'}">
        ${i < step || (finished && i !== step) ? '<span class="tick">✓</span>' : ''}
        <span class="ico" aria-hidden="true">${ICONS[layer.id] ?? '🐾'}</span>
        ${layer.label}
      </button>`;
    })
    .join('');
  const active = tabs.querySelector('.tab.active');
  if (!active) return;
  // Put the scroll back where the player left it, and only pull the strip to the current
  // category when that category has actually gone off-screen. Recentring on every render
  // meant a desktop player who scrolled ahead to look at what's coming had the strip
  // snatched back under them the moment they picked a part.
  tabs.scrollLeft = wasAt;
  const from = active.offsetLeft - tabs.scrollLeft;
  const PEEK = 12; // half-covered by the edge fade counts as off-screen
  if (from < PEEK || from + active.offsetWidth > tabs.clientWidth - PEEK) {
    // scroll the strip itself — scrollIntoView would drag the whole page sideways on mobile
    tabs.scrollLeft = active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2;
  }
}

function renderToolbar() {
  const layer = byId(activeId());
  const pool = poolOf(layer);
  const last = step === LAST;
  const nextLabel = last ? (finished ? '✓ Done' : '✓ Finish') : 'Next ▶';
  toolbar.innerHTML = `
    <button data-act="back" ${step === 0 ? 'disabled' : ''} aria-label="Previous category">◀</button>
    <span class="tname">${layer.label}</span>
    <span class="tcount">${step + 1}/${steps.length}</span>
    <span class="spacer"></span>
    <span class="tpick">${pool.indexOf(selection[layer.id]) + 1}/${pool.length}</span>
    <button data-act="next" class="primary" ${last && finished ? 'disabled' : ''}>${nextLabel}</button>`;
}

function renderProgress() {
  const of = finished ? steps.length : step;
  $('progressFill').style.width = `${(of / steps.length) * 100}%`;
}

/** The shutter stays dark until the run is complete — saving is the reward. */
function renderShutter() {
  const shot = $('dockShot');
  const ready = finished && !isBlank(); // an empty canvas is not a cat to save
  shot.disabled = !ready;
  shot.classList.toggle('ready', ready);
  shot.title = ready
    ? 'Save your cat as PNG'
    : isBlank()
      ? 'Pick some parts first'
      : 'Style every category to unlock';
}

/**
 * One thumbnail: the part next to a faded head so small pieces stay readable, on a
 * tinted backdrop — cream fur and white whiskers vanish against white. The head is
 * stacked on the same side it really sits, so ears and neckwear preview as worn.
 *
 * Frames and sparkles are pure white, so on a pale cell they showed nothing at all —
 * the whole Frame tab looked like eight blank squares. Full-canvas layers get a deep
 * backdrop instead, dark enough for white line art and still light enough for the
 * grey discs and patterns.
 */
async function thumb(layer, file) {
  if (!file) return NONE_ICON;
  const part = await loadPart(layer.id, file);
  if (isSceneLayer(layer)) return wrapSvg(`${sceneRect()}${part}`);

  const headFile = selection[HEAD];
  if (layer.id === HEAD || !headFile) return wrapSvg(part);
  const head = await loadPart(HEAD, headFile);
  const ghost = `<g opacity="0.3">${head}</g>`;
  const worn = layer.id === FUR ? clipToHead(part, head) : part; // preview it as it will be worn
  const stack = isFaceLayer(layer) ? `${ghost}${worn}` : `${worn}${ghost}`;
  return wrapSvg(stack);
}

// the slot tile itself is a mid lilac stone, so parts only need a backdrop when the
// art is full-canvas white line work — those get a deep card of their own
const sceneRect = () => `<rect width="${SIZE}" height="${SIZE}" fill="#3b2358"/>`;

/** "wear nothing on this layer" — a crossed-out circle, tinted by CSS. */
const NONE_ICON = `<svg class="icon-none" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="1.7" stroke-linecap="round" aria-label="none">
  <circle cx="12" cy="12" r="8.4"/><line x1="6.1" y1="17.9" x2="17.9" y2="6.1"/></svg>`;

// Thumbnails are fetched only once their cell is near the viewport — a tab like
// "Face fur" has 83 parts and almost none are on screen at first paint.
let observer;
let gridToken = 0;

function renderGrid() {
  const token = ++gridToken;
  observer?.disconnect();

  const layer = byId(activeId());
  grid.innerHTML = poolOf(layer)
    .map(
      (file) =>
        `<button class="cell loading" data-file="${file ?? ''}" title="${file?.replace('.svg', '') ?? 'none'}"></button>`
    )
    .join('');
  markSelected();

  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) fillCell(entry.target, layer, token);
      }
    },
    { root: grid, rootMargin: '150px' } // start a bit before they scroll in
  );
  grid.querySelectorAll('.cell').forEach((cell) => observer.observe(cell));
}

async function fillCell(cell, layer, token) {
  observer.unobserve(cell);
  const html = await thumb(layer, cell.dataset.file || null);
  if (token !== gridToken) return; // tab changed while fetching
  cell.innerHTML = html;
  cell.classList.remove('loading');
}

function markSelected() {
  const value = selection[activeId()] ?? '';
  for (const cell of grid.children) cell.classList.toggle('selected', cell.dataset.file === value);
}

/* ------------------------------------------------------------------ chrome */

let toastTimer;
function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

/**
 * Run an async action with the button held in a pending state. The button is an
 * icon now, so the state is a class the stylesheet dims — swapping the label out
 * would throw the artwork away.
 */
async function withPending(button, fn) {
  button.disabled = true;
  button.classList.add('pending');
  try {
    await fn();
  } finally {
    button.disabled = false;
    button.classList.remove('pending');
  }
}

/**
 * Blink the screen white, the way a phone camera does. It fires the moment the
 * shutter is pressed rather than when the PNG is ready — encoding takes a beat and
 * a flash that lands late reads as a glitch. Removing the class first and forcing a
 * reflow restarts the animation, so a second shot blinks too.
 */
function flash() {
  const el = $('flash');
  el.classList.remove('fire');
  void el.offsetWidth;
  el.classList.add('fire');
}

async function download(button) {
  flash();
  sfx.shutter();
  await withPending(button, async () => {
    const svg = await buildSvg({ crop: true }); // WYSIWYG: no dead margin around the cat
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = SIZE * 2; // 2x for a crisper export
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.download = `meowmaker-${$('serial').textContent.replace('#', '')}.png`;
        a.href = c.toDataURL('image/png');
        a.click();
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
    game.happytime(); // the cat made it out as a picture, which is the win here
    toast('Photo saved 📷');
  });
}

/* -------------------------------------------------------------- listeners */

/**
 * The category strip pans by finger on a phone, but on desktop it was close to stuck:
 * a mouse wheel has no horizontal axis, the scrollbar is hidden by design, and with
 * fourteen cards on a 480px column more than half the run sits off-screen. So the strip
 * is given the two gestures a mouse actually has — the wheel pushes it sideways, and it
 * can be grabbed and thrown like a map.
 */
const DRAG_SLOP = 4; // a shaky click is still a click, not a drag
let drag = null; // { x, left, moved } while a mouse button is held on the strip
let dragged = false; // the drag that just ended must not also count as a tab tap

tabs.addEventListener(
  'wheel',
  (e) => {
    if (e.shiftKey || !e.deltaY) return; // shift-wheel is horizontal already
    const before = tabs.scrollLeft;
    tabs.scrollLeft += e.deltaY;
    // at either end the strip has nothing left to give, so let the page take the wheel
    if (tabs.scrollLeft !== before) e.preventDefault();
  },
  { passive: false }
);

tabs.addEventListener('pointerdown', (e) => {
  dragged = false;
  if (e.pointerType === 'touch') return; // touch scrolling is native and better left alone
  drag = { x: e.clientX, left: tabs.scrollLeft, moved: false };
});

tabs.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) < DRAG_SLOP) return;
  drag.moved = true;
  // capture so a fast throw that leaves the strip keeps panning it
  if (!tabs.hasPointerCapture(e.pointerId)) tabs.setPointerCapture(e.pointerId);
  tabs.classList.add('dragging');
  tabs.scrollLeft = drag.left - dx;
});

for (const end of ['pointerup', 'pointercancel']) {
  tabs.addEventListener(end, () => {
    dragged = drag?.moved === true;
    drag = null;
    tabs.classList.remove('dragging');
  });
}

tabs.onclick = (e) => {
  if (dragged) return; // they were panning the strip, not picking a category
  const tab = e.target.closest('.tab');
  if (tab) goStep(Number(tab.dataset.step));
};

grid.onclick = (e) => {
  const cell = e.target.closest('.cell');
  if (cell) choose(activeId(), cell.dataset.file || null);
};

toolbar.onclick = (e) => {
  const act = e.target.closest('button')?.dataset.act;
  if (act === 'next') nextStep();
  else if (act === 'back') goStep(step - 1);
};

$('dockShot').onclick = (e) => download(e.currentTarget);

/* --------------------------------------------------------------- settings */

/**
 * Background music. Browsers refuse to start audio before the player has touched
 * the page, so the loop is armed here and actually started by the first gesture —
 * the first tap or key after the boot screen usually is it.
 */
const MUTED = `${STORE}:muted`;
const SILENT = `${STORE}:silent`; // the effects switch, remembered apart from the music one
const music = $('music');
const sheet = $('settingsSheet');
// both read from storage in boot(), for the same reason the mint book is
let muted = false;
let silent = false;
// CrazyGames has its own mute control in the portal chrome, and it is a separate switch
// from the one in the sheet: it silences the game without touching — or being visible in
// — the player's own preference, so the two are kept apart and OR'd together.
let portalMuted = false;

music.volume = 0.35; // a loop that plays for an hour has to sit under the UI

function applyMusic() {
  storage.setItem(MUTED, muted ? '1' : '0');
  // aria-pressed is the whole state: the stylesheet strikes the icon through from it
  $('musicToggle').setAttribute('aria-pressed', String(!muted));
  if (muted || portalMuted) return music.pause();
  music.play().catch(() => {
    /* still waiting on a gesture — startMusic below picks it up */
  });
}

/**
 * Playback needs a user gesture to begin, and on iOS it needs one *again* every time the
 * player comes back: backgrounding the tab — or a phone call — interrupts the audio, and
 * WebKit will not restart it off a visibilitychange alone, only off a real touch. So this
 * is not the one-shot unlock it looks like; it stays subscribed for the whole session and
 * quietly re-arms the loop on the first interaction after any interruption.
 */
function resumeMusic() {
  // the saved mute preference isn't read until boot() — starting the loop before that
  // plays music at someone who switched it off last session
  if (!booted || muted || portalMuted || !music.paused) return;
  music.play().catch(() => {
    /* not a qualifying gesture yet — the next one will do */
  });
}

for (const event of ['pointerdown', 'touchend', 'keydown']) {
  window.addEventListener(event, resumeMusic);
}

// a best-effort restart on the way back; on Android it is enough on its own, and on iOS
// it loses to the gesture requirement and the listeners above pick it up instead
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeMusic();
  syncGameplay(); // a backgrounded tab is not gameplay, and ads background us
});

$('settings').onclick = () => {
  sheet.showModal();
  syncGameplay(); // the sheet is a pause as far as the portal is concerned
};
$('sheetClose').onclick = () => sheet.close();
// clicking the backdrop lands on the dialog itself, never on its contents
sheet.onclick = (e) => e.target === sheet && sheet.close();
// one listener for every way out of the dialog, Escape included
sheet.addEventListener('close', syncGameplay);

$('musicToggle').onclick = () => {
  muted = !muted;
  applyMusic();
};

/**
 * Effects are their own switch, kept apart from the music the same way the portal's mute
 * is: a player who silences an hour-long loop usually still wants to hear the taps. The
 * portal's mute outranks both, since it is also what plays during ads.
 */
function applySound() {
  storage.setItem(SILENT, silent ? '1' : '0');
  $('soundToggle').setAttribute('aria-pressed', String(!silent));
  sfx.setMuted(silent || portalMuted);
}

$('soundToggle').onclick = () => {
  silent = !silent;
  applySound();
  if (!silent) sfx.pick(); // hearing it back is the confirmation
};

/**
 * gameplayStart / gameplayStop have to alternate, so nothing fires them by hand: the state
 * is derived from the three things that decide it — the boot screen is gone, the settings
 * sheet is shut, and the tab is in front — and only a change is reported.
 */
let booted = false;
let playing = false;

function syncGameplay() {
  const active = booted && !sheet.open && document.visibilityState === 'visible';
  if (active === playing) return;
  playing = active;
  if (active) game.gameplayStart();
  else game.gameplayStop();
}

// throwing a cat away lives in the topbar key on the left, and nowhere else
$('topRestart').onclick = () => {
  resetBuild();
  commit({ regrid: true });
  toast('Fresh cat — start styling');
};

/**
 * Keys the browser acts on itself, which the game has to take back. Arrows and Space
 * scroll the page, and inside the CrazyGames iframe that scrolls their page around the
 * game. Escape is deliberately not bound to anything: the browser spends it on leaving
 * fullscreen, so a game that also used it would fight the platform. The sheet still
 * closes on Escape, which is the one behaviour players expect from a dialog.
 */
const HELD_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

window.addEventListener(
  'keydown',
  (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // browser shortcuts stay the browser's
    if (HELD_KEYS.has(e.code)) e.preventDefault();
    if (sheet.open) return; // the dialog's own buttons own the keyboard while it's up
    // the boot screen swallows taps by covering the page, but not keys: an arrow pressed
    // while it is still up would walk a run that has not been restored from storage yet
    if (!booted) return;
    if (e.code === 'ArrowRight') nextStep();
    if (e.code === 'ArrowLeft') goStep(step - 1);
  },
  { passive: false }
);

/**
 * The rest of the default browser behaviour CrazyGames asks games to suppress.
 *
 * The wheel guard is narrower than the snippet in their docs: this game has two real
 * scrollers — the part grid and the category strip — and blanking every wheel event
 * would freeze both. Anything landing outside them has nowhere legitimate to scroll,
 * so it gets swallowed.
 */
window.addEventListener(
  'wheel',
  (e) => {
    if (!e.target.closest?.('.grid, .tabs')) e.preventDefault();
  },
  { passive: false }
);

// right-clicking the artwork offers "Save image as…" on a canvas the game already has a
// save button for, and on tablets a long press raises the same menu
window.addEventListener('contextmenu', (e) => e.preventDefault());

/* --------------------------------------------------------------- preload */

/**
 * Pull every part into the cache at launch (355 files / ~1.3MB), so picking and
 * randomizing never waits on the network afterwards. Runs through a small worker
 * pool — 355 parallel fetches would just queue up in the browser anyway.
 */
async function preloadAll(onProgress) {
  const jobs = layers.flatMap((l) => l.files.map((f) => [l.id, f]));
  let cursor = 0;
  let done = 0;
  const worker = async () => {
    while (cursor < jobs.length) {
      const [id, file] = jobs[cursor++];
      await loadPart(id, file);
      onProgress(++done, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: 16 }, worker));
  return jobs.length;
}

/**
 * The whole tutorial: one line, once, the first time this device opens the game. The run
 * is otherwise self-explanatory — a grid of parts and a Next button — and the guidance is
 * to teach inside gameplay rather than in front of it, so there is no tutorial to skip.
 * It shows on the same screen the player is already looking at and clears itself.
 */
const SEEN = `${STORE}:seen`;

function showFirstRunHint() {
  if (storage.getItem(SEEN) === '1') return;
  storage.setItem(SEEN, '1');
  setTimeout(() => toast('Tap a part to wear it, then Next ▶'), 500);
}

/**
 * Loading screen. A returning player with a cat in storage is asked first: pick the
 * run back up, or bin it and start over. Without that fork the saved cat is simply
 * imposed on them, and the only way back to a blank slate is buried in Settings.
 * The screen then waits on that answer instead of auto-dismissing.
 */
async function runBootScreen({ resume = false } = {}) {
  const boot = $('boot');
  const bar = $('bootBar');
  const count = $('bootCount');
  let dismissed = false;

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 350);
    booted = true;
    syncGameplay(); // loading is over — this is the first gameplayStart the portal wants
    showFirstRunHint();
  };

  if (resume) {
    $('bootChoice').hidden = false;
    $('bootContinue').onclick = dismiss;
    $('bootFresh').onclick = () => {
      resetBuild();
      commit({ regrid: true });
      dismiss();
    };
  }

  // the portal is told the bar on screen is ours, so a long preload does not read as a
  // stalled game — and so the download it measures ends where loading actually ends
  game.loadingStart();
  const total = await preloadAll((n, all) => {
    bar.style.width = `${(n / all) * 100}%`;
    count.textContent = `${n} / ${all}`;
  });
  game.loadingStop();

  if (resume) {
    $('bootSub').textContent = 'You have a cat in progress.';
    return total; // the player's choice dismisses it
  }
  $('bootSub').textContent = 'Ready!';
  dismiss();
  return total;
}

/* ------------------------------------------------------------------ boot */

/**
 * Nothing is read from storage before the SDK has settled. On the portal the save data
 * lives in SDK.data rather than localStorage, and that module only exists after init() —
 * so a read that jumped the gun would come back empty, and the write that followed would
 * strand the player's cat in whichever store it landed in. sdkReady never rejects and
 * gives up after a few seconds, so the wait can't cost the game its boot.
 */
(async () => {
  await sdkReady;

  loadMints();
  muted = storage.getItem(MUTED) === '1';
  silent = storage.getItem(SILENT) === '1';
  applyMusic();
  applySound();

  // strictly after the two switches are read: this fires its handler straight away, and
  // applyMusic writes the preference back out — before the read that would be a default
  // stamped over whatever the player had chosen
  onPortalMute((portal) => {
    portalMuted = portal;
    applyMusic();
    applySound();
  });

  const fromHash = steps.findIndex((l) => l.id === decodeURIComponent(location.hash.slice(1)));
  const restored = restore();
  if (!restored) resetBuild();
  // an explicit #category in the URL wins, as long as the run has already got there
  if (fromHash > -1 && fromHash <= reached) step = fromHash;
  commit({ regrid: true, issue: !fromLink });
  // someone else's shared cat is not the player's run to resume, and a run still on its
  // first category has nothing worth asking about — both skip straight into the game
  runBootScreen({ resume: restored && !fromLink && (reached > 0 || finished) });
})();
