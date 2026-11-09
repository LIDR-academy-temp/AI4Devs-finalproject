#!/usr/bin/env python3
"""
sdd doctor — verifica que el entorno SDD está listo para operar.
Uso: python sdd-toolkit/tools/doctor.py [--config path/to/sdd.config.yaml]
Sale con código 1 si algún check crítico (DETENER) falla.
"""
import sys
import argparse
from pathlib import Path

TOOLS_DIR = Path(__file__).parent
TOOLKIT_DIR = TOOLS_DIR.parent

try:
    import yaml
    _HAS_YAML = True
except ImportError:
    _HAS_YAML = False

try:
    from config_utils import find_config
    _HAS_FIND_CONFIG = True
except ImportError:
    _HAS_FIND_CONFIG = False

REQUIRED_VARS = ['RUTA_PLANNING', 'RUTA_GRAPH']
REQUIRED_TOOLS = ['code_graph.py', 'compound_loop.py', 'config_utils.py']


def _locate_config(explicit=None):
    if explicit:
        p = Path(explicit)
        return p if p.exists() else None
    if _HAS_FIND_CONFIG:
        try:
            return find_config(TOOLKIT_DIR)
        except FileNotFoundError:
            pass
    for c in [TOOLKIT_DIR / 'sdd.config.yaml', TOOLKIT_DIR.parent / 'sdd.config.yaml']:
        if c.exists():
            return c
    return None


def _parse(config_path):
    if not _HAS_YAML:
        return None
    with open(config_path, encoding='utf-8') as f:
        return yaml.safe_load(f)


def run(explicit_config=None):
    rows = []   # (icon, name, message, severity)  severity: None | 'DETENER' | 'Advertir'
    fatal = False

    # 1. Config existe
    config_path = _locate_config(explicit_config)
    if config_path:
        rows.append(('✓', 'sdd.config.yaml', str(config_path), None))
    else:
        rows.append(('✗', 'sdd.config.yaml', 'No encontrado', 'DETENER'))
        _print(rows)
        return True

    # 2. YAML parseable
    cfg = _parse(config_path)
    if not _HAS_YAML:
        rows.append(('⚠', 'PyYAML', 'No instalado — checks de config omitidos', 'Advertir'))
    elif cfg is None:
        rows.append(('✗', 'YAML válido', 'Error al parsear sdd.config.yaml', 'DETENER'))
        _print(rows)
        return True

    # 3. vars mínimos
    if cfg:
        vars_ = cfg.get('vars', {}) or {}
        missing = [v for v in REQUIRED_VARS if not vars_.get(v)]
        if missing:
            rows.append(('✗', 'vars mínimos', f"Faltan: {', '.join(missing)}", 'DETENER'))
            fatal = True
        else:
            rows.append(('✓', 'vars mínimos', ', '.join(REQUIRED_VARS), None))

    # 4. Profiles de targets activos
    if cfg:
        for name, tcfg in (cfg.get('targets') or {}).items():
            if not isinstance(tcfg, dict) or not tcfg.get('enabled'):
                continue
            rel = tcfg.get('profile')
            if not rel:
                continue
            candidates = [config_path.parent / rel, config_path.parent.parent / rel]
            found = next((p for p in candidates if p.exists()), None)
            if found:
                rows.append(('✓', f'profile:{name}', found.name, None))
            else:
                rows.append(('⚠', f'profile:{name}', f'{rel} no encontrado', 'Advertir'))

    # 5. Tools presentes
    for tool in REQUIRED_TOOLS:
        if (TOOLS_DIR / tool).exists():
            rows.append(('✓', f'tool:{tool}', 'presente', None))
        else:
            rows.append(('⚠', f'tool:{tool}', 'no encontrado — features limitadas', 'Advertir'))

    _print(rows)
    return fatal


def _print(rows):
    w1 = max(len(r[1]) for r in rows)
    w2 = max(len(r[2]) for r in rows)
    sep = f"{'─' * 2}  {'─' * w1}  {'─' * w2}  {'─' * 7}"
    print(f"{'':2}  {'Check':<{w1}}  {'Resultado':<{w2}}  Acción")
    print(sep)
    for icon, name, msg, sev in rows:
        print(f"{icon:2}  {name:<{w1}}  {msg:<{w2}}  {sev or ''}")


def main():
    parser = argparse.ArgumentParser(description='SDD Doctor — verifica el entorno SDD.')
    parser.add_argument('--config', help='Ruta explícita a sdd.config.yaml')
    args = parser.parse_args()

    print('SDD Doctor\n')
    fatal = run(args.config)
    print()
    if fatal:
        print('Estado: FALLA — corregir checks DETENER antes de operar.')
        sys.exit(1)
    else:
        print('Estado: OK — entorno listo.')


if __name__ == '__main__':
    main()
