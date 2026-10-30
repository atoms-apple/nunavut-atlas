import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityBrowser, type CommunityView } from '../src/components/community/CommunityBrowser';
import { COMMUNITIES } from '../src/data/communities';
import type { RegionId } from '../src/types/community';

function Harness({ onSelect = () => {} }: { onSelect?: (id: string) => void }) {
  const [view, setView] = useState<CommunityView>('list');
  const [region, setRegion] = useState<RegionId | 'all'>('all');
  return (
    <CommunityBrowser
      view={view}
      onViewChange={setView}
      communities={COMMUNITIES}
      regionFilter={region}
      onRegionFilterChange={setRegion}
      selectedId={null}
      onSelect={onSelect}
    />
  );
}

const bodyRowNames = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).getByRole('rowheader').textContent);

describe('list / table switch', () => {
  it('shows the list by default and switches to the table', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('radio', { name: 'List' })).toBeChecked();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Qikiqtaaluk' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Table' }));
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(COMMUNITIES.length + 1);
    expect(screen.getByText(`Showing ${COMMUNITIES.length} of ${COMMUNITIES.length} communities.`)).toBeInTheDocument();
  });
});

describe('community table', () => {
  it('sorts by population with aria-sort, keeping missing values last', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    const header = screen.getByRole('columnheader', { name: /Population/ });
    expect(header).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: /Community/ })).toHaveAttribute('aria-sort', 'ascending');

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(bodyRowNames()[0]).toBe('Iqaluit');
    expect(screen.getByRole('table')).toHaveAccessibleName(/sorted by population \(descending\)/);

    await user.click(within(header).getByRole('button'));
    expect(header).toHaveAttribute('aria-sort', 'ascending');
    const missing = COMMUNITIES.filter((c) => !c.population).length;
    const lastRows = within(screen.getByRole('table')).getAllByRole('row').slice(-missing);
    for (const row of lastRows) expect(row).toHaveTextContent('not yet added');
    expect(bodyRowNames()[0]).toBe('Grise Fiord');
  });

  it('filters by verified population and coordinate verification, and shows a count', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    await user.click(screen.getByRole('checkbox', { name: 'Only communities with a verified population' }));
    const withPop = COMMUNITIES.filter((c) => c.population).length;
    expect(screen.getByText(`Showing ${withPop} of ${COMMUNITIES.length} communities.`)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Coordinate verification' }), 'single-source');
    expect(bodyRowNames().sort()).toEqual(['Clyde River', 'Igloolik']);

    await user.click(screen.getByRole('radio', { name: 'Kitikmeot' }));
    expect(screen.getByText(/Showing 0 of/)).toBeInTheDocument();
    expect(screen.getByText('No communities match these filters.')).toBeInTheDocument();
  });

  it('shares the region filter with the list view', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'Kivalliq' }));
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByRole('radio', { name: 'Kivalliq' })).toBeChecked();
    expect(bodyRowNames()).toHaveLength(COMMUNITIES.filter((c) => c.regionId === 'kivalliq').length);
  });

  it('selects a community when its name is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    await user.click(screen.getByRole('button', { name: 'Rankin Inlet' }));
    expect(onSelect).toHaveBeenCalledWith('rankin-inlet');
  });

  it('lists the fields not yet added using the detail panel wording', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    const row = screen.getByRole('rowheader', { name: 'Kinngait' }).closest('tr') as HTMLElement;
    expect(row).toHaveTextContent('verified census population');
    expect(row).toHaveTextContent('Single source');
  });
});
