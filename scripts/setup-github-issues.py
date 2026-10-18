#!/usr/bin/env python3
"""Create the GitHub issues for ComproParaTi from the project documentation.

Reads docs/01-PRD.md (epics, user stories) and docs/08-WORK-TICKETS.md (tickets)
and creates, in the repository:
  - labels: story, task, m1, m2
  - milestones: D1, D2, D3 (course deliveries) and M2 (complete MVP)
  - one issue per user story (26) and per milestone 1 ticket (18)
  - each ticket as a sub-issue of its main story
  - a GitHub Project linked to the repository, holding the tickets

Safe to run again: labels are updated, and milestones and issues whose title
already exists are reused instead of duplicated.

Requirements: Python 3.9+, GitHub CLI (gh) signed in with the project scope:
    gh auth login
    gh auth refresh -s project

Usage, from the repository root:
    python3 setup-github-issues.py --dry-run     # show what would be created
    python3 setup-github-issues.py               # create everything
Writes issue-map.json with the issue number of every story and ticket.
"""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

OWNER = "ojordan0"
REPO = f"{OWNER}/AI4Devs-finalproject"
PROJECT_TITLE = "ComproParaTi"
DOCS_URL = f"https://github.com/{REPO}/blob/main/docs"

LABELS = {
    "story": ("1D76DB", "User story (PRD §14.2)"),
    "task": ("0E8A16", "Work ticket (docs/08-WORK-TICKETS.md)"),
    "m1": ("FBCA04", "Milestone 1: core cycle end to end"),
    "m2": ("D93F0B", "Milestone 2: complete MVP"),
}
MILESTONES = {
    "D1": ("D1: Technical documentation", "2026-10-22"),
    "D2": ("D2: Working code", "2026-11-19"),
    "D3": ("D3: Final delivery", "2026-12-06"),
    "M2": ("M2: Complete MVP", "2026-12-31"),
}


# ---------- parsing the docs ----------

def expand(text, prefix):
    """'AC-01 to AC-03, AC-05' -> [1, 2, 3, 5]"""
    out = []
    for a, b in re.findall(rf"{prefix}-(\d+)(?: to {prefix}-(\d+))?", text):
        out += range(int(a), int(b or a) + 1)
    return out


def absolute_links(text):
    """Make links between documents work inside a GitHub issue."""
    text = re.sub(r"\]\((0\d-[A-Z-]+\.md)", rf"]({DOCS_URL}/\1", text)
    return re.sub(r"\]\(#", f"]({DOCS_URL}/01-PRD.md#", text)


def slug(heading):
    h = heading.strip().lower()
    h = "".join(c for c in h if c.isalnum() or c in " -_")
    return h.replace(" ", "-")


def table_rows(text, first_cell_pattern):
    rows = []
    for line in text.splitlines():
        if re.match(rf"^\|\s*{first_cell_pattern}\s*\|", line):
            rows.append([c.strip() for c in line.strip().strip("|").split("|")])
    return rows


def parse_docs(root):
    prd = (root / "docs/01-PRD.md").read_text(encoding="utf-8")
    tickets_md = (root / "docs/08-WORK-TICKETS.md").read_text(encoding="utf-8")

    ac_milestone = {int(r[0][3:]): r[1] for r in table_rows(prd, r"AC-\d+")}

    epics, story_epic = {}, {}
    for r in table_rows(prd, r"E-\d+"):
        epics[r[0]] = r[1]
        for n in expand(r[3], "US"):
            story_epic[f"US-{n:02d}"] = r[0]

    stories = {}
    for r in table_rows(prd, r"US-\d+"):
        sid, who, want, so_that, reqs, acs = r[:6]
        milestones = sorted({ac_milestone[a] for a in expand(acs, "AC")})
        stories[sid] = {
            "title": f"{sid} {want[0].upper()}{want[1:]}",
            "who": who, "want": want, "so_that": so_that,
            "requirements": absolute_links(reqs), "acceptance": acs,
            "epic": story_epic[sid], "milestones": milestones,
        }

    overview = {r[0]: r for r in table_rows(tickets_md, r"T-\d+")}
    tickets = {}
    for m in re.finditer(r"^### (T-\d+) (.+?)\n(.*?)(?=^### T-|\Z)", tickets_md, re.M | re.S):
        tid, title, body = m.group(1), m.group(2).strip(), m.group(3)
        row = overview[tid]  # ID, Title, Epic, Stories, Type, Increment, Delivery, Size, Depends on
        goal = re.search(r"\*\*Goal:\*\*\s*(.+)", body)
        acs = re.search(r"\*\*Acceptance criteria:\*\*\s*(.+)", body)
        done = re.search(r"\*\*Done when:\*\*\s*(.+)", body)
        story_ids = [] if row[3] == "None" else [s.strip() for s in row[3].split(",")]
        deps = [] if row[8] == "None" else [d.strip() for d in row[8].split(",")]
        tickets[tid] = {
            "title": f"{tid} {title}", "heading": f"{tid} {title}",
            "epic": row[2], "stories": story_ids, "type": row[4],
            "increment": row[5], "delivery": row[6], "size": row[7], "depends": deps,
            "goal": absolute_links(goal.group(1).strip()) if goal else "",
            "acceptance": acs.group(1).strip() if acs else "",
            "done_when": absolute_links(done.group(1).strip()) if done else "",
        }
    return epics, stories, tickets


# ---------- GitHub calls ----------

class GitHub:
    def __init__(self, dry_run):
        self.dry_run = dry_run
        self.fake_number = 1000

    def run(self, args, input_text=None, mutating=True):
        if self.dry_run and mutating:
            print("  [dry run] gh " + " ".join(a if " " not in a else repr(a) for a in args[:6]) + (" ..." if len(args) > 6 else ""))
            return ""
        result = subprocess.run(["gh", *args], input=input_text, capture_output=True, text=True)
        if result.returncode != 0:
            sys.exit(f"gh {' '.join(args[:4])} failed:\n{result.stderr.strip()}")
        return result.stdout.strip()

    def api(self, path, method="GET", fields=None, mutating=None):
        args = ["api", path, "--method", method, "-H", "X-GitHub-Api-Version: 2022-11-28"]
        for k, v in (fields or {}).items():
            args += ["-F" if isinstance(v, int) else "-f", f"{k}={v}"]
        out = self.run(args, mutating=(method != "GET") if mutating is None else mutating)
        return json.loads(out) if out else None


def existing_issues(gh):
    out = gh.run(["issue", "list", "--repo", REPO, "--state", "all", "--limit", "500",
                  "--json", "number,title,id"], mutating=False)
    issues = json.loads(out) if out else []
    return {re.match(r"^((?:US|T)-\d+)\b", i["title"]).group(1): i["number"]
            for i in issues if re.match(r"^(?:US|T)-\d+\b", i["title"])}


def ensure_labels(gh):
    for name, (color, desc) in LABELS.items():
        gh.run(["label", "create", name, "--repo", REPO, "--color", color,
                "--description", desc, "--force"])


def ensure_milestones(gh):
    current = gh.api(f"repos/{REPO}/milestones?state=all&per_page=100", mutating=False) or []
    titles = {m["title"] for m in current}
    for title, due in MILESTONES.values():
        if title not in titles:
            gh.api(f"repos/{REPO}/milestones", "POST",
                   {"title": title, "due_on": f"{due}T12:00:00Z"})


def create_issue(gh, title, body, labels, milestone=None):
    args = ["issue", "create", "--repo", REPO, "--title", title, "--body-file", "-",
            "--label", ",".join(labels)]
    if milestone:
        args += ["--milestone", milestone]
    url = gh.run(args, input_text=body)
    if gh.dry_run:
        gh.fake_number += 1
        return gh.fake_number
    return int(url.rstrip("/").split("/")[-1])


def story_body(s, epics):
    return f"""**As a** {s['who']}, **I want to** {s['want']}, **so that** {s['so_that']}.

| | |
| --- | --- |
| Epic | {s['epic']} {epics[s['epic']]} |
| Milestones | {', '.join(s['milestones'])} |
| Requirements | {s['requirements']} |
| Acceptance criteria | {s['acceptance']} |

Defined in [PRD §14.2 User stories]({DOCS_URL}/01-PRD.md#142-user-stories). Rules and criteria live in the PRD; this issue tracks the story.
"""


def ticket_body(t, epics, stories, numbers):
    ref = lambda i: f"#{numbers[i]} ({i})" if i in numbers else i
    main = ref(t["stories"][0]) if t["stories"] else "None (foundation work)"
    others = ", ".join(ref(s) for s in t["stories"][1:]) or "None"
    deps = ", ".join(ref(d) for d in t["depends"]) or "None"
    check = (f"| Acceptance criteria | {t['acceptance']} |" if t["acceptance"]
             else f"| Done when | {t['done_when']} |")
    return f"""**Goal:** {t['goal']}

| | |
| --- | --- |
| Epic | {t['epic']} {epics[t['epic']]} |
| Main story | {main} |
| Other stories | {others} |
| Type · Increment · Size | {t['type']} · {t['increment']} · {t['size']} |
| Delivery | {t['delivery']} |
| Depends on | {deps} |
{check}

Scope and details: [{t['heading']}]({DOCS_URL}/08-WORK-TICKETS.md#{slug(t['heading'])}).
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="print what would be created")
    ap.add_argument("--root", default=".", help="repository root containing docs/")
    args = ap.parse_args()

    epics, stories, tickets = parse_docs(Path(args.root))
    print(f"Read {len(epics)} epics, {len(stories)} stories, {len(tickets)} tickets from the docs.")
    gh = GitHub(args.dry_run)

    repo = gh.api(f"repos/{REPO}", mutating=False)
    if repo is not None and not repo.get("has_issues"):
        sys.exit("Issues are turned off for this repository (forks start with them off).\n"
                 f"Turn them on in Settings > General > Features, or run: gh repo edit {REPO} --enable-issues")

    print("Labels and milestones...")
    ensure_labels(gh)
    ensure_milestones(gh)

    numbers = {} if args.dry_run else existing_issues(gh)

    print("Stories...")
    for sid, s in stories.items():
        if sid in numbers:
            print(f"  {sid} exists as #{numbers[sid]}")
            continue
        labels = ["story"] + [m.lower() for m in s["milestones"]]
        numbers[sid] = create_issue(gh, s["title"], story_body(s, epics), labels)
        print(f"  {sid} -> #{numbers[sid]}")

    print("Tickets...")
    new_tickets = []
    for tid, t in tickets.items():
        if tid in numbers:
            print(f"  {tid} exists as #{numbers[tid]}")
            continue
        milestone = MILESTONES[t["delivery"]][0]
        numbers[tid] = create_issue(gh, t["title"], ticket_body(t, epics, stories, numbers),
                                    ["task", "m1"], milestone)
        new_tickets.append(tid)
        print(f"  {tid} -> #{numbers[tid]}")

    print("Sub-issues (each ticket under its main story)...")
    for tid in new_tickets:
        t = tickets[tid]
        if not t["stories"]:
            continue
        parent = numbers[t["stories"][0]]
        child_id = 0 if args.dry_run else gh.api(f"repos/{REPO}/issues/{numbers[tid]}")["id"]
        gh.api(f"repos/{REPO}/issues/{parent}/sub_issues", "POST", {"sub_issue_id": child_id})
        print(f"  {tid} under {t['stories'][0]}")

    print("Project board...")
    project_url = ""
    out = gh.run(["project", "list", "--owner", OWNER, "--format", "json"], mutating=False)
    projects = json.loads(out).get("projects", []) if out else []
    project = next((p for p in projects if p["title"] == PROJECT_TITLE), None)
    if project is None:
        out = gh.run(["project", "create", "--owner", OWNER, "--title", PROJECT_TITLE, "--format", "json"])
        project = json.loads(out) if out else {"number": 0, "url": ""}
        gh.run(["project", "link", str(project["number"]), "--owner", OWNER, "--repo", REPO])
    project_url = project.get("url", "")
    for tid in new_tickets:
        gh.run(["project", "item-add", str(project["number"]), "--owner", OWNER,
                "--url", f"https://github.com/{REPO}/issues/{numbers[tid]}"])

    if not args.dry_run:
        Path("issue-map.json").write_text(json.dumps(
            {"repository": REPO, "project": project_url,
             "issues": {k: numbers[k] for k in [*stories, *tickets]}}, indent=2) + "\n")
        print(f"\nDone. Wrote issue-map.json. Project: {project_url}")
        print("Last manual step: open the project, and switch its view to the Board layout.")
    else:
        print("\nDry run complete. Nothing was created.")


if __name__ == "__main__":
    main()
