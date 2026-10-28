'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, RotateCcw, Settings, Trash2 } from 'lucide-react';
import { useApiClient } from '../../lib/api-client';
import { deleteProject, projectKeys, restoreProject } from '../../lib/projects-api';
import { getWorkspaceProjects, renameWorkspace, workspaceKeys, type WorkspaceProjects } from '../../lib/workspace-api';
import { useSessionContext } from '../../lib/session-context';
import { useSwitchProject } from '../../lib/use-switch-project';
import { notifySuccess } from '../../lib/notify';
import { AccessDenied } from '../access-denied';
import { ActionError } from '../action-error';
import { InlineNameField } from '../inline-name-field';
import { PageHeader } from '../page-header';
import { ErrorState, ListSkeleton } from '../states';
import { NewProjectDialog } from '../projects/new-project-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type LiveProject = WorkspaceProjects['projects'][number];

/**
 * Workspace Settings (PRD §6.9), Workspace Owners only: the workspace name and its
 * projects — create, open their settings, delete to the trash and restore. Members and
 * Transfer Ownership come in a later slice.
 */
export function WorkspaceSettingsScreen() {
  const session = useSessionContext();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const switchProject = useSwitchProject();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<LiveProject | null>(null);
  const isOwner = session.data?.workspaceRole === 'Owner';

  const projectsQuery = useQuery({
    queryKey: workspaceKeys.projects,
    queryFn: () => getWorkspaceProjects(apiClient),
    enabled: isOwner,
  });

  const refreshProjects = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: workspaceKeys.projects }),
      queryClient.invalidateQueries({ queryKey: projectKeys.list, exact: true }),
    ]);

  const deleteMutation = useMutation({
    mutationFn: (project: LiveProject) => deleteProject(apiClient, project.id),
    onSuccess: async (_, project) => {
      notifySuccess(`"${project.name}" moved to the trash`);
      setDeleting(null);
      // Deleting the active project: the server already falls back to another one, so
      // everything (the session included) is refetched.
      if (project.id === session.data?.projectId) {
        await queryClient.resetQueries();
      } else {
        await refreshProjects();
      }
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (projectId: string) => restoreProject(apiClient, projectId),
    onSuccess: async (restored) => {
      notifySuccess(`"${restored.name}" restored`);
      await refreshProjects();
    },
  });

  if (session.loading || !session.data) {
    return null;
  }
  if (!isOwner) {
    return <AccessDenied message="Only the workspace Owner can open Workspace Settings." />;
  }

  async function rename(name: string) {
    await renameWorkspace(apiClient, { name });
    notifySuccess('Workspace renamed');
    await queryClient.invalidateQueries({ queryKey: ['me'] });
  }

  const data = projectsQuery.data;
  const onlyOneLeft = (data?.projects.length ?? 0) <= 1;

  return (
    <>
      <PageHeader
        title="Workspace Settings"
        description="Workspace-wide administration."
        actions={
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus /> New project
          </Button>
        }
      />
      <div className="flex max-w-4xl flex-col gap-4">
        <Card>
          <CardContent>
            <InlineNameField
              key={session.data.workspaceName}
              id="workspace-name"
              label="Workspace name"
              value={session.data.workspaceName}
              onSave={rename}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {projectsQuery.isPending ? (
              <ListSkeleton />
            ) : projectsQuery.isError ? (
              <ErrorState message="Couldn't load the projects." onRetry={() => projectsQuery.refetch()} />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 font-medium">Name</th>
                    <th className="py-2 text-right font-medium">Test cases</th>
                    <th className="py-2 text-right font-medium">Executions</th>
                    <th className="py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data!.projects.map((project) => (
                    <tr key={project.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{project.name}</td>
                      <td className="py-2 text-right tabular-nums">{project.testCaseCount}</td>
                      <td className="py-2 text-right tabular-nums">{project.executionCount}</td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Settings for ${project.name}`}
                            disabled={switchProject.isPending}
                            onClick={() => switchProject.mutate({ projectId: project.id, destination: '/settings' })}
                          >
                            <Settings /> Settings
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Delete ${project.name}`}
                            title={onlyOneLeft ? "The last project can't be deleted" : undefined}
                            disabled={onlyOneLeft}
                            onClick={() => setDeleting(project)}
                          >
                            <Trash2 /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {data && onlyOneLeft && (
              <p className="text-xs text-muted-foreground">
                The last project can&apos;t be deleted: a workspace always keeps at least one.
              </p>
            )}
            <ActionError error={switchProject.error} />
          </CardContent>
        </Card>

        {data && data.deleted.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recently deleted</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ul className="flex flex-col divide-y">
                {data.deleted.map((project) => (
                  <li key={project.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Deleted by {project.deletedBy?.displayName ?? 'Former member'} on{' '}
                        {new Date(project.deletedAt).toLocaleDateString()} ·{' '}
                        {project.daysLeft === 1 ? '1 day left' : `${project.daysLeft} days left`}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Restore ${project.name}`}
                      disabled={restoreMutation.isPending}
                      onClick={() => restoreMutation.mutate(project.id)}
                    >
                      <RotateCcw /> Restore
                    </Button>
                  </li>
                ))}
              </ul>
              <ActionError error={restoreMutation.error} />
            </CardContent>
          </Card>
        )}
      </div>

      <NewProjectDialog open={creating} onOpenChange={setCreating} destination="/workspace-settings" />

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
            deleteMutation.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleting?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              The project and everything in it — {deleting?.testCaseCount ?? 0} test cases and{' '}
              {deleting?.executionCount ?? 0} executions — move to the trash. You can restore it here for 30 days.
            </DialogDescription>
          </DialogHeader>
          <ActionError error={deleteMutation.error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate(deleting)}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
