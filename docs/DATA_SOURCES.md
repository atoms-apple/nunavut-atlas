# Data sources

This is the narrative version of the data source register. The machine-readable register is `src/data/sources/sources.ts`. The app reads it to show sources in every panel and in **About & data**. When you add or change data, update both.

The code licence (MIT) **does not** apply to data. Every dataset below keeps its own terms.

## How data was collected for this release

The first release was built in a sandbox with restricted network access:

- **Reachable directly:** GitHub (Natural Earth releases) and the npm registry (the GeoNames extract).
- **Not reachable directly:** statcan.gc.ca, geonames.nrcan.gc.ca, gov.nu.ca, wikipedia.org and wikidata.org. Values from these sites were read from search-engine excerpts of the specific official pages (for example, the Statistics Canada *Focus on Geography* page for each hamlet, or the CGNDB record for each place). The excerpts quote the pages, e.g. *"In 2021, the enumerated population of Arctic Bay (Hamlet), was 994"*.

Every value is tied to its source and a verification level. Because the official pages were not opened directly, **re-check the values against the live pages before relying on them for decisions.** The table at the end of this file lists each value to make that easy.

## Register

| ID | Dataset | Publisher | Licence | Accessed | Classification | Used for |
| --- | --- | --- | --- | --- | --- | --- |
| `statcan-2021-fogs` | Focus on Geography Series, 2021 Census (census subdivisions, Nunavut) | Statistics Canada | [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/reference/licence) | 2026-10-14 | Official | 2021 populations; census subdivision codes |
| `nrcan-cgndb` | Canadian Geographical Names Database | Natural Resources Canada | [Open Government Licence – Canada](https://open.canada.ca/en/open-government-licence-canada) | 2026-10-14 | Official | Coordinates of 8 communities; former name of Iqaluit |
| `geonames-cities500` | GeoNames cities500 extract (npm `cities-500-structured@1.0.1`) | GeoNames | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 2026-10-14 | Derived | Coordinates of 11 communities; capital status of Iqaluit |
| `natural-earth-populated-places` | Natural Earth 1:10m Populated Places v5.1.2 | Natural Earth | Public domain | 2026-10-14 | Derived | Coordinate cross-checks only |
| `gov-nunavut-communities` | Community pages | Government of Nunavut | Website terms; facts cited, no text reproduced | 2026-10-14 | Official | Coordinates (arc-minute) for 4 communities; short descriptions; links |
| `wikidata` | Wikidata (Q804378 Baker Lake, Q1723761 Naujaat) | Wikimedia | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | 2026-10-14 | Derived | Coordinates citing CGNDB (Baker Lake) and for Naujaat |
| `nunavut-ca` | nunavut.ca Naujaat page | nunavut.ca | Facts cited | 2026-10-14 | Derived | Cross-check for Naujaat |
| `wikipedia-secondary` | Wikipedia community articles | Wikipedia contributors | CC BY-SA 4.0; facts cited only | 2026-10-14 | Incomplete | Coordinate cross-checks; Inuktut name forms marked "awaiting review" |
| `news-community-name-changes` | CBC North, Nunatsiaq News, Arctic Today | News outlets | Facts cited | 2026-10-14 | Derived | Former names and change years |
| `natural-earth-admin1` | Natural Earth 1:10m Admin 1 v5.1.2 (Nunavut) | Natural Earth | Public domain | 2026-10-14 | Derived | Territorial outline layer |
| `natural-earth-land` | Natural Earth 1:50m Land v5.1.2 | Natural Earth | Public domain | 2026-10-14 | Illustrative | Offline base map |
| `natural-earth-physical` | Natural Earth 1:10m Geography Regions + Marine Areas v5.1.2 | Natural Earth | Public domain | 2026-10-14 | Derived | Island, peninsula and water label points |
| `osm-tiles` | OpenStreetMap standard tiles | OpenStreetMap Foundation | ODbL; [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) | n/a (live) | Derived | Default online base map |
| `nasa-gibs-bluemarble` | Blue Marble Shaded Relief + Bathymetry via GIBS | NASA EOSDIS | [NASA data policy](https://earthdata.nasa.gov/engage/open-data-services-and-software/data-and-information-policy) | n/a (live) | Derived | Optional online base map |

### Notes by dataset

**Statistics Canada 2021 Census.** Reference date: census day, 11 May 2021. Only *enumerated population* values quoted from each hamlet's Focus on Geography page are used. Iqaluit's 7,429 was quoted from a Statistics Canada regional table. For Pangnirtung the Focus on Geography page gives 1,504 and a Statistics Canada languages publication gives 1,505; the atlas uses 1,504.

**CGNDB.** Coordinates are the representative point of the named place. Two records were deliberately *not* used, because they are different features with the same name: "Grise Fiord" (the fiord at 76°35′N) and "Qikiqtarjuaq" (an island in Hudson Strait).

**GeoNames.** The npm package only redistributes the GeoNames `cities500.txt` file. Attribution is to GeoNames under CC BY 4.0. The GeoNames population values are not used because they are not tied to a census year.

**Government of Nunavut.** Coordinates are given to the nearest arc-minute. The Naujaat page gives 66°32′N 85°50′W, which is about 18 km east of every other source, so it is not used. Population figures on these pages predate 2021 and are not used.

**Natural Earth.** Public domain; crediting is optional, and the atlas credits it anyway. The files are fetched at release tag `v5.1.2` and processed by `scripts/build-geodata.mjs`:

- Nunavut outline: 20% vertex retention, islands under 3 km² removed (about 121 KiB).
- Context land: clipped to 170°W–10°W, 35°N–85°N; 35% retention; islands under 40 km² removed (about 139 KiB).
- Physical features: the *inner point* of each selected labelling polygon. These are label positions, not feature extents or official coordinates. Lancaster Sound is not a separate feature in this release. Banks Island, Melville Island and Victoria Island are wholly or partly in the Northwest Territories. They appear because they are part of the regional geography, not as a statement about jurisdiction.

**Base map tiles.** Tiles are requested live by the visitor's browser and are never bundled. The OSM Tile Usage Policy suits light use with attribution. A heavily used deployment should switch providers in `src/config/basemaps.ts`.

## Values pending verification

These values were found **only** in secondary sources (Wikipedia via search excerpts). They are **not** in the atlas until someone confirms them against Statistics Canada:

| Community | Candidate 2021 population | Seen in |
| --- | --- | --- |
| Baker Lake | 2,061 | Wikipedia |
| Gjoa Haven | 1,349 (StatCan languages table: 1,340) | Wikipedia |
| Kinngait | 1,396 | Wikipedia, Canadian Encyclopedia |
| Naujaat | 1,225 | Wikipedia |
| Sanirajak | 891 | Wikipedia |

Coordinates that would benefit from a direct CGNDB check: Clyde River, Igloolik, Kinngait (single-source), and the arc-minute values for Grise Fiord, Kimmirut, Qikiqtarjuaq and Whale Cove.

## Community values in this release

| Community | Region | Lat, Lon (WGS84) | Coordinate sources | Verification | 2021 population |
| --- | --- | --- | --- | --- | --- |
| Arctic Bay | Qikiqtaaluk | 73.0375, -85.1506 | GeoNames, Natural Earth | cross-checked | 994 |
| Arviat | Kivalliq | 61.1088, -94.0585 | GeoNames, Natural Earth | cross-checked | 2,864 |
| Baker Lake | Kivalliq | 64.3194, -96.0208 | Wikidata, Natural Earth | cross-checked | — (pending) |
| Cambridge Bay | Kitikmeot | 69.1149, -105.0548 | GeoNames, Natural Earth | cross-checked | 1,760 |
| Chesterfield Inlet | Kivalliq | 63.3389, -90.7014 | CGNDB, Natural Earth | official-record | 397 |
| Clyde River | Qikiqtaaluk | 70.4723, -68.5899 | GeoNames | single-source | 1,181 |
| Coral Harbour | Kivalliq | 64.1333, -83.1667 | CGNDB, Natural Earth | official-record | 1,035 |
| Gjoa Haven | Kitikmeot | 68.6260, -95.8784 | GeoNames, Natural Earth | cross-checked | — (pending) |
| Grise Fiord | Qikiqtaaluk | 76.4167, -82.9000 | Gov. of Nunavut, Wikipedia | cross-checked | 144 |
| Igloolik | Qikiqtaaluk | 69.3777, -81.7999 | GeoNames | single-source | 2,049 |
| Iqaluit | Qikiqtaaluk | 63.7500, -68.5167 | CGNDB, GeoNames | official-record | 7,429 |
| Kimmirut | Qikiqtaaluk | 62.8500, -69.8800 | Gov. of Nunavut, Wikipedia, Natural Earth | cross-checked | 426 |
| Kinngait | Qikiqtaaluk | 64.2338, -76.5437 | GeoNames | single-source | — (pending) |
| Kugaaruk | Kitikmeot | 68.5347, -89.8250 | CGNDB | official-record | 1,033 |
| Kugluktuk | Kitikmeot | 67.8274, -115.0965 | GeoNames, Natural Earth | cross-checked | 1,382 |
| Naujaat | Kivalliq | 66.5219, -86.2350 | Wikidata, nunavut.ca, Natural Earth | cross-checked | — (pending) |
| Pangnirtung | Qikiqtaaluk | 66.1464, -65.7000 | GeoNames, Natural Earth | cross-checked | 1,504 |
| Pond Inlet | Qikiqtaaluk | 72.6992, -77.9595 | GeoNames, Natural Earth | cross-checked | 1,555 |
| Qikiqtarjuaq | Qikiqtaaluk | 67.5500, -64.0333 | Gov. of Nunavut, Wikipedia | cross-checked | 593 |
| Rankin Inlet | Kivalliq | 62.8091, -92.0853 | GeoNames, Natural Earth | cross-checked | 2,975 |
| Resolute | Qikiqtaaluk | 74.6958, -94.8292 | CGNDB | official-record | 183 |
| Sanikiluaq | Qikiqtaaluk | 56.5333, -79.2333 | CGNDB | official-record | 1,010 |
| Sanirajak | Qikiqtaaluk | 68.7903, -81.2375 | CGNDB, Natural Earth | official-record | — (pending) |
| Taloyoak | Kitikmeot | 69.5361, -93.5208 | CGNDB, Natural Earth | official-record | 934 |
| Whale Cove | Kivalliq | 62.1833, -92.5667 | Gov. of Nunavut, Wikipedia | cross-checked | 470 |

## Datasets considered but not used

| Dataset | Reason |
| --- | --- |
| Statistics Canada census division boundary files (region polygons) | Could not be downloaded from the build environment. This is the recommended source for the planned *Region boundaries* layer. |
| Natural Earth airports | Only 3 Nunavut airports, two of them under former names. Too incomplete to publish as an "Airports" layer. |
| Natural Earth populated-place population estimates | Not census figures. |
