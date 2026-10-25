'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../lib/api-client';
import { getEnvironment, revealCredential } from '../../lib/environments-api';
import type { ProjectRole } from '../../lib/test-case-permissions';
import { ActionError } from '../action-error';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { notifySuccess } from '../../lib/notify';

export interface EnvironmentPanelProps {
  projectId: string;
  environmentId: string;
  open: boolean;
  role: ProjectRole | null;
  onClose: () => void;
}

/**
 * The execution's environment (PRD §6.3.3): credential aliases/emails for everyone,
 * audited reveal for Contributors+. Revealed passwords live only in this component's
 * state — never in the query cache — and are dropped when the panel unmounts.
 */
export function EnvironmentPanel({ projectId, environmentId, open, role, onClose }: EnvironmentPanelProps) {
  const apiClient = useApiClient();
  const canReveal = role === 'Contributor' || role === 'Admin';
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const { data: environment, isLoading } = useQuery({
    queryKey: ['projects', projectId, 'environments', environmentId],
    queryFn: () => getEnvironment(apiClient, projectId, environmentId),
    enabled: open,
  });

  const reveal = useMutation({
    mutationFn: (credentialId: string) => revealCredential(apiClient, projectId, environmentId, credentialId),
    onSuccess: ({ password }, credentialId) => {
      notifySuccess('Password revealed');
      setRevealed((current) => ({ ...current, [credentialId]: password }));
    },
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setRevealed({});
          reveal.reset();
          onClose();
        }
      }}
    >
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{environment?.name ?? 'Environment'}</SheetTitle>
          <SheetDescription>{environment?.baseUrl ?? 'Credentials for this environment.'}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4">
          {isLoading || !environment ? (
            <Skeleton className="h-16 w-full" />
          ) : environment.credentials.length === 0 ? (
            <p className="text-sm text-muted-foreground">No credentials defined.</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Credentials">
              {environment.credentials.map((credential) => (
                <li key={credential.id} className="flex flex-col gap-1 rounded-md border p-3 text-sm">
                  <span className="font-medium">{credential.alias}</span>
                  <span className="text-muted-foreground">{credential.email}</span>
                  {revealed[credential.id] !== undefined ? (
                    <code className="rounded bg-muted px-2 py-1" aria-label={`Password for ${credential.alias}`}>
                      {revealed[credential.id]}
                    </code>
                  ) : (
                    canReveal && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="self-start"
                        disabled={reveal.isPending}
                        onClick={() => reveal.mutate(credential.id)}
                      >
                        Reveal password
                      </Button>
                    )
                  )}
                </li>
              ))}
            </ul>
          )}
          <ActionError error={reveal.error} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
