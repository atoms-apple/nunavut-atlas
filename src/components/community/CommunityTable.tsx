import { useId, useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { Community, RegionId, VerificationLevel } from '../../types/community';
import { getRegion } from '../../data/regions/regions';
import {
  DEFAULT_SORT,
  nextSort,
  tableRows,
  type SortKey,
  type TableFilters,
  type TableSort,
} from '../../lib/communities/table';
import { Badge } from '../shared/Badge';
import { RegionSymbol } from '../shared/RegionSymbol';
import { MISSING_FIELD_LABEL, VERIFICATION_LABEL } from '../shared/labels';
import { RegionFilter } from './RegionFilter';

const NUMBER = new Intl.NumberFormat('en-CA');
const regionName = (c: Community) => getRegion(c.regionId).name;

const SORT_LABEL: Record<SortKey, string> = {
  name: 'community',
  region: 'region',
  population: 'population',
  latitude: 'latitude',
};

interface Props {
  communities: Community[];
  regionFilter: RegionId | 'all';
  onRegionFilterChange: (region: RegionId | 'all') => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Receives the rows currently shown, in order (used by export). */
  renderActions?: (rows: Community[]) => ReactNode;
}

function SortHeader({
  sortKey,
  label,
  sort,
  onSort,
}: {
  sortKey: SortKey;
  label: string;
  sort: TableSort;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.direction === 'ascending' ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={active ? sort.direction : 'none'}>
      <button type="button" className="data-table__sort" onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={14} aria-hidden="true" />
      </button>
    </th>
  );
}

/**
 * Sortable, filterable table of communities. The region filter is shared
 * with the map and the list; the other filters and the sort are local.
 */
export function CommunityTable({ communities, regionFilter, onRegionFilterChange, selectedId, onSelect, renderActions }: Props) {
  const [sort, setSort] = useState<TableSort>(DEFAULT_SORT);
  const [verifiedPopulationOnly, setVerifiedPopulationOnly] = useState(false);
  const [verification, setVerification] = useState<VerificationLevel | 'any'>('any');
  const ids = useId();

  const filters: TableFilters = { region: regionFilter, verifiedPopulationOnly, verification };
  const rows = useMemo(
    () => tableRows(communities, { region: regionFilter, verifiedPopulationOnly, verification }, sort, regionName),
    [communities, regionFilter, verifiedPopulationOnly, verification, sort],
  );

  return (
    <div className="community-table">
      <RegionFilter value={filters.region} onChange={onRegionFilterChange} />
      <div className="table-filters">
        <label className="checkbox-row" htmlFor={`${ids}-pop`}>
          <input
            id={`${ids}-pop`}
            type="checkbox"
            checked={verifiedPopulationOnly}
            onChange={(e) => setVerifiedPopulationOnly(e.target.checked)}
          />
          Only communities with a verified population
        </label>
        <label className="select-row" htmlFor={`${ids}-ver`}>
          <span>Coordinate verification</span>
          <select
            id={`${ids}-ver`}
            value={verification}
            onChange={(e) => setVerification(e.target.value as VerificationLevel | 'any')}
          >
            <option value="any">Any</option>
            {(Object.keys(VERIFICATION_LABEL) as VerificationLevel[]).map((v) => (
              <option key={v} value={v}>
                {VERIFICATION_LABEL[v].label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted small" role="status">
        Showing {rows.length} of {communities.length} communities.
        {regionFilter !== 'all' && ' The map shows the same region.'}
      </p>
      {renderActions?.(rows)}
      <div className="table-scroll" role="region" aria-labelledby={`${ids}-caption`} tabIndex={0}>
        <table className="data-table">
          <caption id={`${ids}-caption`}>
            Nunavut communities, sorted by {SORT_LABEL[sort.key]} ({sort.direction})
          </caption>
          <thead>
            <tr>
              <SortHeader sortKey="name" label="Community" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
              <SortHeader sortKey="region" label="Region" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
              <SortHeader
                sortKey="population"
                label="Population (2021 Census)"
                sort={sort}
                onSort={(k) => setSort((s) => nextSort(s, k))}
              />
              <SortHeader sortKey="latitude" label="Latitude" sort={sort} onSort={(k) => setSort((s) => nextSort(s, k))} />
              <th scope="col">Longitude</th>
              <th scope="col">Coordinate verification</th>
              <th scope="col">Fields not yet added</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const region = getRegion(c.regionId);
              return (
                <tr key={c.id} className={c.id === selectedId ? 'is-selected' : undefined}>
                  <th scope="row">
                    <button
                      type="button"
                      className="link-button"
                      aria-current={c.id === selectedId ? 'true' : undefined}
                      onClick={() => onSelect(c.id)}
                    >
                      {c.name}
                    </button>
                  </th>
                  <td>
                    <span className="data-table__region">
                      <RegionSymbol region={region} size={12} /> {region.name}
                    </span>
                  </td>
                  <td className="num">
                    {c.population ? NUMBER.format(c.population.count) : <span className="missing">not yet added</span>}
                  </td>
                  <td className="num">{c.location ? c.location.lat.toFixed(4) : <span className="missing">not yet added</span>}</td>
                  <td className="num">{c.location ? c.location.lon.toFixed(4) : <span className="missing">not yet added</span>}</td>
                  <td>
                    {c.location ? (
                      <Badge
                        tone={VERIFICATION_LABEL[c.location.verification].tone}
                        title={VERIFICATION_LABEL[c.location.verification].explanation}
                      >
                        {VERIFICATION_LABEL[c.location.verification].label}
                      </Badge>
                    ) : (
                      <span className="missing">not yet added</span>
                    )}
                  </td>
                  <td className="data-table__missing">
                    {c.missingFields.length ? c.missingFields.map((f) => MISSING_FIELD_LABEL[f] ?? f).join(', ') : 'None'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="missing">No communities match these filters.</p>}
    </div>
  );
}
