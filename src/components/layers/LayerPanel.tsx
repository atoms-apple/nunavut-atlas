import { CircleAlert, LoaderCircle } from 'lucide-react';
import { BASEMAPS } from '../../config/basemaps';
import type { LayerDefinition, LayerStorage } from '../../types/layer';
import { Badge } from '../shared/Badge';
import { CLASSIFICATION_LABEL } from '../shared/labels';
import { SourceList } from '../shared/SourceList';
import type { BasemapStatus } from '../map/BasemapLayer';

export type LayerLoadState = { status: 'idle' | 'loading' | 'ready' } | { status: 'error'; message: string };

const STORAGE_LABEL: Record<LayerStorage, string> = {
  bundled: 'Stored in the atlas',
  'static-file': 'Atlas data file (works offline once loaded)',
  online: 'Online service',
};

interface Props {
  layers: LayerDefinition[];
  visibility: Record<string, boolean>;
  onToggle: (id: string, visible: boolean) => void;
  loadState: Record<string, LayerLoadState>;
  onRetry: (id: string) => void;
  basemapId: string;
  basemapStatus: BasemapStatus;
  onBasemapChange: (id: string) => void;
}

export function LayerPanel({ layers, visibility, onToggle, loadState, onRetry, basemapId, basemapStatus, onBasemapChange }: Props) {
  const available = layers.filter((l) => l.status === 'available');
  const planned = layers.filter((l) => l.status === 'planned');

  return (
    <div className="layer-panel">
      <fieldset className="layer-section">
        <legend className="layer-section__title">Base map</legend>
        {BASEMAPS.map((b) => (
          <label key={b.id} className="radio-row">
            <input type="radio" name="basemap" value={b.id} checked={basemapId === b.id} onChange={() => onBasemapChange(b.id)} />
            <span>
              <span className="radio-row__name">{b.name}</span>
              <span className="radio-row__desc">{b.description}</span>
              {b.id === basemapId && basemapStatus === 'unavailable' && (
                <span className="inline-error">
                  <CircleAlert size={14} aria-hidden="true" /> Tiles could not be loaded. The offline outline is shown instead.
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <section className="layer-section" aria-labelledby="active-layers-title">
        <h3 id="active-layers-title" className="layer-section__title">
          Available layers
        </h3>
        <ul className="layer-list">
          {available.map((layer) => {
            const state = loadState[layer.id] ?? { status: 'idle' };
            const cls = CLASSIFICATION_LABEL[layer.classification];
            const inputId = `layer-toggle-${layer.id}`;
            return (
              <li key={layer.id} className="layer-item">
                <div className="layer-item__row">
                  <input
                    id={inputId}
                    type="checkbox"
                    className="switch"
                    role="switch"
                    checked={visibility[layer.id] ?? false}
                    onChange={(e) => onToggle(layer.id, e.target.checked)}
                    aria-describedby={`${inputId}-desc`}
                  />
                  <label htmlFor={inputId} className="layer-item__name">
                    {layer.name}
                  </label>
                  {state.status === 'loading' && (
                    <span className="layer-item__status" role="status">
                      <LoaderCircle size={14} className="spin" aria-hidden="true" /> Loading…
                    </span>
                  )}
                </div>
                <p id={`${inputId}-desc`} className="layer-item__desc">
                  {layer.description}
                </p>
                <div className="layer-item__meta">
                  <Badge tone={cls.tone} title={cls.explanation}>
                    {cls.label}
                  </Badge>
                  <span className="muted small">{STORAGE_LABEL[layer.storage]}</span>
                </div>
                {state.status === 'error' && (
                  <div className="inline-error" role="alert">
                    <CircleAlert size={14} aria-hidden="true" /> {state.message}{' '}
                    <button type="button" className="link-button" onClick={() => onRetry(layer.id)}>
                      Try again
                    </button>
                  </div>
                )}
                <details className="layer-item__sources">
                  <summary>Sources</summary>
                  <SourceList sourceIds={layer.sourceIds} compact />
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="layer-section" aria-labelledby="planned-layers-title">
        <h3 id="planned-layers-title" className="layer-section__title">
          Planned layers
        </h3>
        <p className="muted small">These layers are not shown because no suitable verified dataset has been added yet.</p>
        <ul className="layer-list layer-list--planned">
          {planned.map((layer) => (
            <li key={layer.id} className="layer-item is-planned">
              <div className="layer-item__row">
                <input type="checkbox" className="switch" role="switch" disabled checked={false} aria-label={`${layer.name} (data not yet available)`} />
                <span className="layer-item__name">{layer.name}</span>
                <Badge tone="muted">Data not yet available</Badge>
              </div>
              {layer.plannedNote && <p className="layer-item__desc">{layer.plannedNote}</p>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
