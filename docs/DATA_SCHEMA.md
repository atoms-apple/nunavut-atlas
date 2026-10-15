# Data schema

All coordinates are WGS84 longitude/latitude in decimal degrees (EPSG:4326).

- In **GeoJSON**, positions are `[longitude, latitude]`.
- In **community records**, positions use named fields `lat` and `lon`, so the order cannot be confused.

The TypeScript definitions in `src/types/` are the source of truth. This document summarizes them.

## Community records: `src/data/communities/communities.json`

```jsonc
{
  "version": 1,
  "communities": [
    {
      "id": "iqaluit",                      // stable, lowercase-hyphenated; never change once published
      "name": "Iqaluit",                    // official name
      "regionId": "qikiqtaaluk",            // qikiqtaaluk | kivalliq | kitikmeot
      "municipalStatus": "City",            // optional: City | Hamlet
      "censusSubdivisionCode": "62xxxxx",   // optional: 7-digit StatCan CSD code starting with 62 (Iqaluit's is not yet recorded)
      "indigenousNames": [                  // may be empty (as it is for Iqaluit); example from arviat:
        {
          "name": "ᐊᕐᕕᐊᑦ",
          "language": "Inuktitut",          // Inuktitut | Inuinnaqtun | English (optional)
          "script": "syllabics",            // latin | syllabics (optional)
          "sourceIds": ["wikipedia-secondary"],
          "verification": "single-source",
          "note": "Secondary source; awaiting review by an Inuktut language authority."
        }
      ],
      "formerNames": [
        { "name": "Frobisher Bay", "sourceIds": ["nrcan-cgndb"], "verification": "cross-checked" }
        // "changedYear": 2015 may be added when a source states the year (see naujaat)
      ],
      "location": {                         // or null when no coordinate is verified (community listed, not mapped)
        "lat": 63.75,
        "lon": -68.516667,
        "precision": "arc-minute",          // seconds | arc-minute | decimal
        "sourceIds": ["nrcan-cgndb", "geonames-cities500"],
        "verification": "official-record",  // official-record | cross-checked | single-source
        "note": "optional caveat shown to users"
      },
      "population": {                       // or null
        "count": 7429,
        "censusYear": 2021,
        "sourceIds": ["statcan-2021-fogs"],
        "verification": "official-record",
        "note": "optional"
      },
      "description": {                      // optional
        "text": "A short, sourced geographic description.",
        "sourceIds": ["gov-nunavut-communities"]
      },
      "links": [                            // https only
        { "label": "…", "url": "https://…", "sourceId": "gov-nunavut-communities" }
      ],
      "lastReviewed": "2026-10-14"          // ISO date
    }
  ]
}
```

The example mixes in fields from other records (noted in the comments) to show every field. `changedYear` is set only when a source states the year.

### Validation (`src/lib/validation/community.ts`)

Each record is validated when the app starts and in `npm run validate:data`:

- `id` is lowercase-hyphenated and unique; `name` is unique (case-insensitive).
- `regionId` is one of the three regions.
- Latitude is within −90..90 and longitude within −180..180. The point must also fall inside a generous Nunavut envelope (51–84°N, 125–60°W). Swapped latitude/longitude is detected and reported.
- `population.count` is a non-negative integer and `censusYear` is plausible.
- Every `sourceIds` entry exists in the source register.
- Links are `https`.

Invalid records are **excluded** and listed in the *About & data* panel. They never break the app or show wrong data. Completeness (`complete`, `partial` or `minimal`) is computed from which optional fields are present. It is not entered by hand.

## GeoJSON layers: `public/data/*.geojson`

Static layers are RFC 7946 `FeatureCollection`s. They are fetched only when needed and validated in the browser by `src/lib/geo/geojson.ts`. A layer that fails to download or validate shows an error in the Layers panel. The rest of the atlas keeps working.

Validation checks:

- The top-level object is a `FeatureCollection` with a `features` array.
- Each feature has a supported geometry type, allowed for that layer.
- Coordinate nesting depth matches the geometry type.
- Every position is a pair of finite numbers within the longitude/latitude range. Values in the millions are reported as probably projected.
- Polygon rings are closed and have at least 4 positions.
- Optional per layer: unique `id` on every feature, required properties, and detection of `[lat, lon]` order for Nunavut positions.

### `physical-features.geojson`

`Point` features with a unique `id` (`ne-<slug>`) and these properties:

| Property | Type | Meaning |
| --- | --- | --- |
| `name` | string | Display name (expanded from Natural Earth abbreviations) |
| `category` | `island` \| `island-group` \| `peninsula` \| `bay` \| `strait` \| `sound` \| `gulf` \| `channel` \| `other` | Feature type |
| `realm` | `land` \| `marine` | Used for label styling |
| `sourceName` | string | Name exactly as in Natural Earth |
| `wikidata` | string \| null | Wikidata item id from Natural Earth |
| `labelRank` | number | Natural Earth scalerank; lower is more prominent. Used to thin labels when zoomed out |
| `sourceId` | string | Entry in the source register |

### `nunavut-boundary.geojson`, `context-land.geojson`

`Polygon`/`MultiPolygon` features. Properties are informational only.

## Layer registry: `src/data/layers/registry.ts`

Each layer has an `id`, `name`, `description`, `status` (`available` or `planned`), `storage` (`bundled`, `static-file` or `online`), a `classification`, `sourceIds`, `defaultVisible`, an optional `dataPath` (relative to `public/`), a `plannedNote` for planned layers, and an optional `legend`.

## Source register: `src/data/sources/sources.ts`

Each source has: `id`, `name`, `publisher`, `url`, `license`, optional `licenseUrl`, `accessed` (ISO date), `coverage`, optional `referenceDate`, `classification`, `accessMethod`, optional `attribution`, and `limitations[]`.
