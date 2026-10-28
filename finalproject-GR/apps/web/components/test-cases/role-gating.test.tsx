import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { TestCaseTree } from './test-case-tree';
import { TestCaseDetail } from './test-case-detail';
import { testCasePermissionsForRole, type ProjectRole } from '../../lib/test-case-permissions';
import { getTestCase } from '../../lib/test-cases-api';
import { renderWithProviders } from '../../test/render-with-providers';

const listRequest = vi.fn();

vi.mock('../../lib/api-client', () => ({
  useApiClient: () => ({ request: listRequest }),
}));
vi.mock('../../lib/test-cases-api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/test-cases-api')>('../../lib/test-cases-api');
  return { ...actual, getTestCase: vi.fn(), updateTestCase: vi.fn(), deleteTestCase: vi.fn() };
});
// `listRequest` answers every request with the test case list; tags have their own endpoint.
vi.mock('../../lib/tags-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/tags-api')>()),
  listTags: vi.fn(async () => []),
}));

const mockedGetTestCase = getTestCase as unknown as ReturnType<typeof vi.fn>;

const testCase = {
  id: 'tc1',
  name: 'Login works',
  gherkinScript: 'Given a user',
  status: 'Draft' as const,
  sourceType: 'Gherkin' as const,
};

describe('Test Cases screen role gating (web-app-shell spec)', () => {
  beforeEach(() => {
    // The tree loads folders and test cases through the same client.
    listRequest.mockReset().mockImplementation(async (path: string) => (path.endsWith('/folders') ? [] : [testCase]));
    mockedGetTestCase.mockReset().mockResolvedValue(testCase);
  });

  async function renderForRole(role: ProjectRole) {
    const permissions = testCasePermissionsForRole(role);
    renderWithProviders(
      <>
        <TestCaseTree
          projectId="p1"
          selected={{ kind: 'testCase', id: 'tc1' }}
          onSelect={() => {}}
          canCreate={permissions.canCreate}
          canDelete={permissions.canDelete}
          onAction={() => {}}
        />
        <TestCaseDetail
          projectId="p1"
          testCaseId="tc1"
          canEdit={permissions.canEdit}
          canDelete={permissions.canDelete}
          onUpdated={() => {}}
          onDeleted={() => {}}
        />
      </>,
    );
    await waitFor(() => expect(mockedGetTestCase).toHaveBeenCalled());
    await screen.findAllByText('Login works');
  }

  it('Viewer: no create, edit, or delete controls', async () => {
    await renderForRole('Viewer');

    expect(screen.queryByText('New test case')).toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.queryByLabelText('Gherkin script')).toBeNull();
    expect(screen.queryByLabelText('Status')).toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('Contributor: create and edit controls, no delete', async () => {
    await renderForRole('Contributor');

    expect(screen.getByText('New test case')).not.toBeNull();
    expect(screen.getByLabelText('Name')).not.toBeNull();
    expect(screen.getByLabelText('Gherkin script')).not.toBeNull();
    expect(screen.getByLabelText('Status')).not.toBeNull();
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('Admin: create, edit, and delete controls all present', async () => {
    await renderForRole('Admin');

    expect(screen.getByText('New test case')).not.toBeNull();
    expect(screen.getByLabelText('Name')).not.toBeNull();
    expect(screen.getByLabelText('Gherkin script')).not.toBeNull();
    expect(screen.getByLabelText('Status')).not.toBeNull();
    expect(screen.getByText('Delete')).not.toBeNull();
  });
});
