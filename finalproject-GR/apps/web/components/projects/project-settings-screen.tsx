'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import { projectKeys, renameProject } from '../../lib/projects-api';
import { useSessionContext } from '../../lib/session-context';
import { notifySuccess } from '../../lib/notify';
import { AccessDenied } from '../access-denied';
import { InlineNameField } from '../inline-name-field';
import { PageHeader } from '../page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Project Settings (PRD §6.7), Project Admins only. This change covers General: the
 * name, saved on confirm, and the slug, read-only since it never changes.
 */
export function ProjectSettingsScreen() {
  const session = useSessionContext();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  if (session.loading || !session.data) {
    return null;
  }
  const { projectId, projectName, projectSlug, role } = session.data;
  if (role !== 'Admin') {
    return <AccessDenied message="Only Project Admins can change project settings." />;
  }

  async function rename(name: string) {
    await renameProject(apiClient, projectId, { name });
    notifySuccess('Project renamed');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.list, exact: true }),
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId), exact: true }),
    ]);
  }

  return (
    <>
      <PageHeader title="Project Settings" description="Configuration for this project." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <InlineNameField key={projectName} id="project-name" label="Project name" value={projectName} onSave={rename} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Slug</span>
            <code className="w-fit rounded bg-muted px-2 py-1 text-sm" aria-label="Project slug">
              {projectSlug}
            </code>
            <p className="text-xs text-muted-foreground">Set when the project was created; it never changes.</p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
