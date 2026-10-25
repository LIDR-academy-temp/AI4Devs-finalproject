import { BadRequestException } from '@nestjs/common';
import { fitsDepth, MAX_FOLDER_DEPTH, parseFolderName, parseMoveTarget } from './tree-rules';

const ID = '11111111-1111-4111-8111-111111111111';

describe('fitsDepth', () => {
  it('allows up to four levels', () => {
    expect(MAX_FOLDER_DEPTH).toBe(4);
    expect(fitsDepth(0, 4)).toBe(true); // a 4-level subtree at the root
    expect(fitsDepth(3, 1)).toBe(true); // a leaf under a level-3 folder
  });

  it('refuses a fifth level', () => {
    expect(fitsDepth(4, 1)).toBe(false); // a folder inside a level-4 folder
    expect(fitsDepth(3, 3)).toBe(false); // a subtree two levels deep under level 3
  });
});

describe('parseFolderName', () => {
  it('trims and accepts a name', () => {
    expect(parseFolderName('  Checkout ')).toBe('Checkout');
  });

  it.each([undefined, '', '   ', 5])('rejects %p', (value) => {
    expect(() => parseFolderName(value)).toThrow(BadRequestException);
  });
});

describe('parseMoveTarget', () => {
  it('reads a parent and an afterId', () => {
    expect(parseMoveTarget({ parentFolderId: ID, afterId: ID }, 'parentFolderId')).toEqual({ parentFolderId: ID, afterId: ID });
  });

  it('treats missing values as the root and first', () => {
    expect(parseMoveTarget({}, 'folderId')).toEqual({ parentFolderId: null, afterId: null });
  });

  it('rejects non-uuid ids', () => {
    expect(() => parseMoveTarget({ folderId: 'abc' }, 'folderId')).toThrow(BadRequestException);
    expect(() => parseMoveTarget({ afterId: 'abc' }, 'folderId')).toThrow(BadRequestException);
  });
});
