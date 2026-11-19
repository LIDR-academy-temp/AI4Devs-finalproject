#!/usr/bin/env python3
"""Tests for check-before-pr.py.

Pipes PreToolUse hook input into the hook, with stand-in `npm` and `npx` commands
on the PATH, so the checks' results are controlled and each run is recorded.
Prints a table of expected and actual results. Nothing calls GitHub.

Run: python3 .claude/hooks/test_check_before_pr.py   (exit 1 if a case fails)
"""

import importlib.util
import json
import os
import stat
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
HOOK = os.path.join(HERE, "check-before-pr.py")

STAND_IN = """#!/bin/sh
echo "$(basename "$0") $*" >> "$RUN_LOG"
case "$*" in
  "run lint") [ -z "$FAIL_LINT" ] && exit 0; echo "lint error in app.tsx"; exit 1 ;;
  "tsc --noEmit") [ -z "$FAIL_TSC" ] && exit 0; echo "type error in app.tsx"; exit 1 ;;
  "test") [ -z "$FAIL_TEST" ] && exit 0; echo "failing test name"; exit 1 ;;
esac
exit 0
"""

ALL_RUN = ["npm run lint", "npx tsc --noEmit", "npm test"]


def bash(command):
    return {"tool_name": "Bash", "tool_input": {"command": command}}


def mcp(operation):
    return {"tool_name": "mcp__github__" + operation, "tool_input": {"owner": "o", "repo": "r"}}


# name, hook input, environment, expected exit code, checks run, text in the message
CASES = [
    # Checks and their results
    ("all checks pass", bash("gh pr create --fill"), {}, 0, ALL_RUN, None),
    ("lint failure blocks", bash("gh pr create"), {"FAIL_LINT": "1"}, 2, ALL_RUN, "lint error in app.tsx"),
    ("type error blocks", bash("gh pr create"), {"FAIL_TSC": "1"}, 2, ALL_RUN, "type error in app.tsx"),
    ("test failure blocks", bash("gh pr create"), {"FAIL_TEST": "1"}, 2, ALL_RUN, "failing test name"),
    ("test failure says how to start Postgres", bash("gh pr create"), {"FAIL_TEST": "1"}, 2, ALL_RUN,
     "docker compose up -d --wait"),
    ("every failure is reported", bash("gh pr create"), {"FAIL_LINT": "1", "FAIL_TEST": "1"}, 2, ALL_RUN,
     "lint error in app.tsx"),
    ("a failed check doesn't hide later ones", bash("gh pr create"), {"FAIL_LINT": "1", "FAIL_TEST": "1"}, 2,
     ALL_RUN, "failing test name"),

    # Other commands: no check runs
    ("gh pr view", bash("gh pr view 12"), {"FAIL_LINT": "1"}, 0, [], None),
    ("gh pr list", bash("gh pr list --state open"), {"FAIL_LINT": "1"}, 0, [], None),
    ("gh issue create", bash("gh issue create --title x"), {"FAIL_LINT": "1"}, 0, [], None),
    ("unrelated command", bash("npm run dev"), {"FAIL_LINT": "1"}, 0, [], None),
    ("echo mentions it", bash('echo "gh pr create"'), {"FAIL_LINT": "1"}, 0, [], None),
    ("grep mentions it", bash("grep -rn 'gh pr create' docs"), {"FAIL_LINT": "1"}, 0, [], None),
    ("commit message mentions it", bash('git commit -m "gh pr create is blocked"'), {"FAIL_LINT": "1"}, 0, [], None),
    ("heredoc mentions it", bash("cat <<'E'\ngh pr create\nE"), {"FAIL_LINT": "1"}, 0, [], None),
    ("gh api read of pulls", bash("gh api repos/o/r/pulls"), {"FAIL_LINT": "1"}, 0, [], None),
    ("gh api comment", bash("gh api repos/o/r/issues/1/comments -f body=x"), {"FAIL_LINT": "1"}, 0, [], None),
    ("gh api review on a pull", bash("gh api repos/o/r/pulls/1/reviews -f event=COMMENT"), {"FAIL_LINT": "1"}, 0, [], None),
    ("other MCP tool", mcp("get_pull_request"), {"FAIL_LINT": "1"}, 0, [], None),
    ("non-GitHub tool", {"tool_name": "Read", "tool_input": {"file_path": "x"}}, {"FAIL_LINT": "1"}, 0, [], None),

    # However the pull request is opened
    ("chained", bash("git push -u origin HEAD && gh pr create --fill"), {}, 0, ALL_RUN, None),
    ("after a semicolon", bash("cd . ; gh pr create"), {}, 0, ALL_RUN, None),
    ("in a subshell", bash("(gh pr create)"), {}, 0, ALL_RUN, None),
    ("in a substitution", bash('url=$(gh pr create --fill); echo "$url"'), {}, 0, ALL_RUN, None),
    ("inside bash -c", bash("bash -c 'gh pr create'"), {}, 0, ALL_RUN, None),
    ("through env", bash("env GH_TOKEN=x gh pr create"), {}, 0, ALL_RUN, None),
    ("with an assignment", bash("GH_TOKEN=x gh pr create"), {}, 0, ALL_RUN, None),
    ("with a global option", bash("gh pr -R o/r create"), {}, 0, ALL_RUN, None),
    ("through eval", bash("eval 'gh pr create'"), {}, 0, ALL_RUN, None),
    ("alias", bash("gh pr new --fill"), {}, 0, ALL_RUN, None),
    ("REST", bash("gh api repos/o/r/pulls -f title=x -f head=a -f base=main"), {}, 0, ALL_RUN, None),
    ("REST with a method", bash("gh api -X POST repos/o/r/pulls"), {}, 0, ALL_RUN, None),
    ("GraphQL", bash("gh api graphql -f query='mutation { createPullRequest(input: {}) { clientMutationId } }'"),
     {}, 0, ALL_RUN, None),
    ("MCP tool", mcp("create_pull_request"), {}, 0, ALL_RUN, None),
    ("failure blocks a wrapped command", bash("env X=1 bash -c 'gh pr create'"), {"FAIL_TEST": "1"}, 2, ALL_RUN,
     "failing test name"),
    ("failure blocks REST", bash("gh api repos/o/r/pulls -f title=x"), {"FAIL_LINT": "1"}, 2, ALL_RUN, "lint error"),
    ("failure blocks the MCP tool", mcp("create_pull_request"), {"FAIL_TSC": "1"}, 2, ALL_RUN, "type error"),

    # When the hook can't tell
    ("program in a variable", bash("$GH pr create"), {}, 2, [], "couldn't check this call safely"),
    ("GraphQL from a file", bash("gh api graphql --input body.json"), {}, 2, [], "couldn't check this call safely"),
    ("no command in the input", {"tool_name": "Bash", "tool_input": {}}, {}, 2, [], "couldn't check this call safely"),
]


def run(tmp, payload, env, raw=None):
    log = os.path.join(tmp, "run.log")
    if os.path.exists(log):
        os.remove(log)
    full_env = dict(os.environ, PATH=os.path.join(tmp, "bin") + os.pathsep + os.environ["PATH"],
                    CLAUDE_PROJECT_DIR=tmp, RUN_LOG=log, **env)
    for name in ("FAIL_LINT", "FAIL_TSC", "FAIL_TEST"):
        if name not in env:
            full_env.pop(name, None)
    text = raw if raw is not None else json.dumps(dict(payload, cwd=tmp))
    result = subprocess.run([sys.executable, HOOK], input=text, env=full_env, cwd=tmp,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            universal_newlines=True, timeout=60)
    ran = open(log).read().splitlines() if os.path.exists(log) else []
    return result.returncode, ran, result.stderr


def time_limit_case(tmp):
    """The time limit stops a check and reports it. Runs in this process, to shorten it."""
    spec = importlib.util.spec_from_file_location("check_before_pr", HOOK)
    hook = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(hook)
    hook.TIME_LIMIT = 1
    hook.CHECKS = (("slow", ["sleep", "30"]), ("next", ["true"]))
    failures = hook.run_checks(tmp)
    names = [name for name, _ in failures]
    return names == ["slow", "next"] and "time limit" in failures[0][1] and "time limit" in failures[1][1]


def main():
    failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        tmp = os.path.realpath(tmp)
        os.mkdir(os.path.join(tmp, "bin"))
        for name in ("npm", "npx"):
            path = os.path.join(tmp, "bin", name)
            with open(path, "w") as f:
                f.write(STAND_IN)
            os.chmod(path, os.stat(path).st_mode | stat.S_IEXEC)

        for name, payload, env, code, checks, text in CASES:
            actual_code, ran, message = run(tmp, payload, env)
            ok = actual_code == code and ran == checks and (text is None or text in message)
            failed += not ok
            print("%-4s %-45s expected exit %d, got %d, %d check(s) run" % (
                "ok" if ok else "FAIL", name, code, actual_code, len(ran)))
            if not ok:
                print("     ran: %s\n     message: %s" % (ran, message))

        code, ran, message = run(tmp, {}, {}, raw="not json")
        ok = code == 2 and "internal error" in message
        failed += not ok
        print("%-4s %-45s expected exit 2, got %d" % ("ok" if ok else "FAIL", "internal error blocks", code))

        ok = time_limit_case(tmp)
        failed += not ok
        print("%-4s %s" % ("ok" if ok else "FAIL", "time limit stops a check and is reported"))

    print("\n%d case(s) failed" % failed if failed else "\nAll cases passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
