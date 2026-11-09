#!/usr/bin/env python3
"""Genera un PNG por pantalla e idioma a partir del mockup HTML interactivo.

Usa Chrome o Edge sin ventana (headless) en dos pasadas por captura:
  1. --dump-dom con ?only=<id>&lang=<lang>  -> el mockup escribe la altura real
     de la pantalla en el titulo como "H=<px>".
  2. --screenshot con ese alto exacto (sin recortes ni espacio de sobra).

La lista de pantallas sale del propio mockup: con ?list=1 el titulo queda como
"SCREENS=<json>" con {"langs": [...], "screens": [{"id","file","w"}...]}
(contrato en references/mockup-html.md). Si el mockup no lo soporta, pasar
--screens y --langs a mano.

Uso:
    python render_screens.py <mockup.html> --out <carpeta_png>
        [--only s01,s04]              solo esas pantallas
        [--langs es,en]               idiomas (default: los que declara el mockup)
        [--screens s01:01-home:390,s08:08-anatomia:820]   lista manual
        [--ann 0|1]                   con o sin anotaciones (default 1)
        [--scale 2] [--wait 6000] [--jobs 4] [--browser <ruta>]

Nombre de cada archivo: <file>-<lang>.png  (ann=0 agrega "-limpio").

Modo pagina completa (mockups de diseño que no siguen el contrato, p.ej. en modo flujo):
    python render_screens.py <mockup.html> --out <carpeta_png> --full
        [--width 1400] [--name original]
        [--variants "inicio=,bandeja=#bandeja,novato=?persona=novato"]
    Mide el alto real de la pagina (inyecta un medidor en una copia temporal junto al
    mockup, que se borra al terminar) y captura una imagen por variante. Una variante
    es nombre=sufijo de URL (query o hash), solo sirve si el mockup lo lee. Para
    prototipos que solo navegan con clics, recorrerlos en el navegador y capturar a mano.
Solo libreria estandar.
"""
import argparse
import html as htmllib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile
from concurrent.futures import ThreadPoolExecutor

CANDIDATES = [
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
    r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
]
WHICH = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'msedge', 'chrome']


def find_browser(explicit):
    for c in [explicit, os.environ.get('CHROME')]:
        if c and os.path.isfile(c):
            return c
    for c in CANDIDATES:
        if os.path.isfile(c):
            return c
    for name in WHICH:
        p = shutil.which(name)
        if p:
            return p
    return None


def run(browser, args, timeout=90):
    with tempfile.TemporaryDirectory(prefix='mockup-render-') as prof:
        cmd = [browser, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
               '--hide-scrollbars', f'--user-data-dir={prof}'] + args
        return subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=timeout)


def title_of(dom):
    m = re.search(r'<title>(.*?)</title>', dom, re.S)
    return htmllib.unescape(m.group(1)) if m else ''


def list_screens(browser, url, wait):
    dom = run(browser, ['--window-size=1400,900', f'--virtual-time-budget={wait}', '--dump-dom', url + '?list=1']).stdout
    t = title_of(dom)
    if not t.startswith('SCREENS='):
        return None
    return json.loads(t[len('SCREENS='):])


def parse_manual(spec):
    screens = []
    for item in spec.split(','):
        parts = item.strip().split(':')
        sid = parts[0]
        file = parts[1] if len(parts) > 1 and parts[1] else sid
        w = int(parts[2]) if len(parts) > 2 and parts[2] else 390
        screens.append({'id': sid, 'file': file, 'w': w})
    return screens


def shoot(browser, url, sc, lang, ann, outdir, scale, wait):
    q = f"{url}?only={sc['id']}&lang={lang}&ann={ann}"
    w = int(sc.get('w') or 390)
    dom = run(browser, [f'--window-size={w},900', f'--virtual-time-budget={wait}', '--dump-dom', q]).stdout
    m = re.search(r'H=(\d+)', title_of(dom))
    if not m or int(m.group(1)) == 0:
        return sc['id'], lang, None, 'sin H= (¿id inexistente o el mockup no soporta ?only=?)'
    h = int(m.group(1))
    suffix = '' if str(ann) == '1' else '-limpio'
    out = pathlib.Path(outdir) / f"{sc['file']}-{lang}{suffix}.png"
    run(browser, [f'--force-device-scale-factor={scale}', f'--window-size={w},{h}',
                  f'--virtual-time-budget={wait}', f'--screenshot={out}', q])
    if not out.exists():
        return sc['id'], lang, None, 'el navegador no escribió el PNG'
    return sc['id'], lang, out, f'{w}x{h}'


PROBE = ("<script>(function(){function m(){var d=document.documentElement,b=document.body;"
         "document.title='H='+Math.max(d.scrollHeight,b?b.scrollHeight:0);}setInterval(m,400);})();</script>")


def render_full(browser, mockup, outdir, width, name, variants, scale, wait):
    src = pathlib.Path(mockup).resolve()
    html = src.read_text(encoding='utf-8', errors='replace')
    i = html.lower().rfind('</body>')
    probe_html = html[:i] + PROBE + html[i:] if i >= 0 else html + PROBE
    probe = src.with_name(f'.{src.stem}.probe.html')  # junto al original para que resuelvan las rutas relativas
    probe.write_text(probe_html, encoding='utf-8')
    fails = 0
    try:
        for vname, suffix in variants:
            base = probe.as_uri() + suffix
            dom = run(browser, [f'--window-size={width},900', f'--virtual-time-budget={wait}', '--dump-dom', base]).stdout
            m = re.search(r'H=(\d+)', title_of(dom))
            h = int(m.group(1)) if m else 900
            fname = f'{name}-{vname}.png' if vname else f'{name}.png'
            out = pathlib.Path(outdir) / fname
            run(browser, [f'--force-device-scale-factor={scale}', f'--window-size={width},{h}',
                          f'--virtual-time-budget={wait}', f'--screenshot={out}', base])
            if out.exists():
                print(f'  OK  {out.name:<52} {width}x{h}' + ('' if m else '  (alto no medido)'))
            else:
                fails += 1
                print(f'  !!  {fname} el navegador no escribió el PNG')
    finally:
        probe.unlink(missing_ok=True)
    return 1 if fails else 0


def main():
    ap = argparse.ArgumentParser(description='PNG por pantalla e idioma desde el mockup HTML.')
    ap.add_argument('--full', action='store_true', help='Captura de página completa (mockup que no sigue el contrato)')
    ap.add_argument('--width', type=int, default=1400)
    ap.add_argument('--name', default='original')
    ap.add_argument('--variants', help='nombre=sufijo,... (sufijo = query o hash). Default: solo la página inicial')
    ap.add_argument('mockup')
    ap.add_argument('--out', required=True)
    ap.add_argument('--only')
    ap.add_argument('--langs')
    ap.add_argument('--screens')
    ap.add_argument('--ann', default='1', choices=['0', '1'])
    ap.add_argument('--scale', default='2')
    ap.add_argument('--wait', type=int, default=6000)
    ap.add_argument('--jobs', type=int, default=4)
    ap.add_argument('--browser')
    args = ap.parse_args()
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')

    browser = find_browser(args.browser)
    if not browser:
        print('No encontré Chrome ni Edge. Pasa --browser <ruta> o define CHROME.', file=sys.stderr)
        return 1
    url = pathlib.Path(args.mockup).resolve().as_uri()
    os.makedirs(args.out, exist_ok=True)

    if args.full:
        variants = [('', '')]
        if args.variants:
            variants = [tuple(v.split('=', 1)) if '=' in v else (v, '') for v in args.variants.split(',')]
        print(f'{browser}\n{len(variants)} captura(s) de página completa -> {args.out}')
        return render_full(browser, args.mockup, args.out, args.width, args.name, variants, args.scale, args.wait)

    if args.screens:
        meta = {'langs': (args.langs or 'es').split(','), 'screens': parse_manual(args.screens)}
    else:
        meta = list_screens(browser, url, args.wait)
        if not meta:
            print('El mockup no respondió a ?list=1. Usa --screens id:archivo:ancho,... y --langs.', file=sys.stderr)
            return 1
    langs = args.langs.split(',') if args.langs else meta.get('langs') or ['es']
    screens = meta['screens']
    if args.only:
        wanted = set(args.only.split(','))
        screens = [s for s in screens if s['id'] in wanted]

    jobs = [(sc, lang) for lang in langs for sc in screens]
    print(f'{browser}\n{len(jobs)} capturas ({len(screens)} pantallas × {len(langs)} idiomas) -> {args.out}')
    fails = 0
    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as ex:
        futs = [ex.submit(shoot, browser, url, sc, lang, args.ann, args.out, args.scale, args.wait) for sc, lang in jobs]
        for f in futs:
            sid, lang, out, info = f.result()
            if out:
                print(f'  OK  {out.name:<52} {info}')
            else:
                fails += 1
                print(f'  !!  {sid} [{lang}] {info}')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
