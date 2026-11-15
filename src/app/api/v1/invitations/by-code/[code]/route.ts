import { defineRoute } from "@/server/http/route";

import { getInvitationByCode } from "./definitions";

export const GET = defineRoute(getInvitationByCode);
