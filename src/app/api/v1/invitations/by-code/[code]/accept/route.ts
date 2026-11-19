import { defineRoute } from "@/server/http/route";

import { postAcceptInvitation } from "../definitions";

export const POST = defineRoute(postAcceptInvitation);
