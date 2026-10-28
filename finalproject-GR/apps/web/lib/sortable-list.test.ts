import { describe, expect, it } from 'vitest';
import { dropResult } from './sortable-list';

describe('dropResult', () => {
  const ids = ['a', 'b', 'c'];

  it('moving down follows the item it was dropped on', () => {
    expect(dropResult(ids, 'a', 'b')).toEqual({ ids: ['b', 'a', 'c'], afterId: 'b' });
  });

  it('moving to the top follows nothing', () => {
    expect(dropResult(ids, 'c', 'a')).toEqual({ ids: ['c', 'a', 'b'], afterId: null });
  });

  it('moving up follows the item above the drop target', () => {
    expect(dropResult(ids, 'c', 'b')).toEqual({ ids: ['a', 'c', 'b'], afterId: 'a' });
  });

  it('a drop on itself or an unknown id changes nothing', () => {
    expect(dropResult(ids, 'b', 'b')).toBeNull();
    expect(dropResult(ids, 'b', 'z')).toBeNull();
  });
});
