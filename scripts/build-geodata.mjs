#!/usr/bin/env node
/**
 * Rebuilds the generalized GeoJSON layers in public/data/ from Natural Earth.
 *
 * Natural Earth is public domain (https://www.naturalearthdata.com/about/terms-of-use/).
 * Source files are pinned to a release tag so the output is reproducible.
 * Downloads are cached in .cache/geodata/ (git-ignored).
 *
 * Usage: npm run build:geodata
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mapshaper from 'mapshaper';

const NE_TAG = 'v5.1.2';
const NE_BASE = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_TAG}/geojson`;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, '.cache', 'geodata');
const outDir = path.join(root, 'public', 'data');

/** Bounding box used to clip context land: [west, south, east, north]. */
const CONTEXT_BBOX = [-170, 35, -10, 85];

/** Natural Earth NAME -> display name. Only features listed here are exported. */
const PHYSICAL_LAND = {
  'BAFFIN ISLAND': 'Baffin Island',
  'ELLESMERE  ISLAND': 'Ellesmere Island',
  'VICTORIA ISLAND': 'Victoria Island',
  'BANKS ISLAND': 'Banks Island',
  'Southampton I.': 'Southampton Island',
  'Devon Island': 'Devon Island',
  'Axel Heiberg I.': 'Axel Heiberg Island',
  'Melville Island': 'Melville Island',
  'Prince of Wales I.': 'Prince of Wales Island',
  'Somerset I.': 'Somerset Island',
  'King William I.': 'King William Island',
  'Bathurst I.': 'Bathurst Island',
  'Cornwallis I.': 'Cornwallis Island',
  'Bylot Island': 'Bylot Island',
  'Prince Charles I.': 'Prince Charles Island',
  'Coats I.': 'Coats Island',
  'Mansel I.': 'Mansel Island',
  'Belcher Islands': 'Belcher Islands',
  'Boothia Peninsula': 'Boothia Peninsula',
  'Melville Peninsula': 'Melville Peninsula',
  'Foxe Pen.': 'Foxe Peninsula',
  'Meta Incognita Pen.': 'Meta Incognita Peninsula',
  'Cumberland Peninsula': 'Cumberland Peninsula',
};

const PHYSICAL_MARINE = {
  'Hudson Bay': 'Hudson Bay',
  'Baffin Bay': 'Baffin Bay',
  'Davis Strait': 'Davis Strait',
  'Hudson Strait': 'Hudson Strait',
  'Foxe Basin': 'Foxe Basin',
  'Gulf of Boothia': 'Gulf of Boothia',
  'Jones Sound': 'Jones Sound',
  'Cumberland Sound': 'Cumberland Sound',
  'Frobisher Bay': 'Frobisher Bay',
  'Viscount Melville Sound': 'Viscount Melville Sound',
  'Kane Basin': 'Kane Basin',
  'Wager Bay': 'Wager Bay',
  'Fury and Hecla Strait': 'Fury and Hecla Strait',
  'Eclipse Sound': 'Eclipse Sound',
  'Bathurst Inlet': 'Bathurst Inlet',
  'Amundsen Gulf': 'Amundsen Gulf',
};

const CATEGORY = {
  Island: 'island',
  'Island group': 'island-group',
  'Pen/cape': 'peninsula',
  bay: 'bay',
  strait: 'strait',
  sound: 'sound',
  gulf: 'gulf',
  channel: 'channel',
};

async function fetchCached(name) {
  await mkdir(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${name}.geojson`);
  if (existsSync(file) && (await stat(file)).size > 0) return file;
  const url = `${NE_BASE}/${name}.geojson`;
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}

async function run(cmd) {
  console.log(`mapshaper ${cmd}`);
  await mapshaper.runCommands(cmd);
}

const q = (s) => JSON.stringify(s);
const round = (n) => Math.round(n * 1000) / 1000;

async function main() {
  await mkdir(outDir, { recursive: true });
  const tmp = path.join(cacheDir, 'tmp');
  await mkdir(tmp, { recursive: true });

  const admin1 = await fetchCached('ne_10m_admin_1_states_provinces');
  const land50 = await fetchCached('ne_50m_land');
  const regions = await fetchCached('ne_10m_geography_regions_polys');
  const marine = await fetchCached('ne_10m_geography_marine_polys');

  // 1. Nunavut territorial outline (generalized, 1:10m source).
  const boundaryOut = path.join(outDir, 'nunavut-boundary.geojson');
  await run(
    `-i ${q(admin1)} -filter "name === 'Nunavut'" ` +
      `-filter-fields name,iso_3166_2 ` +
      `-simplify 20% keep-shapes ` +
      `-filter-islands min-area=3km2 remove-empty ` +
      `-o ${q(boundaryOut)} format=geojson precision=0.0001 id-field=iso_3166_2`,
  );

  // 2. Context land for the offline / schematic view (1:50m source).
  const landOut = path.join(outDir, 'context-land.geojson');
  await run(
    `-i ${q(land50)} -clip bbox=${CONTEXT_BBOX.join(',')} ` +
      `-filter-fields featurecla ` +
      `-simplify 35% keep-shapes ` +
      `-filter-islands min-area=40km2 remove-empty ` +
      `-each "fid='land-' + this.id" ` +
      `-o ${q(landOut)} format=geojson precision=0.001 id-field=fid`,
  );

  // 3. Physical geography label points: inner points of Natural Earth
  //    labelling polygons. These are label positions, not feature extents.
  const landPts = path.join(tmp, 'land-points.geojson');
  const marinePts = path.join(tmp, 'marine-points.geojson');
  await run(
    `-i ${q(regions)} -filter ${q(`${JSON.stringify(Object.keys(PHYSICAL_LAND))}.includes(NAME)`)} ` +
      `-each "sourceName=NAME, sourceClass=FEATURECLA, wikidata=WIKIDATAID, scalerank=SCALERANK" ` +
      `-points inner -filter-fields sourceName,sourceClass,wikidata,scalerank ` +
      `-o ${q(landPts)} format=geojson precision=0.001`,
  );
  await run(
    `-i ${q(marine)} -filter ${q(`${JSON.stringify(Object.keys(PHYSICAL_MARINE))}.includes(name)`)} ` +
      `-each "sourceName=name, sourceClass=featurecla, wikidata=wikidataid, scalerank=scalerank" ` +
      `-points inner -filter-fields sourceName,sourceClass,wikidata,scalerank ` +
      `-o ${q(marinePts)} format=geojson precision=0.001`,
  );

  const features = [];
  for (const [file, names, realm] of [
    [landPts, PHYSICAL_LAND, 'land'],
    [marinePts, PHYSICAL_MARINE, 'marine'],
  ]) {
    const fc = JSON.parse(await readFile(file, 'utf8'));
    for (const f of fc.features) {
      const p = f.properties;
      const name = names[p.sourceName];
      if (!name) continue;
      const [lon, lat] = f.geometry.coordinates;
      features.push({
        type: 'Feature',
        id: `ne-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        geometry: { type: 'Point', coordinates: [round(lon), round(lat)] },
        properties: {
          name,
          category: CATEGORY[p.sourceClass] ?? 'other',
          realm,
          sourceName: p.sourceName,
          wikidata: p.wikidata ?? null,
          // Natural Earth scalerank: lower = more prominent. Used to thin labels at small scales.
          labelRank: p.scalerank,
          sourceId: 'natural-earth-physical',
        },
      });
    }
  }
  features.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  const physicalOut = path.join(outDir, 'physical-features.geojson');
  await writeFile(physicalOut, JSON.stringify({ type: 'FeatureCollection', features }, null, 1) + '\n');

  for (const f of [boundaryOut, landOut, physicalOut]) {
    console.log(`${path.relative(root, f)}: ${((await stat(f)).size / 1024).toFixed(1)} KiB`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
