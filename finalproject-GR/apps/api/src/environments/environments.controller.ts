import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { ProjectRoleGuard } from '../common/project-role.guard';
import { RequireProjectRole } from '../common/require-project-role.decorator';
import { RevealRateLimitGuard } from '../common/reveal-rate-limit.guard';
import { PrismaService } from '../common/prisma.service';
import { withTenantContext } from '../common/tenant-context';
import { withUserContext } from '../common/user-context';
import { resolveProjectWorkspaceId } from '../common/resolve-project-workspace';
import { encrypt, decrypt } from '../common/secrets-encryption';
import { log } from '../common/activity-logger';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';

type DefaultBrowser = 'Chromium' | 'Firefox' | 'WebKit';

const DEFAULT_BROWSERS: DefaultBrowser[] = ['Chromium', 'Firefox', 'WebKit'];

const UNIQUE_VIOLATION = '23505';

interface EnvironmentRow {
  id: string;
  name: string;
  base_url: string;
  default_browser: DefaultBrowser;
}

interface CredentialRow {
  id: string;
  environment_id: string;
  alias: string;
  email: string;
}

interface CredentialResponse {
  id: string;
  alias: string;
  email: string;
}

interface EnvironmentResponse {
  id: string;
  name: string;
  baseUrl: string;
  defaultBrowser: DefaultBrowser;
  credentials: CredentialResponse[];
}

interface CreateCredentialInput {
  alias?: unknown;
  email?: unknown;
  password?: unknown;
}

interface CreateEnvironmentBody {
  name?: unknown;
  baseUrl?: unknown;
  defaultBrowser?: unknown;
  credentials?: unknown;
}

interface UpdateCredentialInput {
  id?: unknown;
  alias?: unknown;
  email?: unknown;
  password?: unknown;
}

interface UpdateEnvironmentBody {
  name?: unknown;
  baseUrl?: unknown;
  defaultBrowser?: unknown;
  credentials?: unknown;
}

interface ValidatedNewCredential {
  alias: string;
  email: string;
  password: string;
}

interface ValidatedCredentialUpdate {
  id: string;
  alias: string;
  email: string;
  password: string | undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertNonEmptyString(value: unknown, field: string): string {
  if (!isNonEmptyString(value)) {
    throw new BadRequestException(`${field} must be a non-empty string`);
  }
  return value;
}

function assertDefaultBrowser(value: unknown): DefaultBrowser {
  if (typeof value !== 'string' || !DEFAULT_BROWSERS.includes(value as DefaultBrowser)) {
    throw new BadRequestException(`defaultBrowser must be one of ${DEFAULT_BROWSERS.join(', ')}`);
  }
  return value as DefaultBrowser;
}

function assertUniqueAliases(aliases: string[]): void {
  const seen = new Set<string>();
  for (const alias of aliases) {
    if (seen.has(alias)) {
      throw new BadRequestException(`duplicate credential alias: ${alias}`);
    }
    seen.add(alias);
  }
}

function validateNewCredentials(input: unknown): ValidatedNewCredential[] {
  if (input === undefined) {
    return [];
  }
  if (!Array.isArray(input)) {
    throw new BadRequestException('credentials must be an array');
  }
  const credentials = (input as CreateCredentialInput[]).map((item) => ({
    alias: assertNonEmptyString(item.alias, 'credentials[].alias'),
    email: assertNonEmptyString(item.email, 'credentials[].email'),
    password: assertNonEmptyString(item.password, 'credentials[].password'),
  }));
  assertUniqueAliases(credentials.map((c) => c.alias));
  return credentials;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    typeof error.meta?.code === 'string' &&
    error.meta.code === UNIQUE_VIOLATION
  );
}

function toCredentialResponse(row: CredentialRow): CredentialResponse {
  return { id: row.id, alias: row.alias, email: row.email };
}

function toEnvironmentResponse(environment: EnvironmentRow, credentials: CredentialRow[]): EnvironmentResponse {
  return {
    id: environment.id,
    name: environment.name,
    baseUrl: environment.base_url,
    defaultBrowser: environment.default_browser,
    credentials: credentials.filter((c) => c.environment_id === environment.id).map(toCredentialResponse),
  };
}

@Controller('projects/:projectId/environments')
export class EnvironmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async create(
    @Param('projectId') projectId: string,
    @Body() body: CreateEnvironmentBody,
    @Req() request: AuthenticatedRequest,
  ): Promise<EnvironmentResponse> {
    const name = assertNonEmptyString(body.name, 'name');
    const baseUrl = assertNonEmptyString(body.baseUrl, 'baseUrl');
    const defaultBrowser = assertDefaultBrowser(body.defaultBrowser);
    const newCredentials = validateNewCredentials(body.credentials);

    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);
    const environmentId = randomUUID();

    const credentialsToInsert = await Promise.all(
      newCredentials.map(async (credential) => {
        const credentialId = randomUUID();
        const ciphertext = await encrypt(this.prisma, workspaceId, credentialId, credential.password);
        return { id: credentialId, alias: credential.alias, email: credential.email, ciphertext };
      }),
    );

    try {
      const credentialRows = await withTenantContext(this.prisma, workspaceId, async (tx) => {
        await tx.$executeRaw`
          INSERT INTO environment (id, project_id, workspace_id, name, base_url, default_browser)
          VALUES (${environmentId}::uuid, ${projectId}::uuid, ${workspaceId}::uuid, ${name}, ${baseUrl}, ${defaultBrowser})
        `;

        const inserted: CredentialRow[] = [];
        for (const credential of credentialsToInsert) {
          await tx.$executeRaw`
            INSERT INTO environment_credential (id, environment_id, workspace_id, alias, email, password_ciphertext)
            VALUES (${credential.id}::uuid, ${environmentId}::uuid, ${workspaceId}::uuid, ${credential.alias}, ${credential.email}, ${credential.ciphertext})
          `;
          inserted.push({ id: credential.id, environment_id: environmentId, alias: credential.alias, email: credential.email });
        }
        return inserted;
      });

      return toEnvironmentResponse(
        { id: environmentId, name, base_url: baseUrl, default_browser: defaultBrowser },
        credentialRows,
      );
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('duplicate credential alias within this environment');
      }
      throw error;
    }
  }

  @Get()
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async list(@Param('projectId') projectId: string, @Req() request: AuthenticatedRequest): Promise<EnvironmentResponse[]> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);

    const { environments, credentials } = await withTenantContext(this.prisma, workspaceId, async (tx) => {
      const environments = await tx.$queryRaw<EnvironmentRow[]>`
        SELECT id, name, base_url, default_browser FROM environment
        WHERE project_id = ${projectId}::uuid
        ORDER BY created_at ASC
      `;
      const credentials = await tx.$queryRaw<CredentialRow[]>`
        SELECT ec.id, ec.environment_id, ec.alias, ec.email FROM environment_credential ec
        JOIN environment e ON e.id = ec.environment_id
        WHERE e.project_id = ${projectId}::uuid
        ORDER BY ec.created_at ASC
      `;
      return { environments, credentials };
    });

    return environments.map((environment) => toEnvironmentResponse(environment, credentials));
  }

  @Get(':environmentId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Viewer')
  async detail(
    @Param('projectId') projectId: string,
    @Param('environmentId') environmentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<EnvironmentResponse> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);

    const { environment, credentials } = await withTenantContext(this.prisma, workspaceId, async (tx) => {
      const environments = await tx.$queryRaw<EnvironmentRow[]>`
        SELECT id, name, base_url, default_browser FROM environment
        WHERE id = ${environmentId}::uuid AND project_id = ${projectId}::uuid
      `;
      const credentials = await tx.$queryRaw<CredentialRow[]>`
        SELECT id, environment_id, alias, email FROM environment_credential
        WHERE environment_id = ${environmentId}::uuid
        ORDER BY created_at ASC
      `;
      return { environment: environments[0], credentials };
    });

    if (!environment) {
      throw new NotFoundException('environment not found');
    }

    return toEnvironmentResponse(environment, credentials);
  }

  @Patch(':environmentId')
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async update(
    @Param('projectId') projectId: string,
    @Param('environmentId') environmentId: string,
    @Body() body: UpdateEnvironmentBody,
    @Req() request: AuthenticatedRequest,
  ): Promise<EnvironmentResponse> {
    if (body.name !== undefined) {
      assertNonEmptyString(body.name, 'name');
    }
    if (body.baseUrl !== undefined) {
      assertNonEmptyString(body.baseUrl, 'baseUrl');
    }
    if (body.defaultBrowser !== undefined) {
      assertDefaultBrowser(body.defaultBrowser);
    }

    const name = typeof body.name === 'string' ? body.name : null;
    const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl : null;
    const defaultBrowser = typeof body.defaultBrowser === 'string' ? (body.defaultBrowser as DefaultBrowser) : null;

    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);

    const reconciliation = body.credentials === undefined ? null : await this.planCredentialReconciliation(
      workspaceId,
      environmentId,
      projectId,
      body.credentials,
    );

    try {
      const { environment, credentials } = await withTenantContext(this.prisma, workspaceId, async (tx) => {
        const environments = await tx.$queryRaw<EnvironmentRow[]>`
          UPDATE environment
          SET
            name = COALESCE(${name}, name),
            base_url = COALESCE(${baseUrl}, base_url),
            default_browser = COALESCE(${defaultBrowser}, default_browser)
          WHERE id = ${environmentId}::uuid AND project_id = ${projectId}::uuid
          RETURNING id, name, base_url, default_browser
        `;
        if (environments.length === 0) {
          return { environment: undefined, credentials: [] as CredentialRow[] };
        }

        if (reconciliation) {
          for (const deleteId of reconciliation.deleteIds) {
            await tx.$executeRaw`DELETE FROM environment_credential WHERE id = ${deleteId}::uuid AND environment_id = ${environmentId}::uuid`;
          }
          for (const update of reconciliation.updates) {
            await tx.$executeRaw`
              UPDATE environment_credential
              SET
                alias = ${update.alias},
                email = ${update.email},
                password_ciphertext = COALESCE(${update.ciphertext}, password_ciphertext)
              WHERE id = ${update.id}::uuid AND environment_id = ${environmentId}::uuid
            `;
          }
          for (const insert of reconciliation.inserts) {
            await tx.$executeRaw`
              INSERT INTO environment_credential (id, environment_id, workspace_id, alias, email, password_ciphertext)
              VALUES (${insert.id}::uuid, ${environmentId}::uuid, ${workspaceId}::uuid, ${insert.alias}, ${insert.email}, ${insert.ciphertext})
            `;
          }
        }

        const credentials = await tx.$queryRaw<CredentialRow[]>`
          SELECT id, environment_id, alias, email FROM environment_credential
          WHERE environment_id = ${environmentId}::uuid
          ORDER BY created_at ASC
        `;
        return { environment: environments[0], credentials };
      });

      if (!environment) {
        throw new NotFoundException('environment not found');
      }

      return toEnvironmentResponse(environment, credentials);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('duplicate credential alias within this environment');
      }
      throw error;
    }
  }

  @Delete(':environmentId')
  @HttpCode(204)
  @UseGuards(ProjectRoleGuard)
  @RequireProjectRole('Admin')
  async remove(
    @Param('projectId') projectId: string,
    @Param('environmentId') environmentId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, request.auth!.userId, projectId);

    const rows = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ id: string }[]>`
        DELETE FROM environment
        WHERE id = ${environmentId}::uuid AND project_id = ${projectId}::uuid
        RETURNING id
      `,
    );

    if (rows.length === 0) {
      throw new NotFoundException('environment not found');
    }
  }

  @Post(':environmentId/credentials/:credentialId/reveal')
  @UseGuards(ProjectRoleGuard, RevealRateLimitGuard)
  @RequireProjectRole('Contributor')
  async reveal(
    @Param('projectId') projectId: string,
    @Param('environmentId') environmentId: string,
    @Param('credentialId') credentialId: string,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ password: string }> {
    const userId = request.auth!.userId;
    const workspaceId = await resolveProjectWorkspaceId(this.prisma, userId, projectId);

    const rows = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ password_ciphertext: string; alias: string; environment_name: string }[]>`
        SELECT ec.password_ciphertext, ec.alias, e.name AS environment_name
        FROM environment_credential ec
        JOIN environment e ON e.id = ec.environment_id
        WHERE ec.id = ${credentialId}::uuid AND ec.environment_id = ${environmentId}::uuid AND e.project_id = ${projectId}::uuid
      `,
    );

    if (rows.length === 0) {
      throw new NotFoundException('credential not found');
    }
    const { password_ciphertext, alias, environment_name } = rows[0];

    const password = await decrypt(this.prisma, workspaceId, credentialId, password_ciphertext);

    const [actor] = await withUserContext(this.prisma, userId, (tx) =>
      tx.$queryRaw<{ display_name: string }[]>`SELECT display_name FROM "user" WHERE id = ${userId}::uuid`,
    );

    await withTenantContext(this.prisma, workspaceId, (tx) =>
      log(tx, {
        workspaceId,
        projectId,
        actorUserId: userId,
        actorDisplayName: actor?.display_name ?? null,
        actionCode: 'environment_credential.revealed',
        entityType: 'environment_credential',
        entityId: credentialId,
        entityName: alias,
        category: 'Environments',
        details: { environmentId, environmentName: environment_name },
      }),
    );

    response.header('Cache-Control', 'no-store');
    return { password };
  }

  /**
   * Pre-computes every ciphertext a PATCH's `credentials` array needs, before the
   * update's own withTenantContext transaction opens — `encrypt()` manages its own
   * transaction internally and cannot be nested inside another (design.md).
   */
  private async planCredentialReconciliation(
    workspaceId: string,
    environmentId: string,
    projectId: string,
    rawCredentials: unknown,
  ): Promise<{
    deleteIds: string[];
    updates: { id: string; alias: string; email: string; ciphertext: string | null }[];
    inserts: { id: string; alias: string; email: string; ciphertext: string }[];
  }> {
    if (!Array.isArray(rawCredentials)) {
      throw new BadRequestException('credentials must be an array');
    }

    const existing = await withTenantContext(this.prisma, workspaceId, (tx) =>
      tx.$queryRaw<{ id: string }[]>`
        SELECT ec.id FROM environment_credential ec
        JOIN environment e ON e.id = ec.environment_id
        WHERE ec.environment_id = ${environmentId}::uuid AND e.project_id = ${projectId}::uuid
      `,
    );
    const existingIds = new Set(existing.map((row) => row.id));

    const items = rawCredentials as UpdateCredentialInput[];
    const aliases: string[] = [];
    const updateInputs: ValidatedCredentialUpdate[] = [];
    const newInputs: ValidatedNewCredential[] = [];
    const keptIds = new Set<string>();

    for (const item of items) {
      const alias = assertNonEmptyString(item.alias, 'credentials[].alias');
      const email = assertNonEmptyString(item.email, 'credentials[].email');
      aliases.push(alias);

      if (item.id !== undefined) {
        if (typeof item.id !== 'string' || !existingIds.has(item.id)) {
          throw new BadRequestException('credentials[].id does not belong to this environment');
        }
        if (item.password !== undefined && !isNonEmptyString(item.password)) {
          throw new BadRequestException('credentials[].password must be a non-empty string when provided');
        }
        keptIds.add(item.id);
        updateInputs.push({ id: item.id, alias, email, password: item.password as string | undefined });
      } else {
        const password = assertNonEmptyString(item.password, 'credentials[].password');
        newInputs.push({ alias, email, password });
      }
    }
    assertUniqueAliases(aliases);

    const deleteIds = [...existingIds].filter((id) => !keptIds.has(id));

    const updates = await Promise.all(
      updateInputs.map(async (update) => ({
        id: update.id,
        alias: update.alias,
        email: update.email,
        ciphertext: update.password ? await encrypt(this.prisma, workspaceId, update.id, update.password) : null,
      })),
    );

    const inserts = await Promise.all(
      newInputs.map(async (insert) => {
        const id = randomUUID();
        const ciphertext = await encrypt(this.prisma, workspaceId, id, insert.password);
        return { id, alias: insert.alias, email: insert.email, ciphertext };
      }),
    );

    return { deleteIds, updates, inserts };
  }
}
