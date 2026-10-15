import { memo, useCallback, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, Marker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import type { Basemap } from '../../config/basemaps';
import { MAP_MAX_ZOOM, MAP_MIN_ZOOM, NUNAVUT_INITIAL_BOUNDS } from '../../config/map';
import { getRegion } from '../../data/regions/regions';
import type { Community } from '../../types/community';
import type { Feature, FeatureCollection, PointGeometry } from '../../types/geo';
import type { PhysicalFeatureProperties } from '../../types/layer';
import type { Selection } from '../../hooks/useHashSelection';
import { BasemapLayer, type BasemapStatus } from './BasemapLayer';
import { MapController, type FocusRequest } from './MapController';
import { communityIcon, featureIcon } from './markers';

export interface AtlasMapProps {
  basemap: Basemap;
  /** Increment to retry loading online tiles. */
  tileRetryNonce: number;
  onBasemapStatusChange: (status: BasemapStatus) => void;
  contextLand: FeatureCollection<unknown> | null;
  showContextLand: boolean;
  communities: Community[];
  showCommunities: boolean;
  outline: FeatureCollection<unknown> | null;
  physicalFeatures: Feature<PhysicalFeatureProperties, PointGeometry>[];
  selection: Selection | null;
  onSelect: (selection: Selection) => void;
  focus: FocusRequest | null;
  resetNonce: number;
  occluded: { right: number; bottom: number };
  reducedMotion: boolean;
}

/** Zoom at which community name labels appear next to markers. */
const LABEL_ZOOM = 4.5;

/** Most prominent feature rank shown at a zoom level, to avoid label clutter. */
function maxLabelRank(zoom: number): number {
  if (zoom < 3.75) return 3;
  if (zoom < 4.5) return 5;
  return Infinity;
}

/** Leaflet 1.9 markers are focusable but do not respond to Enter/Space; add that. */
function activateOnKey(e: L.LeafletEvent, action: () => void) {
  const original = (e as L.LeafletKeyboardEvent).originalEvent;
  if (original.key === 'Enter' || original.key === ' ') {
    original.preventDefault();
    original.stopPropagation();
    action();
  }
}

const OUTLINE_STYLE = { className: 'atlas-outline', weight: 1.4, fillOpacity: 0.08 };

const CommunityMarkers = memo(function CommunityMarkers({
  communities,
  selectedId,
  onSelect,
}: {
  communities: Community[];
  selectedId: string | null;
  onSelect: (selection: Selection) => void;
}) {
  return (
    <>
      {communities.map((c) => {
        if (!c.location) return null;
        const region = getRegion(c.regionId);
        const selected = c.id === selectedId;
        return (
          <Marker
            key={c.id}
            position={[c.location.lat, c.location.lon]}
            icon={communityIcon(c.name, region, selected)}
            title={`${c.name}, ${region.name} Region`}
            keyboard
            riseOnHover
            zIndexOffset={selected ? 1000 : 0}
            eventHandlers={{
              click: () => onSelect({ kind: 'community', id: c.id }),
              keydown: (e) => activateOnKey(e, () => onSelect({ kind: 'community', id: c.id })),
            }}
          />
        );
      })}
    </>
  );
});

const FeatureMarkers = memo(function FeatureMarkers({
  features,
  selectedId,
  onSelect,
}: {
  features: Feature<PhysicalFeatureProperties, PointGeometry>[];
  selectedId: string | null;
  onSelect: (selection: Selection) => void;
}) {
  return (
    <>
      {features.map((f) => {
        const [lon, lat] = f.geometry.coordinates;
        if (lon === undefined || lat === undefined) return null;
        const id = String(f.id);
        return (
          <Marker
            key={id}
            position={[lat, lon]}
            icon={featureIcon(f.properties, id === selectedId)}
            title={`${f.properties.name} (approximate label position)`}
            keyboard
            zIndexOffset={-500}
            eventHandlers={{
              click: () => onSelect({ kind: 'feature', id }),
              keydown: (e) => activateOnKey(e, () => onSelect({ kind: 'feature', id })),
            }}
          />
        );
      })}
    </>
  );
});

export function AtlasMap(props: AtlasMapProps) {
  const [zoom, setZoom] = useState(3);
  const onZoomChange = useCallback((z: number) => setZoom(z), []);
  const bounds = useMemo(() => L.latLngBounds(NUNAVUT_INITIAL_BOUNDS), []);

  const selectedCommunity = props.selection?.kind === 'community' ? props.selection.id : null;
  const selectedFeature = props.selection?.kind === 'feature' ? props.selection.id : null;

  const rankLimit = maxLabelRank(zoom);
  const visibleFeatures = useMemo(
    () =>
      props.physicalFeatures.filter(
        (f) => (f.properties.labelRank ?? 0) <= rankLimit || String(f.id) === selectedFeature,
      ),
    [props.physicalFeatures, rankLimit, selectedFeature],
  );

  const className = [
    'atlas-map',
    zoom >= LABEL_ZOOM ? 'atlas-map--labels' : '',
    props.showContextLand ? 'atlas-map--local' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <MapContainer
      className={className}
      bounds={bounds}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={MAP_MAX_ZOOM}
      zoomControl={false}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={90}
      worldCopyJump={false}
      scrollWheelZoom
      keyboard
    >
      <ZoomControl position="topleft" />
      <BasemapLayer
        basemap={props.basemap}
        retryNonce={props.tileRetryNonce}
        onStatusChange={props.onBasemapStatusChange}
        contextLand={props.contextLand}
        showContextLand={props.showContextLand}
      />
      {props.outline && (
        <GeoJSON
          key="outline"
          data={props.outline as unknown as GeoJSON.FeatureCollection}
          style={() => OUTLINE_STYLE}
          interactive={false}
          attribution='Outline: <a href="https://www.naturalearthdata.com/">Natural Earth</a>'
        />
      )}
      {props.physicalFeatures.length > 0 && (
        <FeatureMarkers features={visibleFeatures} selectedId={selectedFeature} onSelect={props.onSelect} />
      )}
      {props.showCommunities && (
        <CommunityMarkers communities={props.communities} selectedId={selectedCommunity} onSelect={props.onSelect} />
      )}
      <MapController
        focus={props.focus}
        resetNonce={props.resetNonce}
        occluded={props.occluded}
        reducedMotion={props.reducedMotion}
        onZoomChange={onZoomChange}
      />
    </MapContainer>
  );
}
