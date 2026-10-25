import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateTestCaseForm } from './create-test-case-form';
import { createTestCase } from '../../lib/test-cases-api';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../lib/api-client', () => ({
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/test-cases-api', () => ({
  createTestCase: vi.fn(),
}));

const mockedCreateTestCase = createTestCase as unknown as ReturnType<typeof vi.fn>;

describe('CreateTestCaseForm', () => {
  beforeEach(() => {
    mockedCreateTestCase.mockReset();
  });

  it('submitting valid input calls createTestCase with the entered values and surfaces the result', async () => {
    const created = { id: 'tc-new', name: 'New case', gherkinScript: 'Given X', status: 'Draft', sourceType: 'Gherkin' };
    mockedCreateTestCase.mockResolvedValue(created);
    const onCreated = vi.fn();

    renderWithProviders(<CreateTestCaseForm projectId="p1" onCreated={onCreated} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('New test case name'), { target: { value: 'New case' } });
    fireEvent.change(screen.getByLabelText('New test case script'), { target: { value: 'Given X' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(mockedCreateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', {
        name: 'New case',
        gherkinScript: 'Given X',
      }),
    );
    expect(onCreated).toHaveBeenCalledWith(created);
  });

  it('submitting with only a name omits gherkinScript', async () => {
    mockedCreateTestCase.mockResolvedValue({
      id: 'tc-new2',
      name: 'No script',
      gherkinScript: null,
      status: 'Draft',
      sourceType: 'Manual',
    });

    renderWithProviders(<CreateTestCaseForm projectId="p1" onCreated={() => {}} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText('New test case name'), { target: { value: 'No script' } });
    fireEvent.click(screen.getByText('Create'));

    await waitFor(() =>
      expect(mockedCreateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', { name: 'No script' }),
    );
  });

  it('submitting with an empty name shows a validation error and does not call createTestCase', async () => {
    renderWithProviders(<CreateTestCaseForm projectId="p1" onCreated={() => {}} onCancel={() => {}} />);

    fireEvent.click(screen.getByText('Create'));

    await waitFor(() => expect(screen.getByRole('alert')).not.toBeNull());
    expect(screen.getByRole('alert').textContent).toMatch(/name is required/i);
    expect(mockedCreateTestCase).not.toHaveBeenCalled();
  });
});
