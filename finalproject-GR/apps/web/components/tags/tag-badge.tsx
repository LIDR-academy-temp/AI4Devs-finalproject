import type { ReactNode } from 'react';
import type { TagColor } from '../../lib/tags-api';
import { cn } from '@/lib/utils';

/** Literal class names (Tailwind only generates classes it can see in source). */
export const TAG_COLOR_CLASSES: Record<TagColor, { badge: string; swatch: string }> = {
  gray: { badge: 'border-tag-gray/30 bg-tag-gray/15 text-tag-gray', swatch: 'bg-tag-gray' },
  red: { badge: 'border-tag-red/30 bg-tag-red/15 text-tag-red', swatch: 'bg-tag-red' },
  orange: { badge: 'border-tag-orange/30 bg-tag-orange/15 text-tag-orange', swatch: 'bg-tag-orange' },
  amber: { badge: 'border-tag-amber/30 bg-tag-amber/15 text-tag-amber', swatch: 'bg-tag-amber' },
  green: { badge: 'border-tag-green/30 bg-tag-green/15 text-tag-green', swatch: 'bg-tag-green' },
  teal: { badge: 'border-tag-teal/30 bg-tag-teal/15 text-tag-teal', swatch: 'bg-tag-teal' },
  blue: { badge: 'border-tag-blue/30 bg-tag-blue/15 text-tag-blue', swatch: 'bg-tag-blue' },
  violet: { badge: 'border-tag-violet/30 bg-tag-violet/15 text-tag-violet', swatch: 'bg-tag-violet' },
};

/** A coloured tag label (PRD §2.4, ADR 0016); colours follow light and dark mode. */
export function TagBadge({ name, color, className, children }: { name: string; color: TagColor; className?: string; children?: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-48 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        TAG_COLOR_CLASSES[color].badge,
        className,
      )}
    >
      <span className="truncate">{name}</span>
      {children}
    </span>
  );
}
