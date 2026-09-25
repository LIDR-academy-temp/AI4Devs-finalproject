#!/usr/bin/env python3
"""
code_graph.py – Grafo de dependencias SQL Server + backend NesGoApiNet.

Extractores:
  - SQL: sys.sql_expression_dependencies (pyodbc)
  - Backend: regex sobre Controllers/**/*.cs (bloques SqlCode)

Limitaciones:
  - SqlCode con concatenación compleja puede no detectarse.
  - SqlCode += encadenado parcial: solo el primer bloque verbatim.
  - No hay cobertura 100% de rutas ni de SQL embebido.

Regeneración manual del grafo (no enganchado a /sincronizar).

Conexión SQL desde SDD_SQL_CONNECTION, variables DB_*, o ~/.cursor/mcp.json (nesgotesthub).

Salidas en RUTA_GRAPH: code_graph.json, code_graph_viz.html
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

from graph_viz import HTML_TEMPLATE, load_var, PROJECT_NAME  # noqa: E402

from config_utils import find_config  # noqa: E402
try:
    CONFIG_PATH = find_config(TOOLS_DIR.parent)
except FileNotFoundError:
    CONFIG_PATH = TOOLS_DIR.parent / "sdd.config.yaml"  # fallback para error messages

SQL_DEPS_QUERY = """
SELECT
  OBJECT_SCHEMA_NAME(referencing_id) + '.' + OBJECT_NAME(referencing_id) AS referencing,
  referenced_schema_name + '.' + referenced_entity_name AS referenced
FROM sys.sql_expression_dependencies
WHERE referenced_schema_name IS NOT NULL
ORDER BY referencing;
"""

EXEC_RE = re.compile(r"EXEC\s+(?:\(\s*)?(\w+\.\w+)", re.IGNORECASE)
FROM_RE = re.compile(r"\bFROM\s+(\w+\.\w+)", re.IGNORECASE)
UPDATE_RE = re.compile(r"\bUPDATE\s+(\w+\.\w+)", re.IGNORECASE)
INSERT_RE = re.compile(r"\bINSERT\s+(?:INTO\s+)?(\w+\.\w+)", re.IGNORECASE)
DELETE_RE = re.compile(r"\bDELETE\s+(?:FROM\s+)?(\w+\.\w+)", re.IGNORECASE)

CLASS_CONTROLLER_RE = re.compile(r"public\s+class\s+(\w+Controller)\b")
METHOD_RE = re.compile(
    r"public\s+(?:async\s+)?(?:ContentResult|IActionResult|ActionResult<[^>]+>|ActionResult)\s+(\w+)\s*\(",
    re.MULTILINE,
)
HTTP_ATTR_RE = re.compile(
    r"\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)(?:\([^\)]*\))?\]",
    re.IGNORECASE,
)
ROUTE_ATTR_RE = re.compile(r'\[Route\s*\(\s*"([^"]*)"', re.IGNORECASE)
SQLCODE_ASSIGN_RE = re.compile(
    r"cApiRequest\.SqlCode\s*(?:\+)?=\s*\$@\"",
    re.MULTILINE | re.IGNORECASE,
)


def _controller_route_token(controller: str, file_stem: str) -> str:
    name = file_stem or controller
    if name.endswith("Controller"):
        return name[: -len("Controller")]
    return name


def _class_route(content: str) -> str | None:
    cm = CLASS_CONTROLLER_RE.search(content)
    if not cm:
        return None
    class_decl_end = cm.end()
    route: str | None = None
    for rm in ROUTE_ATTR_RE.finditer(content):
        if rm.start() >= class_decl_end:
            break
        route = rm.group(1)
    return route


def _combine_routes(class_route: str | None, method_route: str | None, token: str) -> str | None:
    def subst(route: str) -> str:
        return route.replace("[controller]", token).replace("[Controller]", token)

    cr = subst(class_route) if class_route else ""
    mr = subst(method_route) if method_route else ""
    if not cr and not mr:
        return None
    if not mr:
        return cr.rstrip("/") or None
    if not cr:
        return mr.lstrip("/")
    return f"{cr.rstrip('/')}/{mr.lstrip('/')}"


def _config_text() -> str:
    try:
        return CONFIG_PATH.read_text(encoding="utf-8")
    except OSError:
        return ""


def graph_dir() -> Path:
    graph_file = Path(load_var("RUTA_GRAPH", r"D:\ProyNet\contextos\.github\ProjectContexts\_graph.md"))
    return graph_file.parent


def repo_api_path() -> Path:
    return Path(load_var("RUTA_REPO_API", r"D:\ProyNet\NesGoApi\NESGoApiNet"))


def load_test_sql_endpoint() -> tuple[str, int]:
    text = _config_text()
    m = re.search(
        r"envs:\s*\n\s*test:\s*\{\s*host:\s*([^\s,]+)\s*,\s*port:\s*(\d+)\s*\}",
        text,
        re.MULTILINE,
    )
    if m:
        return m.group(1), int(m.group(2))
    return "127.0.0.1", 1433


def _mcp_json_path() -> Path:
    override = os.environ.get("CURSOR_MCP_CONFIG", "").strip()
    if override:
        return Path(override).expanduser()
    return Path.home() / ".cursor" / "mcp.json"


def load_mcp_db_env(server: str = "nesgotesthub") -> dict[str, str]:
    path = _mcp_json_path()
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    servers = data.get("mcpServers") or {}
    entry = servers.get(server) or {}
    env = entry.get("env") or {}
    keys = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
    return {k: str(env[k]).strip() for k in keys if k in env and str(env[k]).strip()}


def _db_params() -> dict[str, str]:
    keys = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")
    out: dict[str, str] = {}
    for k in keys:
        v = os.environ.get(k, "").strip()
        if v:
            out[k] = v
    if all(out.get(k) for k in ("DB_HOST", "DB_NAME")):
        return out

    mcp = load_mcp_db_env("nesgotesthub")
    for k in keys:
        if k not in out and mcp.get(k):
            out[k] = mcp[k]
    if all(out.get(k) for k in ("DB_HOST", "DB_NAME")):
        return out

    host, port = load_test_sql_endpoint()
    out.setdefault("DB_HOST", host)
    out.setdefault("DB_PORT", str(port))
    out.setdefault("DB_NAME", load_var("DB_PRINCIPAL", "Nesgo"))
    return out


def sql_connection_string() -> str:
    env = os.environ.get("SDD_SQL_CONNECTION", "").strip()
    if env:
        return env
    params = _db_params()
    host = params.get("DB_HOST", "127.0.0.1")
    port = params.get("DB_PORT", "1433")
    db = params.get("DB_NAME", load_var("DB_PRINCIPAL", "Nesgo"))
    user = params.get("DB_USER", "").strip()
    password = params.get("DB_PASSWORD", "").strip()
    driver = os.environ.get("SDD_SQL_DRIVER", "ODBC Driver 17 for SQL Server")
    base = f"DRIVER={{{driver}}};SERVER={host},{port};DATABASE={db};"
    if user and password:
        return base + f"UID={user};PWD={password};TrustServerCertificate=yes;"
    return base + "Trusted_Connection=yes;TrustServerCertificate=yes;"


def _iter_verbatim_sql_blocks(content: str) -> list[tuple[int, str]]:
    blocks: list[tuple[int, str]] = []
    for m in SQLCODE_ASSIGN_RE.finditer(content):
        start = m.end()
        i = start
        while i < len(content):
            ch = content[i]
            if ch == '"':
                if i + 1 < len(content) and content[i + 1] == '"':
                    i += 2
                    continue
                break
            i += 1
        blocks.append((m.start(), content[start:i]))
    return blocks


def _endpoint_for_block(content: str, block_pos: int, controller: str, file_stem: str) -> str:
    prefix = content[:block_pos]
    methods = list(METHOD_RE.finditer(prefix))
    if not methods:
        return f"{file_stem}::unknown"

    method_name = methods[-1].group(1)
    method_start = methods[-1].start()
    region_start = max(0, method_start - 800)
    region = prefix[region_start:method_start]

    http_verb = None
    for hm in HTTP_ATTR_RE.finditer(region):
        http_verb = hm.group(1).replace("Http", "").upper()

    method_route: str | None = None
    for rm in ROUTE_ATTR_RE.finditer(region):
        method_route = rm.group(1)

    token = _controller_route_token(controller, file_stem)
    full_route = _combine_routes(_class_route(content), method_route, token)

    label = f"{controller}.{method_name}"
    if http_verb:
        label += f" [{http_verb}"
        if full_route:
            label += f" {full_route}"
        label += "]"
    return label


def _edges_from_sql_text(endpoint: str, sql_text: str) -> list[dict]:
    edges: list[dict] = []
    seen: set[tuple[str, str, str]] = set()

    for em in EXEC_RE.finditer(sql_text):
        target = em.group(1)
        key = (endpoint, target, "calls")
        if key not in seen:
            seen.add(key)
            edges.append(
                {"from": endpoint, "to": target, "relation": "calls", "source": "backend"}
            )

    if not edges:
        refs: set[str] = set()
        for pat in (FROM_RE, UPDATE_RE, INSERT_RE, DELETE_RE):
            for rm in pat.finditer(sql_text):
                refs.add(rm.group(1))
        for target in sorted(refs):
            key = (endpoint, target, "references")
            if key not in seen:
                seen.add(key)
                edges.append(
                    {
                        "from": endpoint,
                        "to": target,
                        "relation": "references",
                        "source": "backend",
                    }
                )
    return edges


def extract_backend_edges(repo_api: Path | None = None) -> list[dict]:
    root = repo_api or repo_api_path()
    controllers = root / "Controllers"
    if not controllers.is_dir():
        print(f"WARN: No existe {controllers}", file=sys.stderr)
        return []

    all_edges: list[dict] = []
    seen_global: set[tuple[str, str, str, str]] = set()

    for cs_path in sorted(controllers.rglob("*.cs")):
        try:
            content = cs_path.read_text(encoding="utf-8", errors="replace")
        except OSError as exc:
            print(f"WARN: No se pudo leer {cs_path}: {exc}", file=sys.stderr)
            continue

        cm = CLASS_CONTROLLER_RE.search(content)
        if not cm:
            continue
        controller = cm.group(1)

        for block_pos, sql_text in _iter_verbatim_sql_blocks(content):
            endpoint = _endpoint_for_block(content, block_pos, controller, cs_path.stem)
            for edge in _edges_from_sql_text(endpoint, sql_text):
                key = (edge["from"], edge["to"], edge["relation"], edge["source"])
                if key in seen_global:
                    continue
                seen_global.add(key)
                all_edges.append(edge)

    return all_edges


def extract_sql_edges() -> list[dict]:
    try:
        import pyodbc  # type: ignore
    except ImportError:
        print("ERROR: pyodbc no instalado (pip install pyodbc)", file=sys.stderr)
        return []

    conn_str = sql_connection_string()
    edges: list[dict] = []
    try:
        with pyodbc.connect(conn_str, timeout=30) as conn:
            cur = conn.cursor()
            cur.execute(SQL_DEPS_QUERY)
            for referencing, referenced in cur.fetchall():
                if not referencing or not referenced:
                    continue
                edges.append(
                    {
                        "from": referencing.strip(),
                        "to": referenced.strip(),
                        "relation": "calls",
                        "source": "sql",
                    }
                )
    except Exception as exc:
        print(f"ERROR SQL: {exc}", file=sys.stderr)
        return []

    return edges


def merge_graph(edges: list[dict]) -> dict:
    node_sources: dict[str, set[str]] = {}
    for e in edges:
        for end in ("from", "to"):
            nid = e[end]
            node_sources.setdefault(nid, set()).add(e.get("source", "unknown"))

    nodes = [
        {
            "id": nid,
            "label": nid,
            "sources": sorted(srcs),
        }
        for nid, srcs in sorted(node_sources.items())
    ]
    return {"nodes": nodes, "edges": edges}


def filter_by_schema(graph: dict, schemas: list[str]) -> dict:
    if not schemas:
        return graph
    allowed = {s.strip().lower() for s in schemas if s.strip()}
    edges = []
    for e in graph["edges"]:
        to_schema = e["to"].split(".", 1)[0].lower() if "." in e["to"] else ""
        fr_schema = e["from"].split(".", 1)[0].lower() if "." in e["from"] else ""
        if to_schema in allowed or fr_schema in allowed:
            edges.append(e)
    return merge_graph(edges)


def build_code_vis_data(graph: dict) -> tuple[list, list]:
    nodes_out: list[dict] = []
    edges_out: list[dict] = []
    id_map: dict[str, int] = {}
    nid = 1

    for node in graph["nodes"]:
        label = node["label"]
        sources = node.get("sources") or []
        if "Controller." in label or label.endswith("Controller"):
            group = "endpoint"
        else:
            group = "sql_object"

        is_endpoint = group == "endpoint"
        id_map[label] = nid
        nodes_out.append(
            {
                "id": nid,
                "label": label if len(label) <= 48 else label[:45] + "...",
                "title": label + (f"<br>sources: {', '.join(sources)}" if sources else ""),
                "group": group,
                "color": {
                    "background": "#c8e6c9" if is_endpoint else "#bbdefb",
                    "border": "#2e7d32" if is_endpoint else "#1565c0",
                },
                "font": {"size": 10 if is_endpoint else 9, "color": "#1b5e20" if is_endpoint else "#0d47a1"},
                "shape": "box" if is_endpoint else "diamond",
            }
        )
        nid += 1

    for i, e in enumerate(graph["edges"], start=1):
        fr = id_map.get(e["from"])
        to = id_map.get(e["to"])
        if fr is None or to is None:
            continue
        rel = e.get("relation", "")
        src = e.get("source", "")
        color = "#81c784" if rel == "calls" else "#64b5f6"
        edges_out.append(
            {
                "id": i,
                "from": fr,
                "to": to,
                "label": rel,
                "title": f"{rel} ({src})",
                "arrows": "to",
                "color": {"color": color, "opacity": 0.85},
                "font": {"size": 8, "align": "middle"},
                "width": 1.5 if rel == "calls" else 1,
            }
        )

    return nodes_out, edges_out


def generate_code_html(graph: dict) -> str:
    vis_nodes, vis_edges = build_code_vis_data(graph)
    html = HTML_TEMPLATE.replace("__NODES__", json.dumps(vis_nodes, ensure_ascii=False))
    html = html.replace("__EDGES__", json.dumps(vis_edges, ensure_ascii=False))
    html = html.replace("__PROJECT__", PROJECT_NAME)
    html = html.replace("SDD Impact Graph", "Code Dependency Graph")
    html = html.replace("Buscar TKT u objeto SQL", "Buscar endpoint u objeto SQL")
    return html


def write_outputs(graph: dict) -> tuple[Path, Path]:
    out_dir = graph_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "code_graph.json"
    html_path = out_dir / "code_graph_viz.html"
    json_path.write_text(json.dumps(graph, ensure_ascii=False, indent=2), encoding="utf-8")
    html_path.write_text(generate_code_html(graph), encoding="utf-8")
    return json_path, html_path


def print_query_report(graph: dict, query: str) -> None:
    terms = [t.strip().lower() for t in query.split(",") if t.strip()]
    edges = graph["edges"]
    print(f"\nConsulta: {query}\n")
    for term in terms:
        out_e = [e for e in edges if term in e["from"].lower()]
        in_e = [e for e in edges if term in e["to"].lower()]
        print(f"=== {term} ===")
        print(f"  Salientes ({len(out_e)}):")
        for e in out_e[:50]:
            print(f"    {e['from']} --[{e['relation']}/{e['source']}]--> {e['to']}")
        if len(out_e) > 50:
            print(f"    ... +{len(out_e) - 50} mas")
        print(f"  Entrantes ({len(in_e)}):")
        for e in in_e[:50]:
            print(f"    {e['from']} --[{e['relation']}/{e['source']}]--> {e['to']}")
        if len(in_e) > 50:
            print(f"    ... +{len(in_e) - 50} mas")
        print()


def run_build(target: str, schema: str | None, query: str | None) -> dict:
    edges: list[dict] = []
    if target in ("sql", "all"):
        sql_e = extract_sql_edges()
        print(f"SQL edges: {len(sql_e)}")
        edges.extend(sql_e)
    if target in ("backend", "all"):
        be_e = extract_backend_edges()
        print(f"Backend edges: {len(be_e)}")
        edges.extend(be_e)

    graph = merge_graph(edges)
    if schema:
        schemas = [s.strip() for s in schema.split(",") if s.strip()]
        graph = filter_by_schema(graph, schemas)
        print(f"Tras filtro schema ({schema}): {len(graph['edges'])} edges, {len(graph['nodes'])} nodes")

    json_path, html_path = write_outputs(graph)
    print(f"JSON -> {json_path}")
    print(f"HTML -> {html_path}")

    if query:
        print_query_report(graph, query)

    return graph


def interactive_main() -> None:
    print("¿Qué querés generar?")
    print("  1) Grafo completo (SQL + backend)")
    print("  2) Solo SQL Server")
    print("  3) Solo backend")
    print("  4) Consultar un objeto puntual")
    print("  5) Filtrar por esquema")
    choice = input("Opción [1-5]: ").strip() or "1"

    target_map = {"1": "all", "2": "sql", "3": "backend"}
    query = None
    schema = None

    if choice == "4":
        query = input("Objeto (csv permitido): ").strip()
        target = input("Target [all/sql/backend] (default all): ").strip() or "all"
    elif choice == "5":
        schema = input("Esquemas (csv, ej. sls,cst): ").strip()
        target = input("Target [all/sql/backend] (default all): ").strip() or "all"
    else:
        target = target_map.get(choice, "all")

    run_build(target, schema, query)


def main() -> None:
    if len(sys.argv) == 1:
        interactive_main()
        return

    parser = argparse.ArgumentParser(description="Code dependency graph (SQL + backend)")
    parser.add_argument("--target", choices=["sql", "backend", "all"], default="all")
    parser.add_argument("--query", default="", help="Objetos a consultar (csv)")
    parser.add_argument("--schema", default="", help="Filtrar por esquema (csv)")
    args = parser.parse_args()

    query = args.query.strip() or None
    schema = args.schema.strip() or None
    run_build(args.target, schema, query)


if __name__ == "__main__":
    main()
