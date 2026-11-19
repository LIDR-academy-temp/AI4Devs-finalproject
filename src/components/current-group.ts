import { CURRENT_GROUP_COOKIE } from "@/shared/navigation";

// The current group, remembered on this device (docs/02-UX-DESIGN.md, section
// 2.2; design decision 3 of the T-05 change). Written by the group selector and
// after accepting a member invitation; the shell reads it on the server.

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function rememberGroup(groupId: string) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CURRENT_GROUP_COOKIE}=${encodeURIComponent(groupId)}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax${secure}`;
}
