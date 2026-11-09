#!/usr/bin/env python3
"""
code_graph_front.py — Grafo de componentes React + dependencias de un proyecto frontend.

Extractores:
  - Páginas/rutas: archivos en src/pages/ o src/views/ (o detectados por react-router)
  - Componentes: archivos .tsx en src/components/
  - Hooks: archivos que empiezan con 'use' en src/hooks/ o inline
  - Stores Zustand: archivos con llamada a create() de zustand
  - Imports entre módulos: mapa de dependencias entre archivos del proyecto

Salidas en RUTA_GRAPH (del sdd.config.yaml):
  - code_graph_front.json   — grafo en JSON (nodos + aristas)
  - code_graph_front.md     — resumen legible para Claude/Cursor

Uso:
  python code_graph_front.py [--repo <ruta>] [--out <ruta-salida>]
  Sin argumentos: lee RUTA_REPO_FRONT y RUTA_GRAPH de sdd.config.yaml
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

TOOLS_DIR = Path(__file__).resolve().parent
import sys as _sys
if str(TOOLS_DIR) not in _sys.path:
    _sys.path.insert(0, str(TOOLS_DIR))
from config_utils import find_config
try:
    CONFIG_PATH = find_config(TOOLS_DIR.parent)
except FileNotFoundError:
    CONFIG_PATH = TOOLS_DIR.parent / "sdd.config.yaml"

# ── Regex extractores ────────────────────────────────────────────────────────

# Imports de módulos internos del proyecto (relativos: ./foo, ../bar, @/...)
IMPORT_RE = re.compile(
    r"""^import\s+(?:[^'"]*\s+from\s+)?['"](\./[^'"]+|\.\.\/[^'"]+|@\/[^'"]+)['"]""",
    re.MULTILINE,
)
# Default export de componente: export default function Foo / export default Foo
DEFAULT_EXPORT_RE = re.compile(
    r"export\s+default\s+(?:function\s+)?([A-Z][A-Za-z0-9_]*)"
)
# Named export de hook: export function useFoo / export const useFoo
HOOK_EXPORT_RE = re.compile(
    r"export\s+(?:function|const)\s+(use[A-Z][A-Za-z0-9_]*)"
)
# Zustand store: create<T>( o create(
ZUSTAND_RE = re.compile(r"\bcreate\s*(?:<[^>]*>)?\s*\(")
# TanStack Query: useQuery / useMutation / useInfiniteQuery
QUERY_RE = re.compile(r"\b(useQuery|useMutation|useInfiniteQuery|useSuspenseQuery)\b")
# React Router: <Route path=... / createBrowserRouter / route({ path:
ROUTE_DEF_RE = re.compile(
    r"""(?:<Route\s+[^>]*path=['"]([^'"]+)['"]|path:\s*['"]([^'"]+)['"])"""
)


# ── Config loader ────────────────────────────────────────────────────────────

def _load_var(name: str, default: str = "") -> str:
    """Extrae un var de sdd.config.yaml sin dependencias externas."""
    if not CONFIG_PATH.exists():
        return default
    text = CONFIG_PATH.read_text(encoding="utf-8", errors="replace")
    m = re.search(rf"^\s*{re.escape(name)}\s*:\s*['\"]?([^'\"#\n]+)['\"]?", text, re.MULTILINE)
    return m.group(1).strip().strip("'\"") if m else default


# ── Clasificador de archivos ─────────────────────────────────────────────────

def _classify(rel: Path) -> str:
    parts = rel.parts
    name = rel.stem.lower()
    if any(p in ("pages", "views", "routes") for p in parts):
        return "page"
    if any(p in ("hooks",) for p in parts) or name.startswith("use"):
        return "hook"
    if any(p in ("stores", "store") for p in parts):
        return "store"
    if any(p in ("components", "ui", "shared") for p in parts):
        return "component"
    if any(p in ("types", "models") for p in parts):
        return "type"
    if any(p in ("utils", "lib", "helpers") for p in parts):
        return "util"
    return "module"


# ── Scanner principal ────────────────────────────────────────────────────────

def scan_repo(repo: Path) -> dict:
    src = repo / "src"
    if not src.exists():
        src = repo  # fallback: repo raíz

    nodes: dict[str, dict] = {}   # rel_path → {type, name, hooks, is_store, routes}
    edges: list[dict] = []        # {from, to, kind}

    tsx_files = list(src.rglob("*.tsx")) + list(src.rglob("*.ts"))
    tsx_files = [f for f in tsx_files if ".d.ts" not in f.name and "node_modules" not in str(f)]

    for fpath in tsx_files:
        rel = fpath.relative_to(repo)
        rel_str = rel.as_posix()
        text = fpath.read_text(encoding="utf-8", errors="replace")

        kind = _classify(rel)

        # Nombre principal del módulo
        name = ""
        m = DEFAULT_EXPORT_RE.search(text)
        if m:
            name = m.group(1)
        if not name:
            name = fpath.stem  # fallback al nombre de archivo

        # Hooks exportados
        hooks = HOOK_EXPORT_RE.findall(text)

        # ¿Es store Zustand?
        is_store = bool(ZUSTAND_RE.search(text))
        if is_store and kind == "module":
            kind = "store"

        # ¿Usa TanStack Query?
        uses_query = bool(QUERY_RE.search(text))

        # Rutas definidas (react-router)
        routes = [m.group(1) or m.group(2) for m in ROUTE_DEF_RE.finditer(text) if m.group(1) or m.group(2)]

        nodes[rel_str] = {
            "type": kind,
            "name": name,
            "hooks": hooks,
            "is_store": is_store,
            "uses_query": uses_query,
            "routes": routes,
        }

        # Aristas de imports
        for imp in IMPORT_RE.findall(text):
            # Normalizar: resolver relativo al archivo actual
            imp_path = (fpath.parent / imp).resolve()
            # Buscar con extensiones comunes
            resolved = None
            for ext in (".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"):
                candidate = Path(str(imp_path) + ext) if not imp_path.suffix else imp_path
                if ext.startswith("/"):
                    candidate = imp_path / ("index" + ext.lstrip("/"))
                else:
                    candidate = Path(str(imp_path) + ext)
                if candidate.exists():
                    resolved = candidate
                    break
            if resolved and resolved.is_relative_to(repo):
                target = resolved.relative_to(repo).as_posix()
                if target in nodes or any(f.relative_to(repo).as_posix() == target for f in tsx_files):
                    edges.append({"from": rel_str, "to": target, "kind": "import"})

    return {"nodes": nodes, "edges": edges, "repo": str(repo)}


# ── Generador de Markdown ────────────────────────────────────────────────────

def _build_markdown(graph: dict, proyecto: str) -> str:
    nodes = graph["nodes"]
    edges = graph["edges"]

    # Agrupar por tipo
    by_type: dict[str, list] = defaultdict(list)
    for path, info in nodes.items():
        by_type[info["type"]].append((path, info))

    # Calcular fanout (cuántos archivos importan a cada nodo)
    fan_in: dict[str, int] = defaultdict(int)
    for e in edges:
        fan_in[e["to"]] += 1

    lines = [
        f"# Grafo inicial — {proyecto}",
        "",
        f"> Generado por `code_graph_front.py`. {len(nodes)} módulos · {len(edges)} dependencias.",
        "",
    ]

    order = ["page", "component", "hook", "store", "type", "util", "module"]
    labels = {
        "page": "Páginas / Vistas",
        "component": "Componentes",
        "hook": "Hooks",
        "store": "Stores (Zustand)",
        "type": "Tipos / Modelos",
        "util": "Utilidades",
        "module": "Otros módulos",
    }

    for t in order:
        items = by_type.get(t, [])
        if not items:
            continue
        lines.append(f"## {labels[t]}")
        lines.append("")
        lines.append("| Archivo | Nombre | Detalles | Fan-in |")
        lines.append("|---------|--------|----------|--------|")
        for path, info in sorted(items, key=lambda x: -fan_in.get(x[0], 0)):
            details = []
            if info["hooks"]:
                details.append("hooks: " + ", ".join(f"`{h}`" for h in info["hooks"]))
            if info["uses_query"]:
                details.append("TanStack Query")
            if info["is_store"]:
                details.append("Zustand store")
            if info["routes"]:
                details.append("rutas: " + ", ".join(f"`{r}`" for r in info["routes"][:3]))
            lines.append(
                f"| `{path}` | `{info['name']}` | {' · '.join(details) or '—'} | {fan_in.get(path, 0)} |"
            )
        lines.append("")

    # Top 10 módulos más importados
    top = sorted(fan_in.items(), key=lambda x: -x[1])[:10]
    if top:
        lines.append("## Módulos más referenciados (fan-in)")
        lines.append("")
        for path, count in top:
            name = nodes.get(path, {}).get("name", path)
            lines.append(f"- `{path}` (`{name}`) — importado por {count} módulo(s)")
        lines.append("")

    lines.append("## Learnings iniciales")
    lines.append("")
    lines.append("<!-- Agregar notas sobre patrones observados al revisar el grafo -->")
    lines.append("")

    return "\n".join(lines)


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Genera grafo de componentes frontend.")
    parser.add_argument("--repo", help="Ruta al repo frontend (default: RUTA_REPO_FRONT del config)")
    parser.add_argument("--out", help="Carpeta de salida (default: RUTA_GRAPH del config)")
    parser.add_argument("--proyecto", help="Nombre del proyecto (default: PROYECTO_FRONT del config)")
    args = parser.parse_args()

    repo_str = args.repo or _load_var("RUTA_REPO_FRONT")
    out_str = args.out or _load_var("RUTA_GRAPH")
    proyecto = args.proyecto or _load_var("PROYECTO_FRONT", "frontend")

    if not repo_str:
        print("ERROR: especifica --repo o configura RUTA_REPO_FRONT en sdd.config.yaml", file=sys.stderr)
        sys.exit(1)

    repo = Path(repo_str)
    if not repo.exists():
        print(f"ERROR: el repo '{repo}' no existe.", file=sys.stderr)
        sys.exit(1)

    print(f"Escaneando {repo} ...")
    graph = scan_repo(repo)
    n_nodes = len(graph["nodes"])
    n_edges = len(graph["edges"])
    print(f"  {n_nodes} módulos encontrados · {n_edges} dependencias")

    # Salida
    if out_str:
        out = Path(out_str)
    else:
        out = repo / ".planning"
    out.mkdir(parents=True, exist_ok=True)

    json_path = out / "code_graph_front.json"
    md_path = out / "code_graph_front.md"

    json_path.write_text(json.dumps(graph, indent=2, ensure_ascii=False), encoding="utf-8")
    md_path.write_text(_build_markdown(graph, proyecto), encoding="utf-8")

    print(f"  JSON → {json_path}")
    print(f"  MD   → {md_path}")
    print("Listo.")


if __name__ == "__main__":
    main()
