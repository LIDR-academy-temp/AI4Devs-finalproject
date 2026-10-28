#!/usr/bin/env python3
"""Desempaca un mockup HTML "bundled" (exportado con __bundler/manifest).

Algunos exportadores de mockups guardan todo en un solo .html: cada recurso
(JS, CSS, imagenes, fuentes) va en base64 (a veces con gzip) dentro de
<script type="__bundler/manifest">, y la pagina en <script type="__bundler/template">.

Uso:
    python unpack_bundle.py <mockup.html> <carpeta_salida>

Escribe en <carpeta_salida>:
    template.html      la pagina tal como la arma el bundle
    <uuid>.<ext>       cada recurso decodificado
    _bundle.json       resumen: id, mime, bytes, archivo
    page_order.txt     orden de paginas (si el bundle lo trae)

Sale con codigo 2 si el archivo no es un bundle (en ese caso se lee directo).
Solo libreria estandar.
"""
import base64
import gzip
import json
import os
import re
import sys

EXT = {
    'text/javascript': '.js', 'application/javascript': '.js',
    'text/html': '.html', 'text/css': '.css', 'application/json': '.json',
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/svg+xml': '.svg',
    'image/webp': '.webp', 'image/gif': '.gif',
    'font/woff2': '.woff2', 'font/woff': '.woff', 'font/ttf': '.ttf',
}


def read_block(html, kind):
    m = re.search(r'<script type="__bundler/%s">(.*?)</script>' % re.escape(kind), html, re.S)
    return m.group(1) if m else None


def is_bundle(html):
    return read_block(html, 'manifest') is not None


def unpack(html):
    """Devuelve (template_html, [(id, mime, bytes)], page_order). Lanza ValueError si no es bundle."""
    raw = read_block(html, 'manifest')
    if raw is None:
        raise ValueError('no es un bundle (__bundler/manifest no encontrado)')
    manifest = json.loads(raw)
    tpl_raw = read_block(html, 'template')
    template = json.loads(tpl_raw) if tpl_raw else ''
    assets = []
    for key, entry in manifest.items():
        data = base64.b64decode(entry['data'])
        if entry.get('compressed'):
            data = gzip.decompress(data)
        assets.append((key, entry.get('mime', 'application/octet-stream'), data))
    return template, assets, read_block(html, 'page_order')


def main(argv):
    if len(argv) != 3:
        print(__doc__)
        return 1
    src, out = argv[1], argv[2]
    html = open(src, encoding='utf-8').read()
    if not is_bundle(html):
        print(f'{src}: no es un bundle; se puede leer directo.')
        return 2
    template, assets, page_order = unpack(html)
    os.makedirs(out, exist_ok=True)
    summary = []
    for key, mime, data in assets:
        name = key + EXT.get(mime, '.bin')
        with open(os.path.join(out, name), 'wb') as f:
            f.write(data)
        summary.append({'id': key, 'mime': mime, 'bytes': len(data), 'file': name})
    with open(os.path.join(out, 'template.html'), 'w', encoding='utf-8') as f:
        f.write(template)
    with open(os.path.join(out, '_bundle.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    if page_order:
        with open(os.path.join(out, 'page_order.txt'), 'w', encoding='utf-8') as f:
            f.write(page_order)
    for s in summary:
        print(f"{s['file']:<48} {s['mime']:<24} {s['bytes']:>9}")
    print(f'template.html {len(template)} chars · {len(summary)} recursos -> {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
