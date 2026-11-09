#!/usr/bin/env python3
"""Inspecciona referencias de recursos en un HTML distribuible.

Analizador estático conservador: no sustituye abrir el artefacto en un navegador.
No descarga recursos externos ni ejecuta el HTML.
"""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

STORED_ATTRS = {"script": ("src",), "link": ("href",), "img": ("src", "srcset"),
                "source": ("src", "srcset"), "video": ("src", "poster"),
                "audio": ("src",), "iframe": ("src",), "object": ("data",),
                "embed": ("src",)}
URL_PATTERN = re.compile(r'url\(\s*["\']?([^"\')]+)["\']?\s*\)', flags=re.I)
CSS_IMPORT_PATTERN = re.compile(r'@import\s+(?:url\()?\s*["\']([^"\']+)', flags=re.I)
JS_IMPORT_PATTERN = re.compile(r'(?:\bimport\s*\(|\bfrom\s*)\s*["\']([^"\']+)["\']', flags=re.I)


def classify(value):
    value = value.strip()
    if not value or value.startswith(("#", "data:", "blob:", "about:", "mailto:", "tel:", "javascript:")):
        return None
    parsed = urlsplit(value)
    if parsed.scheme in ("https", "http") or value.startswith("//"):
        return "externo"
    if parsed.scheme:
        return None
    return "local"


def srcset_values(attr):
    # No separar data:image/... con comas internas.
    if attr.lstrip().startswith('data:'):
        return []
    return [entry.strip().split()[0] for entry in attr.split(',') if entry.strip()]


class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.found = []
        self.in_style = False
        self.in_script = False

    def handle_starttag(self, tag, attrs):
        vals = dict(attrs)
        if tag == 'style':
            self.in_style = True
        if tag == 'script':
            self.in_script = True
        if tag == 'link' and vals.get('rel', '').lower() not in ('stylesheet', 'modulepreload', 'preload', 'icon', 'apple-touch-icon'):
            # links de navegación y canonical no son dependencias.
            return
        for key in STORED_ATTRS.get(tag, ()):
            if key not in vals or vals[key] is None:
                continue
            for path in (srcset_values(vals[key]) if key == 'srcset' else [vals[key]]):
                self.found.append((f'<{tag} {key}>', path))
        style = vals.get('style', '') or ''
        for url in URL_PATTERN.findall(style):
            self.found.append((f'<{tag} style>', url))

    def handle_endtag(self, tag):
        if tag == 'style':
            self.in_style = False
        if tag == 'script':
            self.in_script = False

    def handle_data(self, data):
        if self.in_style:
            for url in URL_PATTERN.findall(data) + CSS_IMPORT_PATTERN.findall(data):
                self.found.append(('CSS inline', url))
        if self.in_script:
            for url in JS_IMPORT_PATTERN.findall(data):
                self.found.append(('JS import (detección orientativa)', url))


def audit(path, strict=False):
    parser = Scan()
    parser.feed(path.read_text(encoding='utf-8-sig'))
    local, remote = [], []
    for location, ref in parser.found:
        kind = classify(ref)
        if kind == 'local':
            local.append((location, ref))
        elif kind == 'externo':
            remote.append((location, ref))
    print(f'Archivo: {path}')
    print(f'Recursos locales detectados: {len(local)}; externos detectados: {len(remote)}')
    for location, ref in local:
        print(f'ERROR local: {location}: {ref}')
    for location, ref in remote:
        print(f'ADVERTENCIA externa: {location}: {ref}')
    if local or (strict and remote):
        print('NO APTO según chequeo estático de autonomía.')
        return 1
    print('SIN REFERENCIAS NO INCORPORADAS DETECTADAS (no garantiza autonomía).')
    return 0


def main():
    argp = argparse.ArgumentParser(description=__doc__)
    argp.add_argument('html', type=Path, help='Ruta al HTML final')
    argp.add_argument('--strict', action='store_true', help='Tratar recursos externos como errores')
    opts = argp.parse_args()
    if not opts.html.is_file():
        argp.error('No existe el archivo HTML especificado')
    try:
        return audit(opts.html, opts.strict)
    except (UnicodeError, OSError) as exc:
        print(f'Error al leer el HTML: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())
