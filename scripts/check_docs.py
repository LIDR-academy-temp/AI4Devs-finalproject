#!/usr/bin/env python3
"""Documentation checks for the AI SDLC gates (G3).

Usage:
  python3 scripts/check_docs.py                 # run all checks (exit 1 on errors)
  python3 scripts/check_docs.py --build-readme  # regenerate readme.md from docs/

Checks:
  - ticket totals in docs/tickets.md match the ticket table
  - every RF/RNF/OBJ/HU/E/T/ADR reference points to an existing definition
  - every ADR has a status; superseded ADRs point to an existing ADR
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
}


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


# ---------- definitions and references ----------

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
    }


def scanned_files():
    files = [p for p in DOCS.rglob("*.md") if p.name not in EXCLUDED_DOCS]
    return files + [ROOT / f for f in SCANNED if (ROOT / f).exists()]


def check_references(defs):
    errors = []
    for path in scanned_files():
        text = path.read_text(encoding="utf-8")
        for kind, pattern in REF_PATTERNS.items():
            for ref in sorted(set(re.findall(pattern, text)) - defs[kind]):
                errors.append(f"{path.relative_to(ROOT)}: reference {ref} has no definition")
    return errors


# ---------- totals ----------

def ticket_totals(text):
    totals = {}
    for row in re.findall(r"^\| T-\d{2} \|.*$", text, re.M):
        cells = [c.strip() for c in row.split("|")]
        priority, hours = cells[5], float(cells[6].split()[0])
        totals[priority] = totals.get(priority, 0.0) + hours
    return totals


def check_totals():
    text = read("docs/tickets.md")
    totals = ticket_totals(text)
    stated = re.search(r"\*\*Totales:\*\* must-have ≈ ([\d.]+) h.*?should-have ≈ ([\d.]+) h", text)
    if not stated:
        return ["docs/tickets.md: missing '**Totales:**' line"]
    errors = []
    for label, key, value in (("must-have", "M", stated.group(1)), ("should-have", "S", stated.group(2))):
        if abs(float(value) - totals.get(key, 0.0)) > 0.01:
            errors.append(f"docs/tickets.md: stated {label} {value} h, table sums {totals.get(key, 0.0):g} h")
    return errors


# ---------- ADRs ----------

def check_adrs(defs):
    errors = []
    for path in sorted((DOCS / "adr").glob("*.md")):
        status = re.search(r"\*\*Estado:\*\* (.*)", path.read_text(encoding="utf-8"))
        if not status:
            errors.append(f"{path.relative_to(ROOT)}: missing status")
            continue
        if "reemplazada" in status.group(1):
            targets = set(re.findall(r"ADR-\d{4}", status.group(1)))
            if not targets or targets - defs["ADR"]:
                errors.append(f"{path.relative_to(ROOT)}: superseded without a valid replacing ADR")
    return errors


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
    errors = check_totals() + check_references(defs) + check_adrs(defs) + check_readme()
    for error in errors:
        print(f"ERROR {error}")
    totals = ticket_totals(read("docs/tickets.md"))
    print(f"tickets: must-have {totals.get('M', 0):g} h, should-have {totals.get('S', 0):g} h; errors: {len(errors)}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
