#!/usr/bin/env python3
"""
enrich_graph.py — Capa semantica sobre code_graph.json.

Lee code_graph.json y los design.md de todos los reqs en .planning/ para
agregar a cada nodo del grafo:
  - description: intencion de negocio extraida del design.md
  - domain:      esquema o dominio funcional del objeto
  - req_history: lista de reqs que tocaron el objeto

Salida: code_graph_enriched.json en el mismo directorio que code_graph.json.

Uso:
  python enrich_graph.py
  python enrich_graph.py --planning D:\\ProyNet\\contextos\\.github\\ProjectContexts\\.planning
  python enrich_graph.py --graph D:\\ruta\\a\\code_graph.json
"""

from __future__ import annotations

import argparse
import json
import re
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


def default_graph_path() -> Path:
    graph_file = Path(load_var("RUTA_GRAPH", r"D:\ProyNet\contextos\.github\ProjectContexts\_graph.md"))
    return graph_file.parent / "code_graph.json"


def default_planning_path() -> Path:
    return Path(load_var("RUTA_SPECS", r"D:\ProyNet\contextos\.github\ProjectContexts\.planning"))


# Patrones para extraer objetos mencionados en design.md
OBJECT_REF_RE = re.compile(r"`([a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*)`")
BACKTICK_RE   = re.compile(r"`([^`]+)`")

# Patrones para extraer descripcion de negocio de lineas contextuales
DESCRIPTION_PATTERNS = [
    re.compile(r"—\s*(.+)$"),        # - `obj.sp` — descripcion
    re.compile(r":\s*(.{10,})$"),     # obj: descripcion larga
]

def _check_freshness(path: Path, days: int = 7) -> None:
    """Advertir si el archivo base tiene más de `days` días."""
    try:
        mtime = datetime.fromtimestamp(path.stat().st_mtime)
        age = datetime.now() - mtime
        if age > timedelta(days=days):
            print(
                f"WARN: {path.name} tiene {age.days} días de antigüedad. "
                f"Los resultados pueden no reflejar cambios recientes.\n"
                f"→ Regenerar con: python code_graph.py",
                file=sys.stderr,
            )
    except OSError:
        pass


# Dominios funcionales por esquema
SCHEMA_DOMAIN = {
    "sls": "Ventas",
    "cst": "Clientes",
    "dfr": "Diferencial",
    "wms": "Inventario/WMS",
    "mkt": "Marketing",
    "sec": "Seguridad",
    "itm": "Catalogo",
    "evt": "Eventos",
    "cfg": "Configuracion",
    "dbo": "Core",
}


# Flujos de negocio por dominio (Domain → [(flow_id, flow_name)])
DOMAIN_FLOWS: dict[str, list[tuple[str, str]]] = {
    "Ventas": [
        ("order", "Gestión de Órdenes"),
        ("commission", "Comisiones"),
        ("bono", "Bonos"),
        ("point", "Puntos"),
        ("price", "Listas de Precio"),
    ],
    "Diferencial": [
        ("period", "Periodos"),
        ("rank", "Rangos"),
        ("calc", "Cálculo Diferencial"),
        ("pathway", "Pathway"),
    ],
    "Inventario/WMS": [
        ("inventory", "Control de Inventario"),
        ("warehouse", "Gestión de Bodegas"),
        ("item", "Artículos"),
    ],
    "Clientes": [
        ("customer", "Gestión de Clientes"),
        ("tree", "Árbol de Distribución"),
        ("enrollment", "Inscripción"),
    ],
    "Marketing": [
        ("promotion", "Promociones"),
        ("coupon", "Cupones"),
        ("campaign", "Campañas"),
    ],
    "Catalogo": [
        ("item", "Catálogo de Artículos"),
        ("web", "Catálogo Web"),
    ],
}

# Nombre de SP/objeto → fase dentro del flujo
FLOW_STEP_MAP = [
    (re.compile(r"prcSet", re.I),               "write"),
    (re.compile(r"prcGet|prcList", re.I),        "read"),
    (re.compile(r"prcDel|prcRemove", re.I),      "delete"),
    (re.compile(r"prcCalc|prcProcess|prcRun", re.I), "process"),
    (re.compile(r"prcValid|prcCheck", re.I),     "validate"),
    (re.compile(r"vs[A-Z]", re.I),               "query"),
    (re.compile(r"Controller\.", re.I),           "endpoint"),
    (re.compile(r"fn[A-Z]", re.I),               "function"),
    (re.compile(r"trg[A-Z]", re.I),              "trigger"),
]


def infer_flow(obj_name: str, domain: str) -> str:
    """Infiere el flujo de negocio al que pertenece el objeto."""
    local = obj_name.split(".")[-1].lower() if "." in obj_name else obj_name.lower()
    for flow_id, flow_name in DOMAIN_FLOWS.get(domain, []):
        if flow_id in local:
            return flow_name
    return ""


def infer_flow_step(obj_name: str) -> str:
    """Infiere la fase del objeto dentro de su flujo."""
    local = obj_name.split(".")[-1] if "." in obj_name else obj_name
    for pattern, step in FLOW_STEP_MAP:
        if pattern.search(local):
            return step
    return ""


def validate_enriched_graph(graph: dict) -> tuple[list[str], list[str]]:
    """
    Valida integridad del grafo enriquecido.
    Retorna (errors, warnings). Errors = detienen el pipeline; warnings = informativos.
    """
    errors:   list[str] = []
    warnings: list[str] = []

    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    # 1. Completeness
    if not nodes:
        errors.append("ERROR: Grafo sin nodos.")
    if not edges:
        warnings.append("WARN: Grafo sin edges (sin dependencias registradas).")

    # 2. Schema + uniqueness
    required_fields = {"label"}
    node_labels: set[str] = set()
    for i, node in enumerate(nodes):
        missing = required_fields - set(node.keys())
        if missing:
            errors.append(f"ERROR: Nodo[{i}] falta campo requerido: {missing}")
            continue
        label = node["label"]
        if label.lower() in {n.lower() for n in node_labels}:
            errors.append(f"ERROR: Nodo duplicado: '{label}'")
        node_labels.add(label)

    # 3. Referential integrity de edges
    labels_lower = {n.lower() for n in node_labels}
    unresolved: list[str] = []
    for j, edge in enumerate(edges):
        src = edge.get("from", "")
        tgt = edge.get("to", "")
        if src.lower() not in labels_lower:
            unresolved.append(f"edge[{j}].from='{src}'")
        if tgt.lower() not in labels_lower:
            unresolved.append(f"edge[{j}].to='{tgt}'")
    if unresolved:
        sample = unresolved[:5]
        extra = f" (+{len(unresolved)-5} más)" if len(unresolved) > 5 else ""
        warnings.append(f"WARN: {len(unresolved)} referencias de edges no resueltas: {sample}{extra}")

    # 4. Orphan nodes
    referenced: set[str] = set()
    for edge in edges:
        referenced.add(edge.get("from", "").lower())
        referenced.add(edge.get("to", "").lower())
    orphans = [n["label"] for n in nodes if n.get("label", "").lower() not in referenced]
    if orphans:
        sample = orphans[:5]
        extra = f" (+{len(orphans)-5} más)" if len(orphans) > 5 else ""
        warnings.append(f"WARN: {len(orphans)} nodos huérfanos (sin edges): {sample}{extra}")

    # 5. Coverage de descripciones
    if nodes:
        empty_desc = sum(1 for n in nodes if not n.get("description"))
        pct = empty_desc / len(nodes) * 100
        if pct > 50:
            warnings.append(
                f"WARN: {empty_desc}/{len(nodes)} nodos ({pct:.0f}%) sin descripción. "
                f"→ Ejecutar enrich_graph.py con más design.md en .planning/"
            )

    return errors, warnings


def infer_domain(obj_name: str) -> str:
    if "." in obj_name:
        schema = obj_name.split(".", 1)[0].lower()
        return SCHEMA_DOMAIN.get(schema, schema)
    if "Controller." in obj_name:
        parts = obj_name.split(".")
        return parts[0].replace("Controller", "")
    return "desconocido"


def infer_layer(obj_name: str) -> str:
    name = obj_name.lower()
    local = name.split(".")[-1] if "." in name else name
    if local.startswith("prc"):
        return "service"
    if local.startswith("vs"):
        return "query"
    if "controller." in name:
        return "endpoint"
    if any(local.startswith(p) for p in ("tbl", "seed", "config")):
        return "data"
    if "." in obj_name and not local.startswith(("prc", "vs", "fn", "trg")):
        return "data"
    if local.startswith("fn"):
        return "function"
    if local.startswith("trg"):
        return "trigger"
    return "unknown"


def extract_object_context(design_text: str, req_id: str) -> dict[str, str]:
    """
    Recorre el design.md y extrae pares objeto -> descripcion.
    Busca lineas que mencionen un objeto en backticks seguido de una descripcion.
    """
    context: dict[str, str] = {}
    for line in design_text.splitlines():
        refs = OBJECT_REF_RE.findall(line)
        if not refs:
            continue
        for desc_pat in DESCRIPTION_PATTERNS:
            dm = desc_pat.search(line)
            if dm:
                description = dm.group(1).strip()
                description = re.sub(r"`[^`]+`", "", description).strip(" .,;")
                if len(description) > 10:
                    for ref in refs:
                        if ref not in context:
                            context[ref] = description
                break
    return context


def load_all_req_context(planning_dir: Path) -> tuple[dict[str, str], dict[str, list[str]]]:
    """
    Recorre todos los req en planning_dir buscando design.md.
    Retorna:
      descriptions: objeto -> primera descripcion encontrada
      req_history:  objeto -> [req-ids que lo mencionan]
    """
    descriptions: dict[str, str] = {}
    req_history:  dict[str, list[str]] = {}

    if not planning_dir.exists():
        print(f"WARN: planning dir no existe: {planning_dir}", file=sys.stderr)
        return descriptions, req_history

    for req_dir in sorted(planning_dir.iterdir()):
        if not req_dir.is_dir():
            continue
        req_id = req_dir.name

        design_files = list(req_dir.glob("design.md")) + list(req_dir.rglob("*/design.md"))
        for design_path in design_files:
            try:
                text = design_path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue

            ctx = extract_object_context(text, req_id)
            for obj, desc in ctx.items():
                if obj not in descriptions:
                    descriptions[obj] = desc
                req_history.setdefault(obj, [])
                if req_id not in req_history[obj]:
                    req_history[obj].append(req_id)

            # Tambien registrar todos los objetos mencionados aunque no tengan descripcion
            for ref in OBJECT_REF_RE.findall(text):
                req_history.setdefault(ref, [])
                if req_id not in req_history[ref]:
                    req_history[ref].append(req_id)

    return descriptions, req_history


def enrich(graph: dict, descriptions: dict[str, str], req_history: dict[str, list[str]]) -> dict:
    enriched_nodes = []
    for node in graph.get("nodes", []):
        label = node["label"]
        enriched = dict(node)
        enriched["description"] = descriptions.get(label, "")
        enriched["domain"]      = infer_domain(label)
        enriched["layer"]       = infer_layer(label)
        enriched["flow"]        = infer_flow(label, enriched["domain"])
        enriched["flow_step"]   = infer_flow_step(label)
        enriched["req_history"] = req_history.get(label, [])
        enriched_nodes.append(enriched)

    return {
        "nodes": enriched_nodes,
        "edges": graph.get("edges", []),
        "meta":  {"enriched": True, "req_count": len(req_history)},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Enriquece code_graph.json con contexto semantico")
    parser.add_argument("--graph",    default="", help="Ruta a code_graph.json (default: RUTA_GRAPH)")
    parser.add_argument("--planning", default="", help="Ruta al directorio .planning (default: RUTA_SPECS)")
    args = parser.parse_args()

    graph_path    = Path(args.graph)    if args.graph    else default_graph_path()
    planning_path = Path(args.planning) if args.planning else default_planning_path()

    if not graph_path.exists():
        print(
            f"ERROR: No existe {graph_path}.\n"
            f"→ Genera el grafo primero con: python sdd-toolkit/tools/code_graph.py",
            file=sys.stderr,
        )
        sys.exit(1)

    _check_freshness(graph_path)
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    print(f"Grafo base: {len(graph.get('nodes', []))} nodos, {len(graph.get('edges', []))} edges")

    print(f"Leyendo reqs en: {planning_path}")
    descriptions, req_history = load_all_req_context(planning_path)
    print(f"Objetos con contexto: {len(descriptions)}  |  Objetos con historial: {len(req_history)}")

    enriched = enrich(graph, descriptions, req_history)

    # Validar antes de escribir
    errors, warnings = validate_enriched_graph(enriched)
    for w in warnings:
        print(w, file=sys.stderr)
    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        print("→ Corregir errores antes de usar el grafo enriquecido.", file=sys.stderr)
        sys.exit(1)

    out_path = graph_path.parent / "code_graph_enriched.json"
    out_path.write_text(json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Enriched -> {out_path}")

    # Resumen de cobertura
    total = len(enriched["nodes"])
    with_desc  = sum(1 for n in enriched["nodes"] if n["description"])
    with_hist  = sum(1 for n in enriched["nodes"] if n["req_history"])
    with_flow  = sum(1 for n in enriched["nodes"] if n.get("flow"))
    print(
        f"Cobertura: {with_desc}/{total} con descripcion  |  "
        f"{with_hist}/{total} con historial de reqs  |  "
        f"{with_flow}/{total} con flujo de negocio inferido"
    )


if __name__ == "__main__":
    main()
