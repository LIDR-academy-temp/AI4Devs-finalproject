'use client';

import { useState, type FormEvent } from 'react';
import { ActionError } from './action-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MAX_NAME_LENGTH = 100;

export interface InlineNameFieldProps {
  id: string;
  label: string;
  value: string;
  /** Saves the trimmed name; a rejection's reason is shown under the field. */
  onSave: (name: string) => Promise<unknown>;
}

/**
 * A name edited in place (project and workspace names): Save appears once the text
 * differs, Enter saves, Escape reverts. Blank or too-long names are refused before any
 * request; the server's own reason shows inline too.
 */
export function InlineNameField({ id, label, value, onSave }: InlineNameFieldProps) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const dirty = draft.trim() !== value;

  async function save(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (name.length === 0 || name.length > MAX_NAME_LENGTH) {
      setValidation(`Name must be 1 to ${MAX_NAME_LENGTH} characters`);
      return;
    }
    setValidation(null);
    setError(null);
    setSaving(true);
    try {
      await onSave(name);
      setDraft(name);
    } catch (failure) {
      setError(failure);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={save} className="flex max-w-md flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          aria-invalid={!!validation}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setDraft(value);
              setValidation(null);
              setError(null);
            }
          }}
        />
        {dirty && (
          <Button type="submit" disabled={saving}>
            Save
          </Button>
        )}
      </div>
      {validation && <p className="text-sm text-destructive">{validation}</p>}
      <ActionError error={error} />
    </form>
  );
}
