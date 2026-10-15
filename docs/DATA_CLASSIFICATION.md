# Official, derived, schematic and planned data

Maps make everything look equally certain. A generalized coastline, an official coordinate and a label position all look like confident lines and dots on screen. The atlas therefore labels every dataset with one of four classifications, and the interface reflects them.

| Classification | Meaning | Examples in this release | How the app shows it |
| --- | --- | --- | --- |
| **Official** | Published by the authority responsible for the information. The value is the authority's own. | Statistics Canada 2021 Census populations; CGNDB coordinates; Government of Nunavut community facts | Green **Official** badge; coordinates marked **Official record** |
| **Derived** | Produced from other data by generalizing, transcribing, calculating or cross-checking. Useful and sourced, but not the authority's own record. | The Nunavut outline (generalized from Natural Earth); island and water label points; coordinates confirmed by agreement between two non-authoritative sources | Blue **Derived** badge; coordinates marked **Cross-checked** or **Single source** |
| **Illustrative / schematic** | For orientation only. Not suitable for measurement, navigation or legal use. | The offline land outline used when online tiles are unavailable | Grey **Illustrative** badge; legend entry "Land (offline outline, illustrative)" |
| **Incomplete / planned** | Partial, secondary or awaiting review, or a layer with no data yet. | Inuktut name forms from secondary sources; all planned layers | Amber **Incomplete** / **Awaiting language review** badges; planned layers disabled with "Data not yet available" |

## Rules

1. **Never present a derived or schematic boundary as official.** The Nunavut outline is labelled "generalized" and "not a legal boundary" everywhere it appears.
2. **Never draw a region boundary by hand** or by wrapping communities in a shape. Until verified boundary files are added, regions are shown only as groups of communities (`boundaryAvailable: false` in `src/data/regions/regions.ts`). A test enforces this.
3. **A planned layer stays planned** until a dataset with clear licensing has been added and validated. Planned layers cannot be switched on, and nothing is drawn for them.
4. **Missing is better than wrong.** A missing value is shown as an explicit sentence ("A verified census population has not yet been added to this record."). Missing values are never filled with estimates.
5. **Label points are not coordinates of features.** The physical-feature points mark where a name is drawn. Their detail panel says so.

## Verification levels for individual values

Community coordinates, populations and names also carry a verification level:

- **Official record**: read from the responsible authority's own record.
- **Cross-checked**: two or more independent sources agree (for coordinates, within a few kilometres).
- **Single source**: one credible source, awaiting a second check.

When sources disagree by more than a few kilometres, the record's `note` field says so, and the note is shown in the details panel.
