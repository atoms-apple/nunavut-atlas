import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app/App';
import { clearGeoJsonCache } from '../src/hooks/useGeoJsonResource';

const publicFile = (path: string) => readFileSync(resolve(__dirname, '../public', path), 'utf8');

function mockFetch(handler: (path: string) => Response | Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      return Promise.resolve(handler(url.replace(/^.*?data\//, 'data/')));
    }),
  );
}

const serveBundledData = () =>
  mockFetch((path) => new Response(publicFile(path), { status: 200, headers: { 'Content-Type': 'application/json' } }));

beforeEach(() => clearGeoJsonCache());
afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('renders the atlas with all community markers', async () => {
    serveBundledData();
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Nunavut Atlas' })).toBeInTheDocument();
    await waitFor(() => expect(container.querySelectorAll('.atlas-marker--community')).toHaveLength(25));
  });

  it('supports the core journey: search, details, layer toggle, close, reset', async () => {
    serveBundledData();
    const user = userEvent.setup();
    const { container } = render(<App />);

    await user.type(screen.getByRole('combobox'), 'iqaluit');
    await user.keyboard('{Enter}');
    const panel = await screen.findByRole('region', { name: 'Iqaluit' });
    expect(within(panel).getByText('7,429')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/community/iqaluit');

    await user.click(screen.getByRole('button', { name: 'Layers' }));
    const toggle = screen.getByRole('switch', { name: 'Communities' });
    expect(toggle).toBeChecked();
    await user.click(toggle);
    expect(container.querySelectorAll('.atlas-marker--community')).toHaveLength(0);
    await user.click(toggle);
    expect(container.querySelectorAll('.atlas-marker--community')).toHaveLength(25);

    await user.click(screen.getByRole('button', { name: 'Close Iqaluit panel' }));
    expect(screen.queryByRole('region', { name: 'Iqaluit' })).not.toBeInTheDocument();
    expect(window.location.hash).toBe('');

    await user.click(screen.getByRole('button', { name: 'Reset map to show all of Nunavut' }));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('remembers layer visibility for the session', async () => {
    serveBundledData();
    const user = userEvent.setup();
    const first = render(<App />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    await user.click(screen.getByRole('switch', { name: 'Territorial outline' }));
    first.unmount();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    expect(screen.getByRole('switch', { name: 'Territorial outline' })).not.toBeChecked();
  });

  it('stays usable when optional layers fail to load', async () => {
    mockFetch(() => new Response('not found', { status: 404 }));
    const user = userEvent.setup();
    const { container } = render(<App />);
    await waitFor(() => expect(container.querySelectorAll('.atlas-marker--community')).toHaveLength(25));
    await screen.findByText(/Some optional map layers could not be loaded/);

    await user.click(screen.getByRole('button', { name: 'Layers' }));
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((a) => /HTTP 404/.test(a.textContent ?? ''))).toBe(true);

    await user.type(screen.getByRole('combobox'), 'arviat');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('region', { name: 'Arviat' })).toBeInTheDocument();
  });

  it('reports invalid optional GeoJSON with a useful error', async () => {
    mockFetch((path) =>
      path.includes('physical-features')
        ? new Response(JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', id: 'x', geometry: { type: 'Point', coordinates: [63.7, -68.5] }, properties: { name: 'X', category: 'bay', realm: 'marine', sourceId: 'natural-earth-physical' } }] }))
        : new Response(publicFile(path)),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Layers' }));
    const alert = await screen.findByText(/failed validation/);
    expect(alert.textContent).toMatch(/\[latitude, longitude\]/);
  });

  it('opens a community from a deep link', async () => {
    serveBundledData();
    window.history.replaceState(null, '', '/#/community/grise-fiord');
    render(<App />);
    const panel = await screen.findByRole('region', { name: 'Grise Fiord' });
    expect(within(panel).getByText(/most northerly community/)).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown deep link', async () => {
    serveBundledData();
    window.history.replaceState(null, '', '/#/community/atlantis');
    render(<App />);
    expect(await screen.findByText(/No community with the identifier “atlantis”/)).toBeInTheDocument();
  });
});

describe('App in a frame that refuses history changes', () => {
  it('still completes the selection', async () => {
    serveBundledData();
    const spy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole('combobox'), 'iqaluit');
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('region', { name: 'Iqaluit' })).toBeInTheDocument();
    // The search box finishes its own update (closes and shows the chosen name),
    // which only happens if selecting did not throw.
    expect(screen.getByRole('combobox')).toHaveValue('Iqaluit');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    spy.mockRestore();
  });
});
