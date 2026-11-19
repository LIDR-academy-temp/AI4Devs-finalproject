import "./zod-openapi";

import { z } from "zod";

import type { FieldError } from "../../shared/fields";
import {
  DomainError,
  InvalidFieldsError,
  RuleViolationError,
} from "../services/errors";
import { errorMessage, type ErrorMessageKey } from "./language";
import type { Language } from "./session";

// The error format in docs/05-API.md, section 1.

export const errorBodySchema = z.object({
  error: z.object({
    code: z.string().meta({ example: "VALIDATION_FAILED" }),
    message: z.string().meta({ example: "Check the highlighted fields." }),
    reason: z.string().optional().meta({ example: "LIST_NOT_DELETABLE" }),
    fields: z.record(z.string(), z.string()).optional(),
  }),
});

export type ErrorBody = z.infer<typeof errorBodySchema>;

export type ErrorCode = ErrorMessageKey;

export const errorStatus: Record<ErrorCode, number> = {
  NOT_SIGNED_IN: 401,
  FORBIDDEN: 403,
  NOT_AVAILABLE: 404,
  ALREADY_RESERVED: 409,
  ITEM_CHANGED: 409,
  RULE_VIOLATION: 409,
  INVITATION_INVALID: 410,
  VALIDATION_FAILED: 422,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Refusals raised by the route wrapper itself, before any service runs. */
export class RequestError extends Error {
  constructor(
    readonly code: Extract<
      ErrorCode,
      "NOT_SIGNED_IN" | "FORBIDDEN" | "NOT_AVAILABLE" | "RATE_LIMITED"
    >,
  ) {
    super(code);
  }
}

export class ValidationFailedError extends Error {
  readonly code = "VALIDATION_FAILED";

  constructor(readonly fields: Record<string, FieldError>) {
    super("VALIDATION_FAILED");
  }
}

export type ErrorResult = { status: number; body: ErrorBody };

/**
 * Turns any thrown value into a status and error body. Anything that isn't a
 * known refusal becomes a 500 with a generic message, and is logged with its
 * details on the server only.
 */
export function toErrorResult(error: unknown, language: Language): ErrorResult {
  const build = (
    code: ErrorCode,
    extra: Partial<ErrorBody["error"]> = {},
  ): ErrorResult => ({
    status: errorStatus[code],
    body: { error: { code, message: errorMessage(language, code), ...extra } },
  });

  if (error instanceof RuleViolationError) {
    return build(error.code, { reason: error.reason });
  }
  if (error instanceof InvalidFieldsError) {
    return build(error.code, { fields: error.fields });
  }
  if (error instanceof DomainError || error instanceof RequestError) {
    return build(error.code);
  }
  if (error instanceof ValidationFailedError) {
    return build(error.code, { fields: error.fields });
  }

  console.error(error);
  return build("INTERNAL_ERROR");
}
