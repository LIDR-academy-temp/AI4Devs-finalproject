"use client";

import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  type ComponentProps,
  type FormEvent,
  type ReactNode,
  useId,
  useRef,
  useState,
} from "react";

import { sendJson } from "@/components/api";
import { FieldError } from "@/components/field-error";
import { FormAlert } from "@/components/form-alert";
import { Button } from "@/components/ui/button";
import { fieldClassName, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldError as FieldErrorCode } from "@/shared/fields";
import { fieldLimits } from "@/shared/limits";

import { CharacterCount, showsCount } from "./character-count";
import { type CheckedField, checkField, useFieldMessage } from "./field-checks";
import { useItemRefusal } from "./item-refusals";

// The item form for adding and editing (docs/02-UX-DESIGN.md, section 2.4;
// FR-13, FR-16; design decision 5): every field on one screen, checked with
// the shared schemas on save and then as the user types (FR-39). An edit
// sends only the fields the member changed, with the version the form last
// loaded. When the item changed meanwhile, the form keeps what they typed and
// shows the latest item in every other field, so saving again applies only
// their changes (BR-20). The recipient comes with T-13; an edit keeps it.

type Values = {
  link: string;
  name: string;
  listId: string;
  quantity: string;
  notes: string;
};

type EditedItem = {
  id: string;
  name: string;
  url: string | null;
  quantity: number;
  notes: string | null;
  listId: string;
  version: number;
};

const ORDER: readonly CheckedField[] = ["link", "name", "quantity", "notes"];

/** The API's name for each field, in its `fields`. */
const API_FIELD: Record<string, CheckedField> = {
  url: "link",
  name: "name",
  quantity: "quantity",
  notes: "notes",
};

const LIMIT: Partial<Record<CheckedField, number>> = {
  link: fieldLimits.link.max,
  name: fieldLimits.name.max,
  notes: fieldLimits.note.max,
};

function valuesOf(item: EditedItem | undefined, listId: string): Values {
  return {
    link: item?.url ?? "",
    name: item?.name ?? "",
    listId: item?.listId ?? listId,
    quantity: String(item?.quantity ?? 1),
    notes: item?.notes ?? "",
  };
}

/** Empty text means no value: null, which clears it on an edit. */
function orNull(value: string): string | null {
  const text = value.trim();
  return text === "" ? null : text;
}

/**
 * The fields the member changed that differ from the latest item, in the
 * API's names. Fields they didn't touch are never sent, so another member's
 * edit to them stands.
 */
function changesFrom(item: EditedItem, edited: Partial<Values>) {
  const changes: Record<string, unknown> = {};
  if (edited.name !== undefined && edited.name.trim() !== item.name) {
    changes.name = edited.name;
  }
  if (edited.link !== undefined && orNull(edited.link) !== item.url) {
    changes.url = orNull(edited.link);
  }
  if (
    edited.quantity !== undefined &&
    Number(edited.quantity) !== item.quantity
  ) {
    changes.quantity = Number(edited.quantity);
  }
  if (edited.notes !== undefined && orNull(edited.notes) !== item.notes) {
    changes.notes = orNull(edited.notes);
  }
  if (edited.listId !== undefined && edited.listId !== item.listId) {
    changes.listId = edited.listId;
  }
  return changes;
}

export function ItemForm({
  lists,
  listId,
  item,
}: {
  lists: readonly { id: string; name: string }[];
  listId: string;
  /** The item being edited, as last loaded; none when adding. */
  item?: EditedItem;
}) {
  const t = useTranslations("itemForm");
  const tCommon = useTranslations("common");
  const message = useFieldMessage();
  const handleRefusal = useItemRefusal();
  const router = useRouter();
  const id = useId();
  const refs = useRef<Partial<Record<CheckedField, HTMLElement | null>>>({});

  // Only what the member typed is kept; every other field shows the item as
  // last loaded, including after a refresh brings a newer version.
  const [edited, setEdited] = useState<Partial<Values>>({});
  const loaded = valuesOf(item, listId);
  const values: Values = { ...loaded, ...edited };
  const [errors, setErrors] = useState<
    Partial<Record<CheckedField, FieldErrorCode>>
  >({});
  const [checked, setChecked] = useState<ReadonlySet<CheckedField>>(new Set());
  const [alert, setAlert] = useState<string>();
  const [pending, setPending] = useState(false);

  function change(field: keyof Values, value: string) {
    setEdited((current) => ({ ...current, [field]: value }));
    if (field !== "listId" && checked.has(field)) {
      setErrors((current) => ({
        ...current,
        [field]: checkField(field, value),
      }));
    }
  }

  /**
   * A field the user has left after typing in it is checked from then on, as
   * they type. Its message waits for the next change or for Save: showing it
   * on leaving would move Save while the user is pressing it.
   */
  function leave(field: CheckedField) {
    if (values[field] !== loaded[field]) {
      setChecked((current) => new Set(current).add(field));
    }
  }

  function showErrors(next: Partial<Record<CheckedField, FieldErrorCode>>) {
    setErrors(next);
    setChecked(new Set(ORDER));
    const first = ORDER.find((field) => next[field]);
    if (first) refs.current[first]?.focus();
    return first !== undefined;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setAlert(undefined);
    const found = Object.fromEntries(
      ORDER.map((field) => [field, checkField(field, values[field])]),
    );
    if (showErrors(found)) return;

    let result;
    if (item) {
      const changes = changesFrom(item, edited);
      if (Object.keys(changes).length === 0) {
        router.push(`/items/${item.id}`);
        return;
      }
      setPending(true);
      result = await sendJson(`/items/${item.id}`, "PATCH", {
        version: item.version,
        ...changes,
      });
    } else {
      setPending(true);
      result = await sendJson(`/lists/${values.listId}/items`, "POST", {
        name: values.name,
        url: orNull(values.link) ?? undefined,
        quantity: Number(values.quantity),
        notes: orNull(values.notes) ?? undefined,
      });
    }
    setPending(false);

    if (result.ok) {
      router.push(item ? `/items/${item.id}` : `/lists?list=${values.listId}`);
      return;
    }
    const serverFields = "offline" in result ? undefined : result.error.fields;
    if (serverFields) {
      const mapped: Partial<Record<CheckedField, FieldErrorCode>> = {};
      for (const [key, error] of Object.entries(serverFields)) {
        const field = API_FIELD[key];
        if (field) mapped[field] = error as FieldErrorCode;
      }
      if (showErrors(mapped)) return;
    }
    setAlert(handleRefusal(result));
  }

  function field(
    name: CheckedField,
    label: string,
    control: (props: {
      id: string;
      "aria-invalid"?: true;
      "aria-describedby"?: string;
    }) => ReactNode,
    help?: string,
  ) {
    const fieldId = `${id}-${name}`;
    const error = errors[name];
    const limit = LIMIT[name];
    const length = values[name].length;
    const describedBy = [
      help && `${fieldId}-help`,
      error && `${fieldId}-error`,
      limit && showsCount(length, limit) && `${fieldId}-count`,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId}>{label}</Label>
        {control({
          id: fieldId,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": describedBy || undefined,
        })}
        {help && (
          <p
            id={`${fieldId}-help`}
            className="text-body-md text-muted-foreground"
          >
            {help}
          </p>
        )}
        {error && (
          <FieldError id={`${fieldId}-error`}>
            {message(name, error)}
          </FieldError>
        )}
        {limit && (
          <CharacterCount id={`${fieldId}-count`} length={length} max={limit} />
        )}
      </div>
    );
  }

  const text = (name: CheckedField): ComponentProps<"input"> => ({
    value: values[name],
    onChange: (event) => change(name, event.target.value),
    onBlur: () => leave(name),
    ref: (element) => {
      refs.current[name] = element;
    },
  });

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-5">
      {alert && <FormAlert>{alert}</FormAlert>}

      {field("link", t("link"), (props) => (
        <Input
          {...props}
          {...text("link")}
          type="url"
          inputMode="url"
          autoComplete="url"
          placeholder="https://"
          maxLength={fieldLimits.link.max}
        />
      ))}

      {field("name", t("name"), (props) => (
        <Input
          {...props}
          {...text("name")}
          required
          autoComplete="off"
          maxLength={fieldLimits.name.max}
        />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-list`}>{t("list")}</Label>
        <select
          id={`${id}-list`}
          value={values.listId}
          onChange={(event) => change("listId", event.target.value)}
          className={fieldClassName}
        >
          {lists.map(({ id: optionId, name }) => (
            <option key={optionId} value={optionId}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {field("quantity", t("quantity"), (props) => (
        <Input
          {...props}
          {...text("quantity")}
          type="number"
          inputMode="numeric"
          min={fieldLimits.quantity.min}
          max={fieldLimits.quantity.max}
          className="max-w-32"
        />
      ))}

      {field(
        "notes",
        t("notes"),
        (props) => (
          <Textarea
            {...props}
            value={values.notes}
            onChange={(event) => change("notes", event.target.value)}
            onBlur={() => leave("notes")}
            ref={(element) => {
              refs.current.notes = element;
            }}
            maxLength={fieldLimits.note.max}
          />
        ),
        t("notesHelp"),
      )}

      <Button type="submit" disabled={pending} aria-busy={pending}>
        <SaveIcon aria-hidden />
        {pending ? tCommon("saving") : tCommon("save")}
      </Button>
    </form>
  );
}
