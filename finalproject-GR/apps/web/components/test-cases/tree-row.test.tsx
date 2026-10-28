import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { TreeRow } from './tree-row';
import type { FlatRow } from '../../lib/test-case-tree';
import type { DropZone } from '../../lib/test-case-tree';

const folderRow: FlatRow = { node: { kind: 'folder', id: 'f', name: 'Checkout', parentId: null, children: [] }, depth: 0 };
const caseRow: FlatRow = {
  node: {
    kind: 'testCase',
    id: 't',
    name: 'Login',
    parentId: null,
    testCase: { id: 't', name: 'Login', gherkinScript: null, status: 'Ready', sourceType: 'Manual' },
  },
  depth: 0,
};

function renderRow(row: FlatRow, dropZone: DropZone | null, dragActive = true) {
  render(
    <DndContext>
      <SortableContext items={[row.node.id]}>
        <TreeRow
          row={row}
          selected={false}
          expanded={false}
          draggable
          dragActive={dragActive}
          dropZone={dropZone}
          actions={[]}
          onSelect={() => {}}
          onToggle={() => {}}
          onAction={() => {}}
        />
      </SortableContext>
    </DndContext>,
  );
  return screen.getByRole('treeitem');
}

describe('TreeRow drop feedback', () => {
  it('highlights a folder as a drop-inside target', () => {
    expect(renderRow(folderRow, 'into').className).toContain('ring-2');
  });

  it('never highlights a test case as a drop-inside target', () => {
    expect(renderRow(caseRow, 'into').className).not.toContain('ring-2');
  });

  it('drops hover styling while something is being dragged', () => {
    expect(renderRow(caseRow, null, true).className).not.toContain('hover:bg-muted');
  });

  it('keeps hover styling when nothing is being dragged', () => {
    expect(renderRow(caseRow, null, false).className).toContain('hover:bg-muted');
  });
});
