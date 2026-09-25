#!/usr/bin/env python3
"""
impact_graph.py — Analisis de impacto para objetos SQL/backend NICE.

Dado un objeto (SP, tabla, vista, endpoint), responde:
  - Callers directos e indirectos (hasta --depth niveles)
  - Dependencias directas del objeto
  - Endpoints API que lo exponen

Prerequisito: code_graph.json debe existir (generado por code_graph.py).

Uso:
  python impact_graph.py --object sls.prcSetBono
  python impact_graph.py --object "sls.prcSetBono,sls.Bonos" --depth 2
  python impact_graph.py --object sls.prcSetBono --format md
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from graph_viz import load_var  # noqa: E402


def graph_json_path() -> Path:
    graph_file = Path(load_var("RUTA_GRAPH", r"D:\ProyNet\contextos\.github\ProjectContexts\_graph.md"))
    enriched = graph_file.parent / "code_graph_enriched.json"
    standard = graph_file.parent / "code_graph.json"
    return enriched if enriched.exists() else standard


def _check_freshness(path: Path, days: int = 7) -> None:
    """Advertir si el archivo de grafo tiene más de `days` días."""
    try:
        mtime = datetime.fromtimestamp(path.stat().st_mtime)
        age = datetime.now() - mtime
        if age > timedelta(days=days):
            print(
                f"WARN: {path.name} tiene {age.days} días de antigüedad. "
                f"Los resultados pueden no reflejar cambios recientes.\n"
                f"→ Regenerar con: python sdd-toolkit/tools/code_graph.py",
                file=sys.stderr,
            )
    except OSError:
        pass


def load_graph() -> dict:
    path = graph_json_path()
    if not path.exists():
        print(
            f"ERROR: No existe {path}.\n"
            f"→ Genera el grafo primero con: python sdd-toolkit/tools/code_graph.py\n"
            f"  Si ya existe en otra ruta, usa: --graph <ruta>",
            file=sys.stderr,
        )
        sys.exit(1)
    _check_freshness(path)
    return json.loads(path.read_text(encoding="utf-8"))


def normalize(name: str) -> str:
    return name.strip().lower()


def find_callers(edges: list[dict], target: str, depth: int = 2) -> dict[int, list[dict]]:
    """Retorna callers agrupados por nivel de profundidad."""
    result: dict[int, list[dict]] = {}
    visited: set[str] = {normalize(target)}
    current_targets: set[str] = {normalize(target)}

    for level in range(1, depth + 1):
        level_callers: list[dict] = []
        next_targets: set[str] = set()
        for edge in edges:
            if normalize(edge["to"]) in current_targets:
                caller_n = normalize(edge["from"])
                if caller_n not in visited:
                    level_callers.append(edge)
                    next_targets.add(caller_n)
                    visited.add(caller_n)
        result[level] = level_callers
        if not next_targets:
            break
        current_targets = next_targets

    return result


def find_dependencies(edges: list[dict], source: str) -> list[dict]:
    """Dependencias directas: que llama este objeto."""
    source_n = normalize(source)
    return [e for e in edges if normalize(e["from"]) == source_n]


def is_endpoint(node_id: str) -> bool:
    return "Controller." in node_id or node_id.endswith("Controller")


def _risk_level(caller_count: int, api_count: int) -> str:
    if caller_count == 0:
        return "BAJO"
    if api_count > 0 or caller_count >= 3:
        return "ALTO"
    return "MEDIO"


def print_text(target: str, callers_by_level: dict, deps: list[dict]) -> None:
    all_callers = [e for lvl in callers_by_level.values() for e in lvl]
    api_callers = [e for e in all_callers if is_endpoint(e["from"])]
    risk = _risk_level(len(callers_by_level.get(1, [])), len(api_callers))

    print(f"\n=== Impacto: {target} ===\n")
    print(
        f"  Callers directos : {len(callers_by_level.get(1, []))}"
        f"  |  Transitivos : {sum(len(v) for k,v in callers_by_level.items() if k > 1)}"
        f"  |  Endpoints API : {len(api_callers)}"
        f"  |  Riesgo : {risk}\n"
    )

    for level, edges in callers_by_level.items():
        if not edges:
            continue
        label = "Callers directos" if level == 1 else f"Callers nivel {level} (transitivos)"
        print(f"[{label}] ({len(edges)}):")
        for e in edges:
            marker = " <- API" if is_endpoint(e["from"]) else ""
            print(f"    {e['from']}{marker}  [{e['relation']}/{e['source']}]")
        print()

    if deps:
        print(f"[Dependencias directas] ({len(deps)}):")
        for e in deps:
            print(f"    {e['to']}  [{e['relation']}/{e['source']}]")
        print()

    if not all_callers and not deps:
        print("  Sin dependencias ni callers en el grafo actual.")

    print("NOTA: Regenerar grafo si es > 7 dias: python code_graph.py")


def print_md(target: str, callers_by_level: dict, deps: list[dict]) -> None:
    all_callers = [e for lvl in callers_by_level.values() for e in lvl]
    api_callers = [e for e in all_callers if is_endpoint(e["from"])]
    direct = callers_by_level.get(1, [])
    risk = _risk_level(len(direct), len(api_callers))
    risk_reason = {
        "ALTO": "tiene callers API activos o 3+ callers directos",
        "MEDIO": "tiene callers SQL que no estan en scope",
        "BAJO": "sin callers conocidos en el grafo",
    }[risk]

    print(f"\n## Impacto: `{target}`\n")
    print("| Metrica | Valor |")
    print("|---|---|")
    print(f"| Callers directos | {len(direct)} |")
    print(f"| Callers transitivos | {sum(len(v) for k,v in callers_by_level.items() if k > 1)} |")
    print(f"| Endpoints API expuestos | {len(api_callers)} |")
    print(f"| Dependencias directas | {len(deps)} |")
    print(f"| Riesgo de regresion | **{risk}** |")
    print()

    for level, edges in callers_by_level.items():
        if not edges:
            continue
        label = "Callers directos" if level == 1 else f"Callers nivel {level} (transitivos)"
        print(f"### {label}\n")
        for e in edges:
            marker = " — **API**" if is_endpoint(e["from"]) else ""
            print(f"- `{e['from']}`{marker} — {e['relation']} ({e['source']})")
        print()

    if deps:
        print("### Dependencias directas\n")
        for e in deps:
            print(f"- `{e['to']}` — {e['relation']} ({e['source']})")
        print()

    if not all_callers and not deps:
        print("_Sin dependencias ni callers encontrados en el grafo._\n")

    non_scope_direct = [e for e in direct if not is_endpoint(e["from"])]
    if non_scope_direct or api_callers:
        print("### Contratos no romper\n")
        for e in api_callers:
            print(f"- `{e['from']}` — endpoint activo: mantener firma de parametros y result set")
        for e in non_scope_direct:
            print(f"- `{e['from']}` — caller SQL no en scope: verificar compatibilidad hacia atras")
        print()

    print(f"> **Riesgo de regresion: {risk}** — {risk_reason}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Analisis de impacto de objetos SQL/backend")
    parser.add_argument("--object", required=True, help="Objeto(s) a analizar (csv)")
    parser.add_argument(
        "--depth", type=int, default=2, help="Niveles de callers transitivos (default 2)"
    )
    parser.add_argument(
        "--format", choices=["text", "md"], default="text", help="Formato de salida"
    )
    args = parser.parse_args()

    graph = load_graph()
    edges = graph.get("edges", [])

    objects = [o.strip() for o in args.object.split(",") if o.strip()]
    for obj in objects:
        callers = find_callers(edges, obj, depth=args.depth)
        deps = find_dependencies(edges, obj)
        if args.format == "md":
            print_md(obj, callers, deps)
        else:
            print_text(obj, callers, deps)


if __name__ == "__main__":
    main()
