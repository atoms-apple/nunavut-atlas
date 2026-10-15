import type { Community, RegionId } from '../../types/community';
import { REGIONS } from '../../data/regions/regions';
import { RegionSymbol } from '../shared/RegionSymbol';

const NUMBER = new Intl.NumberFormat('en-CA');

interface Props {
  communities: Community[];
  regionFilter: RegionId | 'all';
  onRegionFilterChange: (region: RegionId | 'all') => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Text alternative to the map: every community, grouped by region, usable
 * with a keyboard or screen reader. The region filter also filters the map.
 */
export function CommunityList({ communities, regionFilter, onRegionFilterChange, selectedId, onSelect }: Props) {
  const regions = regionFilter === 'all' ? REGIONS : REGIONS.filter((r) => r.id === regionFilter);
  return (
    <div className="community-browser">
      <fieldset className="chip-group">
        <legend className="visually-hidden">Filter by region</legend>
        {(['all', ...REGIONS.map((r) => r.id)] as const).map((id) => {
          const region = REGIONS.find((r) => r.id === id);
          return (
            <label key={id} className={`chip${regionFilter === id ? ' is-active' : ''}`}>
              <input
                type="radio"
                name="region-filter"
                value={id}
                checked={regionFilter === id}
                onChange={() => onRegionFilterChange(id)}
              />
              {region && <RegionSymbol region={region} size={12} />}
              {region ? region.name : 'All regions'}
            </label>
          );
        })}
      </fieldset>
      <p className="muted small" role="status">
        {regionFilter === 'all'
          ? `${communities.length} communities`
          : `${communities.filter((c) => c.regionId === regionFilter).length} communities in ${regions[0]?.name}`}
        . The map shows the same selection.
      </p>
      {regions.map((region) => {
        const members = communities.filter((c) => c.regionId === region.id);
        return (
          <section key={region.id} className="community-group" aria-labelledby={`group-${region.id}`}>
            <h3 id={`group-${region.id}`} className="community-group__title">
              <RegionSymbol region={region} /> {region.name}
            </h3>
            <ul className="community-list">
              {members.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`community-list__item${c.id === selectedId ? ' is-selected' : ''}`}
                    aria-current={c.id === selectedId ? 'true' : undefined}
                    onClick={() => onSelect(c.id)}
                  >
                    <span>{c.name}</span>
                    <span className="muted small">
                      {c.population ? `${NUMBER.format(c.population.count)} (2021)` : 'Population not yet added'}
                      {!c.location && ' · not mapped'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
