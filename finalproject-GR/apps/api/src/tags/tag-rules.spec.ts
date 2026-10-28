import { BadRequestException } from '@nestjs/common';
import { nextColor, parseTagColor, parseTagName } from './tag-rules';

describe('parseTagName', () => {
  it('trims the name', () => {
    expect(parseTagName('  smoke ')).toBe('smoke');
  });

  it('rejects blank, non-string and over-long names', () => {
    for (const value of ['', '   ', 42, undefined, 'x'.repeat(51)]) {
      expect(() => parseTagName(value)).toThrow(BadRequestException);
    }
    expect(parseTagName('x'.repeat(50))).toHaveLength(50);
  });
});

describe('parseTagColor', () => {
  it('accepts palette colours and rejects anything else', () => {
    expect(parseTagColor('teal')).toBe('teal');
    for (const value of ['pink', '#ff0000', 'Gray', null]) {
      expect(() => parseTagColor(value)).toThrow(BadRequestException);
    }
  });
});

describe('nextColor', () => {
  it('starts at gray, follows the palette, and wraps', () => {
    expect(nextColor(null)).toBe('gray');
    expect(nextColor('gray')).toBe('red');
    expect(nextColor('violet')).toBe('gray');
  });
});
