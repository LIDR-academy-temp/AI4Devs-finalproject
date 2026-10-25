# Spec Delta

## Purpose

Lets infrastructure and operators confirm the API process is running and able to respond, before any domain functionality exists.

## ADDED Requirements

### Requirement: API exposes a health-check endpoint
The system SHALL expose an HTTP GET endpoint at `/health` that returns a successful response when the API process is running and able to handle requests, without requiring authentication.

#### Scenario: Health check succeeds
- **WHEN** a client sends `GET /health` to a running API instance
- **THEN** the API responds with HTTP 200 and a JSON body indicating the service is up

#### Scenario: Health check requires no authentication
- **WHEN** a client sends `GET /health` with no `Authorization` header
- **THEN** the API still responds with HTTP 200, since a liveness/readiness probe must not depend on a bearer token (ADR 0009)
