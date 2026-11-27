#!/usr/bin/env python3
"""
Corre la comprobación de estructura (supabase/comprobaciones/estructura.sql)
contra la base local y falla si alguna tabla de negocio no cumple el
requisito «Separación por organización en la base» (HU-03.1).

Uso:  python3 scripts/base/comprobar-estructura.py
Sale con 0 si no hay fallas, y con 1 si hay alguna, si la salida no se puede
leer o si la comprobación no recorrió nada.

La salida se lee con analizar(), que también usan las pruebas
(tests/base/prueba-comprobacion-estructura.py y prueba-scripts-base.py): lo
que la integración continua acepta es exactamente lo que se probó. Es
estricta a propósito:
  - toda línea debe ser FALLA o RESUMEN, con sus 5 campos; cualquier otra
    cosa es un error, no se ignora (un nombre con tabulador o salto de línea
    no puede esconder una falla);
  - tiene que haber una línea RESUMEN, y debe haber recorrido al menos una
    tabla: desde HU-03.1 existe organizacion, así que cero tablas quiere
    decir que la comprobación no miró donde debía.
"""
from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from base_local import leer_sql, psql_ok  # noqa: E402

COMPROBACION = RAIZ / "supabase" / "comprobaciones" / "estructura.sql"


def analizar(salida: str) -> tuple[list[list[str]], dict | None, list[str]]:
    """Lee la salida de estructura.sql. Devuelve (fallas, resumen, errores).

    fallas: [objeto, motivo, explicación] por cada FALLA.
    resumen: {'esquemas', 'tablas', 'otros', 'funciones'} o None si no vino.
    errores: lo que impide confiar en la salida; si hay alguno, no se aprueba.
    """
    fallas, resumen, errores = [], None, []
    for numero, linea in enumerate(salida.splitlines(), start=1):
        if not linea.strip():
            continue
        partes = linea.split("\t")
        if partes[0] == "FALLA" and len(partes) == 5 and partes[4] == "":
            fallas.append(partes[1:4])
        elif partes[0] == "RESUMEN" and len(partes) == 5 and resumen is None:
            try:
                esquemas, tablas, otros, funciones = (int(p) for p in partes[1:])
            except ValueError:
                errores.append(f"línea {numero}: el RESUMEN no trae números: {partes[1:]}")
                continue
            resumen = {"esquemas": esquemas, "tablas": tablas, "otros": otros, "funciones": funciones}
        else:
            errores.append(f"línea {numero}: no es una FALLA ni el RESUMEN esperados: {partes!r}")
    if resumen is None:
        errores.append("la comprobación no dio su línea RESUMEN; no se sabe qué recorrió")
    elif resumen["tablas"] < 1:
        errores.append("la comprobación recorrió 0 tablas de negocio, y al menos existe organizacion: "
                       "no miró donde debía")
    return fallas, resumen, errores


def describir(resumen: dict) -> str:
    return (f"{resumen['esquemas']} esquemas de negocio · {resumen['tablas']} tablas · "
            f"{resumen['otros']} vistas u otros · {resumen['funciones']} funciones con privilegios del dueño")


def main() -> int:
    fallas, resumen, errores = analizar(psql_ok(leer_sql(COMPROBACION)))
    for objeto, motivo, explicacion in fallas:
        print(f"  ✗ {objeto} [{motivo}]: {explicacion}")
    for error in errores:
        print(f"  ✗ ERROR: {error}")
    if errores:
        print(f"comprobar-estructura: no se puede aprobar: {len(errores)} errores al leer la comprobación.")
        return 1
    if fallas:
        print(f"comprobar-estructura: {len(fallas)} fallas ({describir(resumen)}).")
        return 1
    print(f"comprobar-estructura: sin fallas ({describir(resumen)}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
