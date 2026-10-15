import { ExternalLink, LocateFixed } from 'lucide-react';
import type { Community } from '../../types/community';
import { getRegion } from '../../data/regions/regions';
import { formatDecimal, formatDegreesMinutes } from '../../lib/geo/coordinates';
import { statCanProfileUrl } from '../../lib/links';
import { Badge } from '../shared/Badge';
import { RegionSymbol } from '../shared/RegionSymbol';
import { SourceList } from '../shared/SourceList';
import { VERIFICATION_LABEL } from '../shared/labels';

const NUMBER = new Intl.NumberFormat('en-CA');

const FIELD_LABEL: Record<string, string> = {
  location: 'verified coordinates',
  population: 'verified census population',
  indigenousNames: 'Inuktut name forms',
  description: 'geographic description',
  links: 'official links',
};

interface Props {
  community: Community;
  onZoomTo: () => void;
  onSelectRegion: () => void;
}

export function CommunityDetails({ community: c, onZoomTo, onSelectRegion }: Props) {
  const region = getRegion(c.regionId);
  const allSourceIds = [
    ...(c.location?.sourceIds ?? []),
    ...(c.population?.sourceIds ?? []),
    ...(c.description?.sourceIds ?? []),
    ...c.indigenousNames.flatMap((n) => n.sourceIds),
    ...c.formerNames.flatMap((n) => n.sourceIds),
  ];

  return (
    <div className="details">
      <dl className="details__facts">
        {c.indigenousNames.length > 0 && (
          <div className="fact">
            <dt>Inuktut name forms</dt>
            <dd>
              <ul className="plain-list">
                {c.indigenousNames.map((n) => (
                  <li key={n.name}>
                    <span lang={n.language === 'Inuinnaqtun' ? 'ikt' : 'iu'} className="indigenous-name">
                      {n.name}
                    </span>{' '}
                    {n.language && <span className="muted">({n.language})</span>}{' '}
                    {n.verification !== 'official-record' && (
                      <Badge tone="caution" title={n.note}>
                        Awaiting language review
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}

        <div className="fact">
          <dt>Region</dt>
          <dd>
            <button type="button" className="link-button" onClick={onSelectRegion}>
              <RegionSymbol region={region} /> {region.name}
            </button>
            {c.municipalStatus && <span className="muted"> · {c.municipalStatus}</span>}
          </dd>
        </div>

        <div className="fact">
          <dt>Coordinates</dt>
          <dd>
            {c.location ? (
              <>
                <span>
                  {formatDegreesMinutes(c.location.lat, 'lat')}, {formatDegreesMinutes(c.location.lon, 'lon')}
                </span>
                <span className="muted small"> ({formatDecimal(c.location)})</span>{' '}
                <Badge
                  tone={VERIFICATION_LABEL[c.location.verification].tone}
                  title={VERIFICATION_LABEL[c.location.verification].explanation}
                >
                  {VERIFICATION_LABEL[c.location.verification].label}
                </Badge>
                {c.location.note && <p className="note">{c.location.note}</p>}
              </>
            ) : (
              <p className="missing">Coordinates have not been verified, so this community is not shown on the map.</p>
            )}
          </dd>
        </div>

        <div className="fact">
          <dt>Population</dt>
          <dd>
            {c.population ? (
              <>
                <span className="fact__number">{NUMBER.format(c.population.count)}</span>{' '}
                <span className="muted">({c.population.censusYear} Census)</span>
                {c.population.note && <p className="note">{c.population.note}</p>}
              </>
            ) : (
              <p className="missing">
                A verified census population has not yet been added to this record.
              </p>
            )}
          </dd>
        </div>

        <div className="fact">
          <dt>Geography</dt>
          <dd>
            {c.description ? (
              <p>{c.description.text}</p>
            ) : (
              <p className="missing">A sourced geographic description has not yet been added.</p>
            )}
          </dd>
        </div>

        {c.formerNames.length > 0 && (
          <div className="fact">
            <dt>Former names</dt>
            <dd>
              <ul className="plain-list">
                {c.formerNames.map((n) => (
                  <li key={n.name}>
                    {n.name}
                    {n.changedYear && <span className="muted"> (renamed {n.changedYear})</span>}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      {c.location && (
        <button type="button" className="button button--secondary" onClick={onZoomTo}>
          <LocateFixed size={16} aria-hidden="true" /> Zoom to {c.name}
        </button>
      )}

      <h3 className="details__heading">Official resources</h3>
      {c.links.length > 0 || c.censusSubdivisionCode ? (
        <ul className="link-list">
          {c.censusSubdivisionCode && (
            <li>
              <a href={statCanProfileUrl(c.censusSubdivisionCode)} target="_blank" rel="noreferrer noopener">
                Statistics Canada 2021 Census profile <ExternalLink size={13} aria-hidden="true" />
              </a>
            </li>
          )}
          {c.links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer noopener">
                {l.label} <ExternalLink size={13} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="missing">No official links have been added to this record yet.</p>
      )}

      <h3 className="details__heading">Sources</h3>
      <SourceList sourceIds={allSourceIds} />
      <p className="muted small">
        Record last reviewed {c.lastReviewed}.{' '}
        {c.completeness === 'complete'
          ? 'All core fields are filled.'
          : `Not yet added: ${c.missingFields.map((f) => FIELD_LABEL[f] ?? f).join(', ')}.`}
      </p>
    </div>
  );
}
