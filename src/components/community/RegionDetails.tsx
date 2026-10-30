import type { Community, Region } from '../../types/community';
import { regionSummary } from '../../lib/communities/regions';
import { formatDegreesMinutes } from '../../lib/geo/coordinates';
import { Badge } from '../shared/Badge';
import { CLASSIFICATION_LABEL } from '../shared/labels';
import { RegionSymbol } from '../shared/RegionSymbol';
import { SourceList } from '../shared/SourceList';

const NUMBER = new Intl.NumberFormat('en-CA');

export function RegionDetails({
  region,
  communities,
  onSelectCommunity,
}: {
  region: Region;
  communities: Community[];
  onSelectCommunity: (id: string) => void;
}) {
  const members = communities.filter((c) => c.regionId === region.id);
  const withPopulation = members.filter((c) => c.population);
  const summary = regionSummary(region.id, communities);
  const derived = CLASSIFICATION_LABEL.derived;
  const derivedBadge = (
    <Badge tone={derived.tone} title={derived.explanation}>
      {derived.label}
    </Badge>
  );
  const communityButton = (c: Community | null) =>
    c?.location ? (
      <>
        <button type="button" className="link-button" onClick={() => onSelectCommunity(c.id)}>
          {c.name}
        </button>{' '}
        <span className="muted small">({formatDegreesMinutes(c.location.lat, 'lat')})</span>
      </>
    ) : (
      <span className="missing">not yet added</span>
    );
  return (
    <div className="details">
      <p>
        <RegionSymbol region={region} /> {region.description}
      </p>
      <dl className="details__facts">
        {region.alternateNames.length > 0 && (
          <div className="fact">
            <dt>Also known as</dt>
            <dd>{region.alternateNames.join(', ')}</dd>
          </div>
        )}
        <div className="fact">
          <dt>Communities</dt>
          <dd>{summary.communityCount}</dd>
        </div>
        <div className="fact">
          <dt>2021 population</dt>
          <dd>
            {summary.populationSubtotal !== null ? (
              <>
                <span className="fact__number">{NUMBER.format(summary.populationSubtotal)}</span> {derivedBadge}
                <p>
                  across {summary.withPopulation} of {summary.communityCount} communities with a verified 2021 census
                  population
                  {summary.withoutPopulation > 0 ? `; ${summary.withoutPopulation} not yet added` : ''}.
                </p>
                <p className="note">
                  Sum of the verified community counts in this atlas. It is not an official regional total from Statistics
                  Canada.
                </p>
              </>
            ) : (
              <p className="missing">No community in this region has a verified 2021 census population yet.</p>
            )}
          </dd>
        </div>
        <div className="fact">
          <dt>Northernmost</dt>
          <dd>
            {communityButton(summary.northernmost)} {summary.northernmost && derivedBadge}
          </dd>
        </div>
        <div className="fact">
          <dt>Southernmost</dt>
          <dd>
            {communityButton(summary.southernmost)} {summary.southernmost && derivedBadge}
          </dd>
        </div>
        <div className="fact">
          <dt>Census division</dt>
          <dd>{region.censusDivisionCode} (Statistics Canada)</dd>
        </div>
        <div className="fact">
          <dt>Boundary</dt>
          <dd>
            <p className="missing">
              A verified boundary is not yet bundled, so the region is shown as a group of communities rather than an area on the map.
            </p>
          </dd>
        </div>
      </dl>
      <h3 className="details__heading">
        Communities ({members.length})
      </h3>
      <ul className="community-list">
        {members.map((c) => (
          <li key={c.id}>
            <button type="button" className="community-list__item" onClick={() => onSelectCommunity(c.id)}>
              <span>{c.name}</span>
              <span className="muted small">{c.population ? NUMBER.format(c.population.count) : 'population not yet added'}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Verified 2021 census populations are available for {withPopulation.length} of {members.length} communities in this region.
      </p>
      <h3 className="details__heading">Sources</h3>
      <SourceList sourceIds={region.sourceIds} />
    </div>
  );
}
