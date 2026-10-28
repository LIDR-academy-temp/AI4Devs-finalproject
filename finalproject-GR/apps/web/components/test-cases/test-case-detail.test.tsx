import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseDetail } from './test-case-detail';
import { getTestCase, updateTestCase, deleteTestCase } from '../../lib/test-cases-api';
import { renderWithProviders } from '../../test/render-with-providers';

vi.mock('../../lib/api-client', () => ({
  useApiClient: () => ({ request: vi.fn() }),
}));
vi.mock('../../lib/test-cases-api', () => ({
  getTestCase: vi.fn(),
  updateTestCase: vi.fn(),
  deleteTestCase: vi.fn(),
}));
vi.mock('../../lib/tags-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/tags-api')>()),
  listTags: vi.fn(async () => [
    { id: 'tag-smoke', name: 'smoke', color: 'green', testCaseCount: 1, bugCount: 0 },
    { id: 'tag-reg', name: 'regression', color: 'blue', testCaseCount: 0, bugCount: 0 },
  ]),
  createTag: vi.fn(),
}));

const mockedGetTestCase = getTestCase as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateTestCase = updateTestCase as unknown as ReturnType<typeof vi.fn>;
const mockedDeleteTestCase = deleteTestCase as unknown as ReturnType<typeof vi.fn>;

const baseTestCase = {
  id: 'tc1',
  name: 'Login works',
  gherkinScript: 'Given a user',
  status: 'Draft' as const,
  sourceType: 'Gherkin' as const,
  tagIds: ['tag-smoke'],
};

describe('TestCaseDetail', () => {
  beforeEach(() => {
    mockedGetTestCase.mockReset().mockResolvedValue(baseTestCase);
    mockedUpdateTestCase.mockReset().mockResolvedValue({ ...baseTestCase, gherkinScript: 'Given a changed user' });
    mockedDeleteTestCase.mockReset().mockResolvedValue(undefined);
  });

  it('blurring the script textarea after a change calls updateTestCase with the new script (6.2)', async () => {
    renderWithProviders(
      <TestCaseDetail
        projectId="p1"
        testCaseId="tc1"
        canEdit={true}
        canDelete={false}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    const textarea = await screen.findByLabelText('Gherkin script');
    fireEvent.change(textarea, { target: { value: 'Given a changed user' } });
    fireEvent.blur(textarea);

    await waitFor(() =>
      expect(mockedUpdateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'tc1', {
        gherkinScript: 'Given a changed user',
      }),
    );
  });

  it('blurring the name input without a change does not call updateTestCase', async () => {
    renderWithProviders(
      <TestCaseDetail
        projectId="p1"
        testCaseId="tc1"
        canEdit={true}
        canDelete={false}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    const nameInput = await screen.findByLabelText('Name');
    fireEvent.blur(nameInput);

    expect(mockedUpdateTestCase).not.toHaveBeenCalled();
  });

  it('selecting a new status calls updateTestCase with it (6.3)', async () => {
    renderWithProviders(
      <TestCaseDetail
        projectId="p1"
        testCaseId="tc1"
        canEdit={true}
        canDelete={false}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    // Radix's Select renders a trigger button + a portaled listbox, not a native
    // <select> — open it, then click the option, instead of fireEvent.change.
    const statusTrigger = await screen.findByLabelText('Status');
    fireEvent.click(statusTrigger);
    fireEvent.click(await screen.findByText('Ready'));

    await waitFor(() =>
      expect(mockedUpdateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'tc1', { status: 'Ready' }),
    );
  });

  it('confirming delete calls deleteTestCase and onDeleted (6.5)', async () => {
    const onDeleted = vi.fn();
    renderWithProviders(
      <TestCaseDetail
        projectId="p1"
        testCaseId="tc1"
        canEdit={false}
        canDelete={true}
        onUpdated={() => {}}
        onDeleted={onDeleted}
      />,
    );

    fireEvent.click(await screen.findByText('Delete'));
    fireEvent.click(screen.getByText('Confirm delete'));

    await waitFor(() => expect(mockedDeleteTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'tc1'));
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it('does not show a delete control when canDelete is false', async () => {
    renderWithProviders(
      <TestCaseDetail
        projectId="p1"
        testCaseId="tc1"
        canEdit={false}
        canDelete={false}
        onUpdated={() => {}}
        onDeleted={() => {}}
      />,
    );

    await screen.findByText(baseTestCase.name);
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('a Contributor adds a tag from the picker and the full new set is saved', async () => {
    mockedUpdateTestCase.mockResolvedValue({ ...baseTestCase, tagIds: ['tag-smoke', 'tag-reg'] });
    renderWithProviders(
      <TestCaseDetail projectId="p1" testCaseId="tc1" canEdit={true} canDelete={false} onUpdated={() => {}} onDeleted={() => {}} />,
    );

    expect(await screen.findByText('smoke')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit tags' }));
    fireEvent.click(await screen.findByRole('option', { name: /regression/ }));

    await waitFor(() =>
      expect(mockedUpdateTestCase).toHaveBeenCalledWith(expect.anything(), 'p1', 'tc1', { tagIds: ['tag-smoke', 'tag-reg'] }),
    );
  });

  it('a Viewer sees the tag badges and no picker', async () => {
    renderWithProviders(
      <TestCaseDetail projectId="p1" testCaseId="tc1" canEdit={false} canDelete={false} onUpdated={() => {}} onDeleted={() => {}} />,
    );

    expect(await screen.findByText('smoke')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit tags' })).toBeNull();
  });
});
