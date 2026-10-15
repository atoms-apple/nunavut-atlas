# Contributing to Nunavut Atlas

Thank you for helping. The atlas is only as trustworthy as its data, so most of this guide is about adding data safely.

## Ground rules

- **Never invent data.** Do not add coordinates, populations, boundaries or infrastructure points unless a source supports them. "Not yet added" is an acceptable state.
- **Every value cites a source** from the register in `src/data/sources/sources.ts`.
- **Check the licence before bundling.** Public access does not mean you may redistribute. Record the licence in the register and in `docs/DATA_SOURCES.md`.
- **Label derived and schematic data honestly.** See [`docs/DATA_CLASSIFICATION.md`](docs/DATA_CLASSIFICATION.md).
- **Inuit knowledge and language.** Inuit place names, Inuktut spellings and cultural information should come from, or be reviewed by, appropriate Inuit organizations or language authorities. Do not add Inuit artwork, photographs or cultural material without permission and attribution.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173/
npm run check      # lint + type-check + data validation + tests
```

## Add or update a community record

1. Edit `src/data/communities/communities.json`. The format is in [`docs/DATA_SCHEMA.md`](docs/DATA_SCHEMA.md).
2. For each value, add the source ids and a `verification` level:
   - `official-record`: you read it from the responsible authority's record (CGNDB for coordinates, Statistics Canada for census counts).
   - `cross-checked`: two independent sources agree.
   - `single-source`: one credible source.
3. If sources disagree, write the disagreement in `note`. Users will see it.
4. Leave `population` or `location` as `null` if you cannot verify them. The UI handles this.
5. Update `lastReviewed` to today's date.
6. Run `npm run validate:data`.
7. Update the values table in `docs/DATA_SOURCES.md`.

## Add a source

Add an entry to `DATA_SOURCES` in `src/data/sources/sources.ts` with publisher, URL, licence, access date, coverage, classification, access method and known limitations. Add a matching row and notes to `docs/DATA_SOURCES.md`. `npm run validate:data` checks that every referenced source id exists.

## Add a GeoJSON layer

1. **Get the data** from a source whose licence allows redistribution. Record it in the source register.
2. **Reproject** to WGS84 longitude/latitude (EPSG:4326) if needed. GeoJSON positions must be `[longitude, latitude]`.
3. **Clip and simplify.** National datasets are far too large to ship whole. With mapshaper (installed as a dev dependency):

   ```bash
   npx mapshaper input.shp \
     -proj wgs84 \
     -clip bbox=-125,51,-60,84 \
     -simplify 10% keep-shapes \
     -filter-islands min-area=5km2 remove-empty \
     -filter-fields name,id \
     -o public/data/my-layer.geojson format=geojson precision=0.0001
   ```

   Aim for **under about 300 KiB per layer** (a test enforces this for the current files). Every 100 KiB of GeoJSON adds download time on slow northern connections, and parsing and rendering large polygon sets in the browser is slow on modest phones. Prefer:
   - lower `precision` (4 decimal places is about 11 m; 3 is about 110 m),
   - stronger `-simplify` for overview layers,
   - removing properties the app does not show,
   - splitting detailed data into separate layers that load only when switched on.

   For reproducibility, add the steps to `scripts/build-geodata.mjs` (or a sibling script) rather than running them by hand.
4. **Register the layer** in `src/data/layers/registry.ts` with `status: 'available'`, `storage: 'static-file'`, a `dataPath`, a `classification` and `sourceIds`. If the data is not ready, keep or add it as `planned` with a `plannedNote`.
5. **Render it.** Load it with `useGeoJsonResource(path, enabled, validationOptions)` in `src/app/App.tsx` and pass it to `AtlasMap`. Add the drawing code to `src/components/map/` and a legend entry in `Legend.tsx`. The loader validates the file and reports errors without breaking the app.
6. **Test it.** Add the file to `tests/data-integrity.test.ts` with the validation options it should satisfy.

## Validate data

```bash
npm run validate:data
```

This runs `tests/data-integrity.test.ts` and `tests/community-dataset.test.ts`. They check the source register, the layer registry, the community records (coordinates, ranges, duplicates, sources, regions) and every bundled GeoJSON file (geometry types, nesting, coordinate order and range, ids, required properties, file size).

## Run tests

```bash
npm test             # all unit, component and integration tests (Vitest + jsdom)
npm run build
npm run e2e          # optional browser smoke test against dist/ (needs Chromium)
```

## Submit changes

1. Create a branch, make your change, and run `npm run check` and `npm run build`.
2. Open a pull request using the template. For data changes, link the source of every new value.
3. CI runs lint, type-check, data validation, tests and a production build on every pull request.

Data correction reports are welcome as issues even if you cannot make the change yourself. Use the **Data correction** issue template.
