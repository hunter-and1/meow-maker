// Scans public/parts/<layer>/*.svg and writes src/manifest.json.
// Runs automatically before `npm run dev` and `npm run build`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const partsDir = path.join(root, 'public', 'parts');

// Each layer: how it is drawn and whether it can be left empty ("none").
// Every layer is optional, so the run can start from a genuinely blank canvas —
// with nothing picked anywhere the app treats the cat as not started yet.
const config = {
  // its blank part was deleted with the other empty files, so "no background" is the none cell now
  '01-background-base': { label: 'Background', optional: true },
  '02-background-pattern': { label: 'Pattern', optional: true },
  '03-background-frame': { label: 'Frame', optional: true },
  '04-ears': { label: 'Ears', optional: true },
  '05-neckwear': { label: 'Neckwear', optional: true }, // under the head, so it tucks below the chin
  '06-head': { label: 'Head', optional: true },
  '07-face-fur': { label: 'Face fur', optional: true },
  '08-mouth': { label: 'Mouth', optional: true }, // under the whiskers, which cross the muzzle
  '09-whiskers': { label: 'Whiskers', optional: true },
  '10-eyes': { label: 'Eyes', optional: true },
  '11-nose': { label: 'Nose', optional: true },
  '12-glasses': { label: 'Glasses', optional: true },
  '13-hat': { label: 'Hat', optional: true },
  '14-sparkle': { label: 'Sparkles', optional: true }, // last, so sparkles glint over the character
};

const numeric = (a, b) => parseInt(a, 10) - parseInt(b, 10);

// Some exports are just an empty <g>. They'd show up as a blank, unpickable cell in the
// grid, so keep only files that actually draw something.
const DRAWS = /<(path|circle|ellipse|rect|polygon|polyline|line|text|image|use)\b/;
const isEmpty = (file) => !DRAWS.test(fs.readFileSync(file, 'utf8'));
let skipped = 0;

const layers = fs
  .readdirSync(partsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort()
  .map((dir) => {
    const files = fs
      .readdirSync(path.join(partsDir, dir))
      .filter((f) => f.endsWith('.svg'))
      .filter((f) => {
        if (!isEmpty(path.join(partsDir, dir, f))) return true;
        console.warn(`  skipped empty part: ${dir}/${f}`);
        skipped++;
        return false;
      })
      .sort(numeric);
    const { label = dir, optional = true } = config[dir] ?? {};
    return { id: dir, label, optional, files };
  });

const out = path.join(root, 'src', 'manifest.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ layers }, null, 2));

const total = layers.reduce((n, l) => n + l.files.length, 0);
const combos = layers.reduce((n, l) => n * (l.files.length + (l.optional ? 1 : 0)), 1);
console.log(
  `manifest: ${layers.length} layers, ${total} parts, ${combos.toExponential(2)} combinations` +
    (skipped ? ` (${skipped} empty skipped)` : '')
);
