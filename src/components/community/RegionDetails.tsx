import type { Community, Region } from '../../types/community';
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
