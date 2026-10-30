import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommunityDetails } from '../src/components/community/CommunityDetails';
import { COMMUNITIES, getCommunity } from '../src/data/communities';
import { distanceBetween, formatKm } from '../src/lib/communities/distances';
import type { Community } from '../src/types/community';

const community = (id: string) => getCommunity(id) as Community;

function renderDetails(id: string, onSelectCommunity = vi.fn()) {
  render(
    <CommunityDetails
      community={community(id)}
      onZoomTo={() => {}}
      onSelectRegion={() => {}}
      communities={COMMUNITIES}
      onSelectCommunity={onSelectCommunity}
    />,
  );
  return onSelectCommunity;
}

describe('nearest communities in CommunityDetails', () => {
  it('lists five neighbours labelled as derived, and selects one on click', async () => {
    const user = userEvent.setup();
    const onSelect = renderDetails('rankin-inlet');
    const section = screen.getByRole('region', { name: /Nearest communities/ });
    expect(within(section).getByText('Derived')).toBeInTheDocument();
    const items = within(section).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(within(section).getByText(/not a travel, flight or route distance/)).toBeInTheDocument();
    await user.click(within(items[0] as HTMLElement).getByRole('button'));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the distance to a chosen community', async () => {
    const user = userEvent.setup();
    renderDetails('iqaluit');
    const select = screen.getByRole('combobox', { name: 'Distance from Iqaluit to' });
    expect(within(select).queryByRole('option', { name: 'Iqaluit' })).not.toBeInTheDocument();
    await user.selectOptions(select, 'resolute');
    const km = distanceBetween(community('iqaluit'), community('resolute')) as number;
    expect(screen.getByText(`${formatKm(km)} to Resolute`)).toBeInTheDocument();
  });

  it('is hidden for a community without a location, and when no list is given', () => {
    const { rerender } = render(
      <CommunityDetails
        community={{ ...community('iqaluit'), location: null }}
        onZoomTo={() => {}}
        onSelectRegion={() => {}}
        communities={COMMUNITIES}
        onSelectCommunity={() => {}}
      />,
    );
    expect(screen.queryByRole('region', { name: /Nearest communities/ })).not.toBeInTheDocument();
    rerender(<CommunityDetails community={community('iqaluit')} onZoomTo={() => {}} onSelectRegion={() => {}} />);
    expect(screen.queryByRole('region', { name: /Nearest communities/ })).not.toBeInTheDocument();
  });
});
