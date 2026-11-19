import { defineRoute } from "@/server/http/route";

import { getInvitations, postInvitation } from "./definitions";

export const GET = defineRoute(getInvitations);
export const POST = defineRoute(postInvitation);
