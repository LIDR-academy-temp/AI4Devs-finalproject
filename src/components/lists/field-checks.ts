"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

import { type FieldError, fields } from "@/shared/fields";
import { fieldLimits } from "@/shared/limits";

// The item and list fields' checks in the browser, with the same shared
// schemas the server uses (BR-32, FR-39), and their messages, chosen by what
// went wrong, so the server's `fields` and the browser's checks read the same.

export type CheckedField = "name" | "link" | "quantity" | "notes";

/** What is wrong with the field's text, or nothing. An empty link or note is no value. */
export function checkField(
  field: CheckedField,
  value: string,
): FieldError | undefined {
  const text = value.trim();
  switch (field) {
    case "name": {
      const result = fields.name.safeParse(value);
      if (result.success) return undefined;
      return text === "" ? "required" : "too_long";
    }
    case "link":
      if (text === "") return undefined;
      if (text.length > fieldLimits.link.max) return "too_long";
      return fields.link.safeParse(text).success ? undefined : "invalid";
    case "quantity":
      if (text === "") return "required";
      return fields.quantity.safeParse(Number(text)).success
        ? undefined
        : "invalid";
    case "notes":
      return fields.note.safeParse(value).success ? undefined : "too_long";
  }
}

const MAX: Record<CheckedField, number> = {
  name: fieldLimits.name.max,
  link: fieldLimits.link.max,
  quantity: fieldLimits.quantity.max,
  notes: fieldLimits.note.max,
};

/** Returns the message for a field's error. */
export function useFieldMessage() {
  const t = useTranslations("fieldMessages");
  return useCallback(
    (field: CheckedField, error: FieldError | string): string => {
      if (error === "too_long") return t("tooLong", { max: MAX[field] });
      switch (field) {
        case "name":
          return t("nameRequired");
        case "link":
          return t("linkInvalid");
        case "quantity":
          return t("quantityInvalid");
        case "notes":
          return t("tooLong", { max: MAX.notes });
      }
    },
    [t],
  );
}
