#!/usr/bin/env python3
"""Documentation checks for the AI SDLC gates (G3).

Usage:
  python3 scripts/check_docs.py                 # run all checks (exit 1 on errors)
  python3 scripts/check_docs.py --build-readme  # regenerate readme.md from docs/

Checks (each one has a mutation test in scripts/test_check_docs.py):
  - ticket totals in docs/tickets.md match the ticket table
  - every RF/RNF/OBJ/HU/E/T/ADR/D reference points to an existing definition
  - no document cites a decision (D-xx) that was fully superseded
  - every ADR has a status; superseded ADRs point to an existing ADR
  - ticket dependencies exist and have no cycles; AI tickets depend on the budget guard (T-33)
  - ticket contracts: everything a ticket consumes is exposed by itself or a (transitive) dependency,
    and each element has a single exposing ticket
  - the build order in docs/user-stories.md respects ticket dependencies and lists every ticket
  - story estimates match the order table and the sum of their tickets
  - readme.md is up to date with scripts/readme.template.md and docs/
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
TEMPLATE = ROOT / "scripts" / "readme.template.md"
SCANNED = ["readme.md", "prompts.md", "CLAUDE.md", "openspec/config.yaml"]
EXCLUDED_DOCS = {"ai-log.md", "ai-sdlc-claude-code-openspec.md", "reglas-proyecto-final-ai4devs.md"}
REF_PATTERNS = {
    "RF": r"\bRF-\d{2}[a-z]?\b", "RNF": r"\bRNF-\d{2}\b", "OBJ": r"\bOBJ-\d\b",
    "HU": r"\bHU\d{1,2}\b", "E": r"\bE\d\b", "T": r"\bT-\d{2}\b", "ADR": r"\bADR-\d{4}\b",
    "D": r"\bD-\d{2}\b",
}
AI_GUARD = "T-33"
AI_GUARD_EXEMPT = {"T-04", "T-32", "T-33"}  # AI client itself, golden-set labeling, the guard


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


# ---------- definitions and references ----------

def parse_decisions(prd):
    """Return {D-xx: status} from the decision log table in the PRD."""
    return {m[0]: m[1].strip() for m in re.findall(r"^\| (D-\d{2}) \|[^|]*\|[^|]*\| ([^|]+) \|", prd, re.M)}


def definitions():
    prd, stories, tickets = read("docs/prd.md"), read("docs/user-stories.md"), read("docs/tickets.md")
    return {
        "RF": set(re.findall(r"^\| (RF-\d{2}[a-z]?) \|", prd, re.M)),
        "RNF": set(re.findall(r"^\| (RNF-\d{2}) \|", prd, re.M)),
        "OBJ": set(re.findall(r"^\| (OBJ-\d) \|", prd, re.M)),
        "HU": set(re.findall(r"^### (HU\d{1,2}) —", stories, re.M)),
        "E": set(re.findall(r"^\| (E\d) [^|]*\| `", prd, re.M)),
        "T": set(re.findall(r"^### (T-\d{2}) —", tickets, re.M)),
        "ADR": {"ADR-" + p.name[:4] for p in (DOCS / "adr").glob("[0-9][0-9][0-9][0-9]-*.md")},
        "D": set(parse_decisions(prd)),
    }


def scanned_files():
    files = [p for p in DOCS.rglob("*.md") if p.name not in EXCLUDED_DOCS]
    return files + [ROOT / f for f in SCANNED if (ROOT / f).exists()]


def unknown_refs(label, text, defs):
    return [f"{label}: reference {ref} has no definition"
            for kind, pattern in REF_PATTERNS.items() for ref in sorted(set(re.findall(pattern, text)) - defs[kind])]


def superseded_citations(label, text, decisions):
    superseded = {d for d, status in decisions.items() if status.lower().startswith("reemplazada")}
    log_rows = set(re.findall(r"^\| (D-\d{2}) \|", text, re.M))
    cited = set(re.findall(REF_PATTERNS["D"], text)) - log_rows
    return [f"{label}: cites superseded decision {d}" for d in sorted(cited & superseded)]


def check_references(defs):
    decisions = parse_decisions(read("docs/prd.md"))
    errors = []
    for path in scanned_files():
        label, text = str(path.relative_to(ROOT)), path.read_text(encoding="utf-8")
        errors += unknown_refs(label, text, defs) + superseded_citations(label, text, decisions)
    return errors


# ---------- totals ----------

def ticket_totals(text):
    totals = {}
    for info in parse_ticket_table(text).values():
        totals[info["priority"]] = totals.get(info["priority"], 0.0) + info["hours"]
    return totals


def totals_errors(text):
    totals = ticket_totals(text)
    stated = re.search(r"\*\*Totales:\*\* must-have ≈ ([\d.]+) h.*?should-have ≈ ([\d.]+) h", text)
    if not stated:
        return ["docs/tickets.md: missing '**Totales:**' line"]
    return [f"docs/tickets.md: stated {label} {value} h, table sums {totals.get(key, 0.0):g} h"
            for label, key, value in (("must-have", "M", stated.group(1)), ("should-have", "S", stated.group(2)))
            if abs(float(value) - totals.get(key, 0.0)) > 0.01]


def check_totals():
    return totals_errors(read("docs/tickets.md"))


# ---------- ADRs ----------

def adr_errors(label, text, adr_ids):
    status = re.search(r"\*\*Estado:\*\* (.*)", text)
    if not status:
        return [f"{label}: missing status"]
    targets = set(re.findall(r"ADR-\d{4}", status.group(1)))
    if "reemplazada" in status.group(1) and (not targets or targets - adr_ids):
        return [f"{label}: superseded without a valid replacing ADR"]
    return []


def check_adrs(defs):
    return [e for path in sorted((DOCS / "adr").glob("*.md"))
            for e in adr_errors(str(path.relative_to(ROOT)), path.read_text(encoding="utf-8"), defs["ADR"])]


# ---------- tickets: dependencies, AI budget guard and contracts ----------

def parse_ticket_table(text):
    tickets = {}
    for row in re.findall(r"^\| T-\d{2} \|.*$", text, re.M):
        cells = [x.strip() for x in row.split("|")]
        tickets[cells[1]] = {
            "types": {t.strip() for t in cells[3].split(",")},
            "story": cells[4], "priority": cells[5], "hours": float(cells[6].split()[0]),
            "deps": set(re.findall(r"T-\d{2}", cells[7])),
        }
    return tickets


def transitive_deps(tickets, tid, seen=None):
    seen = set() if seen is None else seen
    for dep in tickets.get(tid, {}).get("deps", set()):
        if dep not in seen:
            seen.add(dep)
            transitive_deps(tickets, dep, seen)
    return seen


def check_dependencies(tickets):
    errors = []
    for tid, info in sorted(tickets.items()):
        errors += [f"docs/tickets.md: {tid} depends on unknown ticket {d}" for d in sorted(info["deps"] - tickets.keys())]
        if tid in transitive_deps(tickets, tid):
            errors.append(f"docs/tickets.md: dependency cycle through {tid}")
    return errors


def check_ai_tickets(tickets, guard=AI_GUARD, exempt=AI_GUARD_EXEMPT):
    return [f"docs/tickets.md: AI ticket {tid} does not depend on {guard} (budget guard)"
            for tid, info in sorted(tickets.items())
            if "ai" in info["types"] and tid not in exempt and guard not in transitive_deps(tickets, tid)]


def ticket_sections(text):
    return {m.group(1): m.group(0) for m in re.finditer(r"### (T-\d{2}) — .*?(?=\n### T-|\n---\n|\Z)", text, re.S)}


def parse_contracts(sections):
    contracts = {}
    for tid, body in sections.items():
        expone = re.search(r"^- \*\*Expone:\*\* (.*)$", body, re.M)
        consume = re.search(r"^- \*\*Consume:\*\* (.*)$", body, re.M)
        contracts[tid] = None if not (expone and consume) else (
            set(re.findall(r"`([^`]+)`", expone.group(1))), set(re.findall(r"`([^`]+)`", consume.group(1))))
    return contracts


def check_contracts(tickets, contracts):
    errors = [f"docs/tickets.md: {tid} has no Expone/Consume contract" for tid, c in sorted(contracts.items()) if c is None]
    exposers = {}
    for tid, c in sorted(contracts.items()):
        for item in (c[0] if c else set()):
            exposers.setdefault(item, []).append(tid)
    errors += [f"docs/tickets.md: '{item}' is exposed by several tickets: {', '.join(t)}"
               for item, t in sorted(exposers.items()) if len(t) > 1]
    for tid, c in sorted(contracts.items()):
        if not c:
            continue
        reachable = transitive_deps(tickets, tid) | {tid}
        for item in sorted(c[1]):
            owners = exposers.get(item)
            if not owners:
                errors.append(f"docs/tickets.md: {tid} consumes '{item}', which no ticket exposes")
            elif not set(owners) & reachable:
                errors.append(f"docs/tickets.md: {tid} consumes '{item}' from {owners[0]} without depending on it")
    return errors


# ---------- build order and story hours ----------

def ticket_refs(text):
    refs = set(re.findall(r"T-\d{2}", text))
    for a, b in re.findall(r"T-(\d{2}) a T-(\d{2})", text):
        refs |= {f"T-{n:02d}" for n in range(int(a), int(b) + 1)}
    return refs


def parse_order(stories):
    """Return [(rank, story_or_None, row_text, hours_text)] from the build order table."""
    rows = []
    for m in re.finditer(r"^\| (\d+) \| (HU\d+|—) \| [^|]+ \| ([^|]+) \| [^|]+ \| ([^|]+) \| [^|]+ \|$", stories, re.M):
        rows.append((int(m.group(1)), None if m.group(2) == "—" else m.group(2), m.group(3), m.group(4)))
    return rows


def ticket_ranks(tickets, rows):
    story_rank = {story: rank for rank, story, _, _ in rows if story}
    ranks = {}
    for rank, story, text, _ in rows:
        if story is None:
            for tid in ticket_refs(text):
                ranks.setdefault(tid, rank)
    for tid, info in tickets.items():
        hu = re.search(r"HU\d+", info["story"])
        if hu and tid not in ranks and hu.group(0) in story_rank:
            ranks[tid] = story_rank[hu.group(0)]
    return ranks


def check_build_order(tickets, stories):
    ranks, errors = ticket_ranks(tickets, parse_order(stories)), []
    errors += [f"docs/user-stories.md: {tid} is not placed in the build order" for tid in sorted(tickets.keys() - ranks.keys())]
    for tid in sorted(ranks.keys() & tickets.keys()):
        for dep in sorted(tickets[tid]["deps"]):
            if dep in ranks and ranks[dep] > ranks[tid]:
                errors.append(f"docs/user-stories.md: {tid} (order {ranks[tid]}) depends on {dep} (order {ranks[dep]})")
    return errors


def first_hours(text):
    match = re.search(r"([\d.]+) h", text)
    return float(match.group(1)) if match else None


def story_section_hours(stories):
    return {hid: first_hours(est) for hid, est in re.findall(r"^### (HU\d+) — .*?- \*\*Estimación:\*\* ([^\n]+)", stories, re.M | re.S)}


def check_story_hours(stories, tickets=None):
    order = {story: first_hours(hours) for _, story, _, hours in parse_order(stories) if story}
    errors = []
    for hid, section in story_section_hours(stories).items():
        if hid not in order:
            errors.append(f"docs/user-stories.md: {hid} missing from the order table")
        elif abs(section - order[hid]) > 0.01:
            errors.append(f"docs/user-stories.md: {hid} estimate differs (section {section:g} h, order table {order[hid]:g} h)")
        if tickets is not None:
            mine = [i for i in tickets.values() if re.search(rf"\b{hid}\b", i["story"])]
            must = sum(i["hours"] for i in mine if i["priority"] == "M")
            total = must if must else sum(i["hours"] for i in mine if i["priority"] == "S")
            if abs(total - section) > 0.01:
                errors.append(f"docs/user-stories.md: {hid} estimate {section:g} h differs from its tickets ({total:g} h)")
    return errors


def check_backlog():
    tickets_text, stories = read("docs/tickets.md"), read("docs/user-stories.md")
    tickets = parse_ticket_table(tickets_text)
    return (check_dependencies(tickets) + check_ai_tickets(tickets)
            + check_contracts(tickets, parse_contracts(ticket_sections(tickets_text)))
            + check_build_order(tickets, stories) + check_story_hours(stories, tickets))


# ---------- readme generation ----------

def md_block(text, after_heading, lang):
    start = text.index(after_heading)
    return re.search(r"```%s\n.*?```" % lang, text[start:], re.S).group(0)


def md_section(text, start, end):
    i = text.index(start)
    return text[i:text.index(end, i)].split("\n", 1)[1].strip()


ENTITY_DESCRIPTIONS = {
    "users": "Único usuario del sistema.",
    "resumes": "Versiones del currículum; una sola activa.",
    "job_preferences": "Filtros duros y preferencias del usuario (1:1 con `users`).",
    "target_companies": "Empresas objetivo y su plataforma de empleo.",
    "job_searches": "Búsquedas guardadas que se ejecutan en el agregador.",
    "job_postings": "Ofertas con campos estructurados, origen, decisión y marcas de medición.",
    "filter_results": "Resultado de los filtros duros por oferta (1:1 con `job_postings`).",
    "match_analyses": "Puntajes de encaje calculados por la IA.",
    "applications": "Candidaturas (una por oferta).",
    "application_events": "Historial inmutable de cada candidatura.",
}
SQL_TYPES = {"int": "integer", "string": "varchar", "text": "text", "jsonb": "jsonb",
             "boolean": "boolean", "timestamp": "timestamptz", "bytea": "bytea"}
NULLABLE = {"applied_at", "from_status", "to_status", "body", "email_meta", "file_name", "last_synced_at",
            "seniority", "location_text", "salary_currency", "salary_period", "usage"}
FK_TABLES = {"target_company_id": "target_companies", "job_search_id": "job_searches"}


def entity_row(line):
    sql_type, col, keys, note = re.match(r'\s*(\w+) (\w+)(?: ([A-Z,]+))?(?: "(.*)")?', line).groups()
    keys, note = keys or "", note or ""
    constraints = ["PK"] if "PK" in keys else []
    if "FK" in keys:
        constraints.append(f"FK → `{FK_TABLES.get(col, col[:-3] + 's')}.id`")
    if "UK" in keys:
        constraints.append("UNIQUE")
    constraints.append("NULL" if ("null" in note or col in NULLABLE) else "NOT NULL")
    description = note.replace("nullable", "").strip(" ()").replace("|", "\\|")
    return f"| `{col}` | {SQL_TYPES.get(sql_type, sql_type)} | {', '.join(constraints)} | {description} |"


def entity_tables(erd):
    tables = []
    for name, body in re.findall(r"\n    (\w+) \{\n(.*?)\n    \}", erd, re.S):
        rows = ["| Atributo | Tipo | Restricciones | Descripción |", "| --- | --- | --- | --- |"]
        rows += [entity_row(line) for line in body.strip().splitlines()]
        rows.append("| `created_at`, `updated_at` | timestamptz | NOT NULL | Marcas de tiempo |")
        tables.append(f"#### `{name}`\n\n{ENTITY_DESCRIPTIONS.get(name, '')}\n\n" + "\n".join(rows))
    return "\n\n".join(tables)


def ticket_md(tickets, tid):
    body = re.search(r"### %s — .*?(?=\n### T-|\n---\n|\Z)" % tid, tickets, re.S).group(0).strip()
    return body.replace("### ", "**Ticket — ", 1).replace("\n", "**\n", 1)


def story_md(stories, hid, titles):
    pattern = r"### %s — (.*?)\n\n(\*\*Como\*\*.*?)\n\n(- \*\*Épica.*?)\n\n#### Contexto.*?```gherkin\n(.*?)```" % hid
    title, narrative, meta, gherkin = re.search(pattern, stories, re.S).groups()
    parts = re.split(r"\n(?=(?:Escenario|Esquema del escenario):)", "\n" + gherkin.strip())
    chosen = [p.strip() for p in parts if p.strip() and p.strip().split("\n", 1)[0].split(":", 1)[1].strip() in titles]
    return (f"**Historia de Usuario — {hid}: {title}**\n\n> " + narrative.replace("\n", " ") + "\n\n" + meta
            + "\n\nCriterios de aceptación (extracto):\n\n```gherkin\n" + "\n\n".join(chosen) + "\n```")


README_STORIES = [
    ("HU2", ["Importar las ofertas de una empresa desde su job board", "Tope de ofertas por sincronización", "No duplicar ofertas"]),
    ("HU6", ["Ver el puntaje explicado", "Descartar evidencia inventada", "No repetir un análisis sin cambios"]),
    ("HU8", ["Cambiar el estado solo con el teclado", "Un estado final no cambia", "Ver el detalle de una candidatura"]),
]
README_TICKETS = ["T-09", "T-15", "T-11"]


def build_readme():
    arch, stories, tickets = read("docs/architecture.md"), read("docs/user-stories.md"), read("docs/tickets.md")
    erd = md_block(arch, "## 3. Modelo de datos", "mermaid")
    values = {
        "DIAGRAM": md_block(arch, "### 2.1 Diagrama de arquitectura", "mermaid"),
        "SEQ": md_block(arch, "### 2.3 Flujo principal de datos", "mermaid"),
        "TREE": md_block(arch, "### 2.4 Estructura del proyecto", "text"),
        "COMPONENTS": md_section(arch, "### 2.2 Componentes principales", "### 2.3 Flujo principal de datos"),
        "INFRA": md_section(arch, "### 2.5 Infraestructura y despliegue", "### 2.6 Seguridad"),
        "SECURITY": md_section(arch, "### 2.6 Seguridad", "### 2.7 Pruebas"),
        "TESTS": md_section(arch, "### 2.7 Pruebas", "## 3. Modelo de datos"),
        "ERD": erd,
        "INTEGRITY": arch[arch.index("**Reglas de integridad:**"):arch.index("## 4. Especificación de la API")].strip(),
        "ENTITIES": entity_tables(erd),
        "EPICS": re.search(r"## Épicas\n\n(.*?)\n\nMás ", stories, re.S).group(1),
        "STORIES": "\n\n".join(story_md(stories, hid, titles) for hid, titles in README_STORIES),
        "TICKETS": "\n\n".join(ticket_md(tickets, tid) for tid in README_TICKETS),
        "SCENARIOS": str(len(re.findall(r"^(?:Escenario|Esquema del escenario):", stories, re.M))),
        "TICKET_COUNT": str(len(re.findall(r"^### T-\d{2} —", tickets, re.M))),
    }
    out = TEMPLATE.read_text(encoding="utf-8")
    for key, value in values.items():
        out = out.replace(f"@@{key}@@", value)
    if "@@" in out:
        raise ValueError("readme template has unresolved placeholders")
    return out


def check_readme():
    if build_readme() != read("readme.md"):
        return ["readme.md: out of date; run python3 scripts/check_docs.py --build-readme"]
    return []


def main(argv):
    if "--build-readme" in argv:
        (ROOT / "readme.md").write_text(build_readme(), encoding="utf-8")
        print("readme.md regenerated")
        return 0
    defs = definitions()
    errors = check_totals() + check_references(defs) + check_adrs(defs) + check_backlog() + check_readme()
    for error in errors:
        print(f"ERROR {error}")
    totals = ticket_totals(read("docs/tickets.md"))
    print(f"tickets: must-have {totals.get('M', 0):g} h, should-have {totals.get('S', 0):g} h; errors: {len(errors)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
