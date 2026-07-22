/**
 * The CrazyGames SDK, behind one small facade.
 *
 * Two reasons it is not called directly from the game. First, none of it exists off the
 * portal: on localhost, or any host where sdk.crazygames.com does not load, window.CrazyGames
 * is simply absent and every call here has to become a no-op rather than a crash. Second,
 * the modules are only usable after an async init() that the game has to wait on before it
 * reads a single saved byte — see `storage` below for why that ordering matters.
 *
 * Nothing here ever throws. A portal telemetry call is not worth taking the game down for,
 * so every hop into the SDK is guarded and a failure is dropped on the floor.
 */

const INIT_TIMEOUT = 3000; // the game boots without the SDK rather than waiting on it forever

let sdk = null;

/**
 * Settles once the SDK is up — or once we have given up on it. Never rejects, and never
 * hangs: the game's whole boot waits on this, so an SDK that never answers must not be
 * able to leave the player staring at a loading bar.
 */
export const sdkReady = (async () => {
  const found = window.CrazyGames?.SDK;
  if (!found) return null;
  try {
    await Promise.race([
      found.init(),
      new Promise((_, reject) => setTimeout(reject, INIT_TIMEOUT, new Error('sdk init timeout'))),
    ]);
  } catch {
    return null; // present but unusable — the game runs on its own from here
  }
  sdk = found;
  return sdk;
})();

const call = (module, method, ...args) => {
  try {
    return sdk?.[module]?.[method]?.(...args);
  } catch {
    return undefined;
  }
};

/**
 * The game module: the portal's picture of what the player is doing.
 *
 * - `loadingStart` / `loadingStop` bracket the part preload, so the portal knows the bar
 *   on screen is ours and not a stalled game.
 * - `gameplayStart` / `gameplayStop` say whether the player is actually playing. The first
 *   `gameplayStart` is mandatory — submission QA fails on it — and it is what times the
 *   initial download, so it has to land when loading ends, not when the script runs.
 * - `happytime` marks a moment of celebration; the portal saves its own interruptions for
 *   the beats either side of one.
 *
 * Each pair has to alternate. The game never calls these by hand for that reason — see
 * syncGameplay() in main.js, which derives the state instead.
 */
export const game = {
  loadingStart: () => call('game', 'loadingStart'),
  loadingStop: () => call('game', 'loadingStop'),
  gameplayStart: () => call('game', 'gameplayStart'),
  gameplayStop: () => call('game', 'gameplayStop'),
  happytime: () => call('game', 'happytime'),
};

/**
 * The portal's own mute switch, which is separate from the game's and outranks it: it is
 * what silences the game during a video ad, so an ad is never talked over. Handed to us
 * once at startup and again on every change. Call after `sdkReady`.
 */
export function onPortalMute(handler) {
  if (!sdk) return;
  handler(Boolean(sdk.game.settings?.muteAudio));
  call('game', 'addSettingsChangeListener', (settings) => handler(Boolean(settings?.muteAudio)));
}

/**
 * Save data. `SDK.data` is a drop-in for localStorage, and the portal asks games to use it
 * instead: inside the CrazyGames app the iframe's own localStorage is not persisted, so a
 * cat saved there is gone by the next session.
 *
 * The backend is latched on first touch. Reading from one store and writing to the other
 * would strand the player's cat and hand out duplicate mint numbers, so whichever store is
 * available the first time the game reads is the one it keeps for the session — which is
 * why the game waits on `sdkReady` before it reads anything.
 */
let backend = null;
const store = () => (backend ??= sdk?.data ?? window.localStorage);

export const storage = {
  getItem: (key) => {
    try {
      return store().getItem(key);
    } catch {
      return null; // a blocked or full store reads as a player with nothing saved
    }
  },
  setItem: (key, value) => {
    try {
      store().setItem(key, value);
    } catch {
      /* Safari private mode and a full quota both land here; the run stays playable */
    }
  },
  removeItem: (key) => {
    try {
      store().removeItem(key);
    } catch {
      /* nothing to do about a store that won't drop a key */
    }
  },
  clear: () => {
    try {
      store().clear();
    } catch {
      /* as above */
    }
  },
};
