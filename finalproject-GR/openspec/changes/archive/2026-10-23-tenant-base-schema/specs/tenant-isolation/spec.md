# Spec Delta

## Purpose

Guarantees that data belonging to one workspace is never visible or writable under another workspace's context, regardless of which part of the system accesses it.

## ADDED Requirements

### Requirement: Cross-tenant reads return nothing
The system SHALL ensure that a read scoped to one workspace never returns rows belonging to another workspace, regardless of entry point (API query, raw SQL, or a background job).

#### Scenario: Reading a table with rows from two workspaces
- **WHEN** a query scoped to workspace A runs against a tenant table containing rows for both workspace A and workspace B
- **THEN** only workspace A's rows are returned, and none of workspace B's

### Requirement: Missing tenant context fails closed
The system SHALL return zero rows from a tenant-table query that runs with no workspace context set, rather than returning unscoped data from every workspace.

#### Scenario: Query with no workspace context
- **WHEN** a query runs against a tenant table with no workspace context set
- **THEN** it returns zero rows, not an error and not unscoped data

### Requirement: Cross-tenant writes are rejected
The system SHALL reject an attempt to write a row whose `workspace_id` does not match the active tenant context.

#### Scenario: Insert with a mismatched workspace_id
- **WHEN** a write scoped to workspace A attempts to insert or update a row with `workspace_id` set to workspace B
- **THEN** the write fails

### Requirement: Every tenant table is verified to carry an isolation policy
The system SHALL fail its build if any table with a `workspace_id` column lacks a forced Row-Level Security policy, so isolation coverage cannot silently regress as tables are added.

#### Scenario: New tenant table added without a policy
- **WHEN** a table with a `workspace_id` column is added without a corresponding forced RLS policy
- **THEN** the automated check fails the build
