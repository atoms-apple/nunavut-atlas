import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityDetails } from '../src/components/community/CommunityDetails';
import { SearchBox } from '../src/components/search/SearchBox';
import { LayerPanel } from '../src/components/layers/LayerPanel';
import { Legend } from '../src/components/layers/Legend';
import { getCommunity, COMMUNITIES } from '../src/data/communities';
import { LAYERS, DEFAULT_LAYER_VISIBILITY } from '../src/data/layers/registry';
import { getRegion } from '../src/data/regions/regions';
import { buildCommunityEntries } from '../src/lib/search/search';
import type { Community } from '../src/types/community';

function community(id: string): Community {
  const c = getCommunity(id);
  if (!c) throw new Error(`missing ${id}`);
  return c;
}

describe('CommunityDetails', () => {
  it('shows verified details for Iqaluit', () => {
    render(<CommunityDetails community={community('iqaluit')} onZoomTo={() => {}} onSelectRegion={() => {}} />);
    expect(screen.getByText('7,429')).toBeInTheDocument();
    expect(screen.getByText('(2021 Census)')).toBeInTheDocument();
    expect(screen.getByText('Frobisher Bay')).toBeInTheDocument();
    expect(screen.getByText(/63°45′ N, 68°31′ W/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Canadian Geographical Names Database record/ })).toHaveAttribute(
      'href',
      'https://geonames.nrcan.gc.ca/search-place-names/unique?id=OATRP',
    );
  });

  it('explains missing population instead of crashing or guessing', () => {
    render(<CommunityDetails community={community('kinngait')} onZoomTo={() => {}} onSelectRegion={() => {}} />);
    expect(screen.getByText(/verified census population has not yet been added/)).toBeInTheDocument();
    expect(screen.getByText(/Single source/)).toBeInTheDocument();
  });

  it('handles a record with no location', () => {
    const c = { ...community('kinngait'), location: null };
    render(<CommunityDetails community={c} onZoomTo={() => {}} onSelectRegion={() => {}} />);
    expect(screen.getByText(/not shown on the map/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Zoom to/ })).not.toBeInTheDocument();
  });

  it('marks Inuktut names awaiting review', () => {
    render(<CommunityDetails community={community('baker-lake')} onZoomTo={() => {}} onSelectRegion={() => {}} />);
    expect(screen.getByText("Qamani'tuaq")).toBeInTheDocument();
    expect(screen.getAllByText('Awaiting language review').length).toBeGreaterThan(0);
  });
});

describe('SearchBox', () => {
  const entries = buildCommunityEntries(COMMUNITIES, (c) => getRegion(c.regionId).name);

  it('supports keyboard selection', async () => {
    const onSelect = vi.fn();
    render(<SearchBox entries={entries} onSelect={onSelect} coverage="coverage text" />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'inlet');
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).getAllByRole('option').length).toBe(3);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0]?.[0].name).toBe('Pond Inlet');
  });

  it('shows the coverage note when nothing matches', async () => {
    render(<SearchBox entries={entries} onSelect={() => {}} coverage="Search covers 25 municipalities." />);
    await userEvent.type(screen.getByRole('combobox'), 'Toronto');
    expect(screen.getByText(/No matches for “Toronto”/)).toBeInTheDocument();
    expect(screen.getAllByText('Search covers 25 municipalities.').length).toBeGreaterThan(0);
  });

  it('clears with Escape', async () => {
    render(<SearchBox entries={entries} onSelect={() => {}} coverage="" />);
    const input = screen.getByRole('combobox');
    await userEvent.type(input, 'arv');
    await userEvent.keyboard('{Escape}{Escape}');
    expect(input).toHaveValue('');
  });
});

describe('LayerPanel and Legend', () => {
  it('lists planned layers as disabled and available layers as toggles', async () => {
    const onToggle = vi.fn();
    render(
      <LayerPanel
        layers={LAYERS}
        visibility={DEFAULT_LAYER_VISIBILITY}
        onToggle={onToggle}
        loadState={{ 'nunavut-outline': { status: 'error', message: 'Could not load data/x.geojson (HTTP 404).' } }}
        onRetry={() => {}}
        basemapId="osm"
        basemapStatus="ready"
        onBasemapChange={() => {}}
      />,
    );
    expect(screen.getByRole('switch', { name: /Airports and aerodromes/ })).toBeDisabled();
    expect(screen.getAllByText('Data not yet available').length).toBe(LAYERS.filter((l) => l.status === 'planned').length);
    expect(screen.getByRole('alert')).toHaveTextContent('HTTP 404');
    await userEvent.click(screen.getByRole('switch', { name: 'Communities' }));
    expect(onToggle).toHaveBeenCalledWith('communities', false);
  });

  it('shows legend entries only for visible layers', () => {
    const { rerender } = render(<Legend layers={LAYERS} visibility={DEFAULT_LAYER_VISIBILITY} showOfflineLand={false} />);
    expect(screen.getByText('Qikiqtaaluk community')).toBeInTheDocument();
    expect(screen.queryByText(/Airports/)).not.toBeInTheDocument();
    rerender(<Legend layers={LAYERS} visibility={{ ...DEFAULT_LAYER_VISIBILITY, communities: false }} showOfflineLand={false} />);
    expect(screen.queryByText('Qikiqtaaluk community')).not.toBeInTheDocument();
  });
});
