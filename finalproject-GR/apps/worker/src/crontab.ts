/**
 * Scheduled jobs (Graphile Worker crontab syntax). The trash purge runs daily at 03:00
 * UTC; `fill=1d` catches up one missed run after downtime. Several workers never
 * schedule the same run twice (Graphile's known_crontabs lock).
 */
export const CRONTAB = '0 3 * * * trash_purge ?fill=1d';
