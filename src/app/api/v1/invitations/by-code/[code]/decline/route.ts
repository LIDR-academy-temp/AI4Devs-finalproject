import { defineRoute } from "@/server/http/route";

import { postDeclineInvitation } from "../definitions";

export const POST = defineRoute(postDeclineInvitation);
