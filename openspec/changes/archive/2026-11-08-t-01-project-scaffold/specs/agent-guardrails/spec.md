# Spec Delta

## Purpose

Makes Claude Code's quality checks automatic rather than dependent on Claude remembering them: failing code can't become a pull request, and lint errors reach Claude as soon as a file is edited.

## ADDED Requirements

### Requirement: Pull requests are blocked while checks fail

Before Claude Code opens a pull request, a hook SHALL run `npm run lint`, `tsc --noEmit`, and `npm test`, and SHALL block the pull request, showing Claude the errors, if any of them fails.

#### Scenario: All checks pass

- **GIVEN** linting, type checks, and tests all pass
- **WHEN** Claude Code runs `gh pr create`
- **THEN** the command proceeds

#### Scenario: A lint failure blocks the pull request

- **GIVEN** `npm run lint` fails
- **WHEN** Claude Code runs `gh pr create`
- **THEN** the command is blocked, and Claude sees the lint errors

#### Scenario: A type error blocks the pull request

- **GIVEN** `tsc --noEmit` fails
- **WHEN** Claude Code runs `gh pr create`
- **THEN** the command is blocked, and Claude sees the type errors

#### Scenario: A test failure blocks the pull request

- **GIVEN** `npm test` fails
- **WHEN** Claude Code runs `gh pr create`
- **THEN** the command is blocked, and Claude sees the failing tests

#### Scenario: Postgres isn't running

- **GIVEN** the local Postgres isn't running, so `npm test` can't pass
- **WHEN** Claude Code runs `gh pr create`
- **THEN** the command is blocked, and the message says how to start Postgres

#### Scenario: Other commands aren't slowed down

- **WHEN** Claude Code runs a command that doesn't open a pull request, such as `gh pr view`, or text that only mentions `gh pr create`
- **THEN** no check runs and the command proceeds

### Requirement: The usual ways of opening a pull request are covered

The hook SHALL recognize a pull request being opened through `gh` or a GitHub MCP tool, including when the command is chained or wrapped. When it can't tell what such a command would do, it SHALL block and say why. Other programs that call GitHub, such as `curl` or a script file, aren't recognized; CI and branch protection stop those from merging.

#### Scenario: Wrapped or chained commands are recognized

- **WHEN** `gh pr create` is run after other commands, inside `bash -c`, through a wrapper such as `env`, or with global options such as `--repo`
- **THEN** the checks run first

#### Scenario: The command's alias is recognized

- **WHEN** Claude Code runs `gh pr new`
- **THEN** the checks run first

#### Scenario: The GitHub API is recognized

- **WHEN** Claude Code creates a pull request through `gh api`, with a REST `POST` to the pulls endpoint or the GraphQL `createPullRequest` mutation
- **THEN** the checks run first

#### Scenario: The GitHub MCP tool is recognized

- **WHEN** Claude Code calls a GitHub MCP tool that creates a pull request
- **THEN** the checks run first

#### Scenario: The hook fails

- **GIVEN** the hook hits an internal error or a time limit
- **WHEN** Claude Code tries to open a pull request
- **THEN** the pull request is blocked, and the message says why

### Requirement: Lint errors are shown after each edit

After Claude Code edits or writes a file, a hook SHALL run ESLint on that file and SHALL show Claude any errors. The edit itself is kept.

#### Scenario: An edited file has lint errors

- **WHEN** Claude Code edits or writes a source file that breaks an ESLint rule
- **THEN** Claude is shown the errors for that file, with the file's name and each rule

#### Scenario: An edited file is clean

- **WHEN** Claude Code edits or writes a source file with no lint errors
- **THEN** nothing is shown and work continues

#### Scenario: Files ESLint doesn't handle are skipped

- **WHEN** Claude Code edits a Markdown file, or a file ESLint is configured to ignore
- **THEN** no error is shown

#### Scenario: Dependencies aren't installed yet

- **GIVEN** a clone where ESLint isn't installed
- **WHEN** Claude Code edits a source file
- **THEN** the edit isn't reported as a lint failure

### Requirement: Hooks are shared and tested

The hooks SHALL be configured in `.claude/settings.json`, with their scripts in `.claude/hooks/` next to the branch-protection hook, and SHALL have automated tests that call nothing outside the machine. The branch-protection hook SHALL keep working unchanged.

#### Scenario: A fresh clone gets the hooks

- **WHEN** Claude Code runs in a fresh clone
- **THEN** both new hooks and the branch-protection hook are active, without any local configuration

#### Scenario: Hook tests pass

- **WHEN** the hook test scripts run locally; CI doesn't run them
- **THEN** every scenario in this capability that a script can reproduce passes, and the existing branch-protection tests still pass, with no call to GitHub
