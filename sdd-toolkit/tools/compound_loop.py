#!/usr/bin/env python3
"""
compound_loop.py — Cierre ARCHIVADO con Compound Loop automático + recall semántico.

Uso (cierre):
    python sdd-toolkit/tools/compound_loop.py --req REQ-14858 [--date 2026-06-25] [--quiet]
    python sdd-toolkit/tools/compound_loop.py --tkt REQ-14858 [--date 2026-06-25]  # alias legacy

Uso (recall):
    python sdd-toolkit/tools/compound_loop.py --recall "prcSetOrderSaveV2" [--domain database] [--top 5]

Pasos automatizados (cierre):
  1. Lee delta.md → extrae ## Aprendizajes → append a profiles activos
  1b. Lee delta.md → extrae ## Decisiones (ADR) → append verbatim a profiles activos
  2. Actualiza _index.md: estado ARCHIVADO + fecha_cierre
  3. Actualiza _graph.md: línea de cierre + sección ### [[REQ-xxx]]
  4. Imprime instrucción de cierre para Cursor
"""

import argparse
import re
import sys
from datetime import date
from pathlib import Path

# Windows con consola no-UTF8 (cp1252/cp850) revienta en los ✓/✗/⚠ de los
# prints de abajo, a medias del cierre — forzar UTF-8 en stdout/stderr.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

# ── Rutas resueltas desde sdd.config.yaml ──────────────────────────────────
SCRIPT_DIR  = Path(__file__).parent
TOOLKIT_DIR = SCRIPT_DIR.parent


def _load_vars() -> dict:
    """Lee vars de sdd.config.yaml. Fallback silencioso si falta yaml o config."""
    try:
        import yaml
        from config_utils import find_config
        cfg_path = find_config(TOOLKIT_DIR)
        cfg = yaml.safe_load(cfg_path.read_text(encoding="utf-8"))
        return cfg.get("vars", {})
    except ImportError:
        print("⚠  PyYAML no instalado — usando rutas de fallback. "
              "Instala con: pip install pyyaml")
    except Exception as e:
        print(f"⚠  No se pudo leer sdd.config.yaml ({e}) — usando rutas de fallback.")
    return {}


_vars = _load_vars()

# Los fallbacks se resuelven desde sdd.config.yaml vars.RUTA_PLANNING y vars.RUTA_GRAPH.
# Si no hay config disponible, el operador debe ajustar los valores aquí o instalar PyYAML.
RUTA_SPECS = Path(
    _vars.get("RUTA_PLANNING") or r"<RUTA_PLANNING>"
)
RUTA_GRAPH = Path(
    _vars.get("RUTA_GRAPH") or r"<RUTA_GRAPH>"
)

PROFILE_MAP = {
    "database": TOOLKIT_DIR / "profiles" / "database.md",
    "backend":  TOOLKIT_DIR / "profiles" / "backend.md",
    "context":  TOOLKIT_DIR / "profiles" / "context.md",
    "frontend": TOOLKIT_DIR / "profiles" / "frontend.md",
    "mobile":   TOOLKIT_DIR / "profiles" / "mobile.md",
}
ACTIVE_TARGETS = {"database", "backend", "frontend", "mobile"}

# ── Helpers ─────────────────────────────────────────────────────────────────

def read_file(path: Path) -> str:
    if not path.exists():
        print(f"  ✗ No existe: {path}")
        return ""
    return path.read_text(encoding="utf-8")


def write_file(path: Path, text: str):
    path.write_text(text, encoding="utf-8")


# ── Paso 1: parsear ## Aprendizajes ─────────────────────────────────────────

def parse_learnings(delta_text: str) -> list:
    learnings = []
    in_section = False

    for line in delta_text.splitlines():
        if re.match(r"^##\s+Aprendizajes", line):
            in_section = True
            continue
        if in_section and re.match(r"^##\s+", line):
            break
        if not in_section or "|" not in line:
            continue

        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) < 2:
            continue
        target = cells[0].lower()
        if target in ("target", "---", "") or target.startswith("-"):
            continue

        aprendizaje = cells[1] if len(cells) > 1 else ""
        learnings.append({"target": target, "aprendizaje": aprendizaje})

    return learnings


def append_to_profile(profile_path: Path, tkt: str, fecha: str, aprendizaje: str):
    text = read_file(profile_path)
    if not text:
        return

    row = f"| {tkt} | {fecha} | {aprendizaje} |"
    if row in text:
        print(f"  ⚠  Ya existe en {profile_path.name}: {tkt}")
        return

    marker = "## Learnings (acumulado)"
    if marker not in text:
        print(f"  ✗ Sin sección '{marker}' en {profile_path.name}")
        return

    write_file(profile_path, text.rstrip() + f"\n{row}\n")
    print(f"  ✓ {profile_path.name} ← {row}")


# ── Paso 1b: parsear ## Decisiones (ADR) ────────────────────────────────────

def parse_adrs(delta_text: str) -> list:
    adrs = []
    in_section = False
    current = []

    def flush():
        if not current:
            return
        block = "\n".join(current).strip()
        m_target = re.search(r"\*\*Target\*\*:\s*`?([\w-]+)`?", block)
        if block and m_target:
            adrs.append({"target": m_target.group(1).lower(), "block": block})

    for line in delta_text.splitlines():
        if re.match(r"^##\s+Decisiones\s*\(ADR\)", line):
            in_section = True
            continue
        if in_section and re.match(r"^##\s+", line):
            break
        if not in_section:
            continue
        if line.strip().startswith("<!--") or line.strip().endswith("-->"):
            continue
        if re.match(r"^###\s+", line):
            flush()
            current = [line]
        elif current:
            current.append(line)
    flush()

    return adrs


def append_adr(profile_path: Path, block: str):
    text = read_file(profile_path)
    if not text:
        return

    title_line = block.splitlines()[0]
    if title_line in text:
        print(f"  ⚠  ADR ya existe en {profile_path.name}: {title_line}")
        return

    marker = "## Decisiones (ADR)"
    if marker not in text:
        print(f"  ✗ Sin sección '{marker}' en {profile_path.name}")
        return

    write_file(profile_path, text.rstrip() + f"\n\n{block}\n")
    print(f"  ✓ {profile_path.name} ← ADR: {title_line}")


# ── Paso 2: actualizar _index.md ────────────────────────────────────────────

def update_index(tkt_path: Path, fecha: str):
    index_path = tkt_path / "_index.md"
    text = read_file(index_path)
    if not text:
        return

    updated = re.sub(
        r"(estado\s*:\s*)En progreso",
        r"\1ARCHIVADO",
        text, flags=re.IGNORECASE
    )

    if "fecha_cierre" not in updated:
        updated = updated.rstrip() + f"\nfecha_cierre: {fecha}\n"

    write_file(index_path, updated)
    print(f"  ✓ _index.md → estado: ARCHIVADO, fecha_cierre: {fecha}")


# ── Paso 3: actualizar _graph.md ────────────────────────────────────────────

def extract_objetos(index_text: str) -> str:
    m = re.search(r"objetos[_\s]clave\s*:\s*(.+)", index_text, re.IGNORECASE)
    return m.group(1).strip() if m else "—"


def update_graph(tkt: str, fecha: str, objetos: str):
    text = read_file(RUTA_GRAPH)
    if not text:
        return

    # Línea de cierre en tabla
    cierre_row = f"| {tkt} | ARCHIVADO | {fecha} | {objetos} |"
    if cierre_row not in text:
        text = text.rstrip() + f"\n{cierre_row}\n"

    # Sección detallada: Estado → ARCHIVADO
    text = re.sub(
        rf"(###\s+\[\[{re.escape(tkt)}\]\].*?)(- \*\*Estado\*\*:\s*)En progreso",
        r"\1\2ARCHIVADO",
        text, flags=re.IGNORECASE | re.DOTALL
    )

    # Agregar fecha cierre si no está
    if f"**Fecha cierre**" not in text:
        text = re.sub(
            rf"(###\s+\[\[{re.escape(tkt)}\]\].*?- \*\*Estado\*\*: ARCHIVADO\n)",
            rf"\1- **Fecha cierre**: {fecha}\n",
            text, flags=re.IGNORECASE | re.DOTALL
        )

    write_file(RUTA_GRAPH, text)
    print(f"  ✓ _graph.md → {tkt} ARCHIVADO ({fecha})")


# ── Recall: recuperación semántica sobre profiles (B1) ───────────────────────

def _tokenize(text: str) -> list:
    """Tokens alphanuméricos en minúsculas."""
    return re.findall(r"[a-záéíóúüñA-Z0-9_\-]+", text.lower())


def _score(query_tokens: list, row_text: str) -> int:
    """TF simplificado: cuenta coincidencias de tokens de la query en la fila."""
    row_lower = row_text.lower()
    return sum(1 for t in query_tokens if t in row_lower)


def cmd_recall(query: str, domain: str | None, top: int) -> None:
    """
    Busca en profiles y _graph.md los aprendizajes más relevantes para la query.
    Solo lectura — no modifica ningún archivo.
    """
    query_tokens = _tokenize(query)
    if not query_tokens:
        print("✗ Query vacía.")
        sys.exit(1)

    results = []

    # 1. Buscar en profiles: sección ## Learnings (acumulado)
    profiles_to_scan = (
        [PROFILE_MAP[domain]] if domain and domain in PROFILE_MAP
        else [p for p in PROFILE_MAP.values() if p.exists()]
    )

    row_re = re.compile(r'^\|\s*(TKT-[\w-]+)\s*\|\s*([\d-]+)\s*\|\s*(.+?)\s*\|\s*$')

    for profile_path in profiles_to_scan:
        if not profile_path.exists():
            continue
        text = profile_path.read_text(encoding="utf-8")

        for section_name in ("## Learnings (acumulado)", "## Pitfalls comunes", "## Decisiones (ADR)"):
            if section_name not in text:
                continue
            section = text.split(section_name, 1)[1].split("\n## ", 1)[0]
            for line in section.splitlines():
                m = row_re.match(line)
                if m:
                    tkt, fecha, aprendizaje = m.groups()
                    score = _score(query_tokens, aprendizaje)
                    if score > 0:
                        results.append({
                            "score": score,
                            "tkt": tkt,
                            "fecha": fecha,
                            "texto": aprendizaje,
                            "fuente": f"{profile_path.name} / {section_name.strip('#').strip()}",
                        })
                else:
                    # línea de texto libre (ADR blocks, pitfalls narrativos)
                    score = _score(query_tokens, line)
                    if score > 1:  # umbral mayor para texto libre
                        results.append({
                            "score": score,
                            "tkt": "—",
                            "fecha": "—",
                            "texto": line.strip(),
                            "fuente": f"{profile_path.name} / {section_name.strip('#').strip()}",
                        })

    # 2. Buscar en _sdd_evolution.md si existe
    evolution_path = RUTA_GRAPH / "_sdd_evolution.md"
    if not evolution_path.exists():
        # intentar RUTA_SPECS
        evolution_path = RUTA_SPECS.parent / "_sdd_evolution.md"

    if evolution_path.exists():
        evo_text = evolution_path.read_text(encoding="utf-8")
        for block in re.split(r'\n###\s+', evo_text):
            if not block.strip():
                continue
            score = _score(query_tokens, block)
            if score > 0:
                first_line = block.splitlines()[0].strip()
                tkt_m = re.search(r'TKT-[\w-]+', block)
                results.append({
                    "score": score,
                    "tkt": tkt_m.group(0) if tkt_m else "—",
                    "fecha": "—",
                    "texto": first_line[:120],
                    "fuente": "_sdd_evolution.md",
                })

    # Ordenar y limitar
    results.sort(key=lambda r: r["score"], reverse=True)
    results = results[:top]

    if not results:
        print(f"— Sin aprendizajes relevantes para: {query}")
        return

    print(f"\n=== Recall: \"{query}\" (top {len(results)}) ===\n")
    print(f"{'TKT':<15} {'Fecha':<12} {'Score':>5}  {'Texto':<60}  Fuente")
    print("-" * 110)
    for r in results:
        texto = r["texto"][:60].replace("\n", " ")
        print(f"{r['tkt']:<15} {r['fecha']:<12} {r['score']:>5}  {texto:<60}  {r['fuente']}")
    print()


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser()
    grp = p.add_mutually_exclusive_group(required=True)
    grp.add_argument("--req",    help="ID del requerimiento, ej: REQ-14858")
    grp.add_argument("--tkt",    help="Alias legacy de --req (deprecated)")
    grp.add_argument("--recall", metavar="QUERY",
                     help="Busca aprendizajes relevantes para la query (solo lectura)")
    p.add_argument("--date",   default=str(date.today()), help="Fecha de cierre YYYY-MM-DD")
    p.add_argument("--domain", help="Filtrar recall a un target: database|backend|frontend|mobile")
    p.add_argument("--top",    type=int, default=5, help="Máximo de resultados en recall")
    p.add_argument("--quiet",  action="store_true",
                   help="Solo errores/advertencias + resumen final (suprime lineas ok)")
    args = p.parse_args()

    # Subcomando recall — solo lectura, no necesita cierre
    if args.recall:
        cmd_recall(args.recall, args.domain, args.top)
        return

    tkt   = (args.req or args.tkt).upper()
    fecha = args.date
    quiet = args.quiet

    # Redirect print to suppress ok-lines in quiet mode
    _ok_count = [0]
    _warn_count = [0]
    _orig_print = print

    def _qprint(*a, **kw):
        msg = " ".join(str(x) for x in a)
        if "✗" in msg or "⚠" in msg:
            _warn_count[0] += 1
            _orig_print(*a, **kw)
        elif "✓" in msg:
            _ok_count[0] += 1
            if not quiet:
                _orig_print(*a, **kw)
        else:
            if not quiet:
                _orig_print(*a, **kw)

    import builtins
    if quiet:
        builtins.print = _qprint  # patch while running

    # Buscar carpeta: exact-match primero, luego lowercase (ej: REQ-14858 → req-14858)
    tkt_path = RUTA_SPECS / tkt
    if not tkt_path.exists():
        tkt_path = RUTA_SPECS / tkt.lower()
    if not tkt_path.exists():
        builtins.print = _orig_print
        _orig_print(f"✗ No existe: {RUTA_SPECS / tkt}")
        sys.exit(1)

    if not quiet:
        _orig_print(f"\n{'='*55}")
        _orig_print(f"  Compound Loop: {tkt} → ARCHIVADO ({fecha})")
        _orig_print(f"{'='*55}\n")

    # 1. Aprendizajes → profiles
    delta_text = read_file(tkt_path / "delta.md")
    if not delta_text:
        print("✗ delta.md no encontrado. Abortando.")
        sys.exit(1)

    learnings = parse_learnings(delta_text)
    if not learnings:
        print("  — Sin aprendizajes. Saltando append a profiles.")
    else:
        print(f"[1/4] Aprendizajes ({len(learnings)}):")
        for L in learnings:
            t = L["target"]
            if t not in ACTIVE_TARGETS:
                print(f"  ⚠  Target '{t}' no activo — omitido")
                continue
            profile_path = PROFILE_MAP.get(t)
            if profile_path:
                append_to_profile(profile_path, tkt, fecha, L["aprendizaje"])

    # 1b. Decisiones ADR → profiles
    adrs = parse_adrs(delta_text)
    if not adrs:
        print("  — Sin decisiones ADR. Saltando append a profiles.")
    else:
        print(f"\n[1b/4] Decisiones ADR ({len(adrs)}):")
        for A in adrs:
            t = A["target"]
            if t not in ACTIVE_TARGETS:
                print(f"  ⚠  Target '{t}' no activo — omitido")
                continue
            profile_path = PROFILE_MAP.get(t)
            if profile_path:
                append_adr(profile_path, A["block"])

    # 2. _index.md
    print(f"\n[2/4] _index.md:")
    update_index(tkt_path, fecha)

    # 3. _graph.md
    print(f"\n[3/4] _graph.md:")
    index_text = read_file(tkt_path / "_index.md")
    objetos = extract_objetos(index_text)
    update_graph(tkt, fecha, objetos)

    import builtins as _b
    _b.print = _orig_print  # restore

    if quiet:
        _orig_print(f"{_ok_count[0]} ok, {_warn_count[0]} warn — {tkt} ARCHIVADO ({fecha})")
    else:
        _orig_print(f"\n{'='*55}")
        _orig_print(f"✓ {tkt} cerrado. Checkpoint manual si aplica:")
        _orig_print(f"  memory/checkpoint_{tkt.lower().replace('-','_')}.md → borrar + quitar de MEMORY.md")
        _orig_print(f"\nCursor: abre .planning/{tkt}/ y ejecuta /git-api para PR de cierre.")
        _orig_print(f"{'='*55}\n")


if __name__ == "__main__":
    main()
