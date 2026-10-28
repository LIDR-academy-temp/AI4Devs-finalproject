import { BadRequestException } from '@nestjs/common';

/** ADR 0016 decision 2: the palette, in the order new tags take it. */
export const TAG_COLORS = ['gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet'] as const;
export type TagColor = (typeof TAG_COLORS)[number];

export const MAX_TAG_NAME_LENGTH = 50;

export function parseTagName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length === 0 || name.length > MAX_TAG_NAME_LENGTH) {
    throw new BadRequestException(`name must be 1 to ${MAX_TAG_NAME_LENGTH} characters`);
  }
  return name;
}

export function parseTagColor(value: unknown): TagColor {
  if (!TAG_COLORS.includes(value as TagColor)) {
    throw new BadRequestException(`color must be one of ${TAG_COLORS.join(', ')}`);
  }
  return value as TagColor;
}

/** The palette colour after `last` (the newest tag's), wrapping; the first when there is none. */
export function nextColor(last: string | null): TagColor {
  const index = TAG_COLORS.indexOf(last as TagColor);
  return TAG_COLORS[(index + 1) % TAG_COLORS.length];
}
