# Design

## Context

See proposal.md for motivation. Builds on `identity-provisioning` (the guard, `provisionIdentity`, `withUserContext`) and `tenant-base-schema` (`project`, `project_membership`, `workspace_membership` and their RLS). Constraint: ADR 0002 — project-level authorization is application logic, never derived from or encoded in RLS.

## Goals / Non-Goals

**Goals:**
- Every authenticated request has the caller's internal `userId` available, not just `GET /me`.
- A reusable way to compute "does this user have at least role X on project Y," and to gate an endpoint on it.
- `GET /projects/:projectId` proves both the Owner-implicit-access path and the no-membership-403 path.

**Non-Goals:**
- No project mutation endpoints, no full CRUD surface.
- No invitations — membership fixtures are seeded directly.

## Decisions

### Correction found during apply: `provisionIdentity` assumed every existing user is an Owner somewhere

`identity-provisioning`'s `provisionIdentity` (now exercised on every request via the guard change below, not just `GET /me`) resolved an existing user's workspace via `SELECT workspace_id FROM workspace_membership WHERE user_id = X AND role = 'Owner' LIMIT 1` — safe at the time, since the only way a user row could exist was through its own "create" branch, which always makes an Owner membership. This change's own tests are the first to create a user with only a `Collaborator` membership and run them through the real guard pipeline, and that query returned zero rows, crashing on `membership[0].workspace_id`. Fixed to look up *any* membership (not `role = 'Owner'` specifically), ordered by `created_at`, since a Collaborator-only user is now a real case (and is exactly what accepting an invitation will eventually produce). Not a `project-authorization` design decision as such — a latent bug in prior, already-archived code, surfaced here and fixed here rather than left in place.

### Identity resolution moves into the guard, not a second guard

`ClerkAuthGuard` already runs globally and already resolves `clerkUserId` from the verified token. Resolving the internal `userId` (via `provisionIdentity`) is tightly coupled to that same step — ADR 0002 already frames token verification and provisioning as one "on first authenticated request" event — so it's added to the *same* guard rather than a second one. A second guard would need explicit ordering to guarantee it runs after the first sets `clerkUserId`, which a single guard sidesteps entirely. `request.auth` now carries `{ clerkUserId, userId, workspaceId }`. `GET /me` is refactored to just read `request.auth`, dropping its own `provisionIdentity` call — its response shape and behavior are unchanged.

### Two more RLS reads need a user-scoped fallback — the same recurring shape as before

Resolving an effective project role needs two reads that, under the *existing* policies alone, would return zero rows even when a real row exists — the same "need to look myself up before any workspace context is known" problem `tenant-base-schema` (for `workspace_membership`) and `identity-provisioning` (for `user`) each already hit once:

1. **"Which workspace does project X belong to?"** — needed before any workspace context can be set, since that's the very thing being resolved. `project` only has the standard `tenant_isolation` policy (keyed on `app.workspace_id`), which can't answer this.
2. **"Do I have an explicit `project_membership` row for project X?"** — same problem: `project_membership` only has `tenant_isolation`, keyed on `app.workspace_id`, not on the caller.

Both get a new, additive, **`FOR SELECT`-only** permissive policy (never touching the write path, which keeps using the existing workspace-scoped policy exactly as before) — a third instance of the same fix shape as `workspace_membership`'s `self_membership` and `user`'s widened `self_access`:
```sql
-- project: visible for SELECT if the caller belongs to its workspace at all,
-- found via a subquery against their own workspace_membership rows.
CREATE POLICY member_visible ON project FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_membership
      WHERE user_id = nullif(current_setting('app.user_id', true), '')::uuid
    )
  );

-- project_membership: a user can always read their own rows, exactly parallel to
-- workspace_membership's self_membership policy.
CREATE POLICY self_project_membership ON project_membership FOR SELECT
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
```
With these, the whole role-resolution read runs inside one `withUserContext(prisma, userId, fn)` call — `app.user_id` alone is enough for every read involved (the project's workspace, the caller's workspace-membership role, the caller's project-membership role) — no `app.workspace_id` needed for this read path at all. Writes to any of these tables are untouched and still require the existing workspace-scoped context.

### `resolveEffectiveProjectRole`

```ts
export type ProjectRole = 'Viewer' | 'Contributor' | 'Admin';
const ROLE_RANK: Record<ProjectRole, number> = { Viewer: 0, Contributor: 1, Admin: 2 };

async function resolveEffectiveProjectRole(
  prisma: PrismaClient,
  userId: string,
  projectId: string,
): Promise<ProjectRole | null> {
  return withUserContext(prisma, userId, async (tx) => {
    const project = await tx.$queryRaw<{ workspace_id: string }[]>`SELECT workspace_id FROM project WHERE id = ${projectId}::uuid`;
    if (project.length === 0) return null; // not visible at all (RLS) -> no access

    const owner = await tx.$queryRaw<{ role: string }[]>`
      SELECT role FROM workspace_membership
      WHERE user_id = ${userId}::uuid AND workspace_id = ${project[0].workspace_id}::uuid AND role = 'Owner'`;
    if (owner.length > 0) return 'Admin';

    const membership = await tx.$queryRaw<{ role: string }[]>`
      SELECT role FROM project_membership WHERE user_id = ${userId}::uuid AND project_id = ${projectId}::uuid`;
    return (membership[0]?.role as ProjectRole) ?? null;
  });
}
```
A `null` project lookup (the project doesn't exist, or the caller's workspace doesn't contain it — `member_visible`'s own tenant boundary) and "no membership, not Owner" both resolve to `null` (no access) — the guard turns `null` or "below minimum" into 403 either way; it doesn't need to distinguish them for this change's one endpoint.

### Guard and decorator

```ts
export const REQUIRE_PROJECT_ROLE_KEY = 'requireProjectRole';
export const RequireProjectRole = (minimumRole: ProjectRole) => SetMetadata(REQUIRE_PROJECT_ROLE_KEY, minimumRole);

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const minimumRole = this.reflector.getAllAndOverride<ProjectRole>(REQUIRE_PROJECT_ROLE_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!minimumRole) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const projectId = request.params.projectId;
    const effectiveRole = await resolveEffectiveProjectRole(this.prisma, request.auth!.userId, projectId);

    if (!effectiveRole || ROLE_RANK[effectiveRole] < ROLE_RANK[minimumRole]) {
      throw new ForbiddenException('Insufficient project role');
    }
    request.auth!.projectRole = effectiveRole;
    return true;
  }
}
```
Applied per-route (`@UseGuards(ProjectRoleGuard)` + `@RequireProjectRole('Viewer')` together on the one new endpoint), **not** registered globally like `ClerkAuthGuard` — most routes aren't project-scoped at all, so a global "no requirement declared → allow" fallback would be exercised everywhere for no benefit.

### 403, not 404, for "visible workspace, no project membership"

A Collaborator who passes `ClerkAuthGuard` and whose workspace contains the project (so `member_visible`'s RLS lets them see the row at all) but has no `project_membership` row gets **403**. RLS already proved the project exists and is in their workspace; denying with 404 would be pretending otherwise for no real confidentiality benefit, since workspace membership already establishes that much visibility. This is a different situation from ADR 0003's "resource in another workspace → 404," which is a tenant-isolation boundary, not a permission tier within one's own workspace.

## Risks / Trade-offs

- **[Risk]** `member_visible`'s subquery against `workspace_membership` runs on every project-role check — one extra correlated lookup per request to a project-scoped endpoint. → **Mitigation:** `workspace_membership` is tiny per user (a handful of rows at most while invitations don't exist); revisit only if this is ever measured as a real cost.
- **[Risk]** Moving identity resolution into `ClerkAuthGuard` makes every authenticated request pay the `provisionIdentity` transaction, not just `GET /me`. → **Mitigation:** the "existing user" branch of `provisionIdentity` is already just two indexed lookups; this was always implied by ADR 0002 ("on first authenticated request," not "only on `/me`") — `identity-provisioning` under-scoped this, this change completes it.
- **[Risk]** `resolveEffectiveProjectRole` collapses "project not found" and "no access" into the same `null` — fine for this change's one read endpoint, but a future write endpoint might need to tell them apart (e.g. to 404 on a genuinely nonexistent project id rather than 403). → **Mitigation:** not resolved here; revisit when a mutation endpoint actually needs the distinction.

## Migration Plan

Additive: one new migration (`0004`) adding the two `FOR SELECT` policies — no existing rows or policies touched. Rollback drops both new policies.
