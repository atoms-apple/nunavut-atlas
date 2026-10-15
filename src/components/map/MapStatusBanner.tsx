import { WifiOff, X } from 'lucide-react';
import type { BasemapStatus } from './BasemapLayer';

export function MapStatusBanner({
  status,
  basemapName,
  onUseOffline,
  onRetry,
  onDismiss,
}: {
  status: BasemapStatus;
  basemapName: string;
  onUseOffline: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  if (status !== 'unavailable') return null;
  return (
    <div className="map-banner" role="alert">
      <WifiOff size={18} aria-hidden="true" />
      <div>
        <strong>{basemapName} tiles could not be loaded.</strong>{' '}
        <span className="map-banner__detail">
          You may be offline or the service may be unavailable. The bundled offline outline is shown instead; communities,
          search and all atlas data still work.
        </span>
        <span className="map-banner__short">Showing the offline outline.</span>
      </div>
      <div className="map-banner__actions">
        <button type="button" className="button button--small" onClick={onRetry}>
          Retry
        </button>
        <button type="button" className="button button--small button--secondary" onClick={onUseOffline}>
          Use offline outline
        </button>
      </div>
      <button type="button" className="icon-button map-banner__close" aria-label="Dismiss map tile message" onClick={onDismiss}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
