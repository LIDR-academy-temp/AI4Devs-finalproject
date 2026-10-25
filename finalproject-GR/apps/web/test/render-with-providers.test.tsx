import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from './render-with-providers';

describe('renderWithProviders', () => {
  it('renders a component wrapped in a QueryClientProvider', () => {
    renderWithProviders(<div>hello from a query client</div>);
    expect(screen.getByText('hello from a query client')).not.toBeNull();
  });
});
