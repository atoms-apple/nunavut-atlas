#!/usr/bin/env node
/**
 * Browser smoke test of the core user journey against the production build.
 *
 *   npm run build && npm run e2e
 *
 * Requires a Chromium browser. Uses Playwright's bundled browser by default;
 * set CHROMIUM_PATH to use another executable. Online tile requests are
 * blocked on purpose so the offline fallback is exercised deterministically.
 * Set SCREENSHOT_DIR to save screenshots.
 */
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.E2E_PORT ?? 4317);
const BASE = process.env.BASE_PATH ?? '/nunavut-atlas/';
const URL = `http://127.0.0.1:${PORT}${BASE}`;
const shotDir = process.env.SCREENSHOT_DIR;

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Preview server did not start at ${url}`);
}

async function shot(page, name) {
  if (!shotDir) return;
  await mkdir(shotDir, { recursive: true });
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
}

const server = spawn(
  process.execPath,
  [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, BASE_PATH: BASE } },
);

let browser;
try {
  await waitForServer(URL);
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

  // ---------- Desktop journey ----------
  const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/tile|Failed to load resource/i.test(m.text())) consoleErrors.push(m.text());
  });
  // Block online tile providers so the offline fallback is tested deterministically.
  await page.route(/tile\.openstreetmap\.org|gibs\.earthdata\.nasa\.gov/, (route) => route.abort());

  await page.goto(URL);
  await page.getByRole('heading', { name: 'Nunavut Atlas', level: 1 }).waitFor();
  check('App shell renders', true);

  await page.locator('.atlas-marker--community').first().waitFor();
  const markerCount = await page.locator('.atlas-marker--community').count();
  check('25 community markers on the map', markerCount === 25, `found ${markerCount}`);

  await page.locator('.atlas-outline').first().waitFor({ timeout: 10000 });
  check('Territorial outline layer loads', true);

  const banner = page.getByRole('alert').filter({ hasText: 'tiles could not be loaded' });
  await banner.waitFor({ timeout: 15000 });
  check('Tile failure banner is shown when tiles are blocked', true);
  await page.locator('.atlas-land').first().waitFor({ timeout: 10000 });
  check('Offline land outline is drawn as a fallback', true);
  await shot(page, '01-desktop-initial-offline');

  const search = page.getByRole('combobox', { name: /search/i });
  await search.fill('  IQAL ');
  const option = page.getByRole('option', { name: /Iqaluit/ });
  await option.first().waitFor();
  check('Search finds Iqaluit (case/whitespace-insensitive)', true);
  await search.press('Enter');

  const panelHeading = page.getByRole('heading', { name: 'Iqaluit', level: 2 });
  await panelHeading.waitFor();
  check('Selecting result opens the Iqaluit panel', true);
  const panelText = await page.locator('.panel--right').innerText();
  check('Panel shows 2021 population 7,429', panelText.includes('7,429'));
  check('Panel shows sources', /Canadian Geographical Names Database/.test(panelText));
  check('URL hash reflects selection', (await page.evaluate(() => location.hash)) === '#/community/iqaluit');
  await page.waitForTimeout(1200);
  await shot(page, '02-desktop-iqaluit');

  await search.fill('zzzz');
  const empty = await page.locator('.search__empty').innerText();
  check('Search shows a helpful empty state', /No matches/.test(empty) && /Search covers/.test(empty));
  await search.fill('');

  await search.fill('Cape Dorset');
  await page.getByRole('option', { name: /Kinngait/ }).first().waitFor();
  check('Search matches former names (Cape Dorset → Kinngait)', true);
  await search.press('Enter');
  await page.getByRole('heading', { name: 'Kinngait', level: 2 }).waitFor();
  const kText = await page.locator('.panel--right').innerText();
  check('Missing population shown gracefully', /census population has not yet been added/.test(kText));

  // Layers
  await page.getByRole('button', { name: 'Layers' }).click();
  const featureLabelsBefore = await page.locator('.atlas-marker--feature').count();
  await page.getByRole('switch', { name: 'Islands, peninsulas and waters' }).click();
  const featureLabelsAfter = await page.locator('.atlas-marker--feature').count();
  check('Toggling a layer hides it', featureLabelsBefore > 0 && featureLabelsAfter === 0, `${featureLabelsBefore} → ${featureLabelsAfter}`);
  const plannedDisabled = await page.getByRole('switch', { name: /Airports and aerodromes/ }).isDisabled();
  check('Planned layers are disabled', plannedDisabled);
  await shot(page, '03-desktop-layers');
  await page.getByRole('switch', { name: 'Islands, peninsulas and waters' }).click();

  // Close panels
  await page.getByRole('button', { name: 'Close Kinngait panel' }).click();
  check('Details panel closes', (await page.locator('.panel--right').count()) === 0);
  check('URL hash cleared on close', (await page.evaluate(() => location.hash)) === '');

  // Reset map
  const visibleMarkerCount = () =>
    page.evaluate(() => {
      const map = document.querySelector('.leaflet-container')?.getBoundingClientRect();
      if (!map) return 0;
      return [...document.querySelectorAll('.atlas-marker--community')].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.left >= map.left && r.right <= map.right && r.top >= map.top && r.bottom <= map.bottom;
      }).length;
    });
  const beforeReset = await visibleMarkerCount();
  await page.getByRole('button', { name: 'Reset map to show all of Nunavut' }).click();
  await page.waitForTimeout(1200);
  const afterReset = await visibleMarkerCount();
  check('Reset view shows all communities again', beforeReset < 25 && afterReset === 25, `${beforeReset} → ${afterReset} markers in view`);
  await shot(page, '03b-desktop-reset');

  // Communities list (non-map access)
  await page.getByRole('button', { name: 'Communities' }).click();
  await page.getByRole('radio', { name: 'Kitikmeot' }).check({ force: true });
  const visibleMarkers = await page.locator('.atlas-marker--community').count();
  check('Region filter limits map markers', visibleMarkers === 5, `found ${visibleMarkers}`);
  await shot(page, '04-desktop-communities');
  await page.getByRole('radio', { name: 'All regions' }).check({ force: true });

  // Keyboard access to a marker
  await page.locator('.atlas-marker--community[title^="Arviat"]').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Arviat', level: 2 }).waitFor({ timeout: 5000 });
  check('Markers are keyboard-operable', true);

  // About
  await page.getByRole('button', { name: 'About & data' }).click();
  await page.getByRole('heading', { name: 'About & data sources' }).waitFor();
  check('About & data sources panel opens', true);

  check('No uncaught runtime errors (desktop)', consoleErrors.length === 0, consoleErrors.join(' | '));
  await context.close();

  // ---------- Mobile ----------
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const m = await mobile.newPage();
  await m.route(/tile\.openstreetmap\.org|gibs\.earthdata\.nasa\.gov/, (route) => route.abort());
  await m.goto(`${URL}#/community/pond-inlet`);
  await m.getByRole('heading', { name: 'Pond Inlet', level: 2 }).waitFor();
  check('Deep link opens a community on mobile', true);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('No horizontal overflow on mobile', !overflow);
  await m.waitForTimeout(1200);
  await shot(m, '05-mobile-pond-inlet');
  await m.getByRole('button', { name: 'Close Pond Inlet panel' }).click();
  await m.getByRole('button', { name: 'Layers' }).click();
  await m.getByRole('heading', { name: 'Layers', level: 2 }).waitFor();
  check('Layers sheet opens on mobile', true);
  await shot(m, '06-mobile-layers');
  await mobile.close();
} catch (err) {
  check('Smoke test completed without exceptions', false, err instanceof Error ? err.message : String(err));
} finally {
  await browser?.close();
  server.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
