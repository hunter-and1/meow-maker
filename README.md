# MeowMaker

A tiny Vite app that stacks SVG parts into a random chibi-cat avatar. Exports land as
`meowmaker-<code>.png`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
```

## Shipping to CrazyGames

The build targets a **Basic Implementation** launch: no ads, no accounts, no purchases.
The SDK covers the game and data modules, behind the facade in `src/sdk.js` — off the
portal `window.CrazyGames` is absent and every call there is a no-op. What that costs the
code, and what not to undo:

- **`gameplayStart` / `gameplayStop` are mandatory.** Submission QA fails on "First
  gameplay start" without them, and the first start is what times the initial download, so
  it has to fire when the boot screen clears — not when the script runs. `syncGameplay()`
  in `src/main.js` derives the state (booted, sheet shut, tab visible) instead of firing
  the two by hand, so the pair can't fall out of step. `loadingStart` / `loadingStop`
  bracket the part preload; `happytime` fires on the two wins — the run completing and the
  photo saving.
- **Save data goes through `SDK.data`, not `localStorage`.** Inside the CrazyGames app the
  iframe's own localStorage isn't persisted, so a cat saved there is gone by the next
  session. `storage` in `src/sdk.js` is the only way the game touches either, and it latches
  one backend on first use — reading one and writing the other would strand the save and
  hand out duplicate mint numbers. That is why the whole boot block waits on `sdkReady`
  before it reads a byte: `SDK.data` doesn't exist until `init()` resolves. `sdkReady`
  never rejects and gives up after 3s, so a dead SDK can't cost the game its boot.
- **Every path is relative.** CrazyGames serves the bundle from a nested CDN path
  (`…/game-files.crazygames.com/<slug>/<build>/index.html`), where a leading `/` resolves
  against the CDN root and 404s. `vite.config.js` sets `base: './'` for everything Vite
  emits; the hand-written paths (`parts/…`, `./music-loop.mp3`) are relative in source.
  Verify a build by serving `dist/` from a subdirectory, not from the server root — the
  root case passes either way and hides the bug.
- **Two images are bundled, not public.** `src/logo.png` and `src/num-cat.png` live in
  `src/` because `style.css` masks the wordmark with the logo and paints the plate with
  the other. A `url()` in the stylesheet can't reach `public/` without an absolute path,
  and routing it through a CSS custom property does not work — Chrome resolves a relative
  `url()` in a variable against the file that *uses* it, so it resolved to `assets/`.
- **No external requests.** Fredoka and Nunito are self-hosted from `src/fonts`; they used
  to come from Google Fonts, which sits on the critical path to first paint and is blocked
  in some regions CrazyGames serves. Nothing else may reach off-origin.
- **No way out of the game.** The topbar Home link is gone and the Privacy/Terms
  placeholders with it — navigation out of the iframe is broken and largely disallowed.
  Real Privacy/Terms links are permitted in the settings sheet once they point somewhere.
- **The browser's defaults are suppressed** in `src/main.js`: arrows and Space no longer
  scroll the host page, the context menu is off, and wheel events outside the part grid and
  the category strip are swallowed. `body` sets `user-select: none` so a tablet long-press
  can't raise the magnifier. Escape is deliberately unbound — the browser spends it on
  leaving fullscreen. There is no in-game fullscreen button; CrazyGames provides one, and
  a custom one is prohibited.
- **The layout splits in two in landscape.** Every iframe size CrazyGames measures against
  is wide and short — 907x510 and 1216x684 windowed, 1366x768 and 1920x1080 fullscreen —
  and the portrait phone column spends all of it on margins. Past 640px wide in landscape
  the cat takes the left column and the picker the right; past 1100x700 the chrome steps
  up a size rather than the frame just growing emptier. Portrait is untouched.
- **Music re-arms after an interruption.** iOS suspends audio when the tab is backgrounded
  and won't restart it on a visibility change alone, only on a real gesture, so the resume
  listeners stay subscribed for the whole session rather than firing once.

Current budget: **355 files / 4.1 MB**, against limits of 1500 files and (with no SDK)
50 MB total. `public/btn-setting-icon.png` is currently unreferenced and still ships.

## How it works

All art lives in `public/parts/<NN-layer-name>/<n>.svg`. Every part is authored on the
same 500x500 grid, so an avatar is just the inner markup of one file per layer
concatenated into a single `<svg>` — no positioning math needed.

`scripts/build-manifest.mjs` scans that folder and writes `src/manifest.json`
(layer order, label, whether the layer can be skipped, file list). It runs
automatically before `dev` and `build`, so **adding art = dropping an `.svg` in a
layer folder**; adding a whole new layer = a new folder plus one line in the
`config` map in that script.

## Layers (draw order, bottom to top)

| Folder | Was | Parts |
| --- | --- | --- |
| `01-background-base` | `backgroud` | 1 |
| `02-background-pattern` | `backgroud 2` | 37 |
| `03-background-frame` | `backgroud 3` | 7 |
| `04-ears` | `ldnin` (lwednin) | 26 |
| `05-neckwear` | `grapat` (cravate) | 15 |
| `06-head` | `chap` | 10 |
| `07-face-fur` | `skin` | 82 |
| `08-mouth` | `fm` (fomm) | 31 |
| `09-whiskers` | `zghb` | 14 |
| `10-eyes` | `eyes` | 34 |
| `11-nose` | `nif` | 13 |
| `12-glasses` | `ndadr` (ndader) | 25 |
| `13-hat` | `chapo` (chapeau) | 36 |
| `14-sparkle` | `backgroud 4` | 14 |

Three deliberate order choices:

- **Neckwear before the head** — the knot sits behind the chin and only the bow/tie hangs
  out below, instead of the collar covering the muzzle.
- **Mouth before whiskers** — whiskers lie on top of the muzzle, so a wide mouth can't
  paint over them.
- **Sparkles last** — they glint in front of the character instead of being hidden behind
  the head, which is why the folder moved out of the background block to the very top.

**Face fur is clipped to the head.** Fur was drawn against one head shape, so on a wider
or shorter head the muzzle used to poke out past the outline. `clipToHead()` in
`src/main.js` lifts the head's path data into a `<clipPath>` and wraps the fur in it —
in the avatar and in the fur thumbnails, so the preview matches what you wear. It assumes
heads stay single filled paths; if a head ever becomes a group of shapes, extend that regex.

**Empty parts are dropped at build time.** Ten exports were just an empty `<g>` and showed
up as blank cells; they were deleted, and `build-manifest.mjs` now skips any file with no
drawable element and prints what it skipped. Optional layers already offer a "none" cell,
so nothing was lost — `01-background-base` became `optional: true` to keep the "no
background" choice its blank file used to provide.

Reordering layers or deleting parts changes the positional share code, so bump both
`STORE` and `CODE_V` in `src/main.js` when you do it.

## Run order (the order you style them in)

Draw order makes a poor running order — it opens on wallpaper and only reaches the cat
itself halfway through. `STEP_ORDER` in `src/main.js` gives the tab strip its own
sequence, working outwards from the animal, while the stack above stays untouched:

**Head → Ears → Face fur → Eyes → Nose → Mouth → Whiskers → Glasses → Hat → Neckwear →
Background → Pattern → Frame → Sparkle**

So: the cat, then its face, then what it wears, then the scene it sits in. Any layer the
manifest adds that isn't listed is appended to the end rather than dropped from the run.

Recutting this order is free — no `STORE`/`CODE_V` bump. The share code is positional over
the *draw* order, and how far a run got is saved as category ids, not positions.

345 parts ≈ 6.92e17 possible avatars.

## Layout

Portrait-first. The page is a single phone-width column (`max-width: 480px`) that fills
`100dvh` exactly: `body` never scrolls, and the thumbnail grid is the only scroller, so the
avatar and the tab strip stay put while you browse parts. The avatar is sized
`min(100%, 360px, 36dvh)` — a short screen shrinks the avatar rather than the grid.
Hover styles are behind `@media (hover: hover)` so they don't stick after a tap, targets
grow to 40px+ under `pointer: coarse`, padding respects `env(safe-area-inset-*)`, and
below 430px the Download and Copy buttons drop to their icons so the action row can't wrap
onto a second line.

## Controls

- **Tabs** — one per layer; the badge shows the current part (`—` = none). Fourteen cards
  don't fit a phone-width column, so the strip scrolls: by finger on touch, and on desktop
  by wheel (vertical scrolls it sideways) or by grabbing and dragging it. A drag past
  4px is a pan, not a tap. It only pulls itself back to the current category when that
  category has scrolled out of sight, so browsing ahead isn't undone by your next pick.
- **Thumbnail grid** — click any part to wear it, previewed against a faded head on a
  tinted backdrop so pale fur and white whiskers stay visible. The ghost head is stacked
  on the side it really sits, so ears and neckwear preview as actually worn. Full-canvas
  layers (background, pattern, frame, sparkles) skip the head and sit on a dark card
  instead — frames and sparkles are pure white and were invisible on the pale one.
- **Reroll** (`R`) — reroll just the open layer.
- **Randomize** (`Space`) — reroll every layer; a reroll always lands on a
  different part, so the avatar visibly changes.
- **Download PNG** — exports at 1000x1000, named after the avatar's code.
- **Copy link** — the current avatar is encoded in the URL (`?a=6~1.a.0.…#10-eyes`), so a
  link restores the exact same character and open tab. The leading `6` is `CODE_V`; bump it
  with `STORE` whenever layers are reordered or a pool changes size (adding a `none` cell
  counts), and older links are ignored instead of restoring a scrambled avatar.
- Every layer is optional, so **nothing picked anywhere = a blank canvas**: the serial
  plate hides and the camera stays locked and grey until at least one part is on.
- Your last avatar and tab are saved to `localStorage` and restored on reload.

## Loading behaviour

- **Launch preload** — a boot screen fetches all 345 parts (~1.3 MB) through a 16-way
  worker pool and shows real progress, so nothing waits on the network once you are in.
  The screen dismisses itself as soon as the preload finishes.
- **Continue or start fresh** — if a run is already underway in `localStorage`, the boot
  screen offers that fork and waits for an answer instead of auto-dismissing. Shared
  links and runs still on the first category skip it.
- Thumbnails still fill **only when their cell nears the viewport** (`IntersectionObserver`,
  150px margin), with a shimmer skeleton until then. After the preload that costs no
  requests — it just avoids building 82 SVGs at once when a tab opens.
- Every part is cached in memory and shared between the avatar and the thumbnails.
- The avatar shows a spinner only if a render takes longer than 120ms (no flicker on fast
  renders); Download PNG shows a pending state while rasterizing.
