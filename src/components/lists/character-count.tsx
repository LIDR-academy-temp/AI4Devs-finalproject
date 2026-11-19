"use client";

import { useTranslations } from "next-intl";

// A text field's counter (BR-32, docs/02-UX-DESIGN.md, section 2.7): shown
// from 80% of the limit, and announced politely when the limit is reached.
// The field stops accepting text at the limit through its maxLength.

export function showsCount(length: number, max: number): boolean {
  return length >= Math.ceil(max * 0.8);
}

export function CharacterCount({
  id,
  length,
  max,
}: {
  id: string;
  length: number;
  max: number;
}) {
  const t = useTranslations("fieldMessages");
  const reached = length >= max;
  return (
    <>
      {showsCount(length, max) && (
        <p
          id={id}
          className={
            reached
              ? "text-body-md text-foreground font-semibold"
              : "text-body-md text-muted-foreground"
          }
        >
          {t("characterCount", { count: length, max })}
          {reached && ` · ${t("limitReached")}`}
        </p>
      )}
      <span aria-live="polite" className="sr-only">
        {reached ? t("limitReached") : ""}
      </span>
    </>
  );
}
