import { useCallback, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { AtlasMap } from '../components/map/AtlasMap';
import type { BasemapStatus } from '../components/map/BasemapLayer';
import type { FocusRequest, FocusTarget } from '../components/map/MapController';
import { MapStatusBanner } from '../components/map/MapStatusBanner';
import { Header, type PanelId } from '../components/layout/Header';
import { SearchBox } from '../components/search/SearchBox';
import { Panel } from '../components/shared/Panel';
import { LayerPanel, type LayerLoadState } from '../components/layers/LayerPanel';
import { Legend } from '../components/layers/Legend';
import { CommunityDetails } from '../components/community/CommunityDetails';
import { CommunityList } from '../components/community/CommunityList';
import { FeatureDetails } from '../components/community/FeatureDetails';
import { RegionDetails } from '../components/community/RegionDetails';
import { AboutPanel } from '../components/panels/AboutPanel';
import { BASEMAPS, DEFAULT_BASEMAP_ID, getBasemap } from '../config/basemaps';
import { COMMUNITY_FOCUS_ZOOM, FEATURE_FOCUS_ZOOM } from '../config/map';
import { COMMUNITIES, COMMUNITY_DATA_ERRORS, getCommunity } from '../data/communities';
import { DEFAULT_LAYER_VISIBILITY, LAYERS, getLayer } from '../data/layers/registry';
import { REGIONS, getRegion } from '../data/regions/regions';
import { useGeoJsonResource } from '../hooks/useGeoJsonResource';
import { useHashSelection, type Selection } from '../hooks/useHashSelection';
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMediaQuery';
import { useSessionPreference } from '../hooks/useSessionPreference';
import { boundsOfPoints } from '../lib/geo/coordinates';
import {
  buildCommunityEntries,
  buildFeatureEntries,
  buildRegionEntries,
  type SearchEntry,
} from '../lib/search/search';
import type { Community, RegionId } from '../types/community';
import type { PointGeometry } from '../types/geo';
import type { PhysicalFeatureProperties } from '../types/layer';

const isVisibilityMap = (v: unknown): v is Record<string, boolean> =>
  typeof v === 'object' && v !== null && Object.values(v).every((x) => typeof x === 'boolean');
const isBasemapId = (v: unknown): v is string => typeof v === 'string' && BASEMAPS.some((b) => b.id === v);

const DESKTOP_PANEL_WIDTH = 400;
const MOBILE_SHEET_RATIO = 0.5;

const regionName = (c: Community) => getRegion(c.regionId).name;
const COMMUNITY_ENTRIES = buildCommunityEntries(COMMUNITIES, regionName);
const REGION_ENTRIES = buildRegionEntries(REGIONS);

/** Focus for a community or region deep link, available before any data loads. */
function initialFocusFor(selection: Selection | null): FocusRequest | null {
  if (!selection) return null;
  if (selection.kind === 'community') {
    const loc = getCommunity(selection.id)?.location;
    return loc ? { target: { type: 'point', lat: loc.lat, lon: loc.lon, zoom: COMMUNITY_FOCUS_ZOOM }, nonce: 0 } : null;
  }
  if (selection.kind === 'region') {
    const bounds = boundsOfPoints(COMMUNITIES.filter((c) => c.regionId === selection.id).flatMap((c) => (c.location ? [c.location] : [])));
    return bounds ? { target: { type: 'bounds', bounds, maxZoom: 6 }, nonce: 0 } : null;
  }
  return null;
}

export function App() {
  const isMobile = useMediaQuery('(max-width: 760px)');
  const reducedMotion = usePrefersReducedMotion();

  const [selection, setSelection] = useHashSelection();
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [regionFilter, setRegionFilter] = useState<RegionId | 'all'>('all');
  const [focus, setFocus] = useState<FocusRequest | null>(() => initialFocusFor(selection));
  const [resetNonce, setResetNonce] = useState(0);
  const [basemapStatus, setBasemapStatus] = useState<BasemapStatus>('loading');
  const [tileRetry, setTileRetry] = useState(0);
  const [bannerDismissedFor, setBannerDismissedFor] = useState<string | null>(null);

  const [storedVisibility, setVisibility] = useSessionPreference('layers', DEFAULT_LAYER_VISIBILITY, isVisibilityMap);
  const visibility = useMemo(() => ({ ...DEFAULT_LAYER_VISIBILITY, ...storedVisibility }), [storedVisibility]);
  const [basemapId, setBasemapId] = useSessionPreference('basemap', DEFAULT_BASEMAP_ID, isBasemapId);
  const basemap = getBasemap(basemapId);

  // Optional static datasets are fetched only when needed.
  const showContextLand = basemap.kind === 'local' || basemapStatus === 'unavailable';
  const outlineLayer = getLayer('nunavut-outline');
  const physicalLayer = getLayer('physical-features');
  const outline = useGeoJsonResource(outlineLayer?.dataPath, !!visibility['nunavut-outline'], {
    allowedGeometryTypes: ['Polygon', 'MultiPolygon'],
  });
  // Physical features also feed search, so they load whether or not the layer is visible.
  const physical = useGeoJsonResource<PhysicalFeatureProperties>(physicalLayer?.dataPath, true, {
    allowedGeometryTypes: ['Point'],
    requiredProperties: ['name', 'category', 'realm', 'sourceId'],
    requireIds: true,
    detectSwappedCoordinates: true,
  });
  const contextLand = useGeoJsonResource('data/context-land.geojson', showContextLand, {
    allowedGeometryTypes: ['Polygon', 'MultiPolygon'],
  });

  const physicalFeatures = useMemo(
    () =>
      physical.status === 'ready'
        ? physical.data.features.filter(
            (f): f is typeof f & { geometry: PointGeometry } => f.geometry.type === 'Point',
          )
        : [],
    [physical],
  );

  const searchEntries = useMemo<SearchEntry[]>(
    () => [...COMMUNITY_ENTRIES, ...REGION_ENTRIES, ...buildFeatureEntries(physicalFeatures)],
    [physicalFeatures],
  );
  const searchCoverage =
    `Search covers Nunavut’s ${COMMUNITIES.length} municipalities (including recorded former and Inuktut names), ` +
    `its 3 regions` +
    (physicalFeatures.length ? ` and ${physicalFeatures.length} named islands, peninsulas and waters.` : '.') +
    ' Other place names are not yet included.';

  const visibleCommunities = useMemo(
    () => (regionFilter === 'all' ? COMMUNITIES : COMMUNITIES.filter((c) => c.regionId === regionFilter)),
    [regionFilter],
  );

  const selectedCommunity = selection?.kind === 'community' ? getCommunity(selection.id) : undefined;
  const selectedFeature =
    selection?.kind === 'feature' ? physicalFeatures.find((f) => String(f.id) === selection.id) : undefined;
  const selectedRegion =
    selection?.kind === 'region' ? REGIONS.find((r) => r.id === selection.id) : undefined;

  const detailsOpen = !!(selectedCommunity || selectedFeature || selectedRegion);
  // On mobile only one sheet is shown at a time; details take precedence.
  const leftPanel = isMobile && detailsOpen ? null : activePanel;

  const occluded = useMemo(() => {
    if (!detailsOpen) return { right: 0, bottom: 0 };
    if (isMobile) return { right: 0, bottom: Math.round(window.innerHeight * MOBILE_SHEET_RATIO) };
    return { right: DESKTOP_PANEL_WIDTH, bottom: 0 };
  }, [detailsOpen, isMobile]);

  const requestFocus = useCallback((target: FocusTarget) => {
    setFocus((prev) => ({ target, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const focusOn = useCallback(
    (sel: Selection) => {
      if (sel.kind === 'community') {
        const c = getCommunity(sel.id);
        if (c?.location) requestFocus({ type: 'point', lat: c.location.lat, lon: c.location.lon, zoom: COMMUNITY_FOCUS_ZOOM });
      } else if (sel.kind === 'feature') {
        const f = physicalFeatures.find((x) => String(x.id) === sel.id);
        const [lon, lat] = f?.geometry.coordinates ?? [];
        if (lat !== undefined && lon !== undefined) requestFocus({ type: 'point', lat, lon, zoom: FEATURE_FOCUS_ZOOM });
      } else {
        const points = COMMUNITIES.filter((c) => c.regionId === sel.id).flatMap((c) => (c.location ? [c.location] : []));
        const bounds = boundsOfPoints(points);
        if (bounds) requestFocus({ type: 'bounds', bounds, maxZoom: 6 });
      }
    },
    [physicalFeatures, requestFocus],
  );

  const select = useCallback(
    (sel: Selection, options: { focus?: boolean } = {}) => {
      setSelection(sel);
      if (options.focus ?? true) focusOn(sel);
    },
    [focusOn, setSelection],
  );

  // A deep link (e.g. #/feature/ne-baffin-island) to a feature can only be
  // focused once the feature data has loaded; communities and regions are
  // focused immediately via the initial focus state above.
  const [initialSelection] = useState(selection);
  const deepLinkFocus = useMemo<FocusRequest | null>(() => {
    if (initialSelection?.kind !== 'feature') return null;
    const f = physicalFeatures.find((x) => String(x.id) === initialSelection.id);
    const [lon, lat] = f?.geometry.coordinates ?? [];
    return lat !== undefined && lon !== undefined
      ? { target: { type: 'point', lat, lon, zoom: FEATURE_FOCUS_ZOOM }, nonce: 0 }
      : null;
  }, [initialSelection, physicalFeatures]);

  const onMapSelect = useCallback((sel: Selection) => select(sel, { focus: false }), [select]);

  const onSearchSelect = (entry: SearchEntry) => {
    if (entry.kind === 'region') setRegionFilter(entry.id as RegionId);
    else if (entry.kind === 'community' && regionFilter !== 'all') setRegionFilter('all');
    select({ kind: entry.kind, id: entry.id });
  };

  const closeDetails = () => setSelection(null);

  const togglePanel = (panel: PanelId) => {
    setActivePanel((p) => (p === panel ? null : panel));
    if (isMobile) setSelection(null);
  };

  const layerLoadState: Record<string, LayerLoadState> = {
    'nunavut-outline': outline.status === 'error' ? { status: 'error', message: outline.message } : { status: outline.status },
    'physical-features':
      physical.status === 'error' ? { status: 'error', message: physical.message } : { status: physical.status },
  };

  let detailsPanel = null;
  if (selectedCommunity) {
    const region = getRegion(selectedCommunity.regionId);
    detailsPanel = (
      <Panel
        side="right"
        title={selectedCommunity.name}
        subtitle={`Community · ${region.name} Region`}
        onClose={closeDetails}
      >
        <CommunityDetails
          community={selectedCommunity}
          onZoomTo={() => focusOn({ kind: 'community', id: selectedCommunity.id })}
          onSelectRegion={() => select({ kind: 'region', id: region.id })}
        />
      </Panel>
    );
  } else if (selectedFeature) {
    detailsPanel = (
      <Panel side="right" title={selectedFeature.properties.name} subtitle="Physical geography" onClose={closeDetails}>
        <FeatureDetails feature={selectedFeature} onZoomTo={() => focusOn({ kind: 'feature', id: String(selectedFeature.id) })} />
      </Panel>
    );
  } else if (selectedRegion) {
    detailsPanel = (
      <Panel side="right" title={`${selectedRegion.name} Region`} subtitle="Region · community grouping" onClose={closeDetails}>
        <RegionDetails
          region={selectedRegion}
          communities={COMMUNITIES}
          onSelectCommunity={(id) => select({ kind: 'community', id })}
        />
      </Panel>
    );
  } else if (selection && physical.status !== 'loading' && physical.status !== 'idle') {
    // A link pointed at something that does not exist in the loaded data.
    detailsPanel = (
      <Panel side="right" title="Not found" onClose={closeDetails}>
        <p>
          No {selection.kind} with the identifier “{selection.id}” is in the atlas data. It may have been renamed or removed.
        </p>
      </Panel>
    );
  }

  return (
    <div className="app">
      <a className="skip-link" href="#atlas-panels">
        Skip to community list and panels
      </a>
      <Header
        search={<SearchBox entries={searchEntries} onSelect={onSearchSelect} coverage={searchCoverage} />}
        activePanel={leftPanel}
        onTogglePanel={togglePanel}
      />
      <main className="app-main">
        <section className="map-region" aria-label="Map of Nunavut">
          <AtlasMap
            basemap={basemap}
            tileRetryNonce={tileRetry}
            onBasemapStatusChange={setBasemapStatus}
            contextLand={contextLand.status === 'ready' ? contextLand.data : null}
            showContextLand={showContextLand}
            communities={visibleCommunities}
            showCommunities={!!visibility.communities}
            outline={visibility['nunavut-outline'] && outline.status === 'ready' ? outline.data : null}
            physicalFeatures={visibility['physical-features'] ? physicalFeatures : []}
            selection={selection}
            onSelect={onMapSelect}
            focus={focus ?? deepLinkFocus}
            resetNonce={resetNonce}
            occluded={occluded}
            reducedMotion={reducedMotion}
          />
          <button
            type="button"
            className="map-reset"
            onClick={() => setResetNonce((n) => n + 1)}
            aria-label="Reset map to show all of Nunavut"
            title="Reset view to Nunavut"
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <MapStatusBanner
            status={bannerDismissedFor === `${basemap.id}-${tileRetry}` ? 'local' : basemapStatus}
            onDismiss={() => setBannerDismissedFor(`${basemap.id}-${tileRetry}`)}
            basemapName={basemap.name}
            onRetry={() => setTileRetry((n) => n + 1)}
            onUseOffline={() => setBasemapId('local')}
          />
          {(outline.status === 'error' || physical.status === 'error') && (
            <div className="map-toast" role="status">
              Some optional map layers could not be loaded. See Layers for details.
            </div>
          )}
          <Legend
            layers={LAYERS}
            visibility={visibility}
            showOfflineLand={showContextLand && contextLand.status === 'ready'}
            initiallyOpen={!isMobile}
          />
          <p className="visually-hidden" role="status" aria-live="polite">
            {selectedCommunity ? `${selectedCommunity.name} selected.` : ''}
          </p>
        </section>

        <div id="atlas-panels" className="panels">
          {leftPanel === 'communities' && (
            <Panel
              side="left"
              title="Communities"
              subtitle="All 25 municipalities, grouped by region"
              onClose={() => setActivePanel(null)}
            >
              <CommunityList
                communities={COMMUNITIES}
                regionFilter={regionFilter}
                onRegionFilterChange={setRegionFilter}
                selectedId={selectedCommunity?.id ?? null}
                onSelect={(id) => {
                  if (isMobile) setActivePanel(null);
                  select({ kind: 'community', id });
                }}
              />
            </Panel>
          )}
          {leftPanel === 'layers' && (
            <Panel side="left" title="Layers" subtitle="Base map and data layers" onClose={() => setActivePanel(null)}>
              <LayerPanel
                layers={LAYERS}
                visibility={visibility}
                onToggle={(id, visible) => setVisibility((v) => ({ ...DEFAULT_LAYER_VISIBILITY, ...v, [id]: visible }))}
                loadState={layerLoadState}
                onRetry={(id) => (id === 'nunavut-outline' ? outline.retry() : physical.retry())}
                basemapId={basemap.id}
                basemapStatus={basemapStatus}
                onBasemapChange={setBasemapId}
              />
            </Panel>
          )}
          {leftPanel === 'about' && (
            <Panel side="left" title="About & data sources" onClose={() => setActivePanel(null)}>
              <AboutPanel dataErrors={COMMUNITY_DATA_ERRORS} />
            </Panel>
          )}
          {detailsPanel}
        </div>
      </main>
    </div>
  );
}
