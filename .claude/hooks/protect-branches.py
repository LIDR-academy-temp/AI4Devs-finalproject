#!/usr/bin/env python3
"""Claude Code PreToolUse hook for the Bash tool and the GitHub MCP tools.

Enforces the branch rules in CLAUDE.md ("Branches, commits and PRs" and
"Course deliveries") so they don't depend on Claude remembering them. It blocks:

  - git commit while the current branch is protected, and the other commands
    that add commits to it (merge, cherry-pick, revert, rebase, am);
  - git push that would update main (main changes only through merged PRs);
  - git push that would update a delivery branch from anything other than main;
  - force pushes of any kind, and pushes that delete a protected branch;
  - GitHub writes that bypass git: MCP tools that commit to, create, or delete
    a protected branch, merging pull requests (MCP tool or `gh pr merge`), MCP
    pull request branch updates, `gh repo sync`, and `gh api` calls that write
    refs, contents, or merges.

Everything else is allowed. Exit 0 allows the command; exit 2 blocks it, and
Claude Code passes the message on stderr to Claude. When the hook can't tell
what a command would do (an unresolvable directory, a parse error, a bug in
this script), it blocks and says why instead of allowing it.

Configured in .claude/settings.json. Tests: .claude/hooks/test_protect_branches.py.
Written for the system Python 3 on macOS (3.9), standard library only.
"""

import json
import os
import re
import shlex
import subprocess
import sys

# --- Protected branches: the only place they are listed ----------------------
MAIN = "main"
DELIVERY_BRANCHES = ("feature/entrega-1-OJE", "feature/entrega-2-OJE", "final-project-OJE")
PROTECTED = (MAIN,) + DELIVERY_BRANCHES
# What a delivery push may send: local main, or main as last fetched from origin.
DELIVERY_SOURCES = (MAIN, "origin/" + MAIN, "refs/remotes/origin/" + MAIN)
# ------------------------------------------------------------------------------

BRANCH_RULES = 'CLAUDE.md, "Branches, commits and PRs"'
DELIVERY_RULES = 'CLAUDE.md, "Course deliveries"'

MSG_COMMIT_MAIN = (
    "Blocked by the branch-protection hook: you're on '{branch}', and this would "
    "commit directly to it. Changes reach main only through merged pull requests "
    "(" + BRANCH_RULES + "). Create the ticket branch first with "
    "`git checkout -b <type>/t-<NN>-<slug>` (uncommitted changes come with you; "
    "work outside a ticket uses a name such as `chore/<slug>`), then commit there."
)
MSG_COMMIT_DELIVERY = (
    "Blocked by the branch-protection hook: you're on the delivery branch "
    "'{branch}', which only ever receives main through "
    "`git push origin main:{branch}` (" + DELIVERY_RULES + "). Don't commit or work "
    "on it: switch to main, update it with `git pull --ff-only`, and create a "
    "ticket branch (" + BRANCH_RULES + ")."
)
MSG_LOCAL_COMMITS = (
    "Blocked by the branch-protection hook: `git {command}` here would add commits to "
    "the protected branch '{branch}'. To update it from the remote, use "
    "`git pull --ff-only` (or `git merge --ff-only`); all other work happens on a "
    "ticket branch (" + BRANCH_RULES + ")."
)
MSG_PUSH_MAIN = (
    "Blocked by the branch-protection hook: this push would update '" + MAIN + "' on "
    "the remote. Changes reach main only through merged pull requests "
    "(" + BRANCH_RULES + "). Push the ticket branch instead (`git push -u origin HEAD` "
    "from the ticket branch) and open the PR when the user asks for it."
)
MSG_PUSH_DELIVERY = (
    "Blocked by the branch-protection hook: '{branch}' is a delivery branch and only "
    "receives main. The only allowed push is `git push origin main:{branch}`, without "
    "force, and only when the user asks for a delivery (" + DELIVERY_RULES + ")."
)
MSG_DELETE = (
    "Blocked by the branch-protection hook: this push would delete the protected "
    "branch '{branch}'. Protected branches are never deleted from Claude Code; tell "
    "the user what you were trying to do."
)
MSG_FORCE = (
    "Blocked by the branch-protection hook: force pushes (--force, -f, "
    "--force-with-lease, --force-if-includes, --mirror, or a +refspec) are not allowed "
    "from Claude Code, on any branch. Push without force. If the push is rejected as "
    "non-fast-forward, stop and tell the user (" + DELIVERY_RULES + "); if history "
    "really has to be rewritten, the user runs that push themselves."
)
MSG_ALL = (
    "Blocked by the branch-protection hook: this push could update every matching "
    "branch, including protected ones (--all, --branches, a ':' or wildcard refspec, "
    "or push.default=matching). Push the branch by name, for example "
    "`git push -u origin HEAD` from the ticket branch."
)
MSG_PRUNE = (
    "Blocked by the branch-protection hook: `git push --prune` can delete remote "
    "branches, including protected ones. Push the branch by name without --prune."
)
MSG_MERGE = (
    "Blocked by the branch-protection hook: merging a pull request changes main, "
    "and that is the user's call (" + BRANCH_RULES + "). Tell the user the PR is "
    "ready to merge and give its URL."
)
MSG_GITHUB_WRITE = (
    "Blocked by the branch-protection hook: this GitHub call would write to the "
    "protected branch '{branch}' on GitHub. Changes reach main only through merged "
    "pull requests, and delivery branches only receive main (" + BRANCH_RULES + "; "
    + DELIVERY_RULES + "). Commit on a ticket branch locally and push that branch."
)
MSG_GITHUB_UNKNOWN_BRANCH = (
    "Blocked by the branch-protection hook: {what}, and the hook can't see which "
    "branch that writes to without calling GitHub. Do it with local git on the "
    "ticket branch (for example `git merge origin/main`, then `git push`), or ask "
    "the user to do it in GitHub."
)
MSG_GH_API = (
    "Blocked by the branch-protection hook: this `gh api` call writes git data on "
    "GitHub (refs, file contents, merges, or branch settings), which bypasses the "
    "branch rules (" + BRANCH_RULES + "). Make the change with local git on a ticket "
    "branch and push that branch, or ask the user to do it."
)
MSG_REPO_SYNC = (
    "Blocked by the branch-protection hook: `gh repo sync` can overwrite a branch, "
    "including main, without a pull request. Update branches with local git "
    "(`git pull --ff-only` on main), or ask the user to sync."
)
MSG_UNSURE = (
    "Blocked by the branch-protection hook: it couldn't check this command safely "
    "({detail}). Rewrite it so the hook can tell which branch it commits to or pushes "
    "to (run git from the repository directory, with literal paths and no variables "
    "in `cd` or `git -C`), or ask the user to run it."
)


class Block(Exception):
    """The command breaks a branch rule."""


class Unsure(Exception):
    """The hook can't tell what the command would do."""


# --- Shell parsing -----------------------------------------------------------
# A small tokenizer instead of shlex: it keeps quoted text in one word (so a
# commit message that mentions "push" or "main" is never read as a command),
# and it reports operators, redirections, and newlines, which split commands.

OPERATORS = ("&&", "||", ";;", "|&", ";", "|", "&", "\n", "(", ")")
REDIRECT_RE = re.compile(r"&>>?|<<<|<<-?|<>|>>|>\||<&|>&|<|>")
HEREDOC_RE = re.compile(
    r"(?<![<\\])<<(?!<)(-?)[ \t]*"
    r"(?:'([^'\n]*)'|\"([^\"\n]*)\"|\\?([^\s;&|<>()'\"]+))"
)


def strip_heredocs(text):
    """Drop here-document bodies, so the text of a message isn't parsed as commands."""
    out, pending = [], []
    for line in text.split("\n"):
        if pending:
            delimiter, strip_tabs = pending[0]
            if (line.lstrip("\t") if strip_tabs else line) == delimiter:
                pending.pop(0)
            continue
        out.append(line)
        for match in HEREDOC_RE.finditer(line):
            delimiter = next(g for g in match.groups()[1:] if g is not None)
            pending.append((delimiter, match.group(1) == "-"))
    return "\n".join(out)


def matching_paren(text, i):
    """Index of the ')' that closes the '(' at text[i]."""
    depth, n = 0, len(text)
    while i < n:
        c = text[i]
        if c == "\\":
            i += 2
            continue
        if c == "'":
            end = text.find("'", i + 1)
            if end < 0:
                break
            i = end + 1
            continue
        if c == '"':
            _, i = read_double_quoted(text, i + 1)
            continue
        if c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise Unsure("unbalanced $( ) in the command")


def read_double_quoted(text, i, substitutions=None):
    """Read a double-quoted string starting after its opening quote.

    The text of each command substitution in it is appended to substitutions.
    """
    part, n = "", len(text)
    while i < n:
        c = text[i]
        if c == '"':
            return part, i + 1
        if c == "\\" and i + 1 < n and text[i + 1] in '"\\$`\n':
            if text[i + 1] != "\n":
                part += text[i + 1]
            i += 2
        elif text.startswith("$(", i):
            end = matching_paren(text, i + 1)
            if substitutions is not None:
                substitutions.append(text[i + 2:end])
            part += text[i:end + 1]
            i = end + 1
        elif c == "`":
            end = text.find("`", i + 1)
            if end < 0:
                raise Unsure("unterminated backquote in the command")
            if substitutions is not None:
                substitutions.append(text[i + 1:end])
            part += text[i:end + 1]
            i = end + 1
        else:
            part += c
            i += 1
    raise Unsure("unterminated double quote in the command")


def tokenize(text, substitutions=None):
    """Split shell text into ('w', word), ('op', operator) and ('redir', operator).

    The text of each command substitution, $(...) or `...`, is appended to
    substitutions so it can be checked as a command of its own.
    """
    tokens, word, i, n = [], None, 0, len(text)
    if substitutions is None:
        substitutions = []

    def flush():
        nonlocal word
        if word is not None:
            tokens.append(("w", word))
            word = None

    while i < n:
        c = text[i]
        if c in " \t\r":
            flush()
            i += 1
        elif c == "\\":
            if text.startswith("\\\n", i):
                i += 2  # line continuation
            else:
                word = (word or "") + text[i + 1:i + 2]
                i += 2
        elif c == "'":
            end = text.find("'", i + 1)
            if end < 0:
                raise Unsure("unterminated single quote in the command")
            word = (word or "") + text[i + 1:end]
            i = end + 1
        elif c == '"':
            part, i = read_double_quoted(text, i + 1, substitutions)
            word = (word or "") + part
        elif c == "`":
            end = text.find("`", i + 1)
            if end < 0:
                raise Unsure("unterminated backquote in the command")
            substitutions.append(text[i + 1:end])
            word = (word or "") + text[i:end + 1]
            i = end + 1
        elif text.startswith("$(", i):
            end = matching_paren(text, i + 1)
            substitutions.append(text[i + 2:end])
            word = (word or "") + text[i:end + 1]
            i = end + 1
        elif c == "#" and word is None:
            end = text.find("\n", i)  # comment: skip to the end of the line
            i = n if end < 0 else end
        else:
            redirect = REDIRECT_RE.match(text, i)
            if redirect:
                if word is not None and word.isdigit():
                    word = None  # a file descriptor, as in 2>&1
                flush()
                tokens.append(("redir", redirect.group()))
                i = redirect.end()
                continue
            op = next((o for o in OPERATORS if text.startswith(o, i)), None)
            if op:
                flush()
                tokens.append(("op", op))
                i += len(op)
            else:
                word = (word or "") + c
                i += 1
    flush()
    return tokens


def simple_commands(tokens):
    """Group tokens into simple commands (lists of words), without redirections.

    The subshell parentheses are yielded too, as the strings "(" and ")".
    """
    words, skip_next = [], False
    for kind, value in tokens:
        if kind == "redir":
            skip_next = True  # the redirection's target is not an argument
        elif kind == "op":
            if words:
                yield words
            words, skip_next = [], False
            if value in ("(", ")"):
                yield value
        elif skip_next:
            skip_next = False
        else:
            words.append(value)
    if words:
        yield words


# --- Git queries ----------------------------------------------------------------

DETACHED = object()  # HEAD is not on a branch
UNKNOWN = object()   # an earlier step in the command moved HEAD somewhere we can't tell

GIT_BUILTINS = set("""
    add am annotate apply archive bisect blame branch bundle cat-file check-attr
    check-ignore check-mailmap check-ref-format checkout checkout-index cherry
    cherry-pick citool clean clone column commit commit-graph commit-tree config
    count-objects credential describe diff diff-files diff-index diff-tree difftool
    fast-export fast-import fetch fetch-pack filter-branch fmt-merge-msg
    for-each-ref for-each-repo format-patch fsck gc get-tar-commit-id grep gui
    hash-object help hook index-pack init instaweb interpret-trailers log ls-files
    ls-remote ls-tree mailinfo mailsplit maintenance merge merge-base merge-file
    merge-tree mergetool mktag mktree mv name-rev notes pack-objects pack-refs
    prune prune-packed pull push range-diff read-tree rebase reflog remote repack
    replace request-pull rerere reset restore rev-list rev-parse revert rm
    send-email send-pack shortlog show show-branch show-index show-ref
    sparse-checkout stash status stripspace submodule switch symbolic-ref tag
    unpack-objects update-index update-ref update-server-info var verify-commit
    verify-pack verify-tag version whatchanged worktree write-tree
""".split())


class Repo:
    """Runs read-only git queries in the directory a git command would run in."""

    def __init__(self, cwd, options):
        self.cwd = cwd
        self.options = options  # global options to replay: -c, --git-dir, --work-tree
        self.key = (cwd, tuple(options))

    def git(self, *args):
        if self.cwd is None:
            raise Unsure("couldn't resolve the directory the git command runs in")
        if not os.path.isdir(self.cwd):
            raise Unsure("the directory %s doesn't exist yet" % self.cwd)
        env = dict(os.environ, GIT_OPTIONAL_LOCKS="0", LC_ALL="C")
        try:
            return subprocess.run(
                ["git"] + self.options + list(args), cwd=self.cwd, env=env,
                stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                stderr=subprocess.PIPE, universal_newlines=True, timeout=5,
            )
        except FileNotFoundError:
            raise Unsure("git isn't installed or isn't on PATH")
        except subprocess.TimeoutExpired:
            raise Unsure("a git query timed out")

    def branch(self):
        """The current branch name, or DETACHED."""
        result = self.git("symbolic-ref", "--quiet", "--short", "HEAD")
        if result.returncode == 0:
            return result.stdout.strip()
        if result.returncode == 1:
            # Detached HEAD. During a rebase, the branch being rebased is the one
            # commits will end up on.
            for name in ("rebase-merge/head-name", "rebase-apply/head-name"):
                path = self.git("rev-parse", "--git-path", name).stdout.strip()
                path = os.path.join(self.cwd, path)
                if path and os.path.isfile(path):
                    with open(path) as handle:
                        return short_branch(handle.read().strip()) or DETACHED
            return DETACHED
        raise Unsure("git couldn't read the current branch in %s: %s"
                     % (self.cwd, result.stderr.strip() or "exit %d" % result.returncode))

    def config(self, key):
        result = self.git("config", "--get", key)
        if result.returncode == 0:
            return result.stdout.strip()
        if result.returncode == 1:
            return None
        raise Unsure("git couldn't read the setting %s: %s" % (key, result.stderr.strip()))

    def config_all(self, key):
        result = self.git("config", "--get-all", key)
        if result.returncode == 0:
            return result.stdout.split()
        if result.returncode == 1:
            return []
        raise Unsure("git couldn't read the setting %s: %s" % (key, result.stderr.strip()))

    def has_ref(self, ref):
        return self.git("rev-parse", "--verify", "--quiet", ref).returncode == 0

    def has_remote_branch(self, name):
        result = self.git("for-each-ref", "--format=%(refname)", "refs/remotes/*/" + name)
        return bool(result.stdout.strip())

    def previous_branch(self):
        result = self.git("rev-parse", "--symbolic-full-name", "@{-1}")
        name = short_branch(result.stdout.strip()) if result.returncode == 0 else None
        return name or UNKNOWN


def short_branch(ref):
    """'refs/heads/x' or 'x' -> 'x'; other refs (tags, notes) -> None."""
    if ref.startswith("refs/heads/"):
        return ref[len("refs/heads/"):]
    if ref.startswith("refs/"):
        return None
    return ref


def protected_name(ref):
    """The protected branch a branch name or push destination refers to, or None.

    Git resolves a push destination that is a suffix of a remote ref, so
    'heads/main' updates 'refs/heads/main'; and some remotes and file systems
    ignore letter case. Both are normalized before comparing.
    """
    name = ref.strip()
    for prefix in ("refs/", "heads/"):
        if name.lower().startswith(prefix):
            name = name[len(prefix):]
    lowered = name.lower()
    return next((branch for branch in PROTECTED if branch.lower() == lowered), None)


# --- Checking -----------------------------------------------------------------

SHELL_KEYWORDS = {"!", "{", "}", "if", "then", "else", "elif", "fi", "do", "done",
                  "while", "until", "time"}
SHELLS = {"sh", "bash", "zsh", "dash", "ksh"}
ASSIGNMENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")
GIT_OPTIONS_WITH_VALUE = ("-c", "--git-dir", "--work-tree", "--namespace", "--config-env")


# Programs that run the program named in their arguments, with the options that
# take a value (so the value isn't mistaken for the program).
WRAPPERS = {
    "builtin": set(), "command": set(), "exec": {"-a"}, "nohup": set(), "time": set(),
    "caffeinate": {"-t", "-w"}, "env": {"-u", "--unset", "-S", "--split-string"},
    "nice": {"-n", "--adjustment"}, "stdbuf": {"-i", "-o", "-e"},
    "sudo": {"-u", "-g", "-h", "-p", "-C", "-D", "-r", "-t", "-U"},
    "timeout": {"-s", "--signal", "-k", "--kill-after"},
    "xargs": {"-I", "-L", "-n", "-P", "-s", "-d", "-E", "-a"},
    "arch": {"-arch"}, "xcrun": {"--sdk", "--toolchain"}, "setsid": set(),
    "ionice": {"-c", "-n", "-p", "--class", "--classdata"}, "doas": {"-u", "-C"},
    "chronic": set(), "unbuffer": set(),
}
# Programs that only read or print text: a git or gh among their arguments is
# just a word (echo git push, grep "git commit"), never a call.
TEXT_PROGRAMS = {
    "echo", "printf", "grep", "egrep", "fgrep", "rg", "ag", "ack", "cat", "less",
    "more", "head", "tail", "man", "which", "type", "whereis", "whatis", "apropos",
    "wc", "sort", "uniq", "tr", "cut", "sed", "awk", "diff", "ls", "file", "stat",
    "test", "[", "true", "false", "basename", "dirname", "realpath", "readlink",
    "open", "code", "pbcopy", "tee", "touch", "mkdir", "rm", "cp", "mv", "chmod",
    "for", "case", "function",
}
# With a program given as a variable ($GIT push), these words mean it may be git.
VARIABLE_PROGRAM_VERBS = {"push", "commit", "merge", "cherry-pick", "revert",
                          "rebase", "am", "api", "sync"}
# Environment variables that point git at another repository.
GIT_ENV_OPTIONS = {"GIT_DIR": "--git-dir", "GIT_WORK_TREE": "--work-tree"}


class Checker:
    def __init__(self, cwd):
        self.cwd = cwd
        self.exported = {}  # GIT_DIR / GIT_WORK_TREE set with export (None: unresolvable)
        self.switched = {}  # Repo.key -> branch, DETACHED or UNKNOWN after a checkout

    # Shell level

    def check(self, text, depth=0):
        if depth > 5:
            raise Unsure("commands nested too deeply")
        substitutions = []
        tokens = tokenize(strip_heredocs(text), substitutions)
        for inner in substitutions:
            # A command substitution runs in a subshell of its own.
            saved = (self.cwd, dict(self.exported))
            self.check(inner, depth + 1)
            self.cwd, self.exported = saved
        subshells = []
        for item in simple_commands(tokens):
            if item == "(":
                subshells.append((self.cwd, dict(self.exported)))
            elif item == ")":
                # A subshell's cd and export end with it. A checkout inside it
                # still counts: it changes the repository, not the shell.
                if subshells:
                    self.cwd, self.exported = subshells.pop()
            else:
                self.check_simple(item, depth)

    def check_simple(self, words, depth):
        while words and words[0] in SHELL_KEYWORDS:
            words = words[1:]
        # Find the program: skip variable assignments and wrappers such as env,
        # sudo, or timeout. Only the program itself is checked, so text that
        # merely mentions git (echo git push) is not.
        assignments, program, args = {}, None, words
        while args:
            if ASSIGNMENT_RE.match(args[0]):
                name, value = args[0].split("=", 1)
                assignments[name] = value
                args = args[1:]
                continue
            name = os.path.basename(args[0]).lower()
            if name not in WRAPPERS:
                program, args = name, args[1:]
                break
            args = skip_wrapper_options(name, args[1:])
        if program is None:
            return
        if program in ("cd", "pushd"):
            targets = [a for a in args if a not in ("-P", "-L", "-e", "-@", "--")]
            self.cwd = self.resolve(self.cwd, targets[0] if targets else "~")
        elif program == "popd":
            self.cwd = None
        elif program == "export":
            for arg in args:
                name, _, value = arg.partition("=")
                if name in GIT_ENV_OPTIONS and value:
                    self.exported[name] = self.resolve(self.cwd, value)
        elif program == "unset":
            for name in args:
                self.exported.pop(name, None)
        elif program == "eval":
            self.check(" ".join(args), depth + 1)
        elif program in SHELLS:
            script = shell_script(args)
            if script is not None:
                self.check(script, depth + 1)
        elif program == "git":
            self.check_git(args, depth, self.git_env_options(assignments))
        elif program == "gh":
            check_gh(args)
        elif program.startswith("$"):
            if VARIABLE_PROGRAM_VERBS.intersection(args):
                raise Unsure("the program is a variable, so the hook can't tell "
                             "whether it is git")
        elif program not in TEXT_PROGRAMS:
            self.check_runner(args, depth)

    def check_runner(self, args, depth):
        """A program that may run git for you: find -exec, ssh, watch, su -c, ...

        A later git or gh word is checked as a call, and so is a quoted command
        that starts with one (su -c "git push").
        """
        for index, word in enumerate(args):
            program = os.path.basename(word).lower()
            if program == "git":
                self.check_git(args[index + 1:], depth)
                return
            if program == "gh":
                check_gh(args[index + 1:])
                return
            first = word.split(None, 1)[0].lower() if word.strip() else ""
            if " " in word.strip() and os.path.basename(first) in ("git", "gh"):
                self.check(word, depth + 1)
                return

    def git_env_options(self, assignments):
        """GIT_DIR and GIT_WORK_TREE, from export or a prefix, as git options."""
        values = dict(self.exported)
        for name in GIT_ENV_OPTIONS:
            if name in assignments:
                values[name] = self.resolve(self.cwd, assignments[name])
        options = []
        for name, value in values.items():
            if value is None:
                raise Unsure("%s points to a path the hook can't resolve" % name)
            options += [GIT_ENV_OPTIONS[name], value]
        return options

    @staticmethod
    def resolve(cwd, path):
        """Resolve a cd or -C target; None when it can't be known before running."""
        if path == "-":
            return None
        path = os.path.expandvars(os.path.expanduser(path))
        if "$" in path or "`" in path:
            return None
        if not os.path.isabs(path):
            if cwd is None:
                return None
            path = os.path.join(cwd, path)
        return os.path.normpath(path)

    # Git level

    def check_git(self, args, depth, options=None):
        cwd, options, i = self.cwd, list(options or []), 0
        while i < len(args):
            arg = args[i]
            if arg == "-C":
                if i + 1 >= len(args):
                    return
                cwd = self.resolve(cwd, args[i + 1])
                i += 2
            elif arg in GIT_OPTIONS_WITH_VALUE:
                if i + 1 >= len(args):
                    return
                options += [arg, args[i + 1]]
                i += 2
            elif arg.startswith(tuple(o + "=" for o in GIT_OPTIONS_WITH_VALUE[1:])):
                options.append(arg)
                i += 1
            elif arg.startswith("-"):
                i += 1
            else:
                break
        else:
            return  # no subcommand
        self.check_git_command(Repo(cwd, options), args[i], args[i + 1:], depth)

    def check_git_command(self, repo, sub, args, depth):
        if sub not in GIT_BUILTINS:
            alias = repo.config("alias." + sub)
            if alias is None:
                return  # an external command such as git-lfs
            if depth > 5:
                raise Unsure("git aliases nested too deeply")
            if alias.startswith("!"):
                self.check(alias[1:] + " " + " ".join(shlex.quote(a) for a in args), depth + 1)
                return
            expansion = shlex.split(alias)
            if expansion:
                self.check_git_command(repo, expansion[0], expansion[1:] + args, depth + 1)
            return
        if sub == "commit":
            self.check_commit(repo)
        elif sub in ("merge", "cherry-pick", "revert", "rebase", "am"):
            if any(arg in ("--abort", "--quit") for arg in args):
                return  # backing out adds nothing
            if sub == "merge" and "--ff-only" in args:
                return  # how a protected branch is updated from the remote
            self.check_commit(repo, command=sub)
        elif sub == "push":
            self.check_push(repo, args)
        elif sub in ("checkout", "switch"):
            try:
                self.track_switch(repo, sub, args)
            except Unsure:
                self.switched[repo.key] = UNKNOWN

    def current_branch(self, repo):
        branch = self.switched.get(repo.key)
        if branch is None:
            branch = repo.branch()
        if branch is UNKNOWN:
            raise Unsure("couldn't tell which branch an earlier checkout in the "
                         "command switches to")
        return branch

    def check_commit(self, repo, command="commit"):
        branch = self.current_branch(repo)
        name = None if branch is DETACHED else protected_name(branch)
        if name is None:
            return
        if command != "commit":
            raise Block(MSG_LOCAL_COMMITS.format(command=command, branch=name))
        if name == MAIN:
            raise Block(MSG_COMMIT_MAIN.format(branch=name))
        raise Block(MSG_COMMIT_DELIVERY.format(branch=name))

    def track_switch(self, repo, sub, args):
        """Record where a checkout or switch earlier in the command leaves HEAD."""
        new_branch, detach, targets, i = None, False, [], 0
        while i < len(args):
            arg = args[i]
            if arg == "--":
                if sub == "checkout":
                    return  # checkout <tree-ish> -- <paths> doesn't move HEAD
                targets += args[i + 1:]
                break
            if arg in ("-b", "-B", "-c", "-C", "--orphan", "--create", "--force-create"):
                new_branch = args[i + 1] if i + 1 < len(args) else None
                i += 2
                continue
            if arg.startswith(("--orphan=", "--create=", "--force-create=")):
                new_branch = arg.split("=", 1)[1]
            elif arg in ("--detach", "-d"):
                detach = True
            elif not arg.startswith("-"):
                targets.append(arg)
            i += 1
        if new_branch:
            self.switched[repo.key] = new_branch
        elif detach:
            self.switched[repo.key] = DETACHED
        elif targets:
            target = targets[0]
            if target == "-":
                self.switched[repo.key] = repo.previous_branch()
            elif sub == "switch" or repo.has_ref("refs/heads/" + target) \
                    or repo.has_remote_branch(target):
                self.switched[repo.key] = target
            elif repo.has_ref(target + "^{commit}"):
                self.switched[repo.key] = DETACHED
            # otherwise the arguments are paths, and HEAD doesn't move

    def check_push(self, repo, args):
        force = delete = everything = prune = tags = False
        remote, positional, i = None, [], 0
        while i < len(args):
            arg = args[i]
            if arg == "--":
                positional += args[i + 1:]
                break
            if arg.startswith("--"):
                name, has_value = arg.split("=", 1)[0], "=" in arg
                if name in ("--force", "--force-with-lease", "--force-if-includes"):
                    force = True
                elif name == "--mirror":
                    force = everything = True
                elif name in ("--all", "--branches"):
                    everything = True
                elif name == "--delete":
                    delete = True
                elif name == "--prune":
                    prune = True
                elif name == "--tags":
                    tags = True
                elif name == "--repo":
                    if has_value:
                        remote = arg.split("=", 1)[1]
                    elif i + 1 < len(args):
                        remote = args[i + 1]
                        i += 1
                elif name in ("--receive-pack", "--exec", "--push-option") and not has_value:
                    i += 1
            elif arg.startswith("-") and len(arg) > 1:
                letters = arg[1:]
                for index, letter in enumerate(letters):
                    if letter == "f":
                        force = True
                    elif letter == "d":
                        delete = True
                    elif letter == "o":
                        if index == len(letters) - 1:
                            i += 1  # the push option is the next word
                        break
            else:
                positional.append(arg)
            i += 1

        refspecs = positional[1:]
        if any("$" in word or "`" in word for word in positional):
            raise Unsure("the push's remote or branch comes from a variable or a "
                         "command substitution")
        if force or any(spec.startswith("+") for spec in refspecs):
            raise Block(MSG_FORCE)
        if everything:
            raise Block(MSG_ALL)
        if prune:
            raise Block(MSG_PRUNE)
        if positional:
            remote = positional[0]

        if not refspecs:
            if tags or delete:
                return  # pushes tags only, or fails without a branch to delete
            branch = self.current_branch(repo)
            current = None if branch is DETACHED else branch
            if remote is None:
                remote = ((current and repo.config("branch.%s.pushRemote" % current))
                          or repo.config("remote.pushDefault")
                          or (current and repo.config("branch.%s.remote" % current))
                          or "origin")
            configured = repo.config_all("remote.%s.push" % remote)
            if configured:
                refspecs = configured
                if any(spec.startswith("+") for spec in refspecs):
                    raise Block(MSG_FORCE)
            else:
                if current is None:
                    return  # nothing to push from a detached HEAD
                mode = repo.config("push.default") or "simple"
                if mode == "matching":
                    raise Block(MSG_ALL)
                if mode == "nothing":
                    return
                destinations = {current}
                if mode in ("upstream", "tracking"):
                    merge = repo.config("branch.%s.merge" % current)
                    if merge:
                        destinations = {merge}
                for destination in destinations:
                    self.check_destination(current, destination, deleting=False)
                return

        for spec in refspecs:
            if delete:
                self.check_destination(None, spec, deleting=True)
                continue
            if spec == ":" or "*" in spec:
                raise Block(MSG_ALL)
            if ":" in spec:
                source, destination = spec.split(":", 1)
                if source == "":
                    self.check_destination(None, destination, deleting=True)
                    continue
                source = self.source_name(repo, source)
                destinations = [destination or source]
            else:
                source = self.source_name(repo, spec)
                destinations = [source]
                mode = repo.config("push.default") or "simple"
                if mode in ("upstream", "tracking"):
                    merge = repo.config("branch.%s.merge" % source)
                    if merge:
                        destinations.append(merge)
            for destination in destinations:
                self.check_destination(source, destination, deleting=False)

    def source_name(self, repo, source):
        if source in ("HEAD", "@"):
            branch = self.current_branch(repo)
            return "HEAD" if branch is DETACHED else branch
        return short_branch(source) or source

    def check_destination(self, source, destination, deleting):
        if destination in ("HEAD", "@"):
            raise Unsure("a push to HEAD on the remote")
        name = protected_name(destination)
        if name is None:
            return
        if deleting:
            raise Block(MSG_DELETE.format(branch=name))
        if name == MAIN:
            raise Block(MSG_PUSH_MAIN)
        if source not in DELIVERY_SOURCES:
            raise Block(MSG_PUSH_DELIVERY.format(branch=name))


# --- GitHub: the gh CLI and the GitHub MCP tools --------------------------------

GH_OPTIONS_WITH_VALUE = ("-H", "--header", "-q", "--jq", "-t", "--template",
                         "--hostname", "--cache", "-p", "--preview", "--input")
GH_FIELD_OPTIONS = ("-f", "-F", "--field", "--raw-field")
# REST endpoints whose writes change refs, file contents, merges, or branch settings.
GH_API_WRITE_RE = re.compile(
    r"(^|/)(git/refs|contents|merges)(/|$)|/pulls/[^/]+/(merge|update-branch)$|/branches/"
)
# GraphQL mutations that do the same.
GH_GRAPHQL_WRITE_RE = re.compile(
    r"\b(createCommitOnBranch|mergePullRequest|mergeBranch|updateRefs?|createRef|"
    r"deleteRef|enablePullRequestAutoMerge|updatePullRequestBranch)\b"
)


GH_GLOBAL_OPTIONS_WITH_VALUE = ("-R", "--repo", "--hostname")


def check_gh(args):
    """Block gh commands that change branches on GitHub without git."""
    positional, i = [], 0
    while i < len(args):
        arg = args[i]
        if arg in GH_GLOBAL_OPTIONS_WITH_VALUE:
            i += 2  # the value (gh pr -R owner/repo merge) is not a command word
            continue
        if not arg.startswith("-"):
            positional.append(arg)
            if len(positional) == 2:
                break
        i += 1
    if positional == ["pr", "merge"]:
        raise Block(MSG_MERGE)
    if positional == ["repo", "sync"]:
        raise Block(MSG_REPO_SYNC)
    if positional[:1] == ["api"]:
        check_gh_api(args[args.index("api") + 1:])


def check_gh_api(args):
    method, endpoint, has_body, from_file, fields, i = None, None, False, False, [], 0
    while i < len(args):
        arg = args[i]
        value = args[i + 1] if i + 1 < len(args) else ""
        if arg in ("-X", "--method"):
            method, i = value, i + 2
            continue
        if arg.startswith("--method="):
            method = arg.split("=", 1)[1]
        elif arg.startswith("-X") and len(arg) > 2:
            method = arg[2:]
        elif arg in GH_FIELD_OPTIONS:
            has_body = True
            fields.append(value)
            i += 2
            continue
        elif arg.startswith(("--field=", "--raw-field=")):
            has_body = True
            fields.append(arg.split("=", 1)[1])
        elif arg in GH_OPTIONS_WITH_VALUE:
            if arg == "--input":
                has_body = from_file = True
            i += 2
            continue
        elif arg.startswith("--input="):
            has_body = from_file = True
        elif not arg.startswith("-") and endpoint is None:
            endpoint = arg
        i += 1
    if endpoint is None:
        return
    if endpoint == "graphql":
        if from_file or any(f.startswith("query=@") for f in fields):
            raise Unsure("a gh api graphql request read from a file")
        if GH_GRAPHQL_WRITE_RE.search(" ".join(fields)):
            raise Block(MSG_GH_API)
        return
    method = (method or ("POST" if has_body else "GET")).upper()
    if method != "GET" and GH_API_WRITE_RE.search(endpoint.split("?", 1)[0]):
        raise Block(MSG_GH_API)


GITHUB_WRITE_PREFIXES = ("create_", "push_", "delete_", "update_", "merge_")


def check_github_tool(operation, tool_input):
    """Check a GitHub MCP tool call; operation is the part after the last '__'."""
    if operation == "merge_pull_request":
        raise Block(MSG_MERGE)
    if operation == "update_pull_request_branch":
        raise Block(MSG_GITHUB_UNKNOWN_BRANCH.format(
            what="updating a pull request's branch merges its base into its head branch"))
    if not operation.startswith(GITHUB_WRITE_PREFIXES) or "branch" not in tool_input:
        return  # reads, and writes that don't touch a branch (issues, PR metadata)
    branch = tool_input.get("branch")
    if not isinstance(branch, str) or not branch.strip():
        raise Unsure("the GitHub tool call has no branch, so it would use the "
                     "repository's default branch")
    name = protected_name(branch)
    if name:
        raise Block(MSG_GITHUB_WRITE.format(branch=name))


def skip_wrapper_options(name, args):
    """Drop a wrapper's options (and timeout's duration) to reach the program."""
    takes_value = WRAPPERS[name]
    while args and args[0].startswith("-") and args[0] != "-":
        option, args = args[0], args[1:]
        if option == "--":
            break
        if name == "env" and option.split("=", 1)[0] in ("-C", "--chdir"):
            raise Unsure("env -C runs the command in another directory")
        if option in takes_value and args:
            args = args[1:]
    if name == "timeout" and args:
        args = args[1:]  # the duration
    return args


def shell_script(args):
    """The script passed to sh -c / bash -lc, or None when a script file is run."""
    for index, arg in enumerate(args):
        if arg.startswith("-") and not arg.startswith("--") and "c" in arg[1:]:
            return args[index + 1] if index + 1 < len(args) else None
        if not arg.startswith("-"):
            return None
    return None


def main():
    try:
        data = json.load(sys.stdin)
        tool = str(data.get("tool_name") or "")
        tool_input = data.get("tool_input") or {}
        if tool.lower().startswith("mcp__") and "github" in tool.lower():
            check_github_tool(tool.split("__")[-1], tool_input)
            return 0
        if tool != "Bash":
            return 0
        command = tool_input.get("command")
        if not isinstance(command, str):
            raise Unsure("the hook input has no command")
        lowered = command.lower()
        if "git" not in lowered and "gh" not in lowered:
            return 0
        cwd = data.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
        Checker(cwd).check(command)
        return 0
    except Block as error:
        print(str(error), file=sys.stderr)
        return 2
    except Unsure as error:
        print(MSG_UNSURE.format(detail=error), file=sys.stderr)
        return 2
    except Exception as error:  # a bug in this hook must block, never allow
        detail = "internal error: %s: %s" % (type(error).__name__, error)
        print(MSG_UNSURE.format(detail=detail), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
