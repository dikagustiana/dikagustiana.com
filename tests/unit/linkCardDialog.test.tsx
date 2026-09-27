/**
 * The link-card dialog's "Fetch details": fetched values fill the fields, the
 * author's own values always win, a failure leaves manual entry intact, and a
 * snapshot only counts for the link it was fetched for.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LinkPreviewResponse } from '@/lib/linkPreview';

const fetchLinkPreview = vi.fn<(url: string) => Promise<LinkPreviewResponse>>();
vi.mock('@/lib/linkPreview', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/linkPreview')>()),
  fetchLinkPreview: (url: string) => fetchLinkPreview(url),
}));

const { LinkCardDialog } = await import('@/components/editorial/LinkCardDialog');

const FETCHED = {
  title: 'Where’s the “intelligence explosion”?',
  description: 'Ramez Naam gives a skeptic’s take on Recursive Self-Improvement.',
  author: 'Ramez Naam',
  authorUrl: 'https://substack.com/@rameznaam',
  siteName: 'Noahpinion',
  publishedAt: '2026-09-27',
  resolvedAt: '2026-09-27T08:00:00.000Z',
};
const URL_A = 'https://www.noahpinion.blog/p/wheres-the-intelligence-explosion';

function setup() {
  const onInsert = vi.fn();
  render(<LinkCardDialog open onOpenChange={() => {}} onInsert={onInsert} />);
  const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
  return { onInsert, field, user: userEvent.setup() };
}

beforeEach(() => fetchLinkPreview.mockReset());

describe('LinkCardDialog: Fetch details', () => {
  it('fills every field, shows when, keeps them editable, and inserts the whole snapshot', async () => {
    fetchLinkPreview.mockResolvedValue({ ok: true, data: FETCHED });
    const { onInsert, field, user } = setup();

    await user.type(field('URL'), URL_A);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    await waitFor(() => expect(field('Title').value).toBe(FETCHED.title));
    expect(fetchLinkPreview).toHaveBeenCalledWith(URL_A);
    expect(field('Summary').value).toBe(FETCHED.description);
    expect(field('Author').value).toBe('Ramez Naam');
    expect(field('Source').value).toBe('Noahpinion');
    expect(field('Published').value).toBe('2026-09-27');
    expect(field('Author link').value).toBe('https://substack.com/@rameznaam');
    expect(screen.getByRole('status')).toHaveTextContent('Details fetched 27 September 2026');

    // Still editable after the fetch.
    await user.clear(field('Title'));
    await user.type(field('Title'), 'My own title');

    await user.click(screen.getByRole('button', { name: 'Insert' }));
    expect(onInsert).toHaveBeenCalledWith({ url: URL_A, ...FETCHED, title: 'My own title' });
  });

  it('never overwrites a field the author typed first', async () => {
    fetchLinkPreview.mockResolvedValue({ ok: true, data: FETCHED });
    const { field, user } = setup();

    await user.type(field('URL'), URL_A);
    await user.type(field('Title'), 'Typed before fetching');
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    await waitFor(() => expect(field('Author').value).toBe('Ramez Naam'));
    expect(field('Title').value).toBe('Typed before fetching');
  });

  it('…nor one typed WHILE the fetch was in flight', async () => {
    let answer!: (r: LinkPreviewResponse) => void;
    fetchLinkPreview.mockReturnValue(new Promise(resolve => (answer = resolve)));
    const { field, user } = setup();

    await user.type(field('URL'), URL_A);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    expect(screen.getByRole('button', { name: /Fetching/ })).toBeDisabled();
    await user.type(field('Author'), 'Typed during the fetch');
    answer({ ok: true, data: FETCHED });

    await waitFor(() => expect(field('Title').value).toBe(FETCHED.title));
    expect(field('Author').value).toBe('Typed during the fetch');
  });

  it('a failed fetch says so plainly and manual entry still works, with no fetch time claimed', async () => {
    fetchLinkPreview.mockResolvedValue({ ok: false, message: 'The page answered HTTP 403.' });
    const { onInsert, field, user } = setup();

    await user.type(field('URL'), 'https://example.com/walled');
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'The page answered HTTP 403. You can fill the fields in yourself.',
      ),
    );
    await user.type(field('Title'), 'Typed by hand');
    await user.type(field('Author'), 'A. Writer');
    await user.click(screen.getByRole('button', { name: 'Insert' }));
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com/walled', title: 'Typed by hand', author: 'A. Writer', resolvedAt: '' }),
    );
  });

  it('changing the link drops the untouched fetched values and the fetch time; typed values stay', async () => {
    fetchLinkPreview.mockResolvedValue({ ok: true, data: FETCHED });
    const { onInsert, field, user } = setup();

    await user.type(field('URL'), URL_A);
    await user.type(field('Summary'), 'My summary');
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    await waitFor(() => expect(field('Title').value).toBe(FETCHED.title));

    await user.clear(field('URL'));
    await user.type(field('URL'), 'https://example.com/other');

    expect(field('Title').value).toBe('');
    expect(field('Author').value).toBe('');
    expect(field('Summary').value).toBe('My summary');
    expect(screen.getByRole('status')).toHaveTextContent('');

    await user.click(screen.getByRole('button', { name: 'Insert' }));
    expect(onInsert).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://example.com/other', title: 'example.com', description: 'My summary', resolvedAt: '' }),
    );
  });

  it('an answer for a link the author has since changed is ignored', async () => {
    let answer!: (r: LinkPreviewResponse) => void;
    fetchLinkPreview.mockReturnValue(new Promise(resolve => (answer = resolve)));
    const { field, user } = setup();

    await user.type(field('URL'), URL_A);
    await user.click(screen.getByRole('button', { name: 'Fetch details' }));
    await user.type(field('URL'), '-changed');
    answer({ ok: true, data: FETCHED });

    await new Promise(r => setTimeout(r, 20));
    expect(field('Title').value).toBe('');
    expect(screen.getByRole('button', { name: 'Fetch details' })).toBeEnabled();
  });
});
