#!/usr/bin/env node
/**
 * Renders the "cell ring" logo into the device/store files in assets/brand/.
 * Uses a locally installed Chrome or Edge in headless mode (set CHROME_PATH to override).
 * Geometry and colours mirror src/components/logo.tsx — keep the two in sync.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const OUT_DIR = path.join(__dirname, '..', 'assets', 'brand');

const BACKGROUND = '#FFC93C';
const COLORS = { filled: '#6C3BFF', empty: '#FFE7A3', now: '#FFFFFF', centre: '#F0434A' };

const RING_ROWS = [[2, 6], [1, 7], [0, 8], [0, 8], [0, 8], [0, 8], [0, 8], [1, 7], [2, 6]];
const CELL_START = 12.8;
const CELL_STEP = 8.445;
const CELL_SIZE = 6.84;

function ringCells() {
  return RING_ROWS.flatMap(([from, to], row) =>
    Array.from({ length: to - from + 1 }, (_, i) => {
      const col = from + i;
      const x = CELL_START + col * CELL_STEP;
      const y = CELL_START + row * CELL_STEP;
      const dx = x + CELL_SIZE / 2 - 50;
      const dy = y + CELL_SIZE / 2 - 50;
      let angle = col === 4 && row <= 4 ? 0 : (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      const role = angle <= 248 ? 'filled' : angle <= 272 ? 'now' : 'empty';
      return { x, y, role };
    }),
  );
}

/**
 * The ring (cells + centre dot) in the 0–100 viewBox.
 * `mono` draws an alpha-only silhouette for Android themed icons: filled solid, empty faint, "now" slice left out.
 */
function ring({ mono = false } = {}) {
  const cells = ringCells()
    .filter((c) => !(mono && c.role === 'now'))
    .map((c) => {
      const fill = mono ? '#000000' : COLORS[c.role];
      const opacity = mono && c.role === 'empty' ? ' fill-opacity="0.35"' : '';
      return `<rect x="${c.x.toFixed(3)}" y="${c.y.toFixed(3)}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1.6" fill="${fill}"${opacity}/>`;
    })
    .join('');
  if (mono) {
    // Cut a gap around the centre dot, as the coloured version does with a background-coloured stroke.
    return `<mask id="gap"><rect width="100" height="100" fill="#fff"/><circle cx="50" cy="50" r="5" fill="#000"/></mask>`
      + `<g mask="url(#gap)">${cells}</g><circle cx="50" cy="50" r="4.2" fill="#000000"/>`;
  }
  return `${cells}<circle cx="50" cy="50" r="4.2" fill="${COLORS.centre}" stroke="${BACKGROUND}" stroke-width="1.6"/>`;
}

/** Wraps the ring scaled by `scale` around the canvas centre. */
function svg({ size, background, rounded = false, scale = 1, mono = false }) {
  const bg = background
    ? `<rect width="100" height="100" ${rounded ? 'rx="22"' : ''} fill="${background}"/>`
    : '';
  const t = `translate(50 50) scale(${scale}) translate(-50 -50)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${bg}<g transform="${t}">${ring({ mono })}</g></svg>`;
}

// The ring spans 12.8–87.2 of the viewBox (74.4 units, ~42.4 to the farthest cell corner).
const ASSETS = [
  // iOS + store icon: full bleed, the OS applies the corner mask.
  { file: 'icon.png', size: 1024, background: BACKGROUND },
  // Android adaptive icon: ring kept inside the 66/108 safe circle.
  { file: 'android-icon-background.png', size: 1024, background: BACKGROUND, empty: true },
  { file: 'android-icon-foreground.png', size: 1024, scale: 0.68 },
  { file: 'android-icon-monochrome.png', size: 1024, scale: 0.68, mono: true },
  // Splash: drawn on the yellow splash background (app.json), so the ring alone.
  { file: 'splash-icon.png', size: 512, scale: 1.3 },
  { file: 'favicon.png', size: 48, background: BACKGROUND, rounded: true },
];

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error('Chrome/Edge not found; set CHROME_PATH.');
  return found;
}

function render(browser, tmp, asset) {
  const body = asset.empty
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="${asset.size}" height="${asset.size}"><rect width="100%" height="100%" fill="${asset.background}"/></svg>`
    : svg(asset);
  const page = path.join(tmp, asset.file.replace('.png', '.html'));
  fs.writeFileSync(page, `<!doctype html><html><body style="margin:0;background:transparent">${body}</body></html>`);
  const out = path.join(OUT_DIR, asset.file);
  execFileSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${asset.size},${asset.size}`,
    `--screenshot=${out}`,
    pathToFileURL(page).href,
  ], { stdio: 'ignore' });
  if (asset.background && !asset.rounded) stripAlpha(out);
  console.log(`wrote assets/brand/${asset.file}`);
}

/** App Store icons must not have an alpha channel; Chrome always writes RGBA. */
function stripAlpha(file) {
  let PNG;
  try {
    ({ PNG } = require('pngjs'));
  } catch {
    console.warn(`pngjs not found; ${path.basename(file)} keeps its alpha channel`);
    return;
  }
  const image = PNG.sync.read(fs.readFileSync(file));
  fs.writeFileSync(file, PNG.sync.write(image, { colorType: 2 }));
}

const browser = findBrowser();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'timegami-brand-'));
try {
  for (const asset of ASSETS) render(browser, tmp, asset);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
