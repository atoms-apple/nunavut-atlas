import { useEffect, useRef } from 'react';
import { GeoJSON, TileLayer } from 'react-leaflet';
import type { Basemap } from '../../config/basemaps';
import { TILE_FAILURE_THRESHOLD } from '../../config/map';
import type { FeatureCollection } from '../../types/geo';

export type BasemapStatus = 'loading' | 'ready' | 'unavailable' | 'local';

interface Props {
  basemap: Basemap;
  retryNonce: number;
  onStatusChange: (status: BasemapStatus) => void;
  /** Bundled land outline, drawn when the basemap is local or tiles fail. */
  contextLand: FeatureCollection<unknown> | null;
  showContextLand: boolean;
}

/** Colours come from CSS (.atlas-land) so they follow the design tokens. */
const LAND_STYLE = { className: 'atlas-land', weight: 0.8, fillOpacity: 1 };

export function BasemapLayer({ basemap, retryNonce, onStatusChange, contextLand, showContextLand }: Props) {
  const counts = useRef({ loaded: 0, failed: 0, reported: '' as BasemapStatus | '' });

  useEffect(() => {
    counts.current = { loaded: 0, failed: 0, reported: '' };
    onStatusChange(basemap.kind === 'local' ? 'local' : 'loading');
  }, [basemap, retryNonce, onStatusChange]);

  const report = (status: BasemapStatus) => {
    if (counts.current.reported !== status) {
      counts.current.reported = status;
      onStatusChange(status);
    }
  };

  return (
    <>
      {showContextLand && contextLand && (
        <GeoJSON
          key="context-land"
          data={contextLand as unknown as GeoJSON.FeatureCollection}
          interactive={false}
          style={() => LAND_STYLE}
          attribution='Land outline: <a href="https://www.naturalearthdata.com/">Natural Earth</a>'
        />
      )}
      {basemap.kind === 'tiles' && (
        <TileLayer
          key={`${basemap.id}-${retryNonce}`}
          url={basemap.url}
          attribution={basemap.attribution}
          maxZoom={basemap.maxZoom}
          {...(basemap.maxNativeZoom !== undefined ? { maxNativeZoom: basemap.maxNativeZoom } : {})}
          eventHandlers={{
            tileload: () => {
              counts.current.loaded += 1;
              report('ready');
            },
            tileerror: () => {
              counts.current.failed += 1;
              if (counts.current.loaded === 0 && counts.current.failed >= TILE_FAILURE_THRESHOLD) report('unavailable');
            },
          }}
        />
      )}
    </>
  );
}
