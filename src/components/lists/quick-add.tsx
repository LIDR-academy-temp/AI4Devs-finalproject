"use client";

import { PlusIcon, ShoppingCartIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useId, useRef, useState } from "react";

import { sendJson } from "@/components/api";
import { FieldError } from "@/components/field-error";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FieldError as FieldErrorCode } from "@/shared/fields";
import { fieldLimits } from "@/shared/limits";

import { CharacterCount, showsCount } from "./character-count";
import { checkField, useFieldMessage } from "./field-checks";
import { useItemRefusal } from "./item-refusals";

// Quick add (FR-13; design decision 4): a name alone makes a pending item in
// the current list. The field empties and keeps focus for the next one, and
// keeps its text when saving fails (docs/02-UX-DESIGN.md, section 2.7).

export function QuickAdd({ listId }: { listId: string }) {
  const t = useTranslations("lists");
  const message = useFieldMessage();
  const handleRefusal = useItemRefusal();
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [error, setError] = useState<FieldErrorCode>();
  const [checked, setChecked] = useState(false);
  const [alert, setAlert] = useState<string>();
  const [added, setAdded] = useState("");
  const [pending, setPending] = useState(false);

  async function add(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setAlert(undefined);
    setAdded("");
    setChecked(true);
    const problem = checkField("name", name);
    setError(problem);
    if (problem) {
      input.current?.focus();
      return;
    }
    setPending(true);
    const result = await sendJson<{ name: string }>(
      `/lists/${listId}/items`,
      "POST",
      { name },
    );
    setPending(false);
    if (result.ok) {
      setName("");
      setChecked(false);
      setAdded(t("added", { name: result.data.name }));
      router.refresh();
    } else if (!("offline" in result) && result.error.fields?.name) {
      setError(result.error.fields.name as FieldErrorCode);
    } else {
      setAlert(handleRefusal(result));
    }
    input.current?.focus();
  }

  const fieldId = `${id}-name`;
  const errorId = `${id}-error`;
  const countId = `${id}-count`;
  const max = fieldLimits.name.max;

  // A card holding the field and its button (DESIGN.md, Cards & List Rows),
  // with a decorative cart inside the field. The field's padding makes room
  // for the cart at rest, on focus, and on error, where the border thickens.
  return (
    <form
      onSubmit={add}
      noValidate
      className="border-border bg-card shadow-card flex flex-col gap-2 rounded-xl border-[1.5px] p-4"
    >
      {alert && <FormAlert>{alert}</FormAlert>}
      <Label htmlFor={fieldId}>{t("quickAdd")}</Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <ShoppingCartIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
            aria-hidden
          />
          <Input
            ref={input}
            id={fieldId}
            value={name}
            maxLength={max}
            autoComplete="off"
            enterKeyHint="send"
            aria-invalid={error ? true : undefined}
            aria-describedby={
              [error && errorId, showsCount(name.length, max) && countId]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="h-full pl-12! focus:pl-[calc(3rem-0.5px)]! aria-invalid:pl-[calc(3rem-0.5px)]!"
            onChange={(event) => {
              setName(event.target.value);
              if (checked) setError(checkField("name", event.target.value));
            }}
          />
        </div>
        <Button type="submit" className="px-4" aria-busy={pending}>
          <PlusIcon aria-hidden />
          {t("add")}
        </Button>
      </div>
      {error && <FieldError id={errorId}>{message("name", error)}</FieldError>}
      <CharacterCount id={countId} length={name.length} max={max} />
      <span aria-live="polite" className="sr-only">
        {added}
      </span>
    </form>
  );
}
