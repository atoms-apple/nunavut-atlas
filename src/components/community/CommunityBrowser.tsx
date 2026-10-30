import type { Community, RegionId } from '../../types/community';
import { CommunityList } from './CommunityList';
import { CommunityTable } from './CommunityTable';

export type CommunityView = 'list' | 'table';

interface Props {
  view: CommunityView;
  onViewChange: (view: CommunityView) => void;
  communities: Community[];
  regionFilter: RegionId | 'all';
  onRegionFilterChange: (region: RegionId | 'all') => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const VIEWS: { id: CommunityView; label: string }[] = [
  { id: 'list', label: 'List' },
  { id: 'table', label: 'Table' },
];

/** Communities panel content: the grouped list (default) or a sortable table. */
export function CommunityBrowser({ view, onViewChange, ...shared }: Props) {
  return (
    <>
      <fieldset className="segmented">
        <legend className="visually-hidden">Show communities as</legend>
        {VIEWS.map((v) => (
          <label key={v.id} className={`segmented__option${view === v.id ? ' is-active' : ''}`}>
            <input
              type="radio"
              name="community-view"
              value={v.id}
              checked={view === v.id}
              onChange={() => onViewChange(v.id)}
            />
            {v.label}
          </label>
        ))}
      </fieldset>
      {view === 'list' ? (
        <CommunityList {...shared} />
      ) : (
        <CommunityTable {...shared} />
      )}
    </>
  );
}
