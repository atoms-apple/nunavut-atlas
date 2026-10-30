import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegionDetails } from '../src/components/community/RegionDetails';
import { COMMUNITIES } from '../src/data/communities';
import { REGIONS, getRegion } from '../src/data/regions/regions';
import { regionSummary } from '../src/lib/communities/regions';
import type { Community } from '../src/types/community';

const NUMBER = new Intl.NumberFormat('en-CA');

describe('regionSummary', () => {
  it('sums only verified 2021 counts and reports coverage', () => {
    for (const region of REGIONS) {
      const members = COMMUNITIES.filter((c) => c.regionId === region.id);
      const counted = members.filter((c) => c.population);
      const s = regionSummary(region.id, COMMUNITIES);
      expect(s.communityCount).toBe(members.length);
      expect(s.withPopulation).toBe(counted.length);
      expect(s.withoutPopulation).toBe(members.length - counted.length);
      expect(s.populationSubtotal).toBe(counted.reduce((sum, c) => sum + (c.population?.count ?? 0), 0));
    }
  });

  it('finds the northernmost and southernmost by recorded latitude', () => {
    const q = regionSummary('qikiqtaaluk', COMMUNITIES);
    expect(q.northernmost?.name).toBe('Grise Fiord');
    expect(q.southernmost?.name).toBe('Sanikiluaq');
    const k = regionSummary('kivalliq', COMMUNITIES);
    expect(k.northernmost?.name).toBe('Naujaat');
    expect(k.southernmost?.name).toBe('Arviat');
  });

  it('returns null rather than 0 when no community has a population, and skips unmapped ones', () => {
    const kitikmeot = COMMUNITIES.filter((c) => c.regionId === 'kitikmeot').map(
      (c): Community => ({ ...c, population: null, location: c.id === 'kugluktuk' ? c.location : null }),
    );
    const s = regionSummary('kitikmeot', kitikmeot);
    expect(s.populationSubtotal).toBeNull();
    expect(s.withPopulation).toBe(0);
    expect(s.northernmost?.id).toBe('kugluktuk');
    expect(s.southernmost?.id).toBe('kugluktuk');
    expect(regionSummary('kitikmeot', []).northernmost).toBeNull();
  });
});

describe('RegionDetails summary', () => {
  it('states the subtotal with its coverage and a derived badge', () => {
    const s = regionSummary('kitikmeot', COMMUNITIES);
    render(<RegionDetails region={getRegion('kitikmeot')} communities={COMMUNITIES} onSelectCommunity={() => {}} />);
    expect(screen.getByText(NUMBER.format(s.populationSubtotal as number))).toBeInTheDocument();
    expect(
      screen.getByText(
        new RegExp(`across ${s.withPopulation} of ${s.communityCount} communities with a verified 2021 census population; ${s.withoutPopulation} not yet added`),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/not an official regional total/)).toBeInTheDocument();
    expect(screen.getAllByText('Derived').length).toBeGreaterThan(0);
  });

  it('says so instead of showing 0 when no population is verified', () => {
    const none = COMMUNITIES.map((c): Community => ({ ...c, population: null }));
    render(<RegionDetails region={getRegion('kivalliq')} communities={none} onSelectCommunity={() => {}} />);
    expect(screen.getByText('No community in this region has a verified 2021 census population yet.')).toBeInTheDocument();
    expect(screen.queryByText(/^0$/)).not.toBeInTheDocument();
  });

  it('selects the northernmost community when clicked', async () => {
    const onSelect = vi.fn();
    render(<RegionDetails region={getRegion('qikiqtaaluk')} communities={COMMUNITIES} onSelectCommunity={onSelect} />);
    const northRow = screen.getByText('Northernmost').closest('.fact') as HTMLElement;
    await userEvent.click(northRow.querySelector('button') as HTMLElement);
    expect(onSelect).toHaveBeenCalledWith('grise-fiord');
  });
});
