#!/usr/bin/env python3
"""sello.py — sellos de frescura de aprobaciones SDD (v0.27).

Una aprobación (diseño, VERDE, revisión) vale solo para lo que se aprobó. Este
tool guarda la huella (sha256) de los artefactos y de los objetos SQL en
`<tkt-dir>/_sellos.jsonl` y, en la fase siguiente, detecta si algo cambió
después de aprobarse (sello VIEJO).

Qué se sella:
  - spec.md (completo).
  - *PruebasUnitarias.sql / *Pruebas*.sql, ignorando la línea de evidencia
    '-- [OK] TESTS ...' (cambia legítimamente de ROJO a VERDE).
  - Objetos SQL pasados con --obj schema.objeto=HASH. El HASH lo obtiene el
    agente vía MCP (este tool no se conecta a la BD):
      SELECT CONVERT(varchar(64), HASHBYTES('SHA2_256',
             OBJECT_DEFINITION(OBJECT_ID('<schema.objeto>'))), 2);
design.md NO se sella: /ejecutar actualiza su columna Estado y los ajustes se
registran como '⚠ Ajustado' en impl.md.

Uso:
  python sello.py registrar --tkt-dir <dir> --fase diseno|verde|revisar [--obj s.o=HASH ...]
  python sello.py verificar --tkt-dir <dir> --fase diseno|verde|revisar [--obj s.o=HASH ...]
Salida de verificar: FRESCO (exit 0) | VIEJO (exit 1) | SIN SELLO (exit 2).
"""
import argparse
import glob
import hashlib
import json
import os
import re
import sys
from datetime import datetime

FASES = ("diseno", "verde", "revisar")
EVIDENCIA = re.compile(r"^\s*--\s*(\[OK\]|✓)\s*TESTS?\b.*$", re.IGNORECASE | re.MULTILINE)


def _leer(path):
    with open(path, "rb") as fh:
        data = fh.read()
    return data.decode("utf-8-sig", errors="replace").replace("\r\n", "\n")


def huella_archivo(path):
    texto = _leer(path)
    if path.lower().endswith(".sql"):
        texto = EVIDENCIA.sub("", texto)
    return hashlib.sha256(texto.encode("utf-8")).hexdigest()


def artefactos(tkt_dir):
    out = {}
    spec = os.path.join(tkt_dir, "spec.md")
    if os.path.isfile(spec):
        out["spec.md"] = huella_archivo(spec)
    for p in sorted(glob.glob(os.path.join(tkt_dir, "*Pruebas*.sql"))):
        out[os.path.basename(p)] = huella_archivo(p)
    return out


def parse_objs(items):
    objs = {}
    for it in items or []:
        if "=" not in it:
            sys.exit(f"--obj invalido: '{it}' (formato schema.objeto=HASH)")
        k, v = it.split("=", 1)
        objs[k.strip().lower()] = v.strip().upper()
    return objs


def ultimo_sello(path_sellos, fase):
    if not os.path.isfile(path_sellos):
        return None
    ultimo = None
    with open(path_sellos, encoding="utf-8") as fh:
        for linea in fh:
            linea = linea.strip()
            if not linea:
                continue
            try:
                reg = json.loads(linea)
            except json.JSONDecodeError:
                continue
            if reg.get("fase") == fase:
                ultimo = reg
    return ultimo


def registrar(args):
    reg = {
        "fase": args.fase,
        "fecha": datetime.now().isoformat(timespec="seconds"),
        "artefactos": artefactos(args.tkt_dir),
        "objetos": parse_objs(args.obj),
    }
    if not reg["artefactos"] and not reg["objetos"]:
        sys.exit("Nada que sellar: no hay spec.md, *Pruebas*.sql ni --obj.")
    with open(os.path.join(args.tkt_dir, "_sellos.jsonl"), "a", encoding="utf-8", newline="\n") as fh:
        fh.write(json.dumps(reg, ensure_ascii=False) + "\n")
    print(f"SELLADO [{args.fase}] {reg['fecha']}: "
          f"{len(reg['artefactos'])} artefacto(s), {len(reg['objetos'])} objeto(s)")
    return 0


def verificar(args):
    sello = ultimo_sello(os.path.join(args.tkt_dir, "_sellos.jsonl"), args.fase)
    if sello is None:
        print(f"SIN SELLO [{args.fase}]: la aprobacion no quedo registrada.")
        return 2
    cambios = []
    actuales = artefactos(args.tkt_dir)
    for nombre, h in sello.get("artefactos", {}).items():
        if nombre not in actuales:
            cambios.append(f"{nombre}: ya no existe")
        elif actuales[nombre] != h:
            cambios.append(f"{nombre}: cambio despues del sello")
    for nombre in actuales:
        if nombre not in sello.get("artefactos", {}):
            cambios.append(f"{nombre}: nuevo, no estaba en el sello")
    objs_actuales = parse_objs(args.obj)
    for nombre, h in sello.get("objetos", {}).items():
        if nombre not in objs_actuales:
            cambios.append(f"{nombre}: falta --obj con su hash actual (no verificado)")
        elif objs_actuales[nombre] != h:
            cambios.append(f"{nombre}: el cuerpo del objeto cambio despues del sello")
    if cambios:
        print(f"VIEJO [{args.fase}] sellado {sello['fecha']}:")
        for c in cambios:
            print(f"  - {c}")
        return 1
    print(f"FRESCO [{args.fase}] sellado {sello['fecha']}")
    return 0


def main():
    ap = argparse.ArgumentParser(description="Sellos de frescura de aprobaciones SDD")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for nombre in ("registrar", "verificar"):
        p = sub.add_parser(nombre)
        p.add_argument("--tkt-dir", required=True)
        p.add_argument("--fase", required=True, choices=FASES)
        p.add_argument("--obj", action="append", help="schema.objeto=HASH (repetible)")
    args = ap.parse_args()
    if not os.path.isdir(args.tkt_dir):
        sys.exit(f"No existe la carpeta: {args.tkt_dir}")
    sys.exit(registrar(args) if args.cmd == "registrar" else verificar(args))


if __name__ == "__main__":
    main()
