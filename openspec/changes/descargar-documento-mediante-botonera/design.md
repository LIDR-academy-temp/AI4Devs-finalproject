# Design

## Context

See `proposal.md` for the motivation and scope. The current VES flow is
UI → API → MAPI → SQL Server. The API already exposes an authenticated
`Documentos/{codigoDocumento}/Archivo` route, and the MAPI data-access layer
obtains bytes through `[VES].[BajarArchivo]`. The detail screen consumes the
route as a blob for availability and PDF preview, while the list botonera
currently registers only `abrir`.

The implementation must preserve the existing Spanish naming conventions,
separate the API and MAPI abstraction trees, avoid direct UI access to MAPI or
SQL Server, and respect the existing security and test arrangements.

## Goals / Non-Goals

**Goals:**

- Connect Descargar to the selected document in the common botonera.
- Reuse the protected document-file contract and keep authorization on the
  server.
- Return a safe, correctly named file and preserve list context.
- Cover PF-04 and negative responses through unit, integration, and manual
  evidence where the environment permits.

**Non-Goals:**

- Creating, editing, uploading, replacing, or deleting documents.
- Changing SQL schema or stored procedures.
- Moving authorization decisions into the UI.
- Treating local fixtures or mocks as proof of institutional permissions.
- Refactoring unrelated preview or botonera behavior.

## Decisions

### 1. Reuse the existing document-file route

The UI will use the existing `apiObtenerArchivoDocumentoSTI` contract and
`CodigoDocumento`. This avoids a duplicate endpoint and keeps the UI behind the
API boundary. A new route is only justified if the approved contract proves
that a distinct download response is required.

**Alternative rejected:** direct access to MAPI, SQL Server, or a filesystem
from the UI, because it violates the VES architecture and would bypass server
authorization.

### 2. Keep authorization server-side and deny by default

The API and the effective permission service remain authoritative. The
botonera may hide or disable Descargar based on returned options, but every
request must still be authorized on the server. A permission-service failure
must not grant access.

**Alternative rejected:** treating button visibility as authorization, because a
manually constructed request could bypass it.

### 3. Separate download initiation from preview lifecycle

The list action will request the selected file and initiate a browser download
without changing list state. Existing preview blob creation and revocation
remain owned by the detail flow; shared helpers may be introduced only if they
preserve both lifecycles and are covered by tests.

**Alternative rejected:** navigating the current page directly to the file
endpoint, because it can replace the application context and makes controlled
error handling difficult.

### 4. Preserve the existing file validation boundary

The API will retain positive identifier validation, file availability checks,
allowed extension/MIME checks, the configured size limit, sanitized names, and
content protection headers. HU-04 will retain the current `inline` response
behavior for now and initiate the browser download from the UI blob, avoiding a
contract change that could affect the existing preview flow. The approved
extension/MIME set and maximum size remain a formal decision pending; the
current API values are implementation references, not final product approval.

**Alternative rejected:** accepting a client-supplied filename or MIME type,
because it could produce unsafe names or incorrect content handling.

### 5. Use synthetic fixtures for deterministic verification

Tests will use a versionable synthetic PDF and explicit missing, invalid, denied,
and source-error responses. Institutional authorization and environment
behavior will be reported separately as verified or blocked.

**Alternative rejected:** using institutional documents or credentials in
fixtures, tests, reports, or commits.

## Risks / Trade-offs

- **[Risk]** Changing `Content-Disposition` from `inline` to `attachment` can
  affect existing preview behavior. → **Mitigation:** retain `inline` for this
  change and cover blob download plus preview behavior.
- **[Risk]** Local development authentication may map to `localhost` and cannot
  prove 401/403 behavior. → **Mitigation:** mark those scenarios unverified
  unless executed in an authorized environment with effective permissions.
- **[Risk]** The permission option, module, screen, and identity may not be
  available in the test environment. → **Mitigation:** keep the dependency
  explicit and record the block rather than using a successful mock as proof.
- **[Risk]** A large blob or an error response could be mishandled by the UI.
  → **Mitigation:** test empty/error responses, revoke temporary URLs, and
  avoid changing list state during the request.
- **[Risk]** The stored procedure may return no bytes while metadata says a file
  exists. → **Mitigation:** treat empty content as unavailable and verify the
  MAPI/DA contract without altering DBA-owned schema.

## Migration Plan

1. Implement and test the UI action, API contract, and integration behavior on
   the component branches required by the VES workflow.
2. Run the mandated unit suites, manual curl checks, and applicable Playwright
   flow in a non-production environment.
3. Record PF-04 evidence and update documentation without including secrets.
4. Deploy through the existing component pipelines.
5. Roll back by reverting the feature branch changes; no database migration is
   required.

## Resolved Scope Decisions

- **Content-Disposition:** retain the current `inline` response. The UI creates
  a temporary blob URL and triggers the browser download without navigating away
  from the list.
- **Permission evidence:** PF-04 must use a real user in the test environment.
  If the user does not receive Descargar in the botonera, the visible action
  is unavailable; this does not remove the requirement for server-side
  authorization when a request is attempted directly.
- **File limits:** the current API values (PDF, DOC, DOCX, PPT, PPTX and 10 MB)
  are reference behavior only. Formal approval of extensions, MIME types, and
  maximum size remains a verification task and must not be invented.
