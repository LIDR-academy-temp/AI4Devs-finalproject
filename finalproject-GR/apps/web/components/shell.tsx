'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bug, ListChecks, PlayCircle, Settings } from 'lucide-react';
import { useSessionContext } from '../lib/session-context';
import { UserMenu } from './user-menu';
import { AccessDenied } from './access-denied';
import { ProjectSwitcher } from './projects/project-switcher';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';

const NAV_LINKS = [
  { href: '/test-cases', label: 'Test Cases', icon: ListChecks },
  { href: '/executions', label: 'Executions', icon: PlayCircle },
  { href: '/bugs', label: 'Bugs', icon: Bug },
];

/** Shown only to Project Admins (PRD §6.7). */
const ADMIN_NAV_LINKS = [{ href: '/settings', label: 'Project Settings', icon: Settings }];

export interface ShellProps {
  children: ReactNode;
  /** Sidebar expanded on first render; read from the sidebar_state cookie server-side. */
  defaultOpen?: boolean;
}

/**
 * The signed-in app frame (web-app-shell): a collapsible icon sidebar — state kept in
 * the `sidebar_state` cookie by shadcn's SidebarProvider — with the project switcher,
 * the screens, and the user menu.
 */
export function Shell({ children, defaultOpen = true }: ShellProps) {
  const session = useSessionContext();
  const pathname = usePathname();

  if (session.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (session.error || !session.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (session.data.role === null) {
    return <AccessDenied />;
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <ProjectSwitcher
            projectId={session.data.projectId}
            projectName={session.data.projectName}
            workspaceName={session.data.workspaceName}
            isOwner={session.data.workspaceRole === 'Owner'}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {[...NAV_LINKS, ...(session.data.role === 'Admin' ? ADMIN_NAV_LINKS : [])].map(({ href, label, icon: Icon }) => {
                  const current = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton asChild isActive={current} tooltip={label}>
                        <Link href={href} aria-current={current ? 'page' : undefined}>
                          <Icon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <UserMenu />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger aria-label="Toggle sidebar" />
          <Separator orientation="vertical" className="h-4" />
          <span className="text-sm text-muted-foreground">{session.data.projectName}</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
