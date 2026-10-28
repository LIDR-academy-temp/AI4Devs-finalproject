import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ApiError } from '../lib/api-client';
import { ActionError } from './action-error';

describe('ActionError', () => {
  it("shows the server's reason for a 4xx", () => {
    render(<ActionError error={new ApiError(409, 'resolve every Needs Review run first', '/x')} />);
    expect(screen.getByRole('alert').textContent).toContain('resolve every Needs Review run first');
  });

  it('shows a rate-limit hint for 429', () => {
    render(<ActionError error={new ApiError(429, 'Too many reveal attempts; try again later', '/x')} />);
    expect(screen.getByRole('alert').textContent).toContain('try again shortly');
  });

  it('shows a generic message for server errors and unknown failures', () => {
    const { rerender } = render(<ActionError error={new ApiError(500, 'stack trace', '/x')} />);
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong');
    rerender(<ActionError error={new Error('network down')} />);
    expect(screen.getByRole('alert').textContent).toContain('Something went wrong');
  });

  it('renders nothing without an error', () => {
    const { container } = render(<ActionError error={null} />);
    expect(container.innerHTML).toBe('');
  });
});
