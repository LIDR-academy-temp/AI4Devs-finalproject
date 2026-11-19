// Services and the rate limiter read the time from a clock they receive, never
// directly, so tests can set it (docs/07-SECURITY-AND-TESTING.md, section 2.4).

export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
