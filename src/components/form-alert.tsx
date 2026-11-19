import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

// A message about the whole form, such as "Couldn't save", announced to screen
// readers as soon as it appears (docs/02-UX-DESIGN.md, section 2.7).
export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="border-destructive-border bg-destructive-surface text-body-md text-destructive flex items-start gap-3 rounded-lg border-[1.5px] p-4"
    >
      <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
