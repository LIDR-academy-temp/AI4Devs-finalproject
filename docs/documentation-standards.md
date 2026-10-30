---
description: Documentation standards for the three BCCR VES applications, with verified documentation locations, explicit discrepancies and retained good practices.
globs: ["VES/docs/**/*.{md,yml}", "VES/Bccr.Supen.Ves.Api/**/*.md", "VES/Bccr.Supen.Ves.Mapi/**/*.md", "VES/Bccr.Supen.Ves.UI/**/*.md"]
alwaysApply: true
---

# VES Documentation Standards

## How this standard was adapted

> The previous standard contains useful discipline for maintaining technical documentation and AI
> specifications, but it assumes the LTI project, English-only writing and
> fixed destinations such as `data-model.md` and `api-spec.yml`. VES retains
> the maintenance, traceability and feedback principles while routing updates
> to the actual owning documents of UI, API and MAPI.

### Transformation matrix: previous standard → VES

| Previous rule | Useful intent | VES application |
|---|---|---|
| English-only documentation | Consistency | Preserve the language of the owning document/module; Spanish is valid and prevalent |
| Review docs before commit/push | Prevent stale docs | Retained; inspect the relevant change and affected documentation |
| Data change → `data-model.md` | Keep data documentation aligned | For API/MAPI DTO contracts use `docs/data-model.md`; for SQL tables, procedures and database evidence use MAPI `Documentacion/SCHEMA.md` and DBA ownership |
| API change → `api-spec.yml` | Keep API contracts aligned | Keep VES `docs/api-spec.yml` aligned as a representative OpenAPI reference, in addition to actual controllers, API/MAPI contracts, gateway and consumers; verify runtime facts before claiming coverage |
| Setup/dependency changes → standards | Keep developer instructions current | Update the actual README/Development/Deploy/standards owner |
| Report updated files | Traceability | Retained and expanded with verification and uncertainty reporting |
| Learn from user feedback | Improve agent/team rules | Retained with scope control; one interaction does not automatically create permanent policy |
| Explicit approval for every rule edit | Avoid unilateral policy changes | A direct request to update a standard authorizes that scope; unrelated policy changes remain proposals |

### Documentation source-of-truth hierarchy

When sources disagree, use the strongest applicable evidence in this order:

1. Current implementation/configuration directly relevant to the claim.
2. Project-specific technical documentation owned by the affected component.
3. Shared VES standards.
4. Historical or inherited documentation.
5. Proposed target-state documents or agent instructions.

This hierarchy does **not** mean source code proves production state. Deployment
configuration, runtime behavior, database contents and environment-specific
settings may require separate verification.

## Consolidation note (2026-10-28)

The review below retains its original 2026-10-05 provenance. In a later editorial
consolidation, `docs/data-model.md`, `docs/api-spec.yml` and `docs/development_guide.md`
were included with explicit VES scopes. This change does **not** verify runtime
behavior, deployment configuration, OpenAPI completeness or the live SQL schema.

## Scope and review result

Reviewed on **2026-10-05** against `VES/docs`, the three BCCR applications' documentation, and the source/configuration supporting the architectural findings. Paths below are relative to `VES/` unless stated otherwise; frontmatter globs use the containing workspace root.

**The previous document partially fits VES.** Its maintenance, traceability and scope-control principles are useful and are explicitly retained below. Its English-only rule and automatic routing of all data/API changes to the inherited LTI documents do not reflect the current folders. This revision distinguishes the implemented architecture, documented policies and recommended practices; it is not a runtime, deployment or database audit.

Technical documentation explains how the software is structured, configured, used and operated. Agent instructions describe how an assistant should work. Both need maintenance, but an agent workflow or a proposed specification is not evidence that a runtime feature exists.

## Differences and current reality

| Previous rule or assumption | Finding and applicable correction |
|---|---|
| Always write all documentation and code comments in English | BCCR README files, `AGENT.md`, guides and domain code use Spanish extensively. Preserve the affected document's language and the module's conventions; Spanish documentation is valid. This shared standards file remains in English for continuity. |
| Update `docs/data-model.md` for every data change | `docs/data-model.md` now documents VES API/MAPI DTOs and transfer contracts, not a physical SQL schema. Update it when those contracts change; for DA, SQL objects and stored procedures use MAPI `Documentacion/SCHEMA.md` and DBA evidence. Do not treat historical Web Forms conceptual models as current SQL structure. |
| Update `docs/api-spec.yml` for every endpoint change | The supplied `docs/api-spec.yml` now describes representative endpoints of VES API. This is a documented contract proposal/reference, not independent proof that the routes and security behavior match the current implementation. Verify affected API controllers, DTOs, gateway configuration, MAPI counterparts and UI consumers before updating its definitions or verification status. |
| One general set of setup and architecture documents | There are two independent .NET solutions and one UI package, each with its own README, agent guide and `Documentacion/` directory. Shared standards live in `VES/docs`. |
| Documentation statements can be repeated as current facts | Local BCCR guides also contain stale claims. Record the source/date and verify claims against project files and code; repository evidence alone does not establish production settings or database state. |
| Every interaction should trigger rule refinement | Feedback is useful input, but a one-off task does not necessarily establish a permanent team policy. Analyze relevant feedback and limit changes to supported, authorized scope. |
| Every rule edit requires a new explicit approval | Respect existing authorization. A direct request to review and update a standards file authorizes that work; unrelated policy changes should remain proposals for review. |

## Evidence classification

> The requirement to verify that documentation accurately reflects changes is made explicit by
> classifying the type of evidence behind technical statements.

| Classification | Meaning | Example |
|---|---|---|
| **Observed in source** | Confirmed in current code or configuration | `Startup.cs` reads a named configuration key |
| **Documented policy** | Required by an approved standard/guide | DBA owns SQL schema changes |
| **Verified execution result** | A command/test/runtime check actually ran | `dotnet test` completed successfully |
| **Environment observation** | Confirmed in a named environment at a point in time | API responded in QA on a recorded date |
| **Proposed change** | Intended future behavior, not implemented evidence | “Move remaining calls to the shared HTTP client” |
| **Target architecture** | Desired design, not proof of current state | Proposed common abstraction |
| **Unresolved discrepancy** | Sources conflict or evidence is insufficient | README and schema guide use different database names |

### Match wording to evidence

**Avoid**

```text
Production requires certificate authentication.
```

when only startup code was inspected.

**Prefer**

```text
The current startup code supports certificate enforcement through the
configured certificate option. The effective production value was not verified
in this review.
```

**Avoid**

```text
SQL Server contains object X.
```

when only an EF model or Markdown inventory was reviewed.

**Prefer**

```text
The application model/documentation expects object X. Live SQL Server state was
not verified.
```

### Dates and provenance

Add a review date or provenance when a statement can become stale:

```text
Reviewed against repository source on 2026-10-06.
```

For DBA-provided inventories, exports, screenshots or externally supplied
facts, record the source/date when available.

## Architecture that documentation must represent

The typical persistence flow is **UI → API controllers → SI.SG gateways → MAPI controllers → BW → DA → SQL Server**. This does not imply that every operation traverses every layer.

- `Bccr.Supen.Ves.UI/Codigo` is a React 19 / JavaScript/JSX application built with Vite and tested with Vitest. It contains SEC/STI screens and consumes API contracts; it does not own SQL persistence.
- `Bccr.Supen.Ves.Api/Codigo` is a .NET 8 solution with HTTP controllers, service gateways and its own abstractions/DTOs. Gateways call downstream services through configured endpoints.
- `Bccr.Supen.Ves.Mapi/Codigo` is a separate .NET 8 solution with controllers, business logic, data access, SQL Server/EF Core and its own abstractions/DTOs. Its schema-management guides describe a DBA-owned process without EF migrations.
- The two `Bccr.Supen.Ves.Abstracciones` trees are separate. Document contract changes on both sides when affected; do not describe them as one automatically synchronized shared source.

Use [base standards](./base-standards.md), [backend standards](./backend-standards.md) and [frontend standards](./frontend-standards.md) for the detailed verified baseline and source references. Link to these descriptions instead of copying version lists and configuration explanations into every guide.

## Documentation map and update destinations

| Area | Existing documents and implementation evidence | What to update when affected |
|---|---|---|
| Shared VES conventions | `docs/base-standards.md`, `backend-standards.md`, `frontend-standards.md`, this file | Cross-application boundaries, conventions and the status of inherited documents. |
| API setup and endpoint development | [API README](../VES/Bccr.Supen.Ves.Api/README.md), [endpoint guide](../VES/Bccr.Supen.Ves.Api/Documentacion/ComoCrearUnNuevoEndpoint.md); controllers, SG and API abstractions | Actual routes/verbs/versioning, request/response DTOs, gateway configuration, tests and setup prerequisites. |
| API HTTP reference contract | [VES OpenAPI](./api-spec.yml); actual API controllers/DTOs, `SI.SG`, MAPI counterpart | Update affected operations, shapes, security descriptions and verification flags only with traceable evidence. OpenAPI is representative, not exhaustive. |
| API delivery | [API Deploy.md](../VES/Bccr.Supen.Ves.Api/Documentacion/Deploy.md); startup/program configuration and pipeline files | Configuration keys, certificate behavior, provider order and deployment prerequisites, with environment assumptions made explicit. |
| MAPI business and endpoints | [MAPI README](../VES/Bccr.Supen.Ves.Mapi/README.md), [MAPI implementation guide](../VES/Bccr.Supen.Ves.Mapi/Documentacion/ComoImplementarUnMAPI.md); MAPI/BW/DA and abstractions | Business behavior, DA mappings, stored procedure expectations and relevant tests. |
| API/MAPI data contracts (DTOs) | [VES data-model.md](./data-model.md); API and MAPI `Abstracciones` classes | Fields, types, nullability and consumers; verify serialization in both services and the UI. The separate abstraction projects are not a single shared assembly. |
| Database structure | [MAPI SCHEMA.md](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md); DA models/contexts/commands | Affected procedure parameters, result mappings, connection keys and schema expectations. Separate application expectations from a verified database inventory. |
| MAPI operational checks and releases | [environment verification guide](../VES/Bccr.Supen.Ves.Mapi/Documentacion/VerificacionEntorno.md), [release notes](../VES/Bccr.Supen.Ves.Mapi/Documentacion/release_notes.md) | Relevant health-check behavior, prerequisites, release changes and actual verification results. |
| UI development and usability | [UI README](../VES/Bccr.Supen.Ves.UI/README.md), [development guide](../VES/Bccr.Supen.Ves.UI/Documentacion/DEVELOPMENT.md), [usability notes](../VES/Bccr.Supen.Ves.UI/Documentacion/USABILIDAD.md) | SEC/STI workflows, navigation, components, localization, accessibility and test/setup instructions. |
| UI delivery | [UI Deploy.md](../VES/Bccr.Supen.Ves.UI/Documentacion/Deploy.md); `Codigo/config`, scripts and Vite configuration | Build-time environment selection, base paths, GAUDI landing artifact and publication steps. |
| Agent workflows | Each BCCR folder's `AGENT.md`; [OpenSpec mandatory steps](./openspec-tasks-mandatory-steps.md) and applicable workspace configuration | Only relevant, authorized workflow/convention changes; distinguish them from application functionality. |

The map identifies existing destinations, not a guarantee that each guide is fully current. Do not update every document for every change: select the files whose claims or instructions are affected.

### Change-to-document decision matrix

> **Adapted from `documentation-standards_1.md`:** The original fixed routing
> “data model → `data-model.md` / API → `api-spec.yml`” is replaced with the
> actual documentation ownership of VES.

| Change type | Review/update candidates | Notes |
|---|---|---|
| New/changed UI workflow | UI README, `Documentacion/DEVELOPMENT.md`, usability docs, affected SPEC | Update only when behavior/setup/navigation claims change |
| UI configuration/build change | UI Deploy/Development docs | State build-time vs runtime behavior and script side effects |
| New API endpoint | API endpoint guide/README/SPEC, `docs/api-spec.yml` and affected contract docs | Include route, verb, version, request/response shape; update OpenAPI only after verifying the implemented contract |
| API↔MAPI contract change | `docs/data-model.md`, API and MAPI docs plus affected abstractions/DTO descriptions | Verify both separate Abstracciones projects and relevant UI consumers, not only the controller |
| MAPI business rule | MAPI README/implementation guide/SPEC where applicable | Identify BW ownership |
| DA/stored procedure change | MAPI `SCHEMA.md`, implementation guide, DBA change reference; `docs/data-model.md` only if a public DTO changes | Distinguish application expectation from live schema; never infer physical columns/FKs from a DTO |
| Connection/configuration key | Owning Deploy/README/config docs | Never include real secret values |
| Authentication/mTLS | API/MAPI Deploy/security docs and relevant standards | State environment assumptions explicitly |
| Runtime/dependency version | Owning README/Development/Deploy/standards | Verify the manifest/project file |
| Test framework/process | README/Development/standards/AGENT when workflow changes | Document commands and test locations |
| Build/deploy script | Deploy/Development docs | Include working directory and side effects |
| OpenSpec workflow | OpenSpec instructions/AGENT/shared standards | Keep agent workflow separate from runtime behavior |
| Cross-cutting convention | Shared standards plus affected component guides | Avoid copying the full rule into every document |

### Do not update everything

A documentation impact review is **not** permission to edit every nearby
Markdown file. Update only documents whose statements, instructions or examples
become false, incomplete or misleading because of the change.

### Scope of the integrated VES reference files

- [`data-model.md`](./data-model.md): documented API/MAPI DTOs and transfer contracts; not a physical schema.
- [`api-spec.yml`](./api-spec.yml): representative OpenAPI 3.0.3 description of VES orchestration API; **not exhaustive nor independently verified**.
- [`development_guide.md`](./development_guide.md): cross-component development setup and validation procedure, not a substitute for per-component setup documentation.
- [MAPI `SCHEMA.md`](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md): documented SQL expectations, schema and stored procedures; DBA evidence and live-state verification remain separate.
- Historical Web Forms files remain in [`historical/`](./historical/); their proposals are not instructions to implement the current architecture.

For cross-component navigation consult the [VES documentation index](./INDICE_DOCUMENTAL.md).

### Concrete examples of local documentation drift

- [API Deploy.md](../VES/Bccr.Supen.Ves.Api/Documentacion/Deploy.md) describes certificate bypass as Development-only and certificate enforcement as automatic in Staging/Production. Current [API Startup.cs](../VES/Bccr.Supen.Ves.Api/Codigo/API/Startup.cs) selects behavior using `CertificadoCliente:Requerido`; [MAPI Startup.cs](../VES/Bccr.Supen.Ves.Mapi/Codigo/MAPI/Startup.cs) uses `RequiereCertificado`. A guide must not infer the effective setting solely from the environment name. The deployment note about removing a security tag also lacks enough context to serve as a universal instruction; verify the affected configuration and intent before repeating it.
- MAPI `SCHEMA.md` names the main catalog `BSSupen`/`BSSupen_Des`, while the MAPI README uses `BDSUPEN_Des`; `BDSupen` is the connection key registered in startup. Distinguish the key from an environment's actual catalog. This review did not connect to SQL Server and cannot resolve the deployed catalog name or certify the guide's claimed database inventory.
- UI `DEVELOPMENT.md` lists `App.js` in its structure, while current source has `App.jsx`. Use actual file paths when updating examples and links.
- Some agent guides contain older test/framework descriptions; backend standards records the project-file evidence. Do not treat an agent guide's technology summary as stronger evidence than the target project's declared dependencies.

These findings are recorded here; the local guides themselves are not rewritten by this standards review.

## Writing and formatting conventions

> **Adapted from `documentation-standards_1.md`:** “Maintain consistency” and
> “properly formatted documentation” are expanded into concrete Markdown and
> evidence-writing rules for VES.

### Language

- Preserve the language of the document being edited.
- Spanish is valid and common in VES documentation.
- Keep real code identifiers, routes, configuration keys, SQL objects and CLI
  commands exactly as implemented.
- Do not translate identifiers inside prose merely for stylistic consistency.
- Retain framework/library terminology where natural.

### Headings

Use a logical hierarchy:

```markdown
# Document title
## Major section
### Subsection
#### Detailed subsection
```

Do not skip levels only for visual appearance.

### Paragraphs and lists

- Keep paragraphs focused on one idea.
- Use numbered lists for ordered procedures.
- Use bullets for independent rules or prerequisites.
- Avoid deep nesting when a subsection or table is clearer.
- Keep terminology stable throughout the document.

### Tables

Use tables for genuinely structured comparisons.

```markdown
| Component | Runtime | Tests |
|---|---|---|
| UI | React/Vite | Vitest |
| API | .NET 8 | MSTest/xUnit |
```

Avoid tables whose cells contain long narrative paragraphs.

### Code fences

Specify the language when known:

````markdown
```powershell
dotnet test Bccr.Supen.Ves.Api.sln
```

```csharp
public sealed class FondoBW
{
}
```

```jsx
export default function Pantalla() {
    return <main />;
}
```
````

Use `text` for language-neutral output or diagrams.

### Commands

State the working directory when it matters.

**Prefer**

```markdown
From `Bccr.Supen.Ves.Api/Codigo/`:

```powershell
dotnet test Bccr.Supen.Ves.Api.sln
```
```

Document important side effects. For example, if a build increments
`package.json`, say so and do not present it as a harmless local validation.

### Paths and file names

- Prefer repository-relative paths.
- Wrap paths in backticks.
- Verify referenced paths actually exist.
- Label illustrative/environment-specific paths.
- Update inbound links when files are renamed or moved.

### Relative links

Prefer relative repository links for project-owned documentation:

```markdown
[Backend standards](./backend-standards.md)
```

Link to the owning guide instead of duplicating authoritative instructions.

### Versions

Distinguish:

- declared/configured version;
- dependency range;
- locked/resolved version;
- locally installed version;
- deployed/production version.

**Prefer**

```text
Node version configured by `.nvmrc`: 24.18.0.
```

Do not say “installed version” unless the environment was actually inspected.

### API examples

An API example must identify whether it is:

- an implemented route;
- an illustrative request;
- an observed response;
- an expected contract.

Where relevant include method, route, version, parameter binding, request and
response shapes, authorization and important status/error behavior.

Do not present a fabricated payload as an observed response.

### Database documentation

Distinguish explicitly between:

- connection key;
- catalog/database name;
- schema;
- table/view;
- stored procedure;
- parameters;
- result mapping;
- EF model;
- verified live object.

These terms are not interchangeable.

### Architecture diagrams

Diagrams must reflect ownership and direction. A typical VES path can be:

```text
UI → API Controller → SI.SG → MAPI Controller → BW → DA → SQL Server
```

State when a diagram is illustrative; not every operation necessarily traverses
all nodes. Do not depict the two `.NET` `Abstracciones` trees as one shared
runtime/deployment layer.

### Real versus illustrative examples

Label conceptual samples:

```text
Illustrative example:
```

or:

```text
Example pattern — adapt names/types to the actual module:
```

An example must not create the impression that a class, endpoint, property or
stored procedure exists if it was not verified.

### Secrets and sensitive information

Never place real values for:

- passwords;
- tokens;
- private keys;
- certificates;
- credential-bearing connection strings;
- personal credentials;
- sensitive claims.

Use placeholders:

```text
<authorized-development-connection-string>
<token>
<certificate-path>
```

Do not propagate credential-like values from inherited/historical documents.

### Screenshots

When screenshots are necessary:

- avoid secrets, tokens, personal data and unnecessary internal information;
- state environment/version context if important;
- do not use a screenshot as the only source when text can document behavior
  more precisely.

### Code comments

Documentation standards also apply to code comments:

- explain **why**, constraints or non-obvious behavior;
- do not narrate obvious statements;
- preserve the file's language/conventions;
- remove stale commented-out code rather than preserving large blocks.

**Avoid**

```csharp
// Increment counter
contador++;
```

**Prefer**

```csharp
// The legacy MAPI contract expects this sequence to start at 1.
contador++;
```

### Terminology

Define uncommon abbreviations on first use when the audience may not know them.
Common VES team terms (`UI`, `API`, `MAPI`, `BW`, `DA`, `DTO`) can be used
directly in internal technical documentation.

## Retained good practices from the original document

The following practices are **retained because they remain useful and important**, with their application made specific to VES:

1. **Retained — review documentation impact before a commit/push or when documenting a change.** Inspect the relevant diff and behavior changes. This is a documentation check, not authorization to commit or push.
2. **Retained — update affected technical documentation.** Use the map above, including cross-application consumers where contracts change. Updating one backend endpoint may affect API, MAPI and UI guidance.
3. **Retained — maintain consistent structure and readable formatting.** Keep headings, tables, code fences and relative links coherent. Preserve each document's established language; quote real identifiers exactly.
4. **Retained — verify statements against implementation.** Check paths, manifests, configuration and behavior evidence; correct contradictions instead of propagating them.
5. **Retained — report what changed.** Name the edited files, summarize findings and distinguish documentation checks from executed application tests.
6. **Retained — learn from relevant user feedback.** Tie any proposed lasting rule change to the feedback and a concrete recurring need rather than inferring a universal policy from every interaction.
7. **Retained — make rule changes precise and traceable.** Identify the affected section, the reason and the intended effect; preserve useful guidance instead of replacing it indiscriminately.
8. **Retained — avoid scope creep and unrelated rule edits.** Make the requested correction and necessary consistency updates; do not use a documentation review to refactor code, change deployment settings or redesign workflows.
9. **Retained, clarified — obtain review for unrequested policy changes and confirm completed edits.** Existing explicit authorization covers the requested standards update. Do not require repeated approval for that same scope; present broader policy changes as proposals before adopting them.

## Documentation update procedure

1. **Establish scope.** Identify the affected application(s), files, audience and behavior. For a static review, record the review date and avoid claiming runtime validation.
2. **Read the relevant documentation and source.** Compare shared standards with the local README/guides and the affected implementation. Review the relevant change history/diff when available rather than unrelated files across the whole workspace.
3. **Classify each statement.** Mark it as observed in source, documented policy, proposed improvement, verified execution result or unresolved discrepancy. Do not silently turn a target architecture into an implemented feature.
4. **Document differences explicitly.** Explain the previous claim and the new evidence, with a concrete path/link. Preserve still-useful principles and label them as retained; remove or clearly supersede inapplicable operational examples.
5. **Write the current reality.** Include the layer responsible for behavior, affected contracts/configuration and appropriate commands. Preserve Spanish routes, properties, stored procedure names and other real identifiers.
6. **Keep references coherent.** Update inbound summaries when a formerly stale document has been corrected. Link to the owning document instead of multiplying copies of the same instructions.
7. **Verify proportionately.** Check relative links, paths, code fences and command working directories. For documentation-only changes, application tests are not automatically required; report this limitation. Run applicable runtime checks when the task calls for validating executable instructions or changed behavior.
8. **Report completion and remaining uncertainty.** State exactly what was edited, what was checked and what remains unresolved. Do not mark an OpenSpec test task complete unless its required checks actually ran.

### Documentation review depth

Not every change requires the same documentation effort.

#### Level 1 — Local wording/example update

Use for typo/wording corrections, a renamed local identifier in an example or
clarification without behavior change.

Verify:

- affected paragraph;
- links/code fence;
- consistency with nearby text.

#### Level 2 — Component behavior/process update

Use for endpoints, UI workflows, configuration, build/test procedures or
component-specific setup changes.

Verify:

- owning README/guide;
- implementation/configuration;
- relevant cross-references;
- commands/examples;
- consumer impact.

#### Level 3 — Cross-component or architectural update

Use for UI↔API↔MAPI contracts, security/authentication, deployment architecture,
database ownership/process or shared standards.

Verify:

- all affected component documentation;
- shared standards;
- contracts on both sides;
- implementation/config evidence;
- unresolved environment assumptions;
- OpenSpec artifacts when applicable.

### Suggested change report

For a substantive documentation revision, report the distinction between what
was edited, verified and not verified:

```text
Updated:
- docs/example.md
- Component/Documentacion/guide.md

Reason:
- Contract/configuration changed.

Verified:
- Source paths reviewed.
- Relative links checked.
- Command X executed successfully.

Not verified:
- Production environment values.
- Live SQL schema.

Remaining discrepancy:
- README A and guide B use different catalog names.
```

The exact template is optional; the evidence distinction is not.

## Evidence and example-writing rules

- **Architecture:** reference the affected UI, API/SG or MAPI/BW/DA layer. Avoid a diagram that implies all endpoints take the same route or that the UI accesses the database.
- **API contracts:** document actual HTTP verbs, routes, version selection, parameter binding, DTOs, status/result shapes and authorization behavior. A code example is not an executed HTTP response. Verify both sides of a changed API-to-MAPI contract and the UI caller.
- **Database claims:** distinguish connection keys, configured catalog names, procedure signatures, result models and live schema observations. Label DBA-provided or previously extracted inventories with their provenance/date where available.
- **Versions:** distinguish dependency ranges, locked/resolved versions and the tool actually used for a check. Do not infer installed versions from a README.
- **Commands:** state the working directory, prerequisites and side effects. Use `dotnet` commands for the backend solutions and declared npm scripts for UI. Document that UI `build:pruebas`/`build:produccion` increment the version; a build is not itself a deployment.
- **Configuration:** state whether values are resolved at build time or runtime. UI `__APP_CONFIG__` is bundled by Vite; backend providers have their own order. Do not publish secrets, full credential-bearing connection strings, private keys or tokens in examples/results.
- **Verification:** record actual commands/results and unavailable dependencies. Never claim tests, coverage, production security or successful deployment based only on source inspection or an example in a guide.
- **Language:** preserve Spanish BCCR conventions and the document's language unless the user requests otherwise. Do not translate identifiers for stylistic consistency or claim English-only comments are an implemented project convention.

## Documentation anti-patterns

> **Adapted from `documentation-standards_1.md`:** The original AI-rule
> anti-patterns are retained and extended to cover technical-document drift.

### Unsupported certainty

**Avoid**

```text
Production uses database BDSUPEN.
```

when the statement came only from a development README or configuration sample.

### Copying stale documentation

Do not copy a setup snippet from another guide without validating paths,
versions, scripts and environment assumptions.

### Duplicating authoritative instructions

Avoid copying full deploy/setup procedures into multiple standards. Link to the
owning guide and summarize only the context needed locally.

### Documenting aspiration as implementation

**Avoid**

```text
All UI API calls use the shared HTTP client.
```

when migration is still partial.

**Prefer**

```text
New calls and modified migrated areas should use the shared HTTP client; legacy
Axios calls still exist.
```

### Invented verification

Never write:

```text
All tests pass.
```

unless the relevant tests actually ran and passed.

For documentation-only work, write the real limitation:

```text
Application tests were not executed as part of this documentation-only review.
```

### Global policy from one-off feedback

A single correction may improve the current document without automatically
becoming a permanent workspace-wide rule. Before changing a shared standard,
check that the feedback represents a recurring/project-level need and does not
conflict with component-specific conventions.

### Scope creep

A documentation review must not silently:

- refactor application code;
- change runtime configuration;
- update dependencies;
- relax security;
- redesign architecture;
- modify unrelated standards.

### Broken references after rename

When a document/section is renamed or moved:

- search inbound references;
- update relative links;
- verify agent/skill references when applicable;
- verify symlink targets when the workspace uses them.

## Agent instructions and scope control

Keep agent guidance separate from product behavior. Applicable OpenSpec instructions concern the requested workflow; they do not prove that Cypress, Playwright or a particular model/tool is installed, nor do they require unrelated application changes during a documentation review.

When feedback suggests a rule improvement, connect it to the request and identify the exact section affected. Carry out already-authorized updates; seek clarification only for missing scope or a material new policy decision. Avoid unrelated rule changes, unsupported permanent policies, vague proposals and completion claims without evidence. Close the work by reporting the concrete edits and checks.

## AI specs and agent-rule maintenance

> **Adapted from `documentation-standards_1.md`:** Agent specifications are
> maintainable documentation and should learn from useful feedback, but updates
> must remain evidence-based, scoped and traceable.

### What belongs in an AI spec

Agent documentation may define:

- repository architecture boundaries;
- coding/documentation conventions;
- execution workflows;
- required checks;
- tool/model-selection rules;
- OpenSpec workflows;
- prohibited actions;
- escalation conditions.

It must not claim that a product/runtime capability exists merely because an
agent is instructed to use it.

For example, “use Vitest for UI tests” is a valid rule only because Vitest is
part of the current UI project; an instruction mentioning Cypress would not
prove Cypress is installed.

### Feedback-to-rule process

```text
1. Identify the feedback
       ↓
2. Identify the affected rule/section
       ↓
3. Determine whether it is recurring/project-wide
       ↓
4. Verify against repository reality
       ↓
5. Apply within authorized scope
       ↓
6. Report the exact modification
```

### Existing authorization is enough for the requested scope

A direct request such as:

```text
Review and update documentation-standards.md using document X as reference.
```

authorizes the edits required to complete that transformation. Do not require a
new approval for every subsection inside the same scope.

Seek review/clarification when a proposed change:

- affects another standard outside the requested scope;
- creates a new cross-project policy not implied by the task;
- changes security/deployment/architecture policy;
- conflicts materially with documented component behavior.

### Precise rule changes

**Weak**

```text
Improve documentation quality.
```

**Better**

```text
Commands must state their working directory and document side effects when
those side effects modify repository files or versions.
```

### Traceability markers for adapted standards

For substantial rule transformations, reviewers may use markers such as:

```markdown
> **Adapted from `documentation-standards_1.md`:**
```

```markdown
> **Deliberate VES difference from `documentation-standards_1.md`:**
```

```markdown
> **VES-specific recommendation:**
```

These markers are optional in ordinary product documentation and useful in
standards reviews where provenance matters.

## Recommendations from `documentation-standards_1.md` not carried over literally

> **Comparison with `documentation-standards_1.md`:** The following rules are
> intentionally transformed rather than copied.

- **English only:** replaced by language consistency with the owning VES
  document/module.
- **Always update `data-model.md` for data changes:** route VES DTO/transfer-contract changes to the current `docs/data-model.md`, and SQL/DA/DBA changes to MAPI `SCHEMA.md`; update both only when the change affects both.
- **Always update `api-spec.yml` for API changes:** the inherited YAML describes
  LTI and is not authoritative until explicitly re-scoped/replaced.
- **Review all recent changes in the whole codebase:** narrowed to the relevant
  diff, component and affected consumers to avoid unnecessary workspace-wide
  review.
- **Every feedback interaction implies rule evolution:** feedback is analyzed,
  but permanent policy requires a concrete recurring/project need.
- **Separate explicit approval for every individual rule edit:** a direct
  request to update a standard authorizes the necessary edits within that
  scope; unrelated policy changes still require review.
- **Documentation claims are enough to establish reality:** replaced by
  explicit evidence classification and runtime/environment limitations.

## Documentation quality checklist

### Scope and ownership

- [ ] The affected component/document owner is clear.
- [ ] Only documents whose claims changed were updated.
- [ ] Shared rules were not duplicated unnecessarily into local guides.
- [ ] Historical LTI documents were not used as authoritative VES contracts.

### Evidence

- [ ] Statements distinguish implementation, policy, proposal and verification.
- [ ] Runtime/environment claims include evidence or an explicit limitation.
- [ ] Database claims distinguish connection key/catalog/schema/SP/model.
- [ ] Version claims identify whether they are declared, resolved or observed.
- [ ] No unexecuted test/deploy is described as successful.

### Writing

- [ ] Heading hierarchy is coherent.
- [ ] Tables are used only for genuinely tabular information.
- [ ] Code fences specify a language where known.
- [ ] Real identifiers are quoted exactly.
- [ ] Paths and relative links were verified.
- [ ] Illustrative examples are labeled when not confirmed.
- [ ] Terminology is consistent.
- [ ] The document language is preserved.

### Commands

- [ ] Working directory is stated where needed.
- [ ] Prerequisites are stated.
- [ ] Side effects are documented.
- [ ] Commands match the actual component stack.
- [ ] No LTI/Prisma/Cypress command was copied into VES documentation without
      verified applicability.

### Security

- [ ] No passwords/tokens/private keys/certificate material were added.
- [ ] No credential-bearing connection string was included.
- [ ] Browser-visible configuration is not described as secret.
- [ ] Security bypasses are not presented as universal troubleshooting steps.

### Architecture and contracts

- [ ] UI/API/MAPI ownership is represented correctly.
- [ ] API↔MAPI changes are documented on both affected sides.
- [ ] UI is not described as owning SQL persistence.
- [ ] Separate `Abstracciones` projects are not described as one shared runtime
      library.
- [ ] DBA ownership is preserved for SQL schema/stored procedure changes.

### AI specs and rules

- [ ] Feedback is linked to the rule change.
- [ ] Permanent policy was not inferred from a one-off interaction.
- [ ] Existing authorization was respected without unnecessary re-approval.
- [ ] Broader unrequested policies remain proposals.
- [ ] Agent instructions are not confused with implemented product behavior.

### Completion

- [ ] Edited files are listed.
- [ ] Verification performed is stated.
- [ ] Unverified items/limitations are stated.
- [ ] Remaining discrepancies are recorded.
- [ ] No unrelated code/configuration was modified.

