import { defineConfig } from 'vite';

/**
 * CrazyGames serves a game bundle from a nested path on their CDN
 * (…/game-files.crazygames.com/<slug>/<build>/index.html) and rejects any absolute
 * path, which would resolve against the CDN root and 404. `base: './'` makes Vite
 * emit every script, stylesheet and asset URL relative to index.html; the handful
 * of paths written by hand (public/ files, part SVGs) are relative in the source.
 */
export default defineConfig({
  base: './',
});
