import { useId, useMemo, useState } from 'react';
import type { Community } from '../../types/community';
import { distanceBetween, formatKm, nearestCommunities } from '../../lib/communities/distances';
import { Badge } from '../shared/Badge';
import { CLASSIFICATION_LABEL } from '../shared/labels';

interface Props {
  community: Community;
  communities: readonly Community[];
  onSelectCommunity: (id: string) => void;
}

/** Nearest communities and a distance picker, calculated from recorded coordinates. */
export function CommunityDistances({ community, communities, onSelectCommunity }: Props) {
  const ids = useId();
  const [targetId, setTargetId] = useState('');
  const nearest = useMemo(() => nearestCommunities(community, communities), [community, communities]);
  const others = useMemo(
    () =>
      communities
        .filter((c) => c.id !== community.id && c.location)
        .sort((a, b) => a.name.localeCompare(b.name, 'en-CA')),
    [community, communities],
  );
  const target = others.find((c) => c.id === targetId);
  const targetKm = target ? distanceBetween(community, target) : null;
  const derived = CLASSIFICATION_LABEL.derived;

  if (!community.location) return null;

  return (
    <section className="distances" aria-labelledby={`${ids}-heading`}>
      <h3 id={`${ids}-heading`} className="details__heading">
        Nearest communities{' '}
        <Badge tone={derived.tone} title={derived.explanation}>
          {derived.label}
        </Badge>
      </h3>
      <ol className="distance-list">
        {nearest.map(({ community: c, km }) => (
          <li key={c.id}>
            <button type="button" className="community-list__item" onClick={() => onSelectCommunity(c.id)}>
              <span>{c.name}</span>
              <span className="muted small num">{formatKm(km)}</span>
            </button>
          </li>
        ))}
      </ol>
      <div className="distance-picker">
        <label htmlFor={`${ids}-to`}>Distance from {community.name} to</label>
        <select id={`${ids}-to`} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
          <option value="">Choose a community</option>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <output htmlFor={`${ids}-to`} aria-live="polite" className="distance-picker__result">
          {target && targetKm !== null ? `${formatKm(targetKm)} to ${target.name}` : ''}
        </output>
      </div>
      <p className="note">
        Straight-line (great-circle) distance between the recorded coordinates. It is not a travel, flight or route distance,
        and it is approximate because some coordinates are recorded only to the nearest arc-minute.
      </p>
    </section>
  );
}
