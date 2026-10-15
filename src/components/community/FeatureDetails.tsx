import { ExternalLink, LocateFixed } from 'lucide-react';
import type { Feature, PointGeometry } from '../../types/geo';
import type { PhysicalFeatureProperties } from '../../types/layer';
import { categoryLabel } from '../../lib/search/search';
import { formatDegreesMinutes } from '../../lib/geo/coordinates';
import { SourceList } from '../shared/SourceList';
import { Badge } from '../shared/Badge';

export function FeatureDetails({
  feature,
  onZoomTo,
}: {
  feature: Feature<PhysicalFeatureProperties, PointGeometry>;
  onZoomTo: () => void;
}) {
  const p = feature.properties;
  const [lon = 0, lat = 0] = feature.geometry.coordinates;
  return (
    <div className="details">
      <dl className="details__facts">
        <div className="fact">
          <dt>Type</dt>
          <dd>
            {categoryLabel(p.category)} <span className="muted">({p.realm === 'marine' ? 'water body' : 'land'})</span>
          </dd>
        </div>
        <div className="fact">
          <dt>Label position</dt>
          <dd>
            {formatDegreesMinutes(lat, 'lat')}, {formatDegreesMinutes(lon, 'lon')}{' '}
            <Badge tone="derived">Derived</Badge>
            <p className="note">
              This point is where the name is placed on the map, calculated from a generalized Natural Earth polygon. It is not an
              official coordinate and does not show the feature’s extent or jurisdiction.
            </p>
          </dd>
        </div>
      </dl>
      <button type="button" className="button button--secondary" onClick={onZoomTo}>
        <LocateFixed size={16} aria-hidden="true" /> Zoom to {p.name}
      </button>
      {p.wikidata && (
        <>
          <h3 className="details__heading">Further reading</h3>
          <ul className="link-list">
            <li>
              <a href={`https://www.wikidata.org/wiki/${p.wikidata}`} target="_blank" rel="noreferrer noopener">
                Wikidata item {p.wikidata} <ExternalLink size={13} aria-hidden="true" />
              </a>
            </li>
          </ul>
        </>
      )}
      <h3 className="details__heading">Source</h3>
      <SourceList sourceIds={[p.sourceId]} />
      <p className="muted small">Natural Earth name: “{p.sourceName}”.</p>
    </div>
  );
}
