import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportActions } from '../src/components/community/ExportActions';
import { COMMUNITIES, getCommunity } from '../src/data/communities';
import type { Community } from '../src/types/community';

afterEach(() => vi.restoreAllMocks());

function captureDownloads() {
  const blobs: Blob[] = [];
  const names: string[] = [];
  vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
    blobs.push(b as Blob);
    return 'blob:test';
  });
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download);
  });
  return { blobs, names, revoke };
}

describe('ExportActions', () => {
  it('downloads a CSV of the rows shown and revokes the object URL', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { blobs, names, revoke } = captureDownloads();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const rows = COMMUNITIES.slice(0, 3);
    render(<ExportActions rows={rows} total={COMMUNITIES.length} />);
    await user.click(screen.getByRole('button', { name: /Download CSV/ }));
    expect(names[0]).toMatch(/^nunavut-atlas-communities-\d{4}-\d{2}-\d{2}\.csv$/);
    const text = await (blobs[0] as Blob).text();
    expect(text.trim().split('\r\n')).toHaveLength(4);
    expect(screen.getByText(`CSV saved with 3 of ${COMMUNITIES.length} communities.`)).toBeInTheDocument();
    vi.advanceTimersByTime(1500);
    expect(revoke).toHaveBeenCalledWith('blob:test');
    vi.useRealTimers();
  });

  it('reports communities left out of the GeoJSON', async () => {
    captureDownloads();
    const user = userEvent.setup();
    const unmapped: Community = { ...(getCommunity('kinngait') as Community), location: null };
    render(<ExportActions rows={[getCommunity('iqaluit') as Community, unmapped]} total={2} />);
    expect(screen.getByText(/recorded coordinates \(1 of 2\)/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Download GeoJSON/ }));
    expect(screen.getByText(/GeoJSON saved with 1 community\. 1 without verified coordinates was left out: Kinngait\./)).toBeInTheDocument();
  });

  it('offers the attribution file and disables export when no rows are shown', async () => {
    const { names } = captureDownloads();
    const user = userEvent.setup();
    const { rerender } = render(<ExportActions rows={COMMUNITIES} total={COMMUNITIES.length} />);
    expect(screen.getByText(/Keep the attribution file with the exported data/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /attribution and licences/ }));
    expect(names[0]).toMatch(/-attribution\.txt$/);
    rerender(<ExportActions rows={[]} total={COMMUNITIES.length} />);
    expect(screen.getByRole('button', { name: /Download CSV/ })).toBeDisabled();
  });
});
