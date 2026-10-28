'use client';

import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

/**
 * Shared pieces for the flat sortable lists (execution Selected panel, Draft runs table;
 * ADR 0014): pointer and keyboard sensors, and turning a drop into the new order.
 */
export function useListSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/**
 * The order after dropping `activeId` on `overId`, and the id it now follows (null =
 * first). Null when the drop changes nothing.
 */
export function dropResult(ids: readonly string[], activeId: string, overId: string): { ids: string[]; afterId: string | null } | null {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from === -1 || to === -1 || from === to) {
    return null;
  }
  const next = arrayMove([...ids], from, to);
  return { ids: next, afterId: to === 0 ? null : next[to - 1] };
}
