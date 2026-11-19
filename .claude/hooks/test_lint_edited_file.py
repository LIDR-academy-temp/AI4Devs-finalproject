#!/usr/bin/env python3
"""Tests for lint-edited-file.py.

Builds a throwaway project with a stand-in ESLint that fails on files named
bad.*, pipes PostToolUse hook input into the hook, and prints a table of expected
and actual results.

Run: python3 .claude/hooks/test_lint_edited_file.py   (exit 1 if a case fails)
"""

import json
import os
import stat
import subprocess
import sys
import tempfile

HOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lint-edited-file.py")

STAND_IN = """#!/bin/sh
for last; do :; done
case "$(basename "$last")" in
  bad.*) echo "$last: no-unused-vars"; exit 1 ;;
esac
exit 0
"""


def write(path, content=""):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


def run(project, payload, raw=None):
    env = dict(os.environ, CLAUDE_PROJECT_DIR=project)
    text = raw if raw is not None else json.dumps(payload)
    result = subprocess.run([sys.executable, HOOK], input=text, env=env, cwd=project,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            universal_newlines=True, timeout=30)
    return result.returncode, result.stderr


def edit(path, tool="Edit", cwd=None):
    payload = {"tool_name": tool, "tool_input": {"file_path": path}}
    if cwd:
        payload["cwd"] = cwd
    return payload


def main():
    failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        tmp = os.path.realpath(tmp)
        project = os.path.join(tmp, "project")
        bare = os.path.join(tmp, "bare")
        outside = os.path.join(tmp, "outside")

        eslint = os.path.join(project, "node_modules", ".bin", "eslint")
        write(eslint, STAND_IN)
        os.chmod(eslint, os.stat(eslint).st_mode | stat.S_IEXEC)
        for name in ("src/bad.ts", "src/good.ts", "src/(public)/bad.tsx", "docs/notes.md"):
            write(os.path.join(project, name))
        write(os.path.join(bare, "src/bad.ts"))
        write(os.path.join(outside, "bad.ts"))

        src = os.path.join(project, "src")
        cases = [
            # name, project, hook input, expected exit code, text in the message
            ("an edit with errors is reported", project, edit(src + "/bad.ts"), 2, "no-unused-vars"),
            ("a write with errors is reported", project, edit(src + "/bad.ts", "Write"), 2, "bad.ts"),
            ("a path with parentheses works", project, edit(src + "/(public)/bad.tsx"), 2, "bad.tsx"),
            ("a relative path works", project, edit("src/bad.ts", cwd=project), 2, "no-unused-vars"),
            ("a clean file reports nothing", project, edit(src + "/good.ts"), 0, ""),
            ("Markdown is skipped", project, edit(project + "/docs/notes.md"), 0, ""),
            ("a file outside the project is skipped", project, edit(outside + "/bad.ts"), 0, ""),
            ("a deleted file is skipped", project, edit(src + "/gone.ts"), 0, ""),
            ("no file path is skipped", project, {"tool_name": "Edit", "tool_input": {}}, 0, ""),
            ("missing ESLint isn't a failure", bare, edit(bare + "/src/bad.ts"), 0, ""),
        ]
        for name, root, payload, code, text in cases:
            actual, message = run(root, payload)
            ok = actual == code and text in message and (text or not message)
            failed += not ok
            print("%-4s %-40s expected exit %d, got %d" % ("ok" if ok else "FAIL", name, code, actual))
            if not ok:
                print("     message: %s" % message)

        actual, message = run(project, None, raw="not json")
        ok = actual == 1 and "couldn't run" in message
        failed += not ok
        print("%-4s %-40s expected exit 1, got %d" % ("ok" if ok else "FAIL", "a hook error doesn't interrupt", actual))

    print("\n%d case(s) failed" % failed if failed else "\nAll cases passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
