import { db } from "@/server/db/client";
import { getCurrentUser } from "@/server/services/me";
import { mainScreenPath, visibleTabs } from "@/shared/navigation";

/** Where an onboarded user starts (docs/02-UX-DESIGN.md, section 2.2). */
export async function mainScreenOf(userId: string): Promise<string> {
  return mainScreenPath(visibleTabs(await getCurrentUser(db, userId)));
}
