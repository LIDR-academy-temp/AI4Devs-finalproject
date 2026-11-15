// Field limits (BR-32) and rate limits (docs/07-SECURITY-AND-TESTING.md, section 1).
// Shared by the browser and the server, so each limit is defined once (FR-39).

export const fieldLimits = {
  name: { min: 1, max: 100 },
  inviteeName: { max: 100 },
  note: { max: 1000 },
  quantity: { min: 1, max: 99 },
  recipientDetails: {
    maxCount: 20,
    name: { min: 1, max: 40 },
    value: { min: 1, max: 150 },
  },
  link: { max: 2000 },
  agency: { min: 1, max: 80 },
  deliveryAddress: { min: 1, max: 500 },
} as const;

export type RateLimit = {
  /** Name of the counted action, part of the counter's key. */
  action: string;
  limit: number;
  windowSeconds: number;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const rateLimits = {
  anyRequest: { action: "api", limit: 120, windowSeconds: MINUTE },
  linkLookup: { action: "link-lookup", limit: 20, windowSeconds: MINUTE },
  createInvitation: { action: "invitation", limit: 30, windowSeconds: DAY },
  createItem: { action: "item", limit: 200, windowSeconds: HOUR },
} as const satisfies Record<string, RateLimit>;
