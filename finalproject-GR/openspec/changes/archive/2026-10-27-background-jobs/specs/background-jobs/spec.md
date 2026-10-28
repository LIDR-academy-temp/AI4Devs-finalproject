# Spec Delta

## Purpose

The background job queue and the worker process that runs it: how work is enqueued atomically with the change that causes it, which jobs exist, how scheduled jobs run, and what the worker may touch in the database.

## ADDED Requirements

### Requirement: Jobs are enqueued in the same transaction as the change that triggers them
The system SHALL let application code enqueue a job inside the database transaction of the change it belongs to, so the job exists if and only if that transaction commits.

#### Scenario: The change commits
- **WHEN** a transaction enqueues a `trash_purge` job and commits
- **THEN** the job is in the queue

#### Scenario: The change rolls back
- **WHEN** a transaction enqueues a `trash_purge` job and then rolls back
- **THEN** no job is in the queue

### Requirement: Only known task names can be enqueued
The system SHALL refuse to enqueue a job whose task name is not on the allow-list of tasks the worker implements, failing the enclosing transaction. The application's database role SHALL have no other way to write to the queue.

#### Scenario: Unknown task name
- **WHEN** application code tries to enqueue a job named `drop_everything`
- **THEN** the statement fails and nothing is queued

#### Scenario: Direct queue access
- **WHEN** the application's database role tries to insert into or read the queue's tables directly
- **THEN** the database refuses for lack of privileges

### Requirement: The worker runs jobs with the least database privilege
The worker SHALL connect with its own database role that cannot bypass row-level security and that owns no objects. It SHALL do tenant work only under one workspace's tenant context at a time. Apart from the queue schema, it SHALL be able to list workspace ids but read no other tenant row without that context.

#### Scenario: Tenant data without context
- **WHEN** the worker's role queries test cases without a workspace context
- **THEN** no rows are returned

#### Scenario: Listing workspaces
- **WHEN** the worker's role lists workspaces without a context
- **THEN** it gets every workspace's id

### Requirement: Scheduled jobs run on a fixed schedule
The worker SHALL run `trash_purge` once a day. Running several worker processes SHALL NOT schedule it more than once for the same time.

#### Scenario: Two workers running
- **WHEN** two worker processes are running when the daily schedule comes due
- **THEN** exactly one `trash_purge` job is queued for that time

### Requirement: The worker stops gracefully
On a termination signal the worker SHALL stop taking new jobs, let running jobs finish, and then exit.

#### Scenario: Stopping during a job
- **WHEN** the worker receives SIGTERM while a job is running
- **THEN** the job completes and the process exits without taking another job
