import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TAG_COLORS } from '../../lib/tags-api';
import { TagBadge } from './tag-badge';

describe('TagBadge', () => {
  it.each(TAG_COLORS)('renders %s with its palette classes', (color) => {
    render(<TagBadge name={`tag-${color}`} color={color} />);

    const badge = screen.getByText(`tag-${color}`).parentElement!;
    expect(badge.className).toContain(`bg-tag-${color}/15`);
    expect(badge.className).toContain(`text-tag-${color}`);
  });
});
