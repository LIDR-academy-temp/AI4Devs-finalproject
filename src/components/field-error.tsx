import { TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

// A field's error under it: a warning icon and plain-language text, never color
// alone (DESIGN.md, Input Fields & Selectors).
export function FieldError({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="text-body-md text-destructive flex items-start gap-2">
      <TriangleAlertIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
