import { cardinalityOf } from './matches.service.js';

describe('cardinalityOf', () => {
  it.each([
    [1, 1, 'ONE_TO_ONE'],
    [3, 1, 'MANY_TO_ONE'],
    [1, 2, 'ONE_TO_MANY'],
    [2, 2, 'MANY_TO_MANY'],
  ])('%i ventas y %i movimientos → %s', (pos, bank, expected) => {
    expect(cardinalityOf(pos, bank)).toBe(expected);
  });
});
