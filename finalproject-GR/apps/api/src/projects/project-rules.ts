import { BadRequestException } from '@nestjs/common';

export const MAX_NAME_LENGTH = 100;
const MAX_SLUG_LENGTH = 60;

/** Project and workspace names: trimmed, 1 to 100 characters. */
export function parseName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
    throw new BadRequestException(`name must be 1 to ${MAX_NAME_LENGTH} characters`);
  }
  return name;
}

/**
 * The slug a project's name gives, before any collision suffix (design.md decision 5):
 * accents stripped, lowercased, every run of other characters one hyphen, at most 60
 * characters, `project` when nothing is left.
 */
export function deriveSlug(name: string): string {
  const slug = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

/** `base` if free, else `base-N` with the lowest N ≥ 2 not in `taken`. */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) {
    return base;
  }
  let n = 2;
  while (taken.has(`${base}-${n}`)) {
    n++;
  }
  return `${base}-${n}`;
}
