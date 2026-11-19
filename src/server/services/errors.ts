// Errors a domain service raises when it refuses an action. Each one has a code
// from the error table in docs/05-API.md, section 1; the API layer turns it into
// that status and code, so services never deal with HTTP.

export type DomainErrorCode =
  | "NOT_AVAILABLE"
  | "FORBIDDEN"
  | "ALREADY_RESERVED"
  | "ITEM_CHANGED"
  | "RULE_VIOLATION"
  | "INVITATION_INVALID"
  | "VALIDATION_FAILED";

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
}

/** Outside the user's groups, deleted, or archived; never says which (BR-13). */
export class NotAvailableError extends DomainError {
  readonly code = "NOT_AVAILABLE";
}

/** The user can see the data but not take this action (BR-12). */
export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
}

/** Someone else reserved the item first (BR-23). */
export class AlreadyReservedError extends DomainError {
  readonly code = "ALREADY_RESERVED";
}

/** The item changed since the user loaded it, or the action no longer applies (BR-20). */
export class ItemChangedError extends DomainError {
  readonly code = "ITEM_CHANGED";
}

/** A business rule refuses the action; `reason` names it, for example LIST_NOT_DELETABLE. */
export class RuleViolationError extends DomainError {
  readonly code = "RULE_VIOLATION";

  constructor(readonly reason: string) {
    super(reason);
  }
}

/** The invitation was used, expired, or cancelled (BR-08). */
export class InvitationInvalidError extends DomainError {
  readonly code = "INVITATION_INVALID";
}

/**
 * A field refers to something the request can't use, such as a recipient of
 * another group. Answered like any invalid field, so it reveals nothing more.
 */
export class InvalidFieldsError extends DomainError {
  readonly code = "VALIDATION_FAILED";

  constructor(readonly fields: Record<string, "invalid">) {
    super(Object.keys(fields).join(", "));
  }
}
