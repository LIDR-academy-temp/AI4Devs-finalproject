import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RunsTable } from './runs-table';
import { makeRun } from '../../test/execution-fixtures';
import { keyboardDrag, mockSortableLayout } from '../../test/keyboard-drag';

const RUNS = [
  makeRun({ id: 'r1', position: 1, testCaseName: 'Alpha' }),
  makeRun({ id: 'r2', position: 2, testCaseName: 'Beta' }),
  makeRun({ id: 'r3', position: 3, testCaseName: 'Gamma' }),
];

describe('RunsTable', () => {
  mockSortableLayout();

  it('dragging the third run to the top reports it goes first', async () => {
    const onMove = vi.fn();
    render(<RunsTable runs={RUNS} filter={null} onSelectRun={vi.fn()} reorderable onMove={onMove} />);

    await keyboardDrag(screen.getByRole('button', { name: 'Reorder Gamma' }), 'ArrowUp', 2);

    await waitFor(() => expect(onMove).toHaveBeenCalledWith('r3', null));
  });

  it('dragging a run down one place reports the run it now follows', async () => {
    const onMove = vi.fn();
    render(<RunsTable runs={RUNS} filter={null} onSelectRun={vi.fn()} reorderable onMove={onMove} />);

    await keyboardDrag(screen.getByRole('button', { name: 'Reorder Alpha' }), 'ArrowDown');

    await waitFor(() => expect(onMove).toHaveBeenCalledWith('r1', 'r2'));
  });

  it('renders no drag handles when not reorderable', () => {
    render(<RunsTable runs={RUNS} filter={null} onSelectRun={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /^Reorder/ })).toBeNull();
  });
});
