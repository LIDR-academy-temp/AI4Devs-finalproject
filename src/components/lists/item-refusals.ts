"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

import type { ApiResult } from "@/components/api";

// One way to answer a refused action on an item (BR-20, BR-23,
// docs/02-UX-DESIGN.md, section 2.7): the message to show and, when the item
// changed or is gone, a refresh so the screen shows the latest. A lost
// connection changes nothing, so the user can try again.

export type Refusal = Exclude<ApiResult<unknown>, { ok: true }>;

/** Codes that mean the screen is out of date; the item changed for everyone else. */
const CHANGED = new Set(["ITEM_CHANGED", "NOT_AVAILABLE", "RULE_VIOLATION"]);

const OWN_MESSAGE = [
  "NOT_SIGNED_IN",
  "FORBIDDEN",
  "NOT_AVAILABLE",
  "ALREADY_RESERVED",
  "ITEM_CHANGED",
  "RULE_VIOLATION",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
] as const;

function hasOwnMessage(code: string): code is (typeof OWN_MESSAGE)[number] {
  return (OWN_MESSAGE as readonly string[]).includes(code);
}

/** Returns the message for a refused request: its code's, or "Couldn't save" when it never got an answer. */
export function useRefusalMessage() {
  const tErrors = useTranslations("errors");
  const tCommon = useTranslations("common");
  return useCallback(
    (result: Refusal): string => {
      if ("offline" in result) return tCommon("couldNotSave");
      const { code } = result.error;
      return tErrors(hasOwnMessage(code) ? code : "INTERNAL_ERROR");
    },
    [tErrors, tCommon],
  );
}

/** Returns `handleItemRefusal`, which refreshes when needed and returns the message to show. */
export function useItemRefusal() {
  const router = useRouter();
  const tErrors = useTranslations("errors");
  const refusalMessage = useRefusalMessage();

  return useCallback(
    function handleItemRefusal(result: Refusal): string {
      if ("offline" in result) return refusalMessage(result);
      const { code } = result.error;
      if (CHANGED.has(code)) {
        router.refresh();
        return tErrors("ITEM_CHANGED");
      }
      if (code === "ALREADY_RESERVED") router.refresh();
      return refusalMessage(result);
    },
    [router, tErrors, refusalMessage],
  );
}
