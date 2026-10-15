import { DATA_SOURCES } from '../../data/sources/sources';
import type { RecordError } from '../../lib/validation/community';
import { Badge } from '../shared/Badge';
import { CLASSIFICATION_LABEL } from '../shared/labels';

export function AboutPanel({ dataErrors }: { dataErrors: RecordError[] }) {
  return (
    <div className="about">
      <p>
        <strong>Nunavut Atlas</strong> is an open-source geographic atlas of Nunavut. It is built on the view that the
        Arctic should be understood through Inuit knowledge, Inuit priorities and community needs, not only as a source
        of resources.
      </p>
      <p>
        It is a tool for exploring geography, not an authoritative register. Each dataset has its own date, licence and level of
        completeness, and these are shown wherever the data is used. Where information has not been verified, the atlas says so
        instead of guessing.
      </p>

      <h3 className="details__heading">How to read the data</h3>
      <dl className="classification-list">
        {(Object.keys(CLASSIFICATION_LABEL) as (keyof typeof CLASSIFICATION_LABEL)[]).map((key) => {
          const c = CLASSIFICATION_LABEL[key];
          return (
            <div key={key}>
              <dt>
                <Badge tone={c.tone}>{c.label}</Badge>
              </dt>
              <dd>{c.explanation}</dd>
            </div>
          );
        })}
      </dl>
      <p className="muted small">
        Regions are shown as groups of communities because verified boundary files are not yet bundled. The territorial outline
        is a generalized cartographic outline, not a legal boundary.
      </p>

      {dataErrors.length > 0 && (
        <div className="inline-error" role="alert">
          <strong>Some records were excluded because they failed validation:</strong>
          <ul>
            {dataErrors.map((e, i) => (
              <li key={i}>
                {e.recordId ?? `Record ${e.recordIndex + 1}`}: {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="details__heading">Data sources</h3>
      <ul className="source-register">
        {DATA_SOURCES.map((s) => {
          const c = CLASSIFICATION_LABEL[s.classification];
          return (
            <li key={s.id}>
              <div className="source-register__title">
                <a href={s.url} target="_blank" rel="noreferrer noopener">
                  {s.name}
                </a>{' '}
                <Badge tone={c.tone} title={c.explanation}>
                  {c.label}
                </Badge>
              </div>
              <div className="muted small">
                {s.publisher} · {s.licenseUrl ? (
                  <a href={s.licenseUrl} target="_blank" rel="noreferrer noopener">
                    {s.license}
                  </a>
                ) : (
                  s.license
                )}{' '}
                · accessed {s.accessed}
                {s.referenceDate ? ` · reference date: ${s.referenceDate}` : ''}
              </div>
              <details>
                <summary>Method and limitations</summary>
                <p className="small">{s.accessMethod}</p>
                <ul className="small">
                  {s.limitations.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>

      <h3 className="details__heading">Privacy</h3>
      <p className="small">
        The atlas has no accounts, analytics, advertising or tracking. Search runs entirely in your browser. When an online base map
        is selected, your browser requests map tiles from that provider (OpenStreetMap or NASA GIBS), which can see your IP
        address as with any website. The offline outline makes no external requests. Only interface preferences (visible
        layers and base map) are kept, in this browser tab’s session storage.
      </p>

      <h3 className="details__heading">Projection</h3>
      <p className="small">
        The map uses Web Mercator, the standard for web tiles. It strongly enlarges areas near the pole, so Ellesmere Island
        appears far larger than it is relative to southern Nunavut.
      </p>
    </div>
  );
}
