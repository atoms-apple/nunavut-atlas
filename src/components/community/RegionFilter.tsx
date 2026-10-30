import type { RegionId } from '../../types/community';
import { REGIONS } from '../../data/regions/regions';
import { RegionSymbol } from '../shared/RegionSymbol';

/** Region chips shared by the community list and table; the choice also filters the map. */
export function RegionFilter({ value, onChange }: { value: RegionId | 'all'; onChange: (region: RegionId | 'all') => void }) {
  return (
    <fieldset className="chip-group">
      <legend className="visually-hidden">Filter by region</legend>
      {(['all', ...REGIONS.map((r) => r.id)] as const).map((id) => {
        const region = REGIONS.find((r) => r.id === id);
        return (
          <label key={id} className={`chip${value === id ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="region-filter"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            {region && <RegionSymbol region={region} size={12} />}
            {region ? region.name : 'All regions'}
          </label>
        );
      })}
    </fieldset>
  );
}
