"use client";

import { CheckIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";

import { LANGUAGES, type Language } from "@/shared/languages";

import { cn } from "./ui/utils";

// Two side-by-side choices, Español and English, as radio buttons, so the
// current one is announced and the arrow keys move between them. Each language
// is named in its own language.
//
// The compact look is the pill on Welcome (design/stitch/01-welcome): the
// "Language" legend is read by screen readers only, and the current choice is a
// white pill with a check mark. Each choice is still at least 48px tall, and
// the two are 8px apart (DESIGN.md, Touch and Interaction Targets).

const styles = {
  default: {
    legend: "text-label-lg mb-2 font-semibold",
    track: "bg-muted grid grid-cols-2 gap-2 rounded-lg p-1",
    option: "rounded-md px-4",
    current: "bg-primary text-primary-foreground",
    other: "text-foreground hover:bg-card",
    check: "",
  },
  compact: {
    legend: "sr-only",
    track:
      "border-border bg-muted inline-flex gap-2 rounded-full border-[1.5px] p-1",
    option: "rounded-full pr-5 pl-4 transition-colors",
    current: "bg-card text-foreground shadow-card",
    other: "text-muted-foreground hover:bg-card/70 hover:text-foreground",
    check: "text-primary",
  },
} as const;

export function LanguageSwitch({
  value,
  onChange,
  disabled,
  variant = "default",
  className,
}: {
  value?: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
  variant?: keyof typeof styles;
  className?: string;
}) {
  const t = useTranslations("common");
  const locale = useLocale() as Language;
  const current = value ?? locale;
  const name = useId();
  const look = styles[variant];

  return (
    <fieldset className={cn("flex flex-col gap-2", className)}>
      <legend className={look.legend}>{t("language")}</legend>
      <div className={look.track}>
        {LANGUAGES.map((language) => (
          <label
            key={language}
            lang={language}
            className={cn(
              "text-label-lg has-[:focus-visible]:ring-ring flex min-h-12 cursor-pointer items-center justify-center gap-2 font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2",
              look.option,
              current === language ? look.current : look.other,
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={language}
              checked={current === language}
              disabled={disabled}
              onChange={() => onChange(language)}
              className="sr-only"
            />
            {current === language && (
              <CheckIcon className={cn("size-5", look.check)} aria-hidden />
            )}
            {t(`languageNames.${language}`)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
