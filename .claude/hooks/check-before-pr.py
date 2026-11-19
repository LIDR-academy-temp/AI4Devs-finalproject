#!/usr/bin/env python3
"""Claude Code PreToolUse hook for the Bash tool and the GitHub MCP tools.

Stops Claude Code from opening a pull request while linting, type checks, or
tests fail. When a tool call would open a pull request, it runs the three checks
from the project root and blocks the call, showing Claude the errors, if any of
them fails. Everything else passes straight through.

It recognizes `gh pr create`, its alias `gh pr new`, `gh api` calls that create a
pull request (REST and GraphQL), and the GitHub MCP tool, however the command is
chained or wrapped. Parsing is reused from protect-branches.py, so the two hooks
read commands the same way. When it can't tell what a command would do, or when
it fails, it blocks and says why instead of allowing it.

Exit 0 allows the call; exit 2 blocks it, and Claude Code passes the message on
stderr to Claude. It checks the working tree: CI checks the pushed commit.

Configured in .claude/settings.json. Tests: .claude/hooks/test_check_before_pr.py.
Written for the system Python 3 on macOS (3.9), standard library only.
"""

import importlib.util
import json
import os
import re
import signal
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))

CHECKS = (
    ("npm run lint", ["npm", "run", "lint"]),
    ("tsc --noEmit", ["npx", "tsc", "--noEmit"]),
    ("npm test", ["npm", "test"]),
)
# Seconds for all three checks, below the 600 in .claude/settings.json, so that
# running out of time produces a message here instead of a killed hook.
TIME_LIMIT = 570
# Lines of output kept per failed check: the end has the errors and the summary.
OUTPUT_LINES = 60

MSG_BLOCKED = "Blocked by the pre-PR check hook: fix these before opening a pull request."
MSG_POSTGRES = ("`npm test` needs the local Postgres. If it isn't running, start it with "
                "`docker compose up -d --wait`.")
MSG_UNSURE = ("Blocked by the pre-PR check hook: it couldn't check this call safely "
              "({detail}). Rewrite it as a plain `gh pr create` command.")


class OpensPullRequest(Exception):
    """The tool call would open a pull request."""


def load_parser():
    """A private copy of protect-branches.py that detects pull requests instead.

    Its branch rules are switched off in this copy only: the hook itself runs
    separately and unchanged. What stays is how it finds the program in a command:
    chains, subshells, `bash -c`, wrappers, and text that only mentions gh.
    """
    sys.dont_write_bytecode = True
    spec = importlib.util.spec_from_file_location(
        "protect_branches_parser", os.path.join(HERE, "protect-branches.py"))
    parser = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(parser)

    parser.GH_API_WRITE_RE = re.compile(r"(^|/)pulls/?$")
    parser.GH_GRAPHQL_WRITE_RE = re.compile(r"\bcreatePullRequest\b")
    parser.VARIABLE_PROGRAM_VERBS = {"pr", "api"}

    def detect_gh(args):
        positional, i = [], 0
        while i < len(args) and len(positional) < 2:
            arg = args[i]
            if arg in parser.GH_GLOBAL_OPTIONS_WITH_VALUE:
                i += 2
                continue
            if not arg.startswith("-"):
                positional.append(arg)
            i += 1
        if positional in (["pr", "create"], ["pr", "new"]):
            raise OpensPullRequest()
        if positional[:1] == ["api"]:
            try:
                parser.check_gh_api(args[args.index("api") + 1:])
            except parser.Block:
                raise OpensPullRequest()

    parser.check_gh = detect_gh

    class Detector(parser.Checker):
        def check_git(self, args, depth, options=None):
            pass  # git commands can't open a pull request

        def git_env_options(self, assignments):
            return []

    return parser, Detector


def opens_pull_request(data, parser, detector):
    tool = str(data.get("tool_name") or "")
    tool_input = data.get("tool_input") or {}
    if tool.lower().startswith("mcp__") and "github" in tool.lower():
        return tool.split("__")[-1].startswith("create_pull_request")
    if tool != "Bash":
        return False
    command = tool_input.get("command")
    if not isinstance(command, str):
        raise parser.Unsure("the hook input has no command")
    lowered = command.lower()
    if "gh" not in lowered:
        return False
    cwd = data.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    try:
        detector(cwd).check(command)
    except OpensPullRequest:
        return True
    return False


def run_check(command, root, deadline):
    """Run one check; return its output if it failed, or None if it passed."""
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return "not run: the time limit was reached"
    try:
        process = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, universal_newlines=True,
                                   errors="replace", start_new_session=True)
    except OSError as error:
        return "couldn't start: %s" % error
    try:
        output, _ = process.communicate(timeout=remaining)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        return "stopped: the time limit of %d seconds was reached" % TIME_LIMIT
    if process.returncode == 0:
        return None
    return "\n".join(output.strip().splitlines()[-OUTPUT_LINES:])


def run_checks(root):
    """Run every check, so Claude sees all the failures at once."""
    deadline = time.monotonic() + TIME_LIMIT
    failures = []
    for name, command in CHECKS:
        output = run_check(command, root, deadline)
        if output is not None:
            failures.append((name, output))
    return failures


def main():
    try:
        data = json.load(sys.stdin)
        parser, detector = load_parser()
        try:
            if not opens_pull_request(data, parser, detector):
                return 0
        except (parser.Block, parser.Unsure) as error:
            print(MSG_UNSURE.format(detail=error), file=sys.stderr)
            return 2

        root = os.environ.get("CLAUDE_PROJECT_DIR") or os.path.dirname(os.path.dirname(HERE))
        failures = run_checks(root)
        if not failures:
            return 0

        print(MSG_BLOCKED, file=sys.stderr)
        for name, output in failures:
            print("\n--- `%s` failed ---\n%s" % (name, output), file=sys.stderr)
            if name == "npm test":
                print("\n%s" % MSG_POSTGRES, file=sys.stderr)
        return 2
    except Exception as error:  # a bug in this hook must block, never allow
        detail = "internal error: %s: %s" % (type(error).__name__, error)
        print(MSG_UNSURE.format(detail=detail), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
