import { BadRequestException } from '@nestjs/common';
import { RECORDABLE_OUTCOMES, type RunOutcome } from './execution-lifecycle';

export type Browser = 'Chromium' | 'Firefox' | 'WebKit';
export type RunMode = 'Manual' | 'Automated';

const BROWSERS: Browser[] = ['Chromium', 'Firefox', 'WebKit'];
const RUN_MODES: RunMode[] = ['Manual', 'Automated'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Defaults applied on create when a field is omitted (design.md - Input validation). */
export const EXECUTION_DEFAULTS = {
  browser: 'Chromium' as Browser,
  viewportWidth: 1280,
  viewportHeight: 720,
  locale: 'en-US',
  timezone: 'UTC',
};

/** Run conditions and plan fields; every one optional, so PATCH reuses this shape. */
export interface ExecutionFields {
  name?: string;
  description?: string | null;
  testCaseIds?: string[];
  /** null clears the environment (PATCH); undefined leaves it alone. */
  environmentId?: string | null;
  browser?: Browser;
  viewportWidth?: number;
  viewportHeight?: number;
  locale?: string;
  timezone?: string;
  autoCreateBug?: boolean;
}

let timeZones: Set<string> | undefined;

function isTimeZone(value: string): boolean {
  timeZones ??= new Set([...Intl.supportedValuesOf('timeZone'), 'UTC']);
  return timeZones.has(value);
}

/** Returns the canonical form of a BCP 47 language tag, or null if it is not one. */
function canonicalLocale(value: string): string | null {
  try {
    const canonical = Intl.getCanonicalLocales(value);
    return canonical.length === 1 ? canonical[0] : null;
  } catch {
    return null;
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/**
 * Validates an execution create/update body. `requireCreateFields` makes name and
 * testCaseIds mandatory (create); on PATCH every field is optional.
 */
export function parseExecutionFields(body: Record<string, unknown>, requireCreateFields: boolean): ExecutionFields {
  const fields: ExecutionFields = {};

  if (body.name !== undefined || requireCreateFields) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw new BadRequestException('name must be a non-empty string');
    }
    fields.name = body.name;
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== 'string') {
      throw new BadRequestException('description must be a string or null');
    }
    fields.description = body.description === '' ? null : (body.description as string | null);
  }

  if (body.testCaseIds !== undefined || requireCreateFields) {
    const ids = body.testCaseIds;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(isUuid)) {
      throw new BadRequestException('testCaseIds must be a non-empty array of test case ids');
    }
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('testCaseIds must not contain the same test case twice');
    }
    fields.testCaseIds = ids;
  }

  if (body.environmentId !== undefined) {
    if (body.environmentId !== null && !isUuid(body.environmentId)) {
      throw new BadRequestException('environmentId must be an environment id or null');
    }
    fields.environmentId = body.environmentId;
  }

  if (body.browser !== undefined) {
    if (!BROWSERS.includes(body.browser as Browser)) {
      throw new BadRequestException(`browser must be one of ${BROWSERS.join(', ')}`);
    }
    fields.browser = body.browser as Browser;
  }

  for (const key of ['viewportWidth', 'viewportHeight'] as const) {
    const value = body[key];
    if (value !== undefined) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
        throw new BadRequestException(`${key} must be a positive integer`);
      }
      fields[key] = value;
    }
  }

  if (body.locale !== undefined) {
    const locale = typeof body.locale === 'string' ? canonicalLocale(body.locale) : null;
    if (locale === null) {
      throw new BadRequestException('locale must be a valid language tag, e.g. en-US');
    }
    fields.locale = locale;
  }

  if (body.timezone !== undefined) {
    if (typeof body.timezone !== 'string' || !isTimeZone(body.timezone)) {
      throw new BadRequestException('timezone must be a valid IANA time zone, e.g. Europe/Paris');
    }
    fields.timezone = body.timezone;
  }

  if (body.autoCreateBug !== undefined) {
    if (typeof body.autoCreateBug !== 'boolean') {
      throw new BadRequestException('autoCreateBug must be a boolean');
    }
    fields.autoCreateBug = body.autoCreateBug;
  }

  return fields;
}

export function parseRunMode(value: unknown): RunMode {
  if (!RUN_MODES.includes(value as RunMode)) {
    throw new BadRequestException(`mode must be one of ${RUN_MODES.join(', ')}`);
  }
  return value as RunMode;
}

export function parseOutcome(value: unknown): Exclude<RunOutcome, 'Pending'> {
  if (!RECORDABLE_OUTCOMES.includes(value as RunOutcome)) {
    throw new BadRequestException(`outcome must be one of ${RECORDABLE_OUTCOMES.join(', ')}`);
  }
  return value as Exclude<RunOutcome, 'Pending'>;
}
