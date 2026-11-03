# Design

## Context

See `proposal.md` for the motivation and scope; the observable behavior is defined in `specs/documentos-sti/spec.md`.

The Documentos feature is not currently present in the UI, API, or MAPI source. `VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md` records the DBA verification reported by the requester for a non-production environment and the approved query contract; it is not independent agent verification or evidence about production. The contract requires active types, non-null file name and binary eligibility, calendar-day expiration, descending publication date, and a projection without binary content.

The implementation must follow the existing three-component flow: UI → API Controller → SI.SG → MAPI Controller → BW → DA → SQL Server. API and MAPI have separate `Abstracciones` projects. The API's version is supplied through the `api-version` query parameter. The API uses `[Authorize]` on business controllers; API-to-MAPI requests use the configured `IRequestsHandler` and certificate behavior. MAPI registration is explicit in its versioning configuration.

## Goals / Non-Goals

**Goals:**

- Restore a read-only consultation with behavior matching the capability spec.
- Keep filtering, eligibility, and ordering in the MAPI/SQL path.
- Prevent binary data from entering the MAPI result model, API DTO, or UI response.
- Preserve current VES authorization, versioning, HTTP client, error, logging, and test conventions.

**Non-Goals:**

- Restore document creation, editing, deletion, upload, or download.
- Change the document tables or introduce EF migrations.
- Add a new authentication provider, role system, UI framework, or HTTP dependency.
- Treat the reference SQL script as verified live database state.

## Decisions

### 1. Restore the query as separate operations and preserve the layer boundaries

Implement one API operation to retrieve active types and one to retrieve documents for a type code or `-1` (all), using the routes originally proposed in `historia.md` and now implemented:

- `GET /Documentos/Tipos?api-version=1.0`
- `GET /Documentos?codigoTipo={codigoTipo}&api-version=1.0`

The routes are covered by controller and gateway unit tests; authorized runtime integration remains pending. The API controller delegates through its service-gateway contract and `SI.SG`; it must not access MAPI or SQL directly. MAPI owns the matching contracts and passes the query through Controller → BW → DA.

**Alternative considered:** make the UI call MAPI directly. Rejected because it violates the established UI → API boundary and bypasses API authorization and service orchestration.

### 2. Reuse the DBA-owned procedures; request only the required query changes

Use `[VES].[ListarTiposDocumentos]` for the active type list and `[VES].[ListarDocumentos]` for filtered results, after the DBA verifies their presence, signatures, permissions, and result columns in the target environment. The document-list procedure must:

- Keep the join to `STI_TiposDocumento`, so **Todos** includes documents whose type is active or inactive but naturally excludes documents without a type.
- Apply the requested type when the parameter is not `-1`.
- Require both `NombreArchivo IS NOT NULL` and `Documento IS NOT NULL`.
- _Superseded 2026-10-22 (requester decision): expiration no longer filters the list; expired documents are shown._ Previously: keep `FechaCaduca IS NULL` eligible; for non-null dates compare against the current calendar day, not the current time. A SQL predicate equivalent to `FechaCaduca >= CONVERT(date, GETDATE())` preserves the full expiration day.
- Sort by `FechaPublicacion DESC` and return only code, file name, type name, title, and the `yyyy-MM-dd` publication date.

No database schema or stored procedure is edited by the application implementation. Any procedure change is requested and delivered through the DBA process; update repository SQL documentation only to reflect the approved expected contract, and label it unverified until tested against the target database.

**Alternative considered:** load documents and filter them in the API or UI. Rejected because it transfers unnecessary records and moves SQL eligibility/ordering logic away from the data owner.

### 3. Use response-only result models with no binary property

Create separate, minimal result contracts in each service's own abstraction assembly. MAPI DA maps the procedure result into a keyless EF result model that has no `Documento` property; register it in the MAPI context and repository setup using the established stored-procedure result pattern. Use parameterized SQL (`FromSqlInterpolated` per the MAPI agent guidance), not string-built SQL. The API response DTO likewise contains only the five list fields. Keep the date representation compatible with the specified `yyyy-MM-dd` contract.

**Alternative considered:** reuse the full document metadata model and hide its binary only in JSON. Rejected because the binary could still be read, mapped, logged, or accidentally serialized.

### 4. Keep the UI in the existing Documentation menu workflow

Add the view under the UI's existing `src/Documentacion/Documentos` area and connect it to `Dashboard.jsx` following its option-to-component pattern. The menu options come from the API; confirm the actual Documentation option code and permission mapping before wiring the component. On entry, load active types and query **Todos** as the initial selection; selecting a type re-queries the API. Use the established HTTP client for new requests, show loading separately for pending requests, and translate failures with the existing error-message helper and alert conventions.

**Alternative considered:** add a standalone top-level route or duplicate the user menu. Rejected because the Dashboard already provides permission-aware option navigation.

### 5. Apply authorization at the public API boundary and preserve service authentication

Protect both API operations with the existing `[Authorize]` behavior. The API gateway calls only the configured MAPI endpoints using the environment's established certificate settings. Keep the MAPI routes internal to this service path and confirm the effective MAPI authentication/certificate policy and deployment configuration during implementation; do not introduce a new anonymous business route or move a Development-only certificate bypass.

**Alternative considered:** add a new role or profile requirement. Rejected because the user story calls for existing VES authorization and does not define a new role mapping.

### 6. Keep failures explicit but user-safe

Return the existing framework's client error for invalid filter values and allow a valid code with no matching records to return an empty collection. Let unexpected failures follow the current API/MAPI exception and logging mechanism; the UI displays a clear Spanish message and does not expose exception text, SQL, binary content, or infrastructure details.

**Alternative considered:** catch all failures and return an empty list. Rejected because it makes outages indistinguishable from a legitimate empty result.

### 7. Verify each layer with isolated tests before an authorized end-to-end check

Add focused unit tests in the existing Vitest/MSTest suites for type filtering, `-1`, inactive types in **Todos**, null type exclusion, filename and binary eligibility, calendar-date expiration boundaries, order, result projection, authorization, loading/empty/error UI states, and HTTP gateway behavior. Unit tests must use substitutes/mocks and must not require SQL Server. Then test the configured endpoints and API-to-MAPI contract in an authorized non-production environment without recording credentials or certificates.

**Alternative considered:** make SQL Server access a prerequisite for unit tests. Rejected because VES unit suites are required to be isolated; database behavior is checked through the DBA-approved integration/manual verification path.

## Risks / Trade-offs

- **Reference procedures or table definitions differ from a deployed database** → Have DBA verify objects, signatures, permissions, projection, and target catalog before implementation release; do not infer deployment from Markdown.
- **Legacy `image` content is materialized or serialized accidentally** → Keep the SQL projection and both response models free of the binary; add serialization/projection tests.
- **Expiration boundary differs from current reference `GETDATE()` behavior** → Obtain DBA approval for calendar-day comparison and test a document expiring today at midnight plus one expiring yesterday.
- **API, MAPI, and UI deploy independently** → Preserve compatible request/response contracts and deploy MAPI, then API, then UI; roll back in reverse order if needed.
- **Documentation menu option is not present or not authorized for the intended users** → Confirm the menu entry and permissions supplied by the current API before exposing the UI component.
- **Private feeds, certificates, database connectivity, or browser-test tooling are unavailable** → Record blockers and evidence in the required verification report; do not mark affected test tasks complete or claim live database verification.

## Migration Plan

1. Coordinate DBA verification and approval of the required stored-procedure behavior; no EF migration is created.
2. Implement and validate MAPI contracts, DA/BW/controller behavior, DI, and tests.
3. Implement and validate the authenticated API endpoints, gateway configuration, and tests against the MAPI contract.
4. Implement and validate the UI view, menu integration, HTTP calls, states, and tests.
5. Deploy in dependency order **MAPI → API → UI** in a non-production environment, run authorized endpoint and browser checks, and then follow normal release approvals.
6. If rollback is required, remove/revert UI exposure first, then API, then MAPI. Coordinate any database-procedure rollback with DBA; the application change itself does not alter the schema.
