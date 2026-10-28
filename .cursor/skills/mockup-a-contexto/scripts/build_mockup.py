#!/usr/bin/env python3
"""Arma el HTML final del mockup: incrusta los recursos locales como data URI.

El template usa marcadores __ASSET:<ruta>__ donde iria la URL de una imagen,
icono o fuente que vive en el repo del proyecto (banderas, logos, iconos...).
Este script los reemplaza por data URIs para que el HTML funcione solo, sin
depender de rutas locales, y lo escribe en uno o varios destinos.

Uso:
    python build_mockup.py <template.html> --out <destino.html> [--out <otro.html>]
                           [--assets-root <carpeta>]

    --assets-root   Carpeta base para rutas relativas de __ASSET:...__
                    (default: carpeta del template). Rutas absolutas se usan tal cual.

Ejemplo en el template:
    const FLAG = { MX: '__ASSET:assets/flags/MX.png__' };
    <img src="__ASSET:assets/logo.svg__">

Sale con codigo 1 si falta algun recurso. Solo libreria estandar.
"""
import argparse
import base64
import mimetypes
import os
import re
import sys

ASSET_RE = re.compile(r'__ASSET:([\w ./\\:()-]+?)__')  # sin < > para que los ejemplos <ruta> no cuenten
EXTRA_MIME = {'.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp'}


def data_uri(path):
    ext = os.path.splitext(path)[1].lower()
    mime = EXTRA_MIME.get(ext) or mimetypes.guess_type(path)[0] or 'application/octet-stream'
    with open(path, 'rb') as f:
        return f'data:{mime};base64,' + base64.b64encode(f.read()).decode()


def main():
    ap = argparse.ArgumentParser(description='Incrusta __ASSET:ruta__ como data URI y escribe el mockup final.')
    ap.add_argument('template')
    ap.add_argument('--out', action='append', required=True)
    ap.add_argument('--assets-root')
    args = ap.parse_args()

    root = args.assets_root or os.path.dirname(os.path.abspath(args.template))
    with open(args.template, encoding='utf-8') as f:
        html = f.read()

    missing, cache = [], {}

    def repl(m):
        rel = m.group(1)
        path = rel if os.path.isabs(rel) else os.path.join(root, rel)
        if not os.path.isfile(path):
            missing.append(rel)
            return m.group(0)
        if path not in cache:
            cache[path] = data_uri(path)
        return cache[path]

    html = ASSET_RE.sub(repl, html)
    if missing:
        print('Faltan recursos:\n  ' + '\n  '.join(sorted(set(missing))), file=sys.stderr)
        return 1
    for out in args.out:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        with open(out, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'{out}  ({len(html) / 1024:.0f} KB, {len(cache)} recursos)')
    if len(html) > 10 * 1024 * 1024:
        print('Aviso: el HTML pasa de 10 MB; considera reducir imagenes.', file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
