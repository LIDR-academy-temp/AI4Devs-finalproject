#!/usr/bin/env python3
"""Tests for protect-branches.py.

Builds throwaway repositories (a bare remote, and worktrees on main, a ticket
branch, delivery branches, and a detached HEAD), pipes PreToolUse hook input
into the hook for each case (Bash commands and GitHub MCP tool calls), and
prints a table of expected and actual results. Nothing calls GitHub.

Run: python3 .claude/hooks/test_protect_branches.py   (exit 1 if a case fails)
"""

import json
import os
import subprocess
import sys
import tempfile

HOOK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "protect-branches.py")

# Which hook message a block carries, recognized by a phrase unique to it.
KINDS = [
    ("and this would commit directly", "commit-main"),
    ("you're on the delivery branch", "commit-delivery"),
    ("this push would update 'main'", "push-main"),
    ("is a delivery branch and only receives main", "push-delivery"),
    ("would delete the protected", "delete"),
    ("force pushes (", "force"),
    ("could update every matching", "all"),
    ("--prune` can delete", "prune"),
    ("couldn't check this command safely", "unsure"),
    ("would add commits to the protected branch", "local-commits"),
    ("merging a pull request changes main", "merge"),
    ("would write to the protected branch", "github-write"),
    ("can't see which branch", "github-unknown"),
    ("this `gh api` call writes", "gh-api"),
    ("`gh repo sync` can overwrite", "repo-sync"),
]

REPO = {"owner": "ojordan0", "repo": "AI4Devs-finalproject"}


def mcp(operation, **tool_input):
    """A GitHub MCP tool call instead of a Bash command."""
    return {"tool": "mcp__github__" + operation, "input": dict(REPO, **tool_input)}

HEREDOC_ON_MAIN = """git commit -F - <<'EOF'
Add the hook
EOF"""

HEREDOC_MENTIONING_PUSH = """git commit -F - <<'EOF'
Explain the delivery push

git checkout main
git push --force origin main
EOF"""

SUBSTITUTED_MESSAGE = """git commit -m "$(cat <<'EOF'
Push main later
EOF
)\""""

COMMENT_THEN_FORCE = """git status  # check first
git push -f"""

# (id, what it covers, command, directory key, expected)
CASES = [
    # Commits on protected branches
    ("B01", "commit on main", 'git commit -m "Add hook"', "main", "commit-main"),
    ("B02", "commit on a delivery branch", 'git commit -m "x"', "delivery2", "commit-delivery"),
    ("B03", "commit on final-project-OJE", 'git commit -m "x"', "final", "commit-delivery"),
    ("B04", "chained add && commit on main", 'git add . && git commit -m "wip"', "main", "commit-main"),
    ("B05", "git -C <main worktree> commit", 'git -C {main} commit -m "x"', "ticket", "commit-main"),
    ("B06", "leading cd <main> && commit", 'cd {main} && git commit -am "x"', "ticket", "commit-main"),
    ("B07", "relative cd into main worktree", 'cd {root} && cd repo && git commit -m "x"', "ticket", "commit-main"),
    ("B08", "heredoc commit message on main", HEREDOC_ON_MAIN, "main", "commit-main"),
    ("B09", "checkout main && commit (same command)", 'git checkout main && git commit -m "x"', "ticket", "commit-main"),
    ("B10", "commit through an alias (ci = commit)", 'git ci -m "x"', "main", "commit-main"),
    # Pushes to main
    ("B11", "bare git push on main", "git push", "main", "push-main"),
    ("B12", "git push origin main from a ticket branch", "git push origin main", "ticket", "push-main"),
    ("B13", "git push origin HEAD:main on main", "git push origin HEAD:main", "main", "push-main"),
    ("B14", "git push -u origin HEAD on main", "git push -u origin HEAD", "main", "push-main"),
    ("B15", "push to refs/heads/main", "git push origin HEAD:refs/heads/main", "ticket", "push-main"),
    ("B16", "push main with redirection and pipe", "git push origin main 2>&1 | tail -3", "ticket", "push-main"),
    ("B17", "push main inside bash -c", "bash -c 'git push origin main'", "ticket", "push-main"),
    # Force pushes
    ("B18", "--force on a ticket branch", "git push --force", "ticket", "force"),
    ("B19", "-f with an explicit branch", "git push -f origin t-07-groups-api", "ticket", "force"),
    ("B20", "--force-with-lease", "git push --force-with-lease origin HEAD", "ticket", "force"),
    ("B21", "--force-with-lease=<ref>", "git push --force-with-lease=t-07-groups-api origin HEAD", "ticket", "force"),
    ("B22", "+refspec", "git push origin +t-07-groups-api", "ticket", "force"),
    ("B23", "combined short flags -uf", "git push -uf origin HEAD", "ticket", "force"),
    ("B24", "delivery push with --force", "git push origin main:feature/entrega-1-OJE --force", "ticket", "force"),
    ("B25", "delivery push with +refspec", "git push origin +main:feature/entrega-1-OJE", "ticket", "force"),
    ("B26", "force push behind a wrapper (timeout)", "timeout 60 git push --force-with-lease", "ticket", "force"),
    ("B27", "force push through an alias (pf)", "git pf", "ticket", "force"),
    ("B28", "--mirror", "git push --mirror", "ticket", "force"),
    ("B29", "force push after a comment, on the next line", COMMENT_THEN_FORCE, "ticket", "force"),
    # Delivery branches, deletions, everything-at-once pushes
    ("B30", "delivery branch from a ticket branch", "git push origin t-07-groups-api:feature/entrega-1-OJE", "ticket", "push-delivery"),
    ("B31", "bare git push on a delivery branch", "git push", "delivery2", "push-delivery"),
    ("B32", "--delete a delivery branch", "git push origin --delete feature/entrega-2-OJE", "ticket", "delete"),
    ("B33", "delete main with :main", "git push origin :main", "ticket", "delete"),
    ("B34", "--all", "git push --all origin", "ticket", "all"),
    ("B35", "--prune", "git push --prune origin t-07-groups-api", "ticket", "prune"),
    # The hook can't tell: blocks with an explanation
    ("B36", "push target from a variable", "for b in main; do git push origin $b; done", "ticket", "unsure"),
    ("B37", "cd into a missing directory", 'cd /does/not/exist && git commit -m "x"', "ticket", "unsure"),
    ("B38", "cd into an unset variable", 'cd "$NO_SUCH_VAR_XYZ" && git commit -m "x"', "ticket", "unsure"),
    ("B39", "commit outside a git repository", 'git commit -m "x"', "notrepo", "unsure"),
    ("B40", "unterminated quote", 'git commit -m "unterminated', "ticket", "unsure"),
    ("B41", "invalid hook input JSON", None, "ticket", "unsure"),
    # Review of PR #46: each finding reproduced
    ("R01", "destination heads/main (suffix of refs/heads/main)", "git push origin HEAD:heads/main", "ticket", "push-main"),
    ("R02", "delete heads/<delivery branch>", "git push origin :heads/feature/entrega-1-OJE", "ticket", "delete"),
    ("R03", "--delete heads/main", "git push origin --delete heads/main", "ticket", "delete"),
    ("R04", "destination in another letter case", "git push origin HEAD:MAIN", "ticket", "push-main"),
    ("R05", "delivery branch in another case, full ref", "git push origin HEAD:refs/heads/Final-Project-OJE", "ticket", "push-delivery"),
    ("R06", "GIT_DIR prefix pointing at the main worktree", 'GIT_DIR={main}/.git git commit -m "x"', "ticket", "commit-main"),
    ("R07", "GIT_DIR through env", 'env GIT_DIR={main}/.git git commit -m "x"', "ticket", "commit-main"),
    ("R08", "GIT_DIR through export", 'export GIT_DIR={main}/.git && git commit -m "x"', "ticket", "commit-main"),
    ("R09", "GIT_DIR from an unresolvable variable", 'GIT_DIR="$NO_SUCH_VAR_XYZ" git commit -m "x"', "ticket", "unsure"),
    ("R10", "git merge on main", "git merge t-07-groups-api", "main", "local-commits"),
    ("R11", "git cherry-pick on a delivery branch", "git cherry-pick abc123", "delivery2", "local-commits"),
    ("R12", "git revert on main", "git revert HEAD", "main", "local-commits"),
    ("R13", "git rebase on main", "git rebase -i HEAD~3", "main", "local-commits"),
    ("R14", "git am on main", "git am fix.patch", "main", "local-commits"),
    ("R15", "cd inside a subshell doesn't carry over", '(cd {ticket}); git commit -m "x"', "main", "commit-main"),
    ("R16", "gh api graphql --input file", "gh api graphql --input mutation.json", "ticket", "unsure"),
    ("R17", "wrapper with option values (sudo -u)", "sudo -u ojordan git push --force", "ticket", "force"),
    ("R18", "env -C changes the directory", 'env -C {main} git commit -m "x"', "ticket", "unsure"),
    ("R19", "MCP write to heads/main", mcp("push_files", branch="heads/Main", message="x", files=[]), "ticket", "github-write"),
    # Re-review of PR #46: each finding reproduced
    ("Q01", "find -exec git push", "find . -exec git push origin main \\;", "ticket", "push-main"),
    ("Q02", "arch -arm64 git push", "arch -arm64 git push origin main", "ticket", "push-main"),
    ("Q03", "ssh host git push", "ssh host git push origin main", "ticket", "push-main"),
    ("Q04", "watch git push", "watch git push origin main", "ticket", "push-main"),
    ("Q05", "xcrun git commit on main", 'xcrun git commit -m "x"', "main", "commit-main"),
    ("Q06", "su -c with a quoted git command", "su ojordan -c 'git push --force'", "ticket", "force"),
    ("Q07", "git push inside $( )", "echo $(git push origin main)", "ticket", "push-main"),
    ("Q08", "git push inside backquotes", "echo `git push --force`", "ticket", "force"),
    ("Q09", "git push inside an assignment's $( )", "x=$(git push origin main)", "ticket", "push-main"),
    ("Q10", "git commit inside $( ) in double quotes, on main", 'echo "$(git commit -m x)"', "main", "commit-main"),
    ("Q11", "program given as a variable", "$GIT push origin main", "ticket", "unsure"),
    ("Q12", "gh pr -R owner/repo merge", "gh pr -R o/r merge 5", "ticket", "merge"),
    ("Q13", "gh --repo owner/repo pr merge", "gh --repo o/r pr merge 5", "ticket", "merge"),
    # GitHub without git: MCP tools and the gh CLI
    ("G01", "MCP push_files to main", mcp("push_files", branch="main", message="x", files=[]), "ticket", "github-write"),
    ("G02", "MCP create_or_update_file on a delivery branch", mcp("create_or_update_file", branch="feature/entrega-1-OJE", path="a.md", content="x", message="x"), "ticket", "github-write"),
    ("G03", "MCP delete_file on refs/heads/main", mcp("delete_file", branch="refs/heads/main", path="a.md", message="x"), "ticket", "github-write"),
    ("G04", "MCP create_branch named like a delivery branch", mcp("create_branch", branch="final-project-OJE"), "ticket", "github-write"),
    ("G05", "MCP merge_pull_request", mcp("merge_pull_request", pullNumber=46, merge_method="squash"), "ticket", "merge"),
    ("G06", "MCP update_pull_request_branch", mcp("update_pull_request_branch", pullNumber=46), "ticket", "github-unknown"),
    ("G07", "MCP push_files with an empty branch", mcp("push_files", branch="", message="x", files=[]), "ticket", "unsure"),
    ("G08", "gh pr merge", "gh pr merge 46 --squash", "ticket", "merge"),
    ("G09", "gh repo sync", "gh repo sync", "ticket", "repo-sync"),
    ("G10", "gh api PUT contents on main", "gh api -X PUT repos/o/r/contents/README.md -f message=x -f branch=main", "ticket", "gh-api"),
    ("G11", "gh api PATCH refs/heads/main", "gh api repos/o/r/git/refs/heads/main -X PATCH -f sha=abc -F force=true", "ticket", "gh-api"),
    ("G12", "gh api merges (POST implied by -f)", "gh api repos/o/r/merges -f base=main -f head=t-07-groups-api", "ticket", "gh-api"),
    ("G13", "gh api graphql mergePullRequest", "gh api graphql -f query='mutation { mergePullRequest(input: {pullRequestId: \"x\"}) { clientMutationId } }'", "ticket", "gh-api"),
    ("G14", "gh pr merge behind cd &&", "cd {ticket} && gh pr merge --auto --squash", "main", "merge"),
    # Allowed
    ("A01", "commit on a ticket branch", 'git commit -m "Add hook"', "ticket", "allow"),
    ("A02", "message mentioning main and push", 'git add . && git commit -m "Merge main into push docs"', "ticket", "allow"),
    ("A03", "message that is a forbidden command", 'git commit -m "git push --force origin main"', "ticket", "allow"),
    ("A04", "heredoc body with checkout/push lines", HEREDOC_MENTIONING_PUSH, "ticket", "allow"),
    ("A05", "$(cat <<EOF) message mentioning main", SUBSTITUTED_MESSAGE, "ticket", "allow"),
    ("A06", "git push -u origin HEAD on a ticket branch", "git push -u origin HEAD", "ticket", "allow"),
    ("A07", "bare git push on a ticket branch", "git push", "ticket", "allow"),
    ("A08", "push a ticket branch by name", "git push origin t-07-groups-api", "ticket", "allow"),
    ("A09", "delivery push D1", "git push origin main:feature/entrega-1-OJE", "main", "allow"),
    ("A10", "delivery push D2", "git push origin main:feature/entrega-2-OJE", "ticket", "allow"),
    ("A11", "delivery push D3", "git push origin main:final-project-OJE", "main", "allow"),
    ("A12", "git -C <ticket worktree> commit from main", 'git -C {ticket} commit -m "x"', "main", "allow"),
    ("A13", "cd <ticket> && commit from main", 'cd {ticket} && git commit -m "x"', "main", "allow"),
    ("A14", "checkout -b && commit (same command)", 'git checkout -b chore/new-thing && git commit -m "x"', "main", "allow"),
    ("A15", "switch -c && push -u (same command)", "git switch -c feat/t-09-x && git push -u origin HEAD", "main", "allow"),
    ("A16", "git pull --ff-only on main", "git pull --ff-only", "main", "allow"),
    ("A17", "read-only git on main", "git status && git log --oneline -5 main", "main", "allow"),
    ("A18", "commit on a detached HEAD", 'git commit -m "x"', "detached", "allow"),
    ("A19", "git push on a branch tracking origin/main", "git push", "tracking", "allow"),
    ("A20", "git push origin --tags on main", "git push origin --tags", "main", "allow"),
    ("A21", "gh pr create --base main", 'gh pr create --base main --title "Push main"', "ticket", "allow"),
    ("A22", "quoted forbidden command in echo", 'echo "git push --force origin main"', "ticket", "allow"),
    ("A23", "command without git", "ls -la", "main", "allow"),
    ("A24", "a tool other than Bash", "EDIT_TOOL", "main", "allow"),
    ("H01", "MCP push_files to a ticket branch", mcp("push_files", branch="t-07-groups-api", message="x", files=[]), "main", "allow"),
    ("H02", "MCP create_branch from main", mcp("create_branch", branch="chore/new-thing", from_branch="main"), "main", "allow"),
    ("H03", "MCP create_pull_request into main", mcp("create_pull_request", base="main", head="t-07-groups-api", title="T-07"), "main", "allow"),
    ("H04", "MCP update_pull_request (title, base main)", mcp("update_pull_request", pullNumber=46, base="main", title="x"), "main", "allow"),
    ("H05", "MCP issue_write (no branch)", mcp("issue_write", method="create", title="Push main"), "main", "allow"),
    ("H06", "MCP get_file_contents on main (read)", mcp("get_file_contents", path="readme.md", ref="main"), "main", "allow"),
    ("H07", "gh pr view", "gh pr view 46 --json state", "main", "allow"),
    ("H08", "gh api GET contents on main", "gh api 'repos/o/r/contents/readme.md?ref=main'", "main", "allow"),
    ("H09", "gh api comment mentioning merge and main", "gh api repos/o/r/issues/46/comments -f body='merge main later'", "main", "allow"),
    ("H10", "gh api graphql query (read)", "gh api graphql -f query='query { repository(owner: \"o\", name: \"r\") { name } }'", "main", "allow"),
    ("H11", "commit message mentioning gh pr merge", 'git commit -m "Run gh pr merge after review"', "ticket", "allow"),
    ("S01", "unquoted echo of a git command on main", "echo git commit -m x", "main", "allow"),
    ("S02", "grep with git push as file names, on main", "grep -rn foo git push", "main", "allow"),
    ("S03", "git merge --ff-only on main", "git merge --ff-only origin/main", "main", "allow"),
    ("S04", "git merge --abort on main", "git merge --abort", "main", "allow"),
    ("S05", "git rebase onto main from a ticket branch", "git rebase main", "ticket", "allow"),
    ("S06", "cd into main inside a subshell, commit outside", '(cd {main}) && git commit -m "x"', "ticket", "allow"),
    ("S07", "push to heads/<ticket branch>", "git push origin HEAD:heads/t-07-groups-api", "ticket", "allow"),
    ("S08", "command -v git", "command -v git", "main", "allow"),
    ("S09", "GIT_DIR prefix pointing at the ticket worktree's repo, on a ticket", 'GIT_DIR={ticketgit} git commit -m "x"', "main", "allow"),
    ("P01", "man git push on main", "man git push", "main", "allow"),
    ("P02", "brew info git", "brew info git", "main", "allow"),
    ("P03", "cat a file under .git", "cat .git/HEAD", "main", "allow"),
    ("P04", "read-only git inside $( ) on main", 'echo "$(git rev-parse --abbrev-ref HEAD)"', "main", "allow"),
    ("P05", "a variable program that isn't pushing", "$EDITOR .gitignore", "main", "allow"),
    ("P06", "which git && git --version", "which git && git --version", "main", "allow"),
    ("P07", "$(date) in a commit message on a ticket branch", 'git commit -m "Built $(date)"', "ticket", "allow"),
    ("P08", "find without -exec git", "find . -name '*.git' -type d", "main", "allow"),
    ("P09", "escaped backquotes in a commit message", 'git commit -m "Document \\`git push origin main\\`"', "ticket", "allow"),
    ("P10", "ssh running git status", "ssh host git status", "main", "allow"),
    ("P11", "gh pr view with -R", "gh pr view 46 -R o/r", "main", "allow"),
]


def git(cwd, *args):
    subprocess.run(["git"] + list(args), cwd=cwd, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def build_fixture(root, env):
    os.environ.update(env)
    remote, repo = os.path.join(root, "remote.git"), os.path.join(root, "repo")
    git(root, "init", "-q", "--bare", remote)
    git(root, "init", "-q", "-b", "main", repo)
    for key, value in (("user.name", "Test"), ("user.email", "test@example.com"),
                       ("alias.ci", "commit"), ("alias.pf", "push --force")):
        git(repo, "config", key, value)
    git(repo, "commit", "-q", "--allow-empty", "-m", "Initial commit")
    git(repo, "remote", "add", "origin", remote)
    git(repo, "push", "-q", "-u", "origin", "main")
    for branch in ("t-07-groups-api", "feature/entrega-1-OJE", "feature/entrega-2-OJE",
                   "final-project-OJE"):
        git(repo, "branch", branch)
    git(repo, "push", "-q", "-u", "origin", "t-07-groups-api")
    git(repo, "branch", "-q", "--track", "t-08-tracks-main", "origin/main")
    dirs = {"root": root, "main": repo}
    for key, branch in (("ticket", "t-07-groups-api"), ("delivery2", "feature/entrega-2-OJE"),
                        ("final", "final-project-OJE"), ("tracking", "t-08-tracks-main")):
        dirs[key] = os.path.join(root, key)
        git(repo, "worktree", "add", "-q", dirs[key], branch)
    dirs["ticketgit"] = os.path.join(repo, ".git", "worktrees", "ticket")
    dirs["detached"] = os.path.join(root, "detached")
    git(repo, "worktree", "add", "-q", "--detach", dirs["detached"], "main")
    dirs["notrepo"] = os.path.join(root, "notrepo")
    os.mkdir(dirs["notrepo"])
    return dirs


def run_hook(payload, env):
    result = subprocess.run(["python3", HOOK], input=payload, env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                            universal_newlines=True, timeout=30)
    if result.returncode == 0:
        return "allow", ""
    if result.returncode != 2:
        return "exit %d" % result.returncode, result.stderr
    kind = next((k for phrase, k in KINDS if phrase in result.stderr), "unknown block")
    return kind, result.stderr


def table_cell(text):
    return text.replace("|", "\\|").replace("\n", "⏎ ")


def main():
    with tempfile.TemporaryDirectory() as root:
        root = os.path.realpath(root)
        empty_config = os.path.join(root, "empty-gitconfig")
        open(empty_config, "w").close()
        env = dict(os.environ, GIT_CONFIG_GLOBAL=empty_config, GIT_CONFIG_NOSYSTEM="1")
        env.pop("NO_SUCH_VAR_XYZ", None)
        dirs = build_fixture(root, env)

        failures = 0
        print("| Case | Covers | Command | Expected | Actual | |")
        print("|---|---|---|---|---|---|")
        for case_id, covers, command, where, expected in CASES:
            cwd = dirs[where]
            if command is None:
                payload, shown = "{not json", "(invalid JSON on stdin)"
            elif isinstance(command, dict):
                payload = json.dumps({"hook_event_name": "PreToolUse", "cwd": cwd,
                                      "tool_name": command["tool"],
                                      "tool_input": command["input"]})
                arguments = {k: v for k, v in command["input"].items() if k not in REPO}
                shown = "%s %s" % (command["tool"], json.dumps(arguments))
            elif command == "EDIT_TOOL":
                payload = json.dumps({"hook_event_name": "PreToolUse", "tool_name": "Edit",
                                      "tool_input": {"file_path": "x"}, "cwd": cwd})
                shown = "(Edit tool call)"
            else:
                for key, path in dirs.items():
                    command = command.replace("{%s}" % key, path)
                payload = json.dumps({
                    "session_id": "test", "cwd": cwd, "hook_event_name": "PreToolUse",
                    "tool_name": "Bash", "tool_input": {"command": command},
                    "tool_use_id": "toolu_test",
                })
                shown = command.replace(root, "<tmp>")
            actual, stderr = run_hook(payload, env)
            ok = actual == expected
            failures += not ok
            print("| %s | %s | `%s` | %s | %s | %s |" % (
                case_id, covers, table_cell(shown), expected, actual, "✅" if ok else "❌"))
            if not ok and stderr:
                print("|  | stderr | %s | | | |" % table_cell(stderr.strip()))
        print("\n%d of %d cases passed." % (len(CASES) - failures, len(CASES)))
        return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
