import L from 'leaflet';
import type { Region } from '../../types/community';
import type { PhysicalFeatureProperties } from '../../types/layer';

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch);
}

const iconCache = new Map<string, L.DivIcon>();

/**
 * Community marker: a region-coloured symbol whose shape also encodes the
 * region (circle, square, diamond), so colour is never the only cue.
 */
export function communityIcon(name: string, region: Region, selected: boolean): L.DivIcon {
  const key = `c|${name}|${region.id}|${selected}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: `atlas-marker atlas-marker--community${selected ? ' is-selected' : ''}`,
    html:
      `<span class="atlas-marker__symbol atlas-marker__symbol--${region.style.shape}" style="--marker-color:${region.style.color}" aria-hidden="true"></span>` +
      `<span class="atlas-marker__label">${escapeHtml(name)}</span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  iconCache.set(key, icon);
  return icon;
}

export function featureIcon(props: PhysicalFeatureProperties, selected: boolean): L.DivIcon {
  const key = `f|${props.name}|${props.realm}|${selected}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const icon = L.divIcon({
    className: `atlas-marker atlas-marker--feature atlas-marker--${props.realm}${selected ? ' is-selected' : ''}`,
    html: `<span class="atlas-feature-label">${escapeHtml(props.name)}</span>`,
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  });
  iconCache.set(key, icon);
  return icon;
}
