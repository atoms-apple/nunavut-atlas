import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { REGIONS } from '../../data/regions/regions';
import type { LayerDefinition } from '../../types/layer';
import { RegionSymbol } from '../shared/RegionSymbol';

/** Legend for currently visible, available layers only. */
export function Legend({
  layers,
  visibility,
  showOfflineLand,
  initiallyOpen = true,
}: {
  layers: LayerDefinition[];
  visibility: Record<string, boolean>;
  showOfflineLand: boolean;
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const visible = layers.filter((l) => l.status === 'available' && visibility[l.id] && l.legend);

  if (visible.length === 0 && !showOfflineLand) return null;

  return (
    <aside className={`legend${open ? '' : ' is-collapsed'}`} aria-label="Map legend">
      <button type="button" className="legend__toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Legend {open ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
      </button>
      {open && (
        <ul className="legend__list">
          {visible.map((layer) =>
            layer.legend?.symbol === 'community' ? (
              REGIONS.map((r) => (
                <li key={r.id}>
                  <RegionSymbol region={r} /> {r.name} community
                </li>
              ))
            ) : layer.legend?.symbol === 'outline' ? (
              <li key={layer.id}>
                <span className="legend__swatch legend__swatch--outline" aria-hidden="true" /> {layer.legend.label}
              </li>
            ) : (
              <li key={layer.id}>
                <span className="legend__swatch legend__swatch--label" aria-hidden="true">
                  Aa
                </span>{' '}
                {layer.legend?.label}
              </li>
            ),
          )}
          {showOfflineLand && (
            <li>
              <span className="legend__swatch legend__swatch--land" aria-hidden="true" /> Land (offline outline, illustrative)
            </li>
          )}
        </ul>
      )}
    </aside>
  );
}
