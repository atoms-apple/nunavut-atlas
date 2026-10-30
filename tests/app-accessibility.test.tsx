import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app/App';
import { clearGeoJsonCache } from '../src/hooks/useGeoJsonResource';
import { COMMUNITIES } from '../src/data/communities';
import { REGIONS } from '../src/data/regions/regions';
import { serveBundledData } from './fetch-helpers';

beforeEach(() => {
  clearGeoJsonCache();
  serveBundledData();
});
afterEach(() => vi.unstubAllGlobals());

const liveRegion = (container: HTMLElement) => container.querySelector('[aria-live="polite"]');

async function searchAndChoose(user: ReturnType<typeof userEvent.setup>, query: string, option: RegExp) {
  const input = screen.getByRole('combobox', { name: /search/i });
  await user.clear(input);
  await user.type(input, query);
  await user.click(await screen.findByRole('option', { name: option }));
}

describe('live region announcements', () => {
  it('announces community, region and feature selections', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);

    await searchAndChoose(user, 'iqaluit', /^Iqaluit/);
    expect(liveRegion(container)).toHaveTextContent('Iqaluit selected.');

    await searchAndChoose(user, 'kivalliq', /^Kivalliq Region/);
    expect(liveRegion(container)).toHaveTextContent('Kivalliq Region selected.');

    // Physical features come from a lazily loaded file.
    await waitFor(async () => {
      await user.clear(screen.getByRole('combobox', { name: /search/i }));
      await user.type(screen.getByRole('combobox', { name: /search/i }), 'baffin island');
      expect(screen.getByRole('option', { name: /^Baffin Island/ })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: /^Baffin Island/ }));
    expect(liveRegion(container)).toHaveTextContent('Baffin Island selected.');
  });
});

describe('focus return when a panel closes', () => {
  it('returns focus to the header button that opened a left panel', async () => {
    const user = userEvent.setup();
    render(<App />);
    const layersButton = screen.getByRole('button', { name: 'Layers' });
    await user.click(layersButton);
    await user.click(screen.getByRole('button', { name: 'Close Layers panel' }));
    expect(layersButton).toHaveFocus();
  });

  it('returns focus to the search box after closing details with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole('combobox', { name: /search/i });
    await user.type(input, 'arviat');
    await user.keyboard('{Enter}');
    const heading = await screen.findByRole('heading', { level: 2, name: 'Arviat' });
    expect(heading).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Arviat' })).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('returns focus to the community list item that opened the details', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Communities' }));
    const list = screen.getByRole('region', { name: 'Communities' });
    const item = within(list).getByRole('button', { name: /^Pond Inlet/ });
    await user.click(item);
    await user.click(await screen.findByRole('button', { name: 'Close Pond Inlet panel' }));
    expect(item).toHaveFocus();
  });

  it('falls back to the map when the opener is gone', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.type(screen.getByRole('combobox', { name: /search/i }), 'arviat');
    await user.keyboard('{Enter}');
    // The region link replaces the community panel with the region panel.
    await user.click(await screen.findByRole('button', { name: /Kivalliq/ }));
    const input = screen.getByRole('combobox', { name: /search/i });
    input.remove();
    await user.click(await screen.findByRole('button', { name: 'Close Kivalliq Region panel' }));
    expect(container.querySelector('.leaflet-container')).toHaveFocus();
  });
});

describe('region link in a community panel', () => {
  it('sets the region filter for the map and the list', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.type(screen.getByRole('combobox', { name: /search/i }), 'arviat');
    await user.keyboard('{Enter}');
    await user.click(await screen.findByRole('button', { name: /Kivalliq/ }));
    expect(await screen.findByRole('region', { name: 'Kivalliq Region' })).toBeInTheDocument();
    const kivalliqCount = COMMUNITIES.filter((c) => c.regionId === 'kivalliq').length;
    expect(container.querySelectorAll('.atlas-marker--community')).toHaveLength(kivalliqCount);
    await user.click(screen.getByRole('button', { name: 'Communities' }));
    expect(screen.getByRole('radio', { name: 'Kivalliq' })).toBeChecked();
  });
});

describe('counts come from the data', () => {
  it('uses the community and region counts in visible text', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Communities' }));
    expect(screen.getByText(`All ${COMMUNITIES.length} municipalities, grouped by region`)).toBeInTheDocument();
    await user.type(screen.getByRole('combobox', { name: /search/i }), 'zzzz');
    expect(
      screen.getAllByText(new RegExp(`${COMMUNITIES.length} municipalities .*its ${REGIONS.length} regions`)).length,
    ).toBeGreaterThan(0);
  });
});

describe('physical feature labels', () => {
  it('are clickable but not in the keyboard tab order', async () => {
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelectorAll('.atlas-marker--feature').length).toBeGreaterThan(0));
    for (const el of container.querySelectorAll('.atlas-marker--feature')) {
      expect(el.getAttribute('tabindex')).not.toBe('0');
    }
    const community = container.querySelector('.atlas-marker--community');
    expect(community?.getAttribute('tabindex')).toBe('0');
  });

  it('shows a metric scale bar', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.leaflet-control-scale-line')).toHaveTextContent(/km|m$/);
  });
});
