"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";

import { sendJson } from "@/components/api";
import { FieldError } from "@/components/field-error";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldError as FieldErrorCode } from "@/shared/fields";
import { fieldLimits } from "@/shared/limits";

import { CharacterCount, showsCount } from "./character-count";
import { checkField, useFieldMessage } from "./field-checks";
import { useRefusalMessage } from "./item-refusals";

// New list (FR-12; design decision 8): a name, checked as the user types once
// checked (BR-32), then Lists shows the new list. A sheet (DESIGN.md,
// Collapsible Groups & Sheets): its Close button takes first focus, so the
// on-screen keyboard stays down until the user taps the field, and Create is
// the only button at the bottom.

export function NewListDialog({
  groupId,
  open,
  onOpenChange,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("lists");
  const message = useFieldMessage();
  const refusalMessage = useRefusalMessage();
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [error, setError] = useState<FieldErrorCode>();
  const [checked, setChecked] = useState(false);
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState(false);

  function reset(next: boolean) {
    if (!next) {
      setName("");
      setError(undefined);
      setChecked(false);
      setAlert(undefined);
    }
    onOpenChange(next);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setAlert(undefined);
    setChecked(true);
    const problem = checkField("name", name);
    setError(problem);
    if (problem) {
      input.current?.focus();
      return;
    }
    setPending(true);
    const result = await sendJson<{ id: string }>(
      `/groups/${groupId}/lists`,
      "POST",
      { name },
    );
    setPending(false);
    if (result.ok) {
      reset(false);
      router.push(`/lists?list=${result.data.id}`);
      return;
    }
    if (!("offline" in result) && result.error.fields?.name) {
      setError(result.error.fields.name as FieldErrorCode);
      input.current?.focus();
    } else {
      setAlert(refusalMessage(result));
    }
  }

  const errorId = `${id}-error`;
  const countId = `${id}-count`;
  const max = fieldLimits.name.max;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent variant="sheet" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{t("newList")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={create} noValidate className="flex flex-col gap-5">
          {alert && <FormAlert>{alert}</FormAlert>}
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${id}-name`}>{t("listName")}</Label>
            <Input
              ref={input}
              id={`${id}-name`}
              value={name}
              maxLength={max}
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={
                [error && errorId, showsCount(name.length, max) && countId]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              onChange={(event) => {
                setName(event.target.value);
                if (checked) setError(checkField("name", event.target.value));
              }}
            />
            {error && (
              <FieldError id={errorId}>{message("name", error)}</FieldError>
            )}
            <CharacterCount id={countId} length={name.length} max={max} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              <PlusIcon aria-hidden />
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
