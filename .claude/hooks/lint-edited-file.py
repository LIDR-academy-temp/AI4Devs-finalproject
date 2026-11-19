#!/usr/bin/env python3
"""Claude Code PostToolUse hook for the tools that edit or write files.

Runs ESLint on the file Claude just changed and shows Claude any errors. The edit
stays: the tool has already run, so this reports problems and never undoes one.

Skips files that ESLint doesn't handle, files outside the project, and projects
where ESLint isn't installed yet. Warnings count as errors, like `npm run lint`.

Exit 0 means nothing to report; exit 2 passes the errors on stderr to Claude.
Exit 1 reports a problem with the hook itself, without interrupting Claude.

Configured in .claude/settings.json. Tests: .claude/hooks/test_lint_edited_file.py.
Written for the system Python 3 on macOS (3.9), standard library only.
"""

import json
import os
import subprocess
import sys

EXTENSIONS = (".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts")
# Seconds for ESLint, below the 60 in .claude/settings.json.
TIME_LIMIT = 50


def main():
    try:
        data = json.load(sys.stdin)
        path = (data.get("tool_input") or {}).get("file_path")
        if not isinstance(path, str) or not path.endswith(EXTENSIONS):
            return 0

        here = os.path.dirname(os.path.abspath(__file__))
        root = os.path.realpath(os.environ.get("CLAUDE_PROJECT_DIR")
                                or os.path.dirname(os.path.dirname(here)))
        cwd = data.get("cwd") or root
        path = os.path.realpath(os.path.join(cwd, path))
        if not path.startswith(root + os.sep) or not os.path.isfile(path):
            return 0

        eslint = os.path.join(root, "node_modules", ".bin", "eslint")
        if not os.path.exists(eslint):
            return 0

        result = subprocess.run(
            [eslint, "--no-warn-ignored", "--max-warnings", "0", path], cwd=root,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, universal_newlines=True,
            errors="replace", timeout=TIME_LIMIT)
        if result.returncode == 0:
            return 0
        print("ESLint found problems in the file you just changed:\n%s"
              % result.stdout.strip(), file=sys.stderr)
        return 2
    except Exception as error:
        print("The lint hook couldn't run: %s: %s" % (type(error).__name__, error),
              file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
