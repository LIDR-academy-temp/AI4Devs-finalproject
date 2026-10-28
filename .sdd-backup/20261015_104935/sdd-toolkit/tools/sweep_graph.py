#!/usr/bin/env python3
"""
sweep_graph.py — Barrido periodico SDD (tickets estancados + learnings a revisar)

Uso:
  python sweep_graph.py                 # barrido con umbral default (14 dias)
  python sweep_graph.py --days 21       # umbral de estancamiento distinto
  python sweep_graph.py --graph <ruta>  # ruta alternativa a _graph.md

Solo lectura: no modifica _graph.md, _index.md ni profiles/*.md. Invocado
desde /sincronizar (paso 6) como parte del barrido periodico existente.
"""

import argparse
import re
import sys
from datetime import date, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from graph_viz import parse_graph, DEFAULT_GRAPH, load_var  # noqa: E402

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

TOOLKIT_DIR = Path(__file__).parent.parent
RUTA_SPECS  = Path(load_var("RUTA_SPECS", r"D:\ProyNet\contextos\.github\ProjectContexts\.planning"))
PROFILES_DIR = TOOLKIT_DIR / "profiles"

TERMINAL_STATES = {"ARCHIVADO", "ARCHIVADO sin deploy", "Completado"}


# ---------------------------------------------------------------------------
# Chequeo 1: tickets estancados
# ---------------------------------------------------------------------------

def find_index_path(tkt_id: str) -> Path | None:
    direct = RUTA_SPECS / tkt_id
    if direct.exists():
        return direct / "_index.md"
    if RUTA_SPECS.exists():
        for d in RUTA_SPECS.iterdir():
            if d.is_dir() and d.name.lower() == tkt_id.lower():
                return d / "_index.md"
    return None


def last_log_date(index_text: str) -> str | None:
    """Ultima fecha (yyyy-mm-dd) de la tabla '## Log de estados'."""
    dates = re.findall(r'^\|\s*(\d{4}-\d{2}-\d{2})\s*\|', index_text, re.MULTILINE)
    return dates[-1] if dates else None


TICKET_ID_RE = re.compile(r'^tkt-', re.IGNORECASE)


def find_stale_tickets(tickets: dict, days_threshold: int) -> list:
    stale = []
    today = date.today()

    for tkt_id, data in tickets.items():
        # parse_graph() tambien matchea la tabla "## Dominios" ([[ventas]],
        # [[clientes]], ...) porque comparte la forma "| [[tag]] | ... |".
        # Solo IDs con prefijo tkt-/TKT- son tickets reales.
        if not TICKET_ID_RE.match(tkt_id):
            continue
        if data["state"] in TERMINAL_STATES:
            continue

        index_path = find_index_path(tkt_id)
        if not index_path or not index_path.exists():
            stale.append((tkt_id, data["state"], "sin _index.md", None))
            continue

        text = index_path.read_text(encoding="utf-8")
        last_date = last_log_date(text)
        if not last_date:
            stale.append((tkt_id, data["state"], "sin Log de estados", None))
            continue

        try:
            elapsed = (today - datetime.strptime(last_date, "%Y-%m-%d").date()).days
        except ValueError:
            continue

        if elapsed > days_threshold:
            stale.append((tkt_id, data["state"], f"{elapsed}d sin cambio", last_date))

    return stale


# ---------------------------------------------------------------------------
# Chequeo 2: aprendizajes que ameritan revision (mismo objeto, multiples TKT)
# ---------------------------------------------------------------------------

def find_repeated_learnings(profiles_dir: Path) -> list:
    """Agrupa filas de '## Learnings (acumulado)' por el primer objeto entre
    backticks del texto del aprendizaje. Grupos con 2+ TKT distintos se
    reportan para revision manual (posible aprendizaje superpuesto o
    contradicho por uno mas reciente) — no se auto-resuelve, solo se señala.
    """
    findings = []
    if not profiles_dir.exists():
        return findings

    row_re = re.compile(r'^\|\s*(TKT-[\w-]+)\s*\|\s*([\d-]+)\s*\|\s*(.+?)\s*\|\s*$')

    for profile_path in sorted(profiles_dir.glob("*.md")):
        text = profile_path.read_text(encoding="utf-8")
        if "## Learnings (acumulado)" not in text:
            continue

        section = text.split("## Learnings (acumulado)", 1)[1]
        section = section.split("\n## ", 1)[0]

        groups: dict = {}
        for line in section.splitlines():
            m = row_re.match(line)
            if not m:
                continue
            tkt, fecha, aprendizaje = m.groups()
            obj_m = re.search(r'`([^`]+)`', aprendizaje)
            if not obj_m:
                continue
            key = obj_m.group(1)
            groups.setdefault(key, []).append((tkt, fecha, aprendizaje))

        for key, rows in groups.items():
            distinct_tkts = {r[0] for r in rows}
            if len(distinct_tkts) > 1:
                findings.append((profile_path.name, key, rows))

    return findings


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Barrido periodico SDD")
    parser.add_argument("--graph", default=str(DEFAULT_GRAPH), help="Ruta a _graph.md")
    parser.add_argument("--days", type=int, default=14, help="Umbral de dias sin cambio")
    parser.add_argument("--quiet", action="store_true",
                        help="Solo errores/advertencias + resumen (suprime lineas ok)")
    args = parser.parse_args()

    graph_path = Path(args.graph)
    if not graph_path.exists():
        print(f"ERROR: No se encontro {graph_path}", file=sys.stderr)
        sys.exit(1)

    tickets = parse_graph(graph_path.read_text(encoding="utf-8"))

    if not args.quiet:
        print("\n=== Barrido periodico SDD ===\n")

    stale = find_stale_tickets(tickets, args.days)
    repeated = find_repeated_learnings(PROFILES_DIR)
    warn_count = len(stale) + len(repeated)

    if not args.quiet:
        print(f"[1/2] Tickets estancados (>{args.days}d sin cambio de estado):")
        if not stale:
            print("  — Ninguno.")
        else:
            for tkt_id, state, motivo, last_date in stale:
                print(f"  {tkt_id}  [{state}]  {motivo}")

        print(f"\n[2/2] Aprendizajes a revisar (mismo objeto, 2+ tickets distintos):")
        if not repeated:
            print("  — Ninguno.")
        else:
            for profile_name, key, rows in repeated:
                print(f"  {profile_name} :: `{key}`")
                for tkt, fecha, aprendizaje in rows:
                    print(f"    -> {tkt} ({fecha}): {aprendizaje}")
        print()
    else:
        # Modo quiet: solo warn/error + resumen
        for tkt_id, state, motivo, _ in stale:
            print(f"⚠  {tkt_id}  [{state}]  {motivo}")
        for profile_name, key, rows in repeated:
            tkts = ", ".join(r[0] for r in rows)
            print(f"⚠  {profile_name} :: `{key}` ({tkts})")
        ok_count = len([t for t in tickets if tickets[t]["state"] in TERMINAL_STATES])
        print(f"{ok_count} ok, {warn_count} warn, 0 error")


if __name__ == "__main__":
    main()
