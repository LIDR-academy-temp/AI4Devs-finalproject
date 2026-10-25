import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Inbox } from 'lucide-react';
import { EmptyState, ErrorState } from './states';
import { GherkinView } from './gherkin-view';
import { StatusBadge } from './executions/status-badge';

describe('shared states', () => {
  it('ErrorState Retry calls onRetry', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Couldn't load bugs." onRetry={onRetry} />);

    expect(screen.getByRole('alert').textContent).toContain("Couldn't load bugs.");
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('EmptyState renders its action only when given', () => {
    const { rerender } = render(<EmptyState icon={Inbox} title="No bugs yet." />);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(<EmptyState icon={Inbox} title="No bugs yet." action={<button type="button">File a bug</button>} />);
    expect(screen.getByRole('button', { name: 'File a bug' })).toBeTruthy();
  });
});

describe('StatusBadge', () => {
  it('shows the live dot only for In Progress', () => {
    const { rerender } = render(<StatusBadge status="InProgress" />);
    expect(screen.queryByTestId('live-dot')).not.toBeNull();

    for (const status of ['Draft', 'Ready', 'Paused', 'Completed', 'Done'] as const) {
      rerender(<StatusBadge status={status} />);
      expect(screen.queryByTestId('live-dot')).toBeNull();
    }
  });
});

describe('GherkinView', () => {
  const script = 'Feature: Checkout\n  Given a cart\n  Then the total is $10';

  it('numbers every line', () => {
    const { container } = render(<GherkinView script={script} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.querySelector('[aria-hidden]')?.textContent)).toEqual(['1', '2', '3']);
    expect(container.textContent).toContain('the total is $10');
  });

  it('highlights keywords at the start of a line', () => {
    const { container } = render(<GherkinView script={script} />);

    const keywords = [...container.querySelectorAll('.gherkin-keyword')].map((el) => el.textContent);
    expect(keywords).toEqual(['Feature', 'Given', 'Then']);
  });

  it('marks the failed step and keeps its keyword highlighted', () => {
    render(<GherkinView script={script} failedStep="Then the total is $10" />);

    const failed = screen.getByLabelText('Failed step');
    expect(failed.textContent).toContain('the total is $10');
    expect(failed.querySelector('.gherkin-keyword')?.textContent).toBe('Then');
  });
});
