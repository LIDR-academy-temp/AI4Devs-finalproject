'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, FlaskConical, Plus, Settings2 } from 'lucide-react';
import { useApiClient } from '../../lib/api-client';
import { listProjects, projectKeys } from '../../lib/projects-api';
import { useSwitchProject } from '../../lib/use-switch-project';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { NewProjectDialog } from './new-project-dialog';

export interface ProjectSwitcherProps {
  projectId: string;
  projectName: string;
  workspaceName: string;
  isOwner: boolean;
}

/**
 * The sidebar header (web-app-shell): the active project, opening a menu of every
 * project the user can access. Owners also get New project and Workspace settings.
 */
export function ProjectSwitcher({ projectId, projectName, workspaceName, isOwner }: ProjectSwitcherProps) {
  const apiClient = useApiClient();
  const switchProject = useSwitchProject();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const { data: projects = [] } = useQuery({ queryKey: projectKeys.list, queryFn: () => listProjects(apiClient) });

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={projectName} aria-label="Switch project">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FlaskConical className="size-4" />
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-semibold">{projectName}</span>
                <span className="truncate text-xs text-muted-foreground">{workspaceName}</span>
              </span>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="min-w-56">
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            {projects.map((project) => {
              const active = project.id === projectId;
              return (
                <DropdownMenuItem
                  key={project.id}
                  aria-current={active ? 'true' : undefined}
                  disabled={switchProject.isPending}
                  onSelect={() => {
                    if (!active) {
                      switchProject.mutate({ projectId: project.id });
                    }
                  }}
                >
                  <span className="flex-1 truncate">{project.name}</span>
                  {active && <Check className="size-4" aria-label="Active project" />}
                </DropdownMenuItem>
              );
            })}
            {isOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setNewProjectOpen(true)}>
                  <Plus className="size-4" />
                  New project
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/workspace-settings">
                    <Settings2 className="size-4" />
                    Workspace settings
                  </Link>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
