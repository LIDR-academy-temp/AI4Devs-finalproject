import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Tag } from '../../lib/tags-api';
import { TagPicker } from './tag-picker';

const TAGS: Tag[] = [
  { id: 't-smoke', name: 'Smoke', color: 'green', testCaseCount: 2, bugCount: 0 },
  { id: 't-reg', name: 'Regression', color: 'blue', testCaseCount: 0, bugCount: 0 },
];

function open() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit tags' }));
}

describe('TagPicker', () => {
  it('selecting an unselected tag adds it; selecting a carried one removes it', () => {
    const onChange = vi.fn();
    render(<TagPicker tags={TAGS} selectedIds={['t-reg']} onChange={onChange} />);
    open();

    fireEvent.click(screen.getByRole('option', { name: /Smoke/ }));
    expect(onChange).toHaveBeenLastCalledWith(['t-reg', 't-smoke']);

    fireEvent.click(screen.getByRole('option', { name: /Regression/ }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('typing a new name offers Create, and creating adds the new tag', async () => {
    const onChange = vi.fn();
    const onCreate = vi.fn(async (name: string): Promise<Tag> => ({ id: 't-new', name, color: 'gray', testCaseCount: 0, bugCount: 0 }));
    render(<TagPicker tags={TAGS} selectedIds={['t-smoke']} onChange={onChange} onCreate={onCreate} />);
    open();

    fireEvent.change(screen.getByPlaceholderText('Search or create a tag'), { target: { value: ' payments ' } });
    fireEvent.click(screen.getByRole('option', { name: /Create “payments”/ }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('payments'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['t-smoke', 't-new']));
  });

  it('offers no Create for an existing name (ignoring case) or without create permission', () => {
    const onCreate = vi.fn();
    const { unmount } = render(<TagPicker tags={TAGS} selectedIds={[]} onChange={vi.fn()} onCreate={onCreate} />);
    open();
    fireEvent.change(screen.getByPlaceholderText('Search or create a tag'), { target: { value: 'smoke' } });
    expect(screen.queryByRole('option', { name: /Create/ })).toBeNull();
    expect(screen.getByRole('option', { name: /Smoke/ })).toBeTruthy();
    unmount();

    render(<TagPicker tags={TAGS} selectedIds={[]} onChange={vi.fn()} />);
    open();
    fireEvent.change(screen.getByPlaceholderText('Search or create a tag'), { target: { value: 'brand new' } });
    expect(screen.queryByRole('option', { name: /Create/ })).toBeNull();
    expect(screen.getByText('No tags found.')).toBeTruthy();
  });
});
