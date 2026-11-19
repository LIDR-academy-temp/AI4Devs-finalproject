import { redirect } from "next/navigation";

import { getSessionUser } from "@/server/auth";
import type { SessionUser } from "@/server/http/session";

/**
 * The signed-in user, who has completed onboarding. Sends anyone else to
 * Welcome or One last step (design decision 5 of the T-04 change). Next.js can
 * render a layout and its page at the same time, so each of them calls this.
 */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!user.onboarded) redirect("/onboarding");
  return user;
}
