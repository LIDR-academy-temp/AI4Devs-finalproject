import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { EnvironmentPanel } from './environment-panel';
import { getEnvironment, revealCredential } from '../../lib/environments-api';
import { ApiError } from '../../lib/api-client';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../lib/api-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/api-client')>()),
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/environments-api', () => ({
  getEnvironment: vi.fn(),
  revealCredential: vi.fn(),
}));

const mockedReveal = vi.mocked(revealCredential);

function renderPanel(role: 'Viewer' | 'Contributor') {
  renderWithProviders(<EnvironmentPanel projectId="p1" environmentId="env-1" open role={role} onClose={() => {}} />);
}

describe('EnvironmentPanel', () => {
  beforeEach(() => {
    vi.mocked(getEnvironment).mockResolvedValue({
      id: 'env-1',
      name: 'Staging',
      baseUrl: 'https://staging.example.com',
      defaultBrowser: 'Chromium',
      credentials: [{ id: 'cred-1', alias: 'Admin user', email: 'admin@example.com' }],
    });
    mockedReveal.mockReset();
  });

  it('lists aliases and emails, and a Contributor can reveal a password', async () => {
    mockedReveal.mockResolvedValue({ password: 's3cret!' });
    renderPanel('Contributor');

    expect(await screen.findByText('admin@example.com')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal password' }));

    expect((await screen.findByLabelText('Password for Admin user')).textContent).toBe('s3cret!');
    expect(mockedReveal).toHaveBeenCalledWith(expect.anything(), 'p1', 'env-1', 'cred-1');
  });

  it('a Viewer sees aliases and emails but no reveal control', async () => {
    renderPanel('Viewer');

    expect(await screen.findByText('Admin user')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reveal password' })).toBeNull();
  });

  it('says to try again shortly when the reveal is rate-limited', async () => {
    mockedReveal.mockRejectedValue(new ApiError(429, 'Too many reveal attempts; try again later', '/x'));
    renderPanel('Contributor');

    fireEvent.click(await screen.findByRole('button', { name: 'Reveal password' }));

    expect((await screen.findByRole('alert')).textContent).toContain('try again shortly');
  });
});
