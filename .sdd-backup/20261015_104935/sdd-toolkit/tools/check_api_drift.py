#!/usr/bin/env python3
"""
check_api_drift.py — Drift de Endpoints API documentados vs codigo real.

Simetrico al chequeo de objetos SQL de /sincronizar (paso 4): NO audita los
~2600+ controllers del repo (la enorme mayoria nunca se documento en specs/,
eso es deuda de documentacion preexistente, no drift). Solo verifica que los
endpoints que SI estan documentados en specs/<dominio>.md (seccion
"## Endpoints API") sigan existiendo en Controllers/ con esa misma ruta.

Uso:
  python check_api_drift.py                      # specs/ + repo API desde sdd.config.yaml
  python check_api_drift.py --specs <ruta>        # ruta alternativa a specs/
  python check_api_drift.py --repo-api <ruta>     # ruta alternativa al repo de la API
"""

import argparse
import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

import sys as _sys
_TOOLS_DIR = Path(__file__).resolve().parent
if str(_TOOLS_DIR) not in _sys.path:
    _sys.path.insert(0, str(_TOOLS_DIR))
from config_utils import find_config
try:
    CONFIG_PATH = find_config(_TOOLS_DIR.parent)
except FileNotFoundError:
    CONFIG_PATH = _TOOLS_DIR.parent / "sdd.config.yaml"


def load_var(key: str, default: str) -> str:
    try:
        text = CONFIG_PATH.read_text(encoding="utf-8")
    except OSError:
        return default
    m = re.search(rf"^\s*{key}\s*:\s*['\"]?(.+?)['\"]?\s*(?:#.*)?$", text, re.MULTILINE)
    return m.group(1) if m else default


CLASS_CONTROLLER_RE = re.compile(r"public\s+class\s+(\w+Controller)\b")
METHOD_RE = re.compile(
    r"public\s+(?:async\s+)?(?:ContentResult|IActionResult|ActionResult<[^>]+>|ActionResult)\s+(\w+)\s*\(",
    re.MULTILINE,
)
HTTP_ATTR_RE = re.compile(
    r'\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)(?:\(\s*"([^"]*)"\s*\))?\]',
    re.IGNORECASE,
)
ROUTE_ATTR_RE = re.compile(r'\[Route\s*\(\s*"([^"]*)"', re.IGNORECASE)

# Tabla "## Endpoints API" de specs/<dominio>.md: | `Endpoint` | Verbo | Descripcion |
ENDPOINT_TABLE_ROW_RE = re.compile(
    r'^\|\s*`?([^`|]+?)`?\s*\|\s*(GET|POST|PUT|DELETE|PATCH)\s*\|', re.MULTILINE | re.IGNORECASE
)


def specs_dir(override: str | None) -> Path:
    if override:
        return Path(override)
    ruta = load_var("RUTA_CONTEXTOS", r"D:\ProyNet\contextos\.github\ProjectContexts")
    return Path(ruta) / "specs"


def repo_api_path(override: str | None) -> Path:
    if override:
        return Path(override)
    return Path(load_var("RUTA_REPO_API", r"D:\ProyNet\NesGoApi\NESGoApiNet"))


def _class_route(content: str, class_decl_end: int) -> str | None:
    route = None
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


def _normalize_route(route: str) -> str:
    """Normaliza para comparar 'forma' de ruta, no nombres de parametro:
    Messaging/EzTextingTemplate/{id} == Messaging/EzTextingTemplate/{EzTextingTemplateID}."""
    route = route.strip("/").lower()
    return re.sub(r"\{[^}/]*\}", "{}", route)


def extract_all_routes(repo_api: Path) -> set[str]:
    """Todas las rutas reales normalizadas (lowercase, sin / al borde) de Controllers/**/*.cs."""
    routes: set[str] = set()
    controllers_dir = repo_api / "Controllers"
    if not controllers_dir.is_dir():
        print(f"ERROR: No existe {controllers_dir}", file=sys.stderr)
        return routes

    for cs_path in sorted(controllers_dir.rglob("*.cs")):
        try:
            content = cs_path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        cm = CLASS_CONTROLLER_RE.search(content)
        if not cm:
            continue
        controller = cm.group(1)
        class_route = _class_route(content, cm.end())
        token = controller[: -len("Controller")] if controller.endswith("Controller") else controller

        methods = list(METHOD_RE.finditer(content))
        for i, hm in enumerate(HTTP_ATTR_RE.finditer(content)):
            # Ventana de busqueda: desde el atributo hasta la firma del siguiente metodo.
            next_method = next((mm for mm in methods if mm.start() > hm.end()), None)
            window_end = next_method.start() if next_method else len(content)
            window = content[hm.end():window_end]

            method_route = None
            for rm in ROUTE_ATTR_RE.finditer(window):
                method_route = rm.group(1)
            if method_route is None and hm.group(2) is not None:
                # Fallback: ruta inline en el propio [HttpPost("Accion")], sin [Route] separado.
                method_route = hm.group(2)

            full_route = _combine_routes(class_route, method_route, token)
            if full_route:
                routes.add(_normalize_route(full_route))
    return routes


def extract_documented_endpoints(specs_path: Path) -> list[dict]:
    """Una fila por endpoint listado en cualquier seccion 'Endpoints API' de specs/*.md."""
    documented = []
    if not specs_path.is_dir():
        return documented
    for md in sorted(specs_path.glob("*.md")):
        text = md.read_text(encoding="utf-8", errors="replace")
        if "Endpoints API" not in text:
            continue
        # Tomar solo el tramo desde "Endpoints API" hasta el siguiente encabezado ##.
        _, _, tail = text.partition("Endpoints API")
        section = re.split(r"\n##\s", tail, maxsplit=1)[0]
        for m in ENDPOINT_TABLE_ROW_RE.finditer(section):
            route = m.group(1).strip()
            if not route or route.lower() == "endpoint" or set(route) <= {"-", ":"}:
                continue
            documented.append({"domain": md.stem, "route": route, "verb": m.group(2).upper()})
    return documented


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Drift de Endpoints API: specs/<dominio>.md vs Controllers reales"
    )
    parser.add_argument("--specs", default=None, help="Ruta alternativa a specs/")
    parser.add_argument("--repo-api", default=None, help="Ruta alternativa al repo de la API")
    args = parser.parse_args()

    specs_path = specs_dir(args.specs)
    repo_api = repo_api_path(args.repo_api)

    documented = extract_documented_endpoints(specs_path)
    if not documented:
        print(f"Sin endpoints documentados en {specs_path} (ninguna seccion 'Endpoints API' encontrada).")
        return

    real_routes = extract_all_routes(repo_api)
    if not real_routes:
        print(f"ERROR: no se pudo extraer ninguna ruta real desde {repo_api}. Abortando.", file=sys.stderr)
        sys.exit(1)

    print(f"Endpoints documentados: {len(documented)} | Rutas reales detectadas: {len(real_routes)}\n")

    obsoletos = [d for d in documented if _normalize_route(d["route"]) not in real_routes]

    if not obsoletos:
        print("Sin drift: todos los endpoints documentados siguen existiendo en el codigo.")
        return

    print(f"=== API-SPEC-OBSOLETO ({len(obsoletos)}) ===")
    for d in obsoletos:
        print(f"  specs/{d['domain']}.md -> {d['verb']} {d['route']}  (no encontrado en Controllers/)")


if __name__ == "__main__":
    main()
