---
description: This document contains all development rules and guidelines for this project, applicable to all AI agents (Claude, Cursor, Codex, Gemini, etc.).
alwaysApply: true
---

## 0. Scope and actual VES architecture

These standards apply across the VES workspace, but project-specific architecture
and conventions documented in each BCCR directory take precedence where they
differ. The three `Bccr.Supen.Ves.*` directories are separate components, not
three equivalent layers of one application:

| Directory | Actual responsibility | Main technology |
|---|---|---|
| `Bccr.Supen.Ves.UI` | Browser UI for STI and SEC; calls the API over HTTP | React 19, JavaScript/JSX, Vite, Vitest |
| `Bccr.Supen.Ves.Api` | HTTP orchestration and service gateway; its `SI.SG` implementations call MAPI | .NET 8 / ASP.NET Core |
| `Bccr.Supen.Ves.Mapi` | Business and data services; its `MAPI` controllers call `BW`, which calls `DA` and SQL Server | .NET 8 / ASP.NET Core, EF Core 8 |

For data documentation, the active [API/MAPI DTO catalog](./data-model.md) is separate from the [MAPI SQL inventory](../VES/Bccr.Supen.Ves.Mapi/Documentacion/SCHEMA.md). Historical Web Forms models are non-normative and belong in `docs/historical/`.

The end-to-end flow is **UI → API → MAPI → database**. Within the API, the
relevant flow is **API Controller → SI.SG → MAPI over HTTP**; within MAPI, it is
**MAPI Controller → BW → DA → SQL Server**. `Abstracciones` contains contracts
and DTOs within the .NET projects; it does not make the UI, API, and MAPI one
shared deployment layer. Consult each component's `README.md`, `AGENT.md`, and
technical documentation before applying a project-specific rule.


### 0.1 Transformation Matrix: Generic Criteria → VES

> This matrix serves as a source of engineering discipline and agent-operating practices.
> Whenever a generic rule conflicts with VES architecture, language, tooling, or actual processes, the VES standard and component-specific documentation take precedence.

| Rule from document 1 | Useful intent | Application in VES |
|---|---|---|
| “Small tasks, one at a time” | Reduce risk and simplify reviews | Make small, coherent, incremental changes; do not proceed to unrelated work |
| Mandatory TDD | Protect behavior and prevent regressions | Prefer tests that demonstrate behavior; use test-first when it adds value and fits the task |
| All code must be typed | Reduce type-related defects | C# is statically typed; use existing validation, contracts, and tooling in JS/JSX without imposing TypeScript |
| Clear naming | Improve readability and maintenance | Retained; follow frontend- and backend-specific conventions |
| Question assumptions | Avoid incorrect inferences | Verify code, documentation, and contracts before making assumptions |
| Pattern detection | Identify duplication | Flag recurring patterns and extract abstractions only where there is a genuine shared rule |
| English only | Consistency | Not adopted literally: VES primarily uses Spanish; preserve external names where compatibility requires them |
| Skills in `ai-specs/skills` | Reuse instructions | Retained according to the documented project structure |
| Planning with a specific model | Improve reasoning quality | Do not mandate a vendor/model; use the available workflow and capabilities without changing settings to satisfy a generic rule |
| `ai-specs` as universal canonical source | Avoid duplication | Use the documented canonical location for each artifact; do not assume all artifacts must reside in `ai-specs` |
| Multi-agent symlinks | Preserve portability | Verify references/symlinks where present; do not require them where they are not portable |
| OpenSpec post-apply | Maintain specifications as the source of truth | Retained for active OpenSpec changes, with mandatory sequence defined below |

### 0.1.1 Analysis and Change-Control Rule

For every request to review, expand, correct, or improve a user story:

1. ALWAYS begin in read-only analysis mode.
2. Verify the story against OpenSpec specifications, documentation, standards, and existing source code.
3. Identify and justify every file proposed for modification.
4. Present an analysis, impact matrix, and change plan before editing. These may be recorded in `historia.md` within the OpenSpec change.
5. Obtain explicit user approval before modifying files, unless the current request expressly authorizes the change or an applicable skill defines an authorized documentation deliverable without further approval.
6. MUST NOT interpret approval of a documentation proposal as authorization to modify source code or tests.
7. Keep permissions separate for:
   7.1. Specifications and documentation. A skill may expressly authorize its own documentation artifacts, such as `historia.md` for `enrich-us`.
   7.2. Source code and tests. These ALWAYS require separate authorization.
   7.3. Reading or updating Azure DevOps. This is permitted only when expressly authorized by the current request or an applicable skill, using existing work items without creating unrequested items.
8. MUST NOT execute destructive commands or write operations during analysis. Explicitly authorized writes may occur only after analysis and within the authorized scope.
9. **Fundamental rule: analysis and proposals do not authorize implementation.**

### 0.2 Source-of-Truth Hierarchy

When sources disagree, apply the following order:

1. Explicit user requirements or the current task.
2. Active OpenSpec artifacts, when work belongs to an OpenSpec change.
3. Component-specific documentation (`README.md`, `AGENT.md`, `SPEC.md`, technical guides, and backend/frontend/documentation standards).
4. This `base-standards.md`.
5. Generic best practices or agent knowledge.

Do not use a generic recommendation to override a convention confirmed in the repository.

### 0.3 Documentation Ownership Rules for the VES Frontend

- `docs/base-standards.md`: scope, approvals, OpenSpec, and cross-cutting discipline for UI/API/MAPI.
- `docs/frontend-standards.md`: **the sole active implementation standard for React/JSX** (state, API, UX, tests, accessibility, and browser security). The [examples appendix](./frontend-examples.md) is illustrative, not a second standard.
- `VES/Bccr.Supen.Ves.UI/SPEC.md`: declared UI behavior and architecture; cross-check against source code when a decision depends on its currency.
- `VES/Bccr.Supen.Ves.UI/Documentacion/DEVELOPMENT.md` and `Deploy.md`: operational procedures, including build scripts that may alter versions/files.
- `VES/Bccr.Supen.Ves.UI/Prototipo-UI/DESIGN-SYSTEM.md`, `DESIGN-HANDOFF.md`, and `LOGIN-SPEC.md`: **design/prototype sources within their scope**, not evidence that their MUI versions, resources, or simulated behaviors match the running product. Verify against `src/estilos/temaVes.js`, components, and manifests where present.
- `USABILIDAD.md`: evidence for a documented branch and date; do not apply its claims to another branch without verification. `Pendientes-npm-audit.md` is a dated audit backlog, not a current `npm audit` result.
- `docs/historical/`: Web Forms/VB.NET references and migration analysis; MUST NOT impose those patterns on React code.
- Pending discrepancies in code, dependencies, design, security, routes, and environments are flagged **V** in `docs/VERIFICACIONES_PENDIENTES_FRONTEND.md`; do not resolve them automatically or disable controls.

**Priority when resolving conflicts:** approved requirement and applicable OpenSpec → verified implementation/contract → component-specific standard → component technical documentation within its scope → base standard → historical prototype and generic recommendations. This complements, rather than replaces, hierarchy 0.2 and approval rule 0.1.1.

## 1. Core Principles

- **Focused changes**: Keep changes incremental and limited to the requested scope.
- **Testing**: Prefer tests that demonstrate new behavior or prevent regressions; follow the test framework and patterns already used by the project.
- **Type safety**: Preserve compile-time and runtime validation supported by the project's language and tooling. Do not impose TypeScript or convert the UI's existing JavaScript/JSX just to satisfy a generic rule.
- **Clear Naming**: Use clear, descriptive names for all variables and functions.
- **Question Assumptions**: Always question assumptions and inferences.
- **Consistency**: Reuse established project patterns and call out meaningful duplication before introducing a new abstraction.

The useful practices from the original standards are retained: focused and
incremental work, testing new behavior and regressions, clear naming,
questioning assumptions, and checking for repeated patterns. They are applied
using each component's actual language, test framework, and architecture rather
than as one-size-fits-all rules.


### 1.1 Small, Focused Changes

> “Baby steps” remains a risk-reduction principle, not a requirement to stop after every micro-change.

Rules:

- Keep each change limited to the requested objective.
- Prefer modifications that can be independently reviewed and validated.
- MUST NOT mix unrelated refactoring, upgrades, formatting, or general cleanup with a feature.
- Where a task spans several files or layers, complete the smallest coherent set needed for correct behavior.
- MUST NOT proceed to a second feature simply because it was discovered during implementation.

**Avoid**

```text
“I need to add an endpoint, so I will also upgrade packages,
rename folders, and restructure the entire solution.”
```

**Recommended**

```text
“I will implement the endpoint, its contract, the required integration,
and relevant tests. Other findings will be documented separately.”
```

### 1.2 Testing and TDD

Apply test-first when:

- the behavior can be clearly expressed before implementation;
- fixing a reproducible regression;
- a business rule has verifiable inputs and outputs;
- the component already has a test suite that supports this workflow.

Do not force TDD when:

- the task concerns documentation or configuration only;
- the task is research/exploration;
- the component lacks suitable testing infrastructure and creating it exceeds scope;
- the change is purely visual and another validation method is more appropriate, although behavioral tests should be added where material risks exist.

Whenever existing behavior changes, assess which test would prevent a regression.

### 1.3 Type Safety and Contracts

- In .NET/C#, preserve static types, nullable annotations, contracts, and DTOs.
- In the JavaScript/JSX UI, MUST NOT introduce TypeScript as a cross-cutting requirement. Use documented validation, API contracts, linting, and existing patterns to reduce defects.
- MUST NOT use type-system escape hatches (`dynamic`, `object`, casts, or unjustified suppressions) in backend code.
- MUST NOT invent API response shapes in the frontend; verify the existing contract.

### 1.4 Clear Naming

Use names that communicate business intent or responsibility.

**Avoid**

```text
x
tmp
data1
proc
flag
helper2
```

**Prefer**

```text
codigoEntidad
estaCargando
ObtengaFondosAsync
mensajeDeError
configuracionEndpoint
```

Exact casing, language, suffix, and filename conventions are defined in `backend-standards.md` and `frontend-standards.md`.

### 1.5 Question Assumptions

> Before implementing an inference, seek evidence in the repository.

Agents and developers MUST distinguish:

- **Confirmed:** supported by current code, configuration, or documentation.
- **Inferred:** appears likely but has not been verified.
- **Proposed:** a suggested improvement that does not yet exist in the system.

Example:

```text
Confirmed: the UI consumes Bccr.Supen.Ves.Api.
Inferred: a new endpoint will probably follow a route similar to an existing one.
Proposed: create a shared abstraction for three repeated workflows.
```

MUST NOT present an inference or proposal as an existing part of VES.

### 1.6 Pattern Detection Without Overengineering

> Identifying duplication does not imply immediately creating an abstraction.

When repeated code is found:

1. Determine whether it expresses the same rule or merely a superficial similarity.
2. Check whether the instances change for the same reasons.
3. Inspect whether the project already provides an equivalent abstraction.
4. Extract only when doing so improves maintainability, testability, or consistency.
5. Avoid internal frameworks, factories, wrappers, or generic helpers without a demonstrated need.

“DRY” must not become “abstract everything.”

### 1.7 Consistency Over Personal Preference

MUST NOT replace established patterns based solely on developer or agent preference when both options are technically sound.

Examples:

- Do not replace MUI with another library based on preference.
- Do not migrate MSTest to xUnit without a specific task.
- Do not convert JS/JSX to TypeScript based on a global rule.
- Do not replace BCCR contracts with a self-designed generic abstraction.
- Do not change the language of public identifiers for stylistic reasons.

## 2. Language Standards
- Use the language and naming conventions already established in the component.
  The BCCR VES UI and API code/documentation primarily use Spanish, including
  identifiers in existing code. Do not translate or rename established APIs,
  database objects, or identifiers to satisfy a workspace-wide English-only rule.
- Keep new technical writing clear and consistent with nearby documentation;
  Spanish is valid and is the prevailing language in these VES projects.
- Use descriptive names, messages, and tests. Preserve externally defined names
  and conventions where compatibility requires them.


### 2.1 Language and Compatibility

> Document 1 requires English for code, documentation, Azure DevOps, schemas, configuration, commits, and tests. That rule does not fully apply to the VES repository.

VES rules:

- Preserve the language established in each component.
- Spanish is valid and predominant in VES documentation and domain code.
- Preserve names externally defined by contracts, frameworks, libraries, SQL, APIs, or integrations.
- Avoid mixing Spanish and English within the same concept without a technical reason.
- MUST NOT translate existing names where doing so would affect compatibility.
- Error messages, tests, and logs must be descriptive and consistent with their owning module.

**Example**

```text
Valid in a Spanish-language VES module:
codigoEntidad
mensajeDeError
ObtengaFondosAsync
```

MUST NOT rename these identifiers in English solely to comply with an outdated cross-cutting rule.

### 2.2 Documentation and Commits

- New documentation SHOULD use the predominant language of the owning area.
- Commits MUST follow the actual repository/team convention.
- MUST NOT impose English or Spanish where a different explicit convention exists.
- Filenames, OpenSpec artifacts, and tool-required keys MUST retain the format expected by that tool.

## 3. Specific standards

For detailed standards and guidelines specific to different areas of the project, refer to:

- Backend Standards (`docs/backend-standards.md`, file from the previous backend package) - API development, database patterns, testing, security and backend best practices
- [Frontend Standards](./frontend-standards.md) - React components, UI/UX guidelines, and frontend architecture
- Documentation Standards (`docs/documentation-standards.md`, outside this package) - Technical documentation structure, formatting, and maintenance guidelines, including AI standards like this document
- OpenSpec Tasks Mandatory Steps (`docs/openspec-tasks-mandatory-steps.md`, outside this package) - Required checklist and execution rules when creating or updating OpenSpec `tasks.md` files


### 3.1 Select the Correct Standard

| Change type | Primary document |
|---|---|
| React, UI/UX, hooks, frontend tests | `frontend-standards.md` |
| .NET API, MAPI, EF Core, SQL Server, backend tests | `backend-standards.md` |
| Markdown, SPEC, README, guides, and technical artifacts | `documentation-standards.md` |
| Creating/updating OpenSpec `tasks.md` | `openspec-tasks-mandatory-steps.md` |
| Cross-cutting rules and multi-agent portability | `base-standards.md` |

When a task spans several areas, apply all relevant standards without forcing independent components into a shared architecture.

## 4. Project Skills

- Skills live in `ai-specs/skills`.
- When a request matches a skill, load and follow the corresponding `SKILL.md` automatically before continuing.
- Also load any referenced files in the skill folder (for example, `references/*.md`) when the skill requires them.


### 4.1 Safe Use of Skills

> Automatic skill loading is retained, but a skill cannot silently override actual repository contracts.

When a task matches a skill:

1. Read its `SKILL.md`.
2. Read the references required by the skill.
3. Verify that its instructions apply to the current component.
4. Resolve conflicts using the source-of-truth hierarchy above.
5. Perform only actions compatible with the requested scope.

MUST NOT copy a skill from another technology stack as a mandatory VES pattern without validation.

### 4.2 Artifacts Shared Across Agents

When a skill, agent, or reference is designed for multiple assistants:

- Maintain one documented canonical source.
- Avoid divergent copies.
- Use references or symlinks only where compatible with the operating system and repository.
- Document any necessary exceptions.

## 5. Planning Workflows

Use the planning workflow and model supported by the active tools and project.

Planning workflows SHOULD use an advanced-reasoning model equivalent to Opus for planning and complex decisions.

This requirement applies to:
- `enrich-us`
- `openspec-ff-change`
- `openspec-continue-change`

Do not change agent or model settings merely to satisfy a vendor-specific workspace rule.

### 5.1 Explicit Model Strategy: Advanced Planning and Efficient Execution

> Explicitly preserve the intent to use an advanced-reasoning model, such as **Opus**, for planning and complex decisions, and a capable but more cost-efficient execution model, such as **Sonnet**, for implementing work whose specification, architecture, and rules are already clear. This rule is expressed in terms of **capabilities**, not vendors, so it remains portable across Claude, GitHub Copilot, Cursor, Codex, Gemini, and other platforms.

#### General Principle

Use two logical model tiers:

```text
                 ┌──────────────────────────────┐
                 │   ADVANCED PLANNING MODEL    │
                 │       OPUS-EQUIVALENT        │
                 │                              │
                 │  Analyze • Design • Decide   │
                 │  Identify risks • Plan       │
                 └──────────────┬───────────────┘
                                │
                         approved plan
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │      EXECUTION MODEL         │
                 │      SONNET-EQUIVALENT       │
                 │                              │
                 │ Implement • Test • Refine    │
                 │   following explicit rules   │
                 └──────────────┬───────────────┘
                                │
                        uncertainty / deviation
                                │
                                ▼
                    ESCALATE TO PLANNER
```

The terms **Opus-equivalent** and **Sonnet-equivalent** denote capability levels, not mandatory products.

- **Opus-equivalent:** the most capable reasoning model available that is suitable for the technology involved.
- **Sonnet-equivalent:** a competent, more efficient general-purpose development model that can accurately follow established specifications, standards, contracts, and tasks.

Model selection MUST also consider the task's technology stack. For .NET changes, the advanced model must perform well with C#/.NET and architecture; for frontend, React/JavaScript/Vite/MUI; for data, SQL Server/EF Core; for OpenSpec, requirements analysis and documentation consistency.

#### When an Opus-Equivalent Model Is Mandatory

Use an advanced model for **planning or reviewing** when the task includes one or more of the following:

- architectural changes;
- changes spanning UI → API → MAPI → database;
- defining or modifying inter-component contracts;
- security, authentication, authorization, certificate, or sensitive-data decisions;
- designing new patterns, abstractions, or shared components;
- schema, stored procedure, or DBA integration changes;
- technology migrations;
- dependency changes with cross-cutting impact;
- concurrency, performance, or resilience analysis;
- large-scale refactoring;
- ambiguous requirements or requirements with multiple valid interpretations;
- enriching complex user stories, specifications, or OpenSpec changes;
- producing an implementation plan for a multi-layer feature;
- reviewing a solution after an error persists despite reasonable attempts;
- assessing findings that could change the original scope.

Where applicable, the advanced model MUST produce at least:

1. Understanding of the requirement.
2. Confirmed and unresolved assumptions.
3. Affected architecture/components.
4. Contracts that must be preserved.
5. Files or areas likely to change.
6. Technical risks.
7. Test strategy.
8. Implementation order.
9. Acceptance/verification criteria.
10. Explicit restrictions on what **must not** be modified.

#### When to Use a Sonnet-Equivalent Model

Once the plan, rules, and contracts are clear, use an efficient execution model to:

- create or modify code following an approved plan;
- implement already-designed endpoints;
- create React components with specified behavior;
- adapt already-defined DTOs or mappings;
- write tests for predefined scenarios;
- perform repetitive or mechanical changes;
- fix well-understood lint, formatting, or warning issues;
- update documentation to reflect decisions already made;
- execute explicitly described local refactoring;
- implement sufficiently detailed `tasks.md` tasks;
- apply review corrections when the required fix is unambiguous.

The execution model **MUST NOT independently reinterpret the architecture or expand the scope**. Its primary responsibility is to implement established decisions consistently.

#### Escalation Rule for Advanced Reasoning

The Sonnet-equivalent model MUST stop making local design decisions and escalate to an Opus-equivalent model whenever:

- implementation contradicts the plan;
- the discovered architecture differs from assumptions;
- a required contract is missing;
- a decision between significant architectural alternatives is required;
- unexpected impact on another component is found;
- security or permissions must change;
- a new dependency must be introduced;
- a public interface must change;
- backward compatibility could be lost;
- a test suggests the specification itself might be incorrect;
- the requested change affects unanticipated OpenSpec artifacts;
- substantial stored procedure/schema changes are required;
- significant data, performance, or concurrency risks arise;
- the solution requires an exception to project standards.

Escalation does not mean abandoning the task. It means returning the new information to advanced reasoning, updating the plan, and then resuming execution.

#### Model Selection Matrix

| Work type | Recommended model | Rationale |
|---|---|---|
| Simple, narrowly scoped text change | Sonnet-equivalent | Clear rules, low risk |
| Local fix with a known cause | Sonnet-equivalent | Straightforward execution |
| Implementation of a detailed OpenSpec task | Sonnet-equivalent | Design already defined |
| Tests for specified behavior | Sonnet-equivalent | Known scenarios |
| Ambiguous new user story | Opus-equivalent | Requires analysis |
| API/MAPI design | Opus-equivalent | Contracts and architecture |
| UI + API + MAPI change | Opus-equivalent | Cross-cutting impact |
| Security/authentication | Opus-equivalent | High risk |
| Complex data model/SQL | Opus-equivalent | Integrity/performance risk |
| Cross-cutting refactoring | Opus-equivalent | Structural decisions |
| Difficult bug investigation | Opus-equivalent initially | Requires diagnosis |
| Mechanical fix after diagnosis | Sonnet-equivalent | Solution already determined |
| Final review of a high-risk change | Opus-equivalent | Independent validation of decisions |

#### Technology-Specific Examples

**.NET Backend / API / MAPI**

```text
Opus-equivalent:
- decides which layer owns a new rule among API, SG, MAPI, BW, and DA;
- reviews contracts, security, transactions, and test strategy.

Sonnet-equivalent:
- implements the defined classes/methods;
- adds DI following existing patterns;
- creates MSTest/xUnit tests;
- performs local corrections.
```

**React Frontend**

```text
Opus-equivalent:
- determines state ownership;
- decides component composition;
- analyzes API integration, accessibility, and UX risks.

Sonnet-equivalent:
- implements JSX/hooks according to the design;
- creates Vitest/RTL tests;
- applies established MUI tokens and responsive rules.
```

**SQL Server / EF Core**

```text
Opus-equivalent:
- analyzes transaction boundaries, stored procedure impact,
  performance, and compatibility.

Sonnet-equivalent:
- implements the already-designed parameterized DA access;
- adds defined mappings and tests.
```

**OpenSpec / Requirements**

```text
Opus-equivalent:
- enriches requirements;
- identifies ambiguities and scenarios;
- designs the change and its tasks.

Sonnet-equivalent:
- executes tasks.md once requirements, scenarios, and constraints are
  sufficiently defined.
```

#### Do Not Equate “More Advanced Model” with “Do Everything”

The Opus-equivalent model SHOULD NOT mechanically implement the entire change merely because it is more capable. Its greatest value lies in:

- reasoning;
- planning;
- architecture;
- ambiguity resolution;
- high-risk reviews.

The Sonnet-equivalent model SHOULD receive sufficiently clear instructions to carry out disciplined implementation without redesigning the solution.

#### Vendor Independence

Commercial model names may change over time. The normative rule is therefore:

```text
COMPLEX PLANNING
→ advanced-reasoning model available for the stack
→ Opus-equivalent

EXECUTION UNDER CLEAR RULES
→ competent, efficient general-purpose/coding model
→ Sonnet-equivalent
```

If a platform does not offer two separate models, use the **reasoning effort/configuration level** that best matches these two functions.

MUST NOT automatically change persistent user, repository, or IDE configuration to switch models unless required by the tool workflow and expressly authorized. Prefer normal session/agent model-selection mechanisms.

### 5.2 Recommended Execution Pattern

For code or standards tasks:

```text
1. INSPECT
   ↓
2. CONFIRM ARCHITECTURE/CONTRACTS
   ↓
3. DEFINE MINIMAL CHANGE
   ↓
4. IMPLEMENT
   ↓
5. VALIDATE
   ↓
6. REVIEW INCIDENTAL CHANGES
   ↓
7. REPORT RESULTS
```

#### Inspect

First read the directly relevant files and component-specific documentation.

#### Confirm

Distinguish facts from inferences. Verify versions, contracts, names, and patterns before generating code.

#### Minimal Change

Determine which files must change and which must not.

#### Implement

Follow existing conventions and avoid unnecessary dependencies.

#### Validate

Run the component's documented checks, such as build, lint, tests, static analysis, or artifact validation, as appropriate.

#### Review Incidental Changes

Confirm that versions, packages, contracts, styles, or unrelated files were not modified accidentally.

#### Report

Summarize what changed, what was validated, and any real limitations.

## 6. Symlink Integrity and Multi-Agent Portability

- **Canonical Source**: Keep reusable artifacts in the documented canonical location for the project; use symlinks or other references for agent-specific paths when supported and portable.
- **Update Safety**: Whenever a file is renamed, moved, or its suffix changes, verify and update all symlinks that target it before considering the change complete.
- **New Artifact Linking**: For artifacts intended to be shared across agents, add the references supported by the target repositories and operating systems.
- **Completion Gate**: Verify affected references after moving files. Do not require symlinks where they are unsupported or would make a BCCR checkout non-portable.


### 6.1 Reference Integrity Rules

> Preserve the intent of a canonical source and multi-agent references, but do not assume that `ai-specs` is the canonical location for everything.

Whenever an artifact is moved, renamed, or its extension changes:

1. Search for internal references.
2. Verify existing symlinks.
3. Update relative paths.
4. Review documentation that links to it.
5. Confirm the solution still works on the team's supported operating systems.

**Incomplete change**

```text
ai-specs/skills/x/SKILL.md was renamed,
but .claude/... or .cursor/... still point to its previous name.
```

**Correct change**

```text
The artifact was renamed, affected references were updated, and
no obsolete symlink targets remained.
```

### 6.2 Avoid Duplicating Canonical Sources

MUST NOT create independent copies of the same standard for different agents when they can reference a common source.

If a tool does not support symlinks, or the repository must operate in an environment where they are not portable, use that tool's documented alternative and clearly describe its relationship to the original source.

## 7. Mandatory OpenSpec Artifact Updates for Post-Apply Changes

When working on an active OpenSpec change after `opsx:apply` and before
`opsx:archive`, update the affected change artifacts before implementing a new
requirement. This workflow does not apply to ordinary work that is not part of
an active OpenSpec change.

For an active change:

1. Update the affected requirements, scenarios, and tasks.
2. Regenerate artifacts when required by the workflow.
3. Implement and verify against the updated artifacts before archiving.

### 7.1 Source-of-Truth Principle During an OpenSpec Change

> Between `opsx:apply` and `opsx:archive`, an additional request that changes requirements MUST NOT be implemented directly as an informal patch.

The mandatory sequence is:

```text
New requirement/change
        ↓
Update requirements/scenarios
        ↓
Update tasks.md
        ↓
Regenerate artifacts if applicable
        ↓
Implement
        ↓
Verify against updated artifacts
        ↓
Archive when the change is complete
```

Do not automatically label a new functional requirement a “bugfix” if it actually changes the design or scope of the active change.

### 7.2 When This Rule Does NOT Apply

Do not apply the OpenSpec workflow to:

- ordinary work outside an active OpenSpec change;
- inquiries or analysis that do not modify the project;
- purely operational tasks that project documentation governs through another workflow.

MUST NOT create unnecessary OpenSpec artifacts merely because this document mentions them.

### 7.3 Example

**Avoid**

```text
A new requirement appears after apply.
The source code is modified directly.
tasks.md and scenarios remain outdated.
```

**Recommended**

```text
First update the affected requirements, scenarios, and tasks.
Then implement and validate against the revised specification.
```

## 8. Cross-Cutting Rules for Dependency and Configuration Changes

> Focused tasks MUST NOT introduce accidental infrastructure changes.

- MUST NOT upgrade packages as a side effect of implementing a feature.
- MUST NOT change runtime/framework versions without an explicit task.
- MUST NOT introduce a new dependency when the platform already offers an equivalent solution.
- Before adding a dependency, justify its necessity, scope, security, maintenance, and compatibility.
- MUST NOT change agent, IDE, or user tool configuration unless expressly required by the task.
- MUST NOT include secrets, tokens, or credentials in standards, examples, or version-controlled configuration.

## 9. Handling Out-of-Scope Findings

If an unrelated issue is discovered while working on a task:

1. Do not automatically modify it.
2. Determine whether it blocks the current task.
3. If it blocks the task, make the smallest necessary change and document the reason.
4. Otherwise, report it separately.

Example:

```text
Task: add validation to an endpoint.
Finding: another module uses an outdated package.

Correct action: do not upgrade the package in the same change unless
it prevents implementation or validation of the task.
```

## 10. Completion Criteria

A technical task is not considered complete merely because “the code has been written.”

Depending on the change, verify that:

- the requested behavior is implemented;
- the architecture and contracts are preserved;
- relevant tests were added/updated;
- applicable tests/build/lint checks were executed;
- relevant warnings were reviewed;
- documentation/artifacts were updated where behavior or processes changed;
- references and symlinks remain valid if artifacts were moved;
- no secrets or sensitive data were added;
- no unrelated incidental changes were made;
- OpenSpec was updated where applicable.

## 11. Recommendations from `base-standards_1.md` NOT Adopted Literally

- **English Only:** VES primarily uses Spanish; linguistic consistency is retained, but mandatory English is not.
- **Mandatory TDD for every feature:** retained as a recommended practice when useful; tests remain required according to risk, behavior, and component standards.
- **All code must be fully typed:** naturally applies to C#; MUST NOT be used to impose TypeScript on the JavaScript/JSX UI.
- **Never advance more than one step:** adapted into small, incremental, verifiable changes without forcing interruption of a coherent workflow.
- **Claude Opus as a mandatory product:** replaced by the **Opus-equivalent** category: the most capable advanced-reasoning model available and suitable for the stack for planning, architecture, and complex decisions.
- **Claude Sonnet as a mandatory product:** replaced by the **Sonnet-equivalent** category: a competent, efficient model for implementing already-defined plans, tasks, and rules.
- **Automatically modify `.claude/settings.json`:** not adopted as a cross-cutting mechanism. Select model/effort through the tool's normal workflow unless expressly authorized otherwise.
- **Automatically switch between Opus/Sonnet by commercial name:** no particular brand is required; retain the logical separation of advanced planning and efficient execution where the platform allows it.
- **`ai-specs` as the canonical location for every customization:** only where project documentation expressly establishes it.
- **Mandatory symlinks for all agents:** use only where compatible and documented; portability takes precedence.

## 12. Base Checklist for Developers and Agents

### Before Making Changes

- [ ] I classified the task as complex planning or execution under clear rules.
- [ ] I selected an Opus-equivalent model where architectural decisions, ambiguity, or high risk are present.
- [ ] If the work is sufficiently specified, I can use a Sonnet-equivalent model for implementation.
- [ ] I identified the actual affected component.
- [ ] I read its component-specific standard.
- [ ] I reviewed its README/AGENT/SPEC or relevant documentation.
- [ ] I distinguished facts, inferences, and proposals.
- [ ] I confirmed the requested scope.
- [ ] I checked whether an applicable active OpenSpec change exists.

### During the Change

- [ ] If the execution model encounters an unforeseen design decision, it escalates to the Opus-equivalent model rather than redesigning independently.
- [ ] I keep the change small and focused.
- [ ] I follow the existing architecture.
- [ ] I use clear names.
- [ ] I do not introduce a technology or pattern based solely on personal preference.
- [ ] I do not upgrade packages or runtime without an explicit need.
- [ ] I do not modify public contracts for stylistic reasons.
- [ ] I do not duplicate logic without first determining whether it represents the same rule.
- [ ] I do not create speculative abstractions.
- [ ] I preserve the component's established language and naming conventions.
- [ ] I do not introduce secrets.

### Validation

- [ ] I added/updated relevant behavior tests.
- [ ] I ran build/lint/tests as appropriate for the component.
- [ ] I reviewed applicable warnings and static-analysis results.
- [ ] I verified there are no unrelated incidental changes.
- [ ] I updated documentation where behavior/processes changed.
- [ ] I verified symlinks/references if I moved artifacts.
- [ ] I updated OpenSpec before changing code where required.

### Before Closing

- [ ] The result meets the original requirement.
- [ ] I can explain what changed and why.
- [ ] I can identify which validations were actually executed.
- [ ] Any limitation or out-of-scope finding has been clearly documented.
