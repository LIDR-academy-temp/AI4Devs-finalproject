import { BadRequestException } from '@nestjs/common';
import { parseAfterRunId, reorderAfter } from './run-order';

const RUN = '11111111-1111-4111-8111-111111111111';

describe('reorderAfter', () => {
  const ids = ['a', 'b', 'c'];

  it('moves a run after another', () => {
    expect(reorderAfter(ids, 'c', 'a')).toEqual(['a', 'c', 'b']);
  });

  it('moves a run first when afterRunId is null', () => {
    expect(reorderAfter(ids, 'c', null)).toEqual(['c', 'a', 'b']);
  });

  it('moves a run last', () => {
    expect(reorderAfter(ids, 'a', 'c')).toEqual(['b', 'c', 'a']);
  });

  it('returns null when the order would not change', () => {
    expect(reorderAfter(ids, 'b', 'a')).toBeNull();
    expect(reorderAfter(ids, 'a', null)).toBeNull();
  });

  it('rejects the run itself or an unknown run as afterRunId', () => {
    expect(() => reorderAfter(ids, 'b', 'b')).toThrow(BadRequestException);
    expect(() => reorderAfter(ids, 'b', 'z')).toThrow(BadRequestException);
  });
});

describe('parseAfterRunId', () => {
  it('reads a run id, null, or absent', () => {
    expect(parseAfterRunId({ afterRunId: RUN })).toBe(RUN);
    expect(parseAfterRunId({ afterRunId: null })).toBeNull();
    expect(parseAfterRunId({})).toBeNull();
  });

  it('rejects a non-uuid', () => {
    expect(() => parseAfterRunId({ afterRunId: 'abc' })).toThrow(BadRequestException);
  });
});
