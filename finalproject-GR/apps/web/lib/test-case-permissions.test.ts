import { describe, expect, it } from 'vitest';
import { testCasePermissionsForRole } from './test-case-permissions';

describe('testCasePermissionsForRole', () => {
  it('gives a Viewer no create, edit, or delete', () => {
    expect(testCasePermissionsForRole('Viewer')).toEqual({ canCreate: false, canEdit: false, canDelete: false });
  });

  it('gives a Contributor create and edit, but not delete', () => {
    expect(testCasePermissionsForRole('Contributor')).toEqual({ canCreate: true, canEdit: true, canDelete: false });
  });

  it('gives an Admin create, edit, and delete', () => {
    expect(testCasePermissionsForRole('Admin')).toEqual({ canCreate: true, canEdit: true, canDelete: true });
  });

  it('gives a null role (no access) nothing', () => {
    expect(testCasePermissionsForRole(null)).toEqual({ canCreate: false, canEdit: false, canDelete: false });
  });
});
