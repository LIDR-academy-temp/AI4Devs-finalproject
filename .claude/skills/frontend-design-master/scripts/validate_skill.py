#!/usr/bin/env python3
"""Validación estructural conservadora de Frontend Design Master (sin dependencias)."""
from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parent.parent
errors = []
skill = root / 'SKILL.md'
if not skill.is_file():
    errors.append('Falta SKILL.md')
else:
    data = skill.read_text(encoding='utf-8')
    match = re.match(r'\A---\s*\n(.*?)\n---\s*\n', data, re.S)
    if not match:
        errors.append('Frontmatter YAML no delimitado por ---')
    else:
        fm = match.group(1)
        for key in ('name', 'description'):
            if not re.search(rf'(?m)^{key}:', fm):
                errors.append(f'Falta campo: {key}')
        name = re.search(r'(?m)^name:\s*(\S+)', fm)
        if name:
            value = name.group(1).strip('"\'')
            if value != root.name:
                errors.append('Nombre de carpeta y name no coinciden')
            if not re.fullmatch('[a-z0-9]+(?:-[a-z0-9]+)*', value) or len(value) > 64:
                errors.append('name no cumple Agent Skills')
        desc = re.search(r'(?ms)^description:\s*>\s*\n((?:[ \t]+[^\n]+\n?)+)', fm)
        desc_plain = ' '.join(line.strip() for line in desc.group(1).splitlines()) if desc else ''
        if not desc_plain:
            errors.append('description multilínea vacía o no soportada por verificador')
        elif len(desc_plain) > 1024:
            errors.append('description supera 1024 caracteres')
        compat = re.search(r'(?ms)^compatibility:\s*>\s*\n((?:[ \t]+[^\n]+\n?)+)', fm)
        if compat and len(' '.join(l.strip() for l in compat.group(1).splitlines())) > 500:
            errors.append('compatibility supera 500 caracteres')
    if len(data.splitlines()) > 500:
        errors.append('SKILL.md supera 500 líneas recomendadas')
    refs = set(re.findall(r'`((?:references|platforms|templates|scripts)/[\w.-]+\.(?:md|py|ps1))`', data))
    for path in refs:
        if not (root / path).is_file():
            errors.append(f'Referencia rota: {path}')
    if len(refs) < 20:
        errors.append('No se detectan suficientes referencias a módulos; revisar router')
for needed in (
    'README.md', 'THIRD_PARTY.md', 'EVALS.md',
    'references/06-quality-audit.md', 'references/11-design-calibration.md',
    'references/12-ux-deep-audit.md', 'references/13-motion-patterns.md',
    'references/14-multiplatform-acceptance.md', 'references/15-native-tools-optional.md',
    'platforms/react.md', 'platforms/winui3.md', 'platforms/flutter.md',
    'scripts/check_artifact.py', 'templates/design-contract.md'
):
    if not (root / needed).is_file():
        errors.append(f'Falta recurso: {needed}')
for file in root.rglob('*'):
    if file.is_symlink():
        errors.append(f'Enlace simbólico no permitido en ZIP: {file}')
    if file.is_file() and file.suffix in ('.md', '.ps1', '.py', '.json'):
        try:
            file.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            errors.append(f'Archivo no UTF-8: {file}')

if errors:
    print('VALIDACIÓN FALLIDA')
    for error in errors:
        print(' -', error)
    sys.exit(1)
print(f'VALIDACIÓN ESTRUCTURAL CORRECTA: {sum(f.is_file() for f in root.rglob("*"))} archivos en {root.name}')
