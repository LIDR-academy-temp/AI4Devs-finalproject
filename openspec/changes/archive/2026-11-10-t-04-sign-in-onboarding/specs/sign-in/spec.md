# Spec Delta

## Purpose

Lets people sign in with Google and stay signed in while they keep using the app, and lets developers and browser tests sign in locally without Google credentials.

## ADDED Requirements

### Requirement: Users sign in with Google

The app SHALL let a person sign in with their Google account, with no password of its own, creating their account on first sign-in (FR-01). Each identity SHALL be identified by the provider's stable user ID, never by email, and a provider account without a verified email SHALL be refused (BR-02).

#### Scenario: BR-02 a Google profile without a verified email is refused

- **GIVEN** a Google profile whose email is not verified
- **WHEN** it is used to sign in
- **THEN** no account or session is created
- Verified by an integration test through Better Auth's sign-in and callback, with Google's token endpoint answered by the test, so Google itself is not called (docs/07-SECURITY-AND-TESTING.md §2.4).

#### Scenario: BR-02 an identity is matched by the provider's ID, not by email

- **GIVEN** an existing user with a verified email and no Google identity
- **WHEN** a Google identity with the same email signs in
- **THEN** it is not linked to that user, no session is created, and Welcome shows the sign-in error
- Verified by an integration test through Better Auth's sign-in and callback.

#### Scenario: BR-02 a returning identity keeps its account after its email changes

- **GIVEN** a user who signed in with Google
- **WHEN** they sign in again with the same Google identity and a different email
- **THEN** they are signed in as the same user
- Verified by an integration test through Better Auth's sign-in and callback.

### Requirement: Sessions renew with use and expire after 30 days without use

A session SHALL stay valid until 30 days pass without the user using the app, renewing at most once a day, and SHALL NOT expire at a fixed time after sign-in (BR-03). The session cookie SHALL be `httpOnly`, `SameSite=Lax`, and `Secure` outside localhost, and every request SHALL check the session in the database (docs/07-SECURITY-AND-TESTING.md §1).

#### Scenario: AC-05 a user who used the app 20 days ago is still signed in

- **GIVEN** a user who signed in 45 days ago and last used the app 20 days ago (docs/01-PRD.md §17.1, AC-05)
- **WHEN** they open the app
- **THEN** they are still signed in, and their session now expires 30 days from now
- Verified by an integration test with the session row dated as described.

#### Scenario: AC-06 a user who last used the app 31 days ago signs in again

- **GIVEN** a user who last used the app 31 days ago (docs/01-PRD.md §17.1, AC-06)
- **WHEN** they open the app
- **THEN** they are treated as signed out: `/api/v1` answers 401 `NOT_SIGNED_IN`, and pages send them to Welcome
- Verified by an integration test with the session row dated as described.

#### Scenario: BR-03 a session used twice in one day is renewed once

- **GIVEN** a session renewed less than a day ago
- **WHEN** the user makes another request
- **THEN** the session's expiry doesn't change

### Requirement: Signing out ends the session

Signing out SHALL delete the user's session, so the same cookie no longer signs anyone in (BR-03, docs/07-SECURITY-AND-TESTING.md §1).

#### Scenario: BR-03 signing out deletes the session

- **GIVEN** a signed-in user
- **WHEN** they sign out
- **THEN** their session no longer exists, and a request with the old cookie answers 401 `NOT_SIGNED_IN`
- Verified by an integration test.

### Requirement: Sign-in requests come from the app

Requests to the sign-in endpoints that change state SHALL be refused when their `Origin` isn't the app's own address (docs/07-SECURITY-AND-TESTING.md §1).

#### Scenario: T-04 a sign-out from another origin is refused

- **GIVEN** a signed-in user's cookie
- **WHEN** a sign-out request arrives with another site's `Origin`
- **THEN** it is refused and the session still exists
- Verified by an integration test.

### Requirement: Only the sign-in endpoints the app uses are served

Under `/api/auth`, the app SHALL serve only Google sign-in and its callback, reading the session, signing out, the sign-in error page, and, when it is on, the development sign-in. Every other address SHALL answer 404, so changes to an account go through `/api/v1` and its checks (docs/05-API.md §2).

#### Scenario: T-04 Better Auth's own account changes are not served

- **GIVEN** the app's sign-in endpoints
- **WHEN** a request is sent to another Better Auth endpoint, such as changing the user's name or deleting the user
- **THEN** it answers 404
- Verified by an integration test.

### Requirement: Development-only sign-in

When the development sign-in setting is on, the app SHALL let anyone sign in by entering an email: as the existing user with that email, or as a new user who hasn't completed onboarding. With the setting off, it SHALL NOT exist (docs/03-ARCHITECTURE.md §3).

#### Scenario: T-04 the development sign-in signs in a seed user

- **GIVEN** the development sign-in is on
- **WHEN** someone signs in with a seed user's email
- **THEN** they are signed in as that user, who has already completed onboarding
- Verified by an integration test.

#### Scenario: T-04 the development sign-in creates a new user

- **GIVEN** the development sign-in is on
- **WHEN** someone signs in with an email no user has
- **THEN** a new user with that email is created and signed in, and hasn't completed onboarding
- Verified by an integration test.

#### Scenario: T-04 the development sign-in doesn't exist when the setting is off

- **GIVEN** the setting is off
- **WHEN** a request is sent to the development sign-in
- **THEN** it answers as an unknown address, and Welcome doesn't show the development sign-in
- Verified by an integration test.

#### Scenario: T-04 the app refuses to start with the setting on outside localhost

- **GIVEN** the setting is on and the app's address isn't on localhost
- **WHEN** the app starts
- **THEN** it stops with an error that names the setting
- Verified by a unit test of the startup check.

### Requirement: Endpoints and pages see the signed-in user

Every `/api/v1` endpoint and every page SHALL identify the user from the session, with their language and whether they have completed onboarding, and SHALL treat a missing, expired, or deleted session as signed out.

#### Scenario: T-04 an endpoint reads a real session

- **GIVEN** a seed user with a valid session cookie
- **WHEN** they request `GET /me`
- **THEN** the response is their account
- Verified by an integration test through the session reader, not a test reader.
