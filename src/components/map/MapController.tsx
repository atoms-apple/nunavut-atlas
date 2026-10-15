import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { NUNAVUT_INITIAL_BOUNDS } from '../../config/map';
import type { LatLngBoundsTuple } from '../../types/geo';

export type FocusTarget =
  | { type: 'point'; lat: number; lon: number; zoom: number }
  | { type: 'bounds'; bounds: LatLngBoundsTuple; maxZoom: number };

export interface FocusRequest {
  target: FocusTarget;
  /** Increment to re-run the same focus. */
  nonce: number;
}

interface Props {
  focus: FocusRequest | null;
  resetNonce: number;
  /** Pixels hidden by overlapping panels; the focus point is shifted to stay visible. */
  occluded: { right: number; bottom: number };
  reducedMotion: boolean;
  onZoomChange: (zoom: number) => void;
}

export function MapController({ focus, resetNonce, occluded, reducedMotion, onZoomChange }: Props) {
  const map = useMap();
  const { right, bottom } = occluded;

  useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
  });

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  useEffect(() => {
    if (!focus) return;
    const animate = !reducedMotion;
    const { target } = focus;
    if (target.type === 'point') {
      const zoom = Math.max(map.getZoom(), target.zoom);
      // Shift the centre so the target sits in the visible part of the map.
      const projected = map.project([target.lat, target.lon], zoom).add([right / 2, bottom / 2]);
      const center = map.unproject(projected, zoom);
      if (animate) map.flyTo(center, zoom, { duration: 0.8 });
      else map.setView(center, zoom, { animate: false });
    } else {
      map.fitBounds(L.latLngBounds(target.bounds), {
        paddingTopLeft: [40, 40],
        paddingBottomRight: [40 + right, 40 + bottom],
        maxZoom: target.maxZoom,
        animate,
      });
    }
    // Only re-run when a new focus request is issued.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, map]);

  useEffect(() => {
    if (resetNonce === 0) return;
    map.fitBounds(L.latLngBounds(NUNAVUT_INITIAL_BOUNDS), { animate: !reducedMotion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce, map]);

  return null;
}
