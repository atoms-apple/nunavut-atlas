import { useState } from 'react';
import { Download } from 'lucide-react';
import type { Community } from '../../types/community';
import { getRegion } from '../../data/regions/regions';
import { DATA_SOURCES } from '../../data/sources/sources';
import { buildAttribution, buildCsv, buildGeoJson, exportFilename, isoDate } from '../../lib/communities/export';
import { downloadText } from '../../lib/download';

const regionName = (c: Community) => getRegion(c.regionId).name;
const plural = (n: number) => `${n} ${n === 1 ? 'community' : 'communities'}`;

/** Download the rows currently shown in the table, built entirely in the browser. */
export function ExportActions({ rows, total }: { rows: Community[]; total: number }) {
  const [message, setMessage] = useState('');
  const mapped = rows.filter((c) => c.location).length;
  const disabled = rows.length === 0;

  const saveCsv = () => {
    const now = new Date();
    downloadText(buildCsv(rows, regionName), exportFilename('csv', now), 'text/csv;charset=utf-8');
    setMessage(`CSV saved with ${rows.length} of ${plural(total)}.`);
  };

  const saveGeoJson = () => {
    const now = new Date();
    const { collection, omitted } = buildGeoJson(rows, regionName);
    downloadText(JSON.stringify(collection, null, 2) + '\n', exportFilename('geojson', now), 'application/geo+json');
    setMessage(
      `GeoJSON saved with ${plural(collection.features.length)}.` +
        (omitted.length
          ? ` ${omitted.length} without verified coordinates ${omitted.length === 1 ? 'was' : 'were'} left out: ${omitted
              .map((c) => c.name)
              .join(', ')}.`
          : ''),
    );
  };

  const saveAttribution = () => {
    const now = new Date();
    downloadText(buildAttribution(rows, DATA_SOURCES, isoDate(now)), exportFilename('attribution', now), 'text/plain;charset=utf-8');
    setMessage('Attribution and licences saved.');
  };

  return (
    <div className="export-actions">
      <div className="export-actions__buttons">
        <button type="button" className="button button--secondary button--small" onClick={saveCsv} disabled={disabled}>
          <Download size={14} aria-hidden="true" /> Download CSV
        </button>
        <button type="button" className="button button--secondary button--small" onClick={saveGeoJson} disabled={disabled}>
          <Download size={14} aria-hidden="true" /> Download GeoJSON
        </button>
        <button type="button" className="button button--secondary button--small" onClick={saveAttribution} disabled={disabled}>
          <Download size={14} aria-hidden="true" /> Download attribution and licences (.txt)
        </button>
      </div>
      <p className="muted small">
        Exports contain the {rows.length} rows shown, in this order. GeoJSON includes only communities with recorded
        coordinates ({mapped} of {rows.length}). Keep the attribution file with the exported data: each dataset keeps its own
        licence.
      </p>
      <p className="muted small" role="status">
        {message}
      </p>
    </div>
  );
}
