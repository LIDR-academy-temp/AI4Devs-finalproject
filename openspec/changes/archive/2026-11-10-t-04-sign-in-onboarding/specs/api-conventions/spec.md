# Spec Delta

## MODIFIED Requirements

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
