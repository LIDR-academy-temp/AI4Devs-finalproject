"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ScreenError } from "@/components/screen-error";

// A screen that failed inside the shell, which stays usable. Try again fetches
// the screen's data again, then renders it (design decision 5 of the T-05
// change).
export default function ShellError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [retrying, startTransition] = useTransition();
  return (
    <ScreenError
      retrying={retrying}
      onRetry={() =>
        startTransition(() => {
          router.refresh();
          reset();
        })
      }
    />
  );
}
