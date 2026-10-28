'use client';

import { useId, type FormEventHandler, type ReactNode } from 'react';
import { ActionError } from './action-error';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SIZES = {
  default: 'sm:max-w-lg',
  wide: 'sm:max-w-xl',
  extraWide: 'sm:max-w-4xl',
} as const;

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  submitLabel: string;
  /** Saving: the submit button is disabled until the server answers. */
  pending?: boolean;
  /** The failed save's reason, shown inside the dialog. */
  error?: unknown;
  onSubmit: FormEventHandler<HTMLFormElement>;
  children: ReactNode;
}

/**
 * The one frame for create and edit forms (web-ui-foundation): title, scrolling body,
 * the server's reason on failure, then Cancel and the submit action. Esc, the close
 * button, Cancel, or an outside click close it without saving.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  size = 'default',
  submitLabel,
  pending = false,
  error,
  onSubmit,
  children,
}: FormDialogProps) {
  const formId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[90vh] overflow-y-auto', SIZES[size])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
          {children}
          <ActionError error={error} />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={pending}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
