#!/usr/bin/env python3
"""
check_doc_links.py — Sincronizacion del indice de guardrails (.cursor/rules).

Un solo chequeo, deliberadamente acotado: la tabla "Indice de guardrails" de
.cursor/rules/00_sdd_flujo.mdc debe tener una fila por cada *.mdc real en
.cursor/rules/ — ni una regla nueva sin indexar, ni una fila huerfana de una
regla borrada/renombrada.

Nota de diseno: la version inicial de este script tambien intentaba validar
links markdown y wikilinks (`[[TKT-xxxx]]`, `[[dominio]]`) dentro de los
artefactos por ticket. Se probo contra el repo real de planning y dio 231
hallazgos, la enorme mayoria falsos positivos: los templates SDD linkean a
propósito hacia adelante a artefactos que aun no existen (delta.md de un
ticket no archivado), los wikilinks de dominio no tienen mapeo 1:1 con
specs/<dominio>.md, y hay tickets pre-toolkit sin carpeta .planning. Esa
verificacion de estado-declarado-vs-real ya la hace /avance con mejor
contexto (lee el Estado real del ticket). Se descarto esa parte en vez de
dejar una herramienta ruidosa.

Uso:
  python check_doc_links.py
"""

import re
import sys
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

TOOLS_DIR = Path(__file__).parent
RULES_DIR = TOOLS_DIR.parent.parent / ".cursor" / "rules"
FLUJO_MDC = RULES_DIR / "00_sdd_flujo.mdc"

INDEX_ROW_RE = re.compile(r'^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|', re.MULTILINE)


def check_rules_index() -> list[str]:
    findings = []
    if not FLUJO_MDC.is_file():
        findings.append(f"RULES-INDEX-DESYNC: no existe {FLUJO_MDC}")
        return findings

    text = FLUJO_MDC.read_text(encoding="utf-8", errors="replace")
    marker = "Índice de guardrails"
    if marker not in text:
        findings.append("RULES-INDEX-DESYNC: no existe la seccion 'Indice de guardrails' en 00_sdd_flujo.mdc")
        return findings

    _, _, tail = text.partition(marker)
    section = re.split(r"\n##\s", tail, maxsplit=1)[0]
    indexed = {m.group(1).strip() for m in INDEX_ROW_RE.finditer(section)}

    real = {re.sub(r"^\d+_", "", p.stem) for p in RULES_DIR.glob("*.mdc")}

    for name in sorted(real - indexed):
        findings.append(f"RULES-INDEX-DESYNC: {name}.mdc existe pero no esta en la tabla de 00_sdd_flujo.mdc")
    for name in sorted(indexed - real):
        findings.append(f"RULES-INDEX-DESYNC: la tabla cita '{name}' pero no existe ese .mdc en .cursor/rules/")

    return findings


def main() -> None:
    findings = check_rules_index()
    if not findings:
        print("Sin hallazgos: indice de guardrails sincronizado con .cursor/rules/*.mdc.")
        return

    print(f"=== Hallazgos ({len(findings)}) ===")
    for f in findings:
        print(f"  {f}")
    sys.exit(1)


if __name__ == "__main__":
    main()
