import { afterEach, beforeEach, vi } from 'vitest';
import { act, fireEvent } from '@testing-library/react';

/**
 * jsdom has no layout: give each `[data-sortable-id]` element a 30px slot in document
 * order so dnd-kit's keyboard sensor can measure where "next" is.
 */
export function mockSortableLayout() {
  let rectSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const items = [...document.querySelectorAll('[data-sortable-id]')];
      const item = this.closest('[data-sortable-id]') ?? document.activeElement?.closest('[data-sortable-id]') ?? null;
      const top = Math.max(item ? items.indexOf(item) : 0, 0) * 30;
      return { x: 0, y: top, top, left: 0, width: 300, height: 30, right: 300, bottom: top + 30, toJSON: () => ({}) } as DOMRect;
    });
  });
  afterEach(() => rectSpy.mockRestore());
}

/** Picks up `handle` with Space, presses `key` `steps` times, and drops with Space. */
export async function keyboardDrag(handle: HTMLElement, key: 'ArrowDown' | 'ArrowUp', steps = 1) {
  handle.focus();
  // dnd-kit measures and moves asynchronously; let each step settle.
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
  const press = async (code: string, keyValue: string) =>
    act(async () => {
      fireEvent.keyDown(document.activeElement ?? handle, { code, key: keyValue });
      await settle();
    });
  await press('Space', ' ');
  for (let i = 0; i < steps; i++) {
    await press(key, key);
  }
  await press('Space', ' ');
}
