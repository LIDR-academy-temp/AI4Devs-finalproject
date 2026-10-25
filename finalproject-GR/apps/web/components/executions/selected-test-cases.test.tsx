import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SelectedTestCases, type SelectedItem } from './selected-test-cases';
import { keyboardDrag, mockSortableLayout } from '../../test/keyboard-drag';

const ITEMS: SelectedItem[] = [
  { id: 'a', name: 'Alpha', status: 'Ready' },
  { id: 'b', name: 'Beta', status: 'Ready' },
  { id: 'c', name: 'Gamma', status: 'Deprecated' },
];

describe('SelectedTestCases', () => {
  mockSortableLayout();

  it('lists items with their run positions and marks a non-Ready one', () => {
    render(<SelectedTestCases items={ITEMS} onChange={vi.fn()} />);
    const items = within(screen.getByRole('list', { name: 'Selected test cases' })).getAllByRole('listitem');

    expect(items.map((item) => item.textContent)).toEqual(['1Alpha', '2Beta', '3GammaDeprecated']);
  });

  it('moves an item down one place with the keyboard', async () => {
    const onChange = vi.fn();
    render(<SelectedTestCases items={ITEMS} onChange={onChange} />);

    await keyboardDrag(screen.getByRole('button', { name: 'Reorder Alpha' }), 'ArrowDown');

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['b', 'a', 'c']));
  });

  it('rows stay in place while dragging; a drop line shows where it will land', async () => {
    const onChange = vi.fn();
    render(<SelectedTestCases items={ITEMS} onChange={onChange} />);
    const handle = screen.getByRole('button', { name: 'Reorder Alpha' });
    handle.focus();
    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    await act(async () => {
      fireEvent.keyDown(handle, { code: 'Space', key: ' ' });
      await settle();
    });
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? handle, { code: 'ArrowDown', key: 'ArrowDown' });
      await settle();
    });

    const rows = within(screen.getByRole('list', { name: 'Selected test cases' })).getAllByRole('listitem');
    expect(rows.map((row) => row.style.transform)).toEqual(['', '', '']);
    expect(within(rows[1]).getByTestId('drop-line').className).toContain('-bottom-px');
    expect(onChange).not.toHaveBeenCalled();
    // The floating label is portalled to <body>, outside any (transformed) dialog.
    const overlayLabel = screen.getAllByText('Alpha').find((el) => !el.closest('ol'));
    expect(overlayLabel).toBeTruthy();
    expect(overlayLabel!.parentElement?.closest('[data-slot="dialog-content"], ol')).toBeNull();
  });

  it('removes an item', () => {
    const onChange = vi.fn();
    render(<SelectedTestCases items={ITEMS} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove Beta' }));

    expect(onChange).toHaveBeenCalledWith(['a', 'c']);
  });
});
