# api-conventions Specification

## Purpose
Defines how every endpoint under `/api/v1` receives requests and answers them, so each endpoint adds only its own business logic and every client can handle any response the same way.

## Requirements

### Requirement: Endpoints require a signed-in user

Every endpoint under `/api/v1` SHALL answer `401 NOT_SIGNED_IN` when the request has no valid session, before any validation or service runs, except the invitation preview, which API §1 lists as needing no sign-in. Every endpoint SHALL also answer `403 FORBIDDEN` to a signed-in user who hasn't completed onboarding, before any validation or service runs, except `GET /me` and `POST /me/onboarding` (API §1).

#### Scenario: T-03 request without a session is rejected

- **GIVEN** an endpoint that requires sign-in
- **WHEN** a request arrives with no valid session
- **THEN** the response is 401 with the code `NOT_SIGNED_IN` in the error format, and the endpoint's service is not called
- Verified by an integration test.

#### Scenario: T-03 public endpoint skips the session check

- **GIVEN** an endpoint declared as public
- **WHEN** a request arrives with no session
- **THEN** the endpoint's service runs
- Verified by an integration test.

#### Scenario: T-04 a user who hasn't completed onboarding is refused

- **GIVEN** a signed-in user who hasn't completed onboarding
- **WHEN** they request `GET /groups`
- **THEN** the response is 403 `FORBIDDEN` in the error format, and the endpoint's service is not called
- Verified by an integration test.

#### Scenario: T-04 a user who hasn't completed onboarding can read themselves and complete it

- **GIVEN** a signed-in user who hasn't completed onboarding
- **WHEN** they request `GET /me` and `POST /me/onboarding`
- **THEN** neither is refused for missing onboarding
- Verified by an integration test.

### Requirement: One error format

Every error response from `/api/v1` SHALL use the format and the status and code pairs in API §1, with `Content-Type: application/json`. An unexpected failure SHALL answer 500 with a generic message and SHALL NOT include internal details, such as a stack trace or a database message.

#### Scenario: T-03 domain error becomes its status and code

- **GIVEN** a service that refuses with each error the API defines
- **WHEN** the endpoint answers
- **THEN** the status and `code` match the table in API §1, and `reason` is present only for `RULE_VIOLATION`
- Verified by integration tests.

#### Scenario: T-03 unexpected failure reveals nothing

- **GIVEN** a service that fails with an unexpected error
- **WHEN** the endpoint answers
- **THEN** the response is 500 in the error format, with a generic message and no stack trace or database text

### Requirement: Error messages in the user's language

The `message` of every error SHALL come from the translation files, in the signed-in user's language. When there is no signed-in user, or the user has no language yet, it SHALL follow the browser's preferred language, as UX design §2.8 describes, and SHALL be Spanish when the browser prefers neither Spanish nor English.

#### Scenario: T-03 message follows the user's language

- **GIVEN** a signed-in user whose language is English, and another whose language is Spanish
- **WHEN** each one gets the same error
- **THEN** each message is the translation-file text for that error in the user's language
- Verified by an integration test.

#### Scenario: T-03 message follows the browser without a user

- **WHEN** a request with no session and an `Accept-Language` preferring English gets `NOT_SIGNED_IN`
- **THEN** the message is the English translation-file text
- **AND** with no `Accept-Language`, or one preferring another language, it is the Spanish text

### Requirement: Request validation against field limits

Request bodies and query parameters SHALL be validated against shared schemas that apply the limits in BR-32, before any service runs (FR-39). A value outside its limit, or a missing required field, SHALL answer `422 VALIDATION_FAILED` with `fields` naming each failing field and the kind of failure, and nothing is saved.

#### Scenario: BR-32 each field limit is enforced

- **GIVEN** each field in the BR-32 table
- **WHEN** a value at the limit and a value just past it are validated
- **THEN** the value at the limit is accepted and the one past it is rejected
- Verified by unit tests of the shared schemas, one per field.

#### Scenario: BR-32 phone numbers must be valid international numbers

- **WHEN** a WhatsApp number or receiver's phone is validated
- **THEN** a valid international number is accepted and stored in one standard international format, and an invalid number is rejected

#### Scenario: BR-32 links must be http or https

- **WHEN** a link with another scheme, or one over 2,000 characters, is validated
- **THEN** it is rejected

#### Scenario: T-03 invalid body answers with the failing fields

- **GIVEN** an endpoint with a body schema
- **WHEN** a request breaks one field's limit and leaves out a required field
- **THEN** the response is 422 `VALIDATION_FAILED`, `fields` names both fields, and the endpoint's service is not called
- Verified by an integration test.

#### Scenario: T-03 body that isn't JSON is rejected

- **WHEN** a request that changes data has a body that isn't valid JSON
- **THEN** the response is 422 `VALIDATION_FAILED`, and the endpoint's service is not called

### Requirement: The same schemas in the browser and the server

The field limits and schemas SHALL live in one shared place that the interface and the server both import, so that a limit is defined once (FR-39). Code shared this way SHALL NOT import server-only code.

#### Scenario: T-03 shared schemas have no server imports

- **WHEN** the type check and lint run
- **THEN** no file in the shared schemas imports from the server code
- Verified by a lint rule in CI.

### Requirement: Responses carry only what their schema documents

A success response SHALL contain only the properties its documented response schema defines, so data a service returns by accident, such as extra columns from a query, never reaches the client. A result that doesn't match its schema SHALL answer `500 INTERNAL_ERROR` instead of being sent.

#### Scenario: T-03 only properties the response schema documents are sent

- **GIVEN** an endpoint whose service returns a property its response schema doesn't define
- **WHEN** the endpoint answers
- **THEN** the response body has only the documented properties
- Verified by an integration test.

#### Scenario: T-03 a result that breaks the response schema becomes a 500

- **GIVEN** an endpoint whose service returns a result missing a required property
- **WHEN** the endpoint answers
- **THEN** the response is 500 `INTERNAL_ERROR`, and the result isn't sent

### Requirement: Generated OpenAPI document

`docs/openapi.yaml` SHALL be generated from the same Zod schemas the endpoints use, with the base path, the session cookie security scheme, and the error format in API §3. Each endpoint ticket adds its paths through the same generator.

#### Scenario: T-03 generated document has the shared components

- **WHEN** the generation script runs
- **THEN** `docs/openapi.yaml` is an OpenAPI 3.1 document with the server `/api/v1`, the session cookie security scheme, and the `Error` schema as API §3 defines them
- Verified by an integration test that parses the generated document.

#### Scenario: T-03 generation is repeatable

- **WHEN** the generation script runs twice with no code change
- **THEN** the file is identical both times

### Requirement: Responses match their schemas

Integration tests SHALL be able to check any endpoint's response against the Zod schema that documents it in the OpenAPI document, as Security and testing §2.1 requires.

#### Scenario: T-03 a response that breaks its schema fails the test

- **GIVEN** a test endpoint whose response leaves out a required property of its documented schema
- **WHEN** an integration test checks the response
- **THEN** the check fails and names the property
