export type ProjectRole = 'Viewer' | 'Contributor' | 'Admin';

export interface TestCasePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Pure role→permissions mapping for the Test Cases screen (web-app-shell spec:
 * "The Test Cases screen's available actions match the signed-in user's project
 * role"). Viewer: read-only. Contributor: create+edit, no delete. Admin: all three.
 */
export function testCasePermissionsForRole(role: ProjectRole | null): TestCasePermissions {
  const canCreateOrEdit = role === 'Contributor' || role === 'Admin';
  return {
    canCreate: canCreateOrEdit,
    canEdit: canCreateOrEdit,
    canDelete: role === 'Admin',
  };
}
