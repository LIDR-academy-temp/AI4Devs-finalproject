#!/usr/bin/env python3
"""Inventario de un mockup: textos, colores y fuentes, cruzado contra el proyecto frontend.

Sirve para no adivinar: que textos del mockup ya existen como llave de idioma,
que colores ya existen como token del tema y que es realmente nuevo.

Uso:
    python mockup_inventory.py <mockup> [opciones]

<mockup> puede ser un .html (bundled o normal) o una carpeta (por ejemplo la
salida de unpack_bundle.py). Se leen .html .htm .js .jsx .ts .tsx .css .vue .svelte.

Opciones:
    --compare <mockup_anterior>   Modo delta: lista solo lo que agrega el mockup nuevo
                                  y lo que quita respecto al anterior.
    --tokens <ruta> [...]         Archivos o carpetas del tema del proyecto (dart, css,
                                  scss, less, ts, js). Cada color del mockup se empareja
                                  con el token mas cercano (Delta E 76 en Lab).
    --i18n <ruta> [...]           Archivos o carpetas de idioma (.arb, .json, .resx).
                                  Cada texto se empareja con la llave que ya lo tiene.
    --flow                        Modo flujo (backend): navegacion, estados, acciones (handlers)
                                  y campos de formulario sacados del codigo del mockup.
    --channel NOMBRE[:rol]=RUTA   Varios canales del mismo proyecto (repetir). rol = cliente
                                  (default: app, web...) o admin (WinUI, ERP, backoffice; tambien
                                  se deduce si el nombre es admin/erp/winui/backoffice). Ej.:
                                  --channel app=app.html --channel web=web.html
                                  --channel erp:admin=<carpeta con .xaml / .cs o .html> --flow
    --de-exact N                  Delta E maximo para "igual" (default 1.5).
    --de-near N                   Delta E maximo para "cercano" (default 6).
    --min-count N                 Oculta textos que aparecen menos de N veces (default 1).
    --out <archivo.md>            Escribe el reporte en markdown (default: stdout).
    --json <archivo.json>         Ademas escribe el inventario en JSON.

Las rutas aceptan comodines (glob). Solo libreria estandar. Es heuristico: el
reporte orienta la lectura del codigo, no la reemplaza.
"""
import argparse
import difflib
import glob
import html as htmllib
import json
import os
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from unpack_bundle import is_bundle, unpack  # noqa: E402

MOCK_EXT = {'.html', '.htm', '.js', '.jsx', '.mjs', '.ts', '.tsx', '.css', '.vue', '.svelte', '.xaml', '.cs'}
TOKEN_EXT = {'.dart', '.css', '.scss', '.sass', '.less', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.xaml'}
I18N_EXT = {'.arb', '.json', '.resx', '.resw'}

# WinUI / WPF (XAML): atributos con texto visible, controles de entrada y comandos
XAML_TEXT_RE = re.compile(r'\b(?:Text|Content|Header|PlaceholderText|Title|Label|Description|Subtitle|OffContent|OnContent'
                          r'|ToolTipService\.ToolTip|AutomationProperties\.Name|PrimaryButtonText|SecondaryButtonText'
                          r'|CloseButtonText)\s*=\s*"([^"{][^"]*)"')
XAML_INPUT_RE = re.compile(r'<(TextBox|PasswordBox|NumberBox|ComboBox|AutoSuggestBox|DatePicker|CalendarDatePicker|TimePicker'
                           r'|CheckBox|ToggleSwitch|RadioButton|Slider|RichEditBox)\b([^>]*)>')
XAML_CMD_RE = re.compile(r'\b(Command|Click|Tapped|SelectionChanged|ItemClick)\s*=\s*"\{?(?:x:Bind|Binding)?\s*(?:Path=)?([\w.]+)')
SKIP_DIRS = {'node_modules', '.git', 'build', 'dist', '.dart_tool', 'bin', 'obj', '.next', 'coverage'}


# ---------------------------------------------------------------- archivos

def expand(paths, exts):
    out = []
    for p in paths:
        hits = glob.glob(p, recursive=True) or [p]
        for h in hits:
            if os.path.isdir(h):
                for root, dirs, files in os.walk(h):
                    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                    out += [os.path.join(root, f) for f in files if os.path.splitext(f)[1].lower() in exts]
            elif os.path.isfile(h):
                out.append(h)
    return sorted(set(out))


def read(path):
    with open(path, encoding='utf-8', errors='replace') as f:
        return f.read()


VENDOR_MARKERS = ('@license', 'do not edit', '@ds-bundle', 'webpackBootstrap', 'Copyright (c)')
CODE_MIMES = {'text/javascript': '.js', 'application/javascript': '.js', 'text/jsx': '.jsx',
              'text/babel': '.jsx', 'text/typescript': '.ts', 'text/css': '.css', 'text/html': '.html'}


def is_vendor(content):
    """Librerias empaquetadas (React, Babel, runtime, design system): no son copy del mockup."""
    if any(m in content[:600] for m in VENDOR_MARKERS):
        return True
    lines = content.count('\n') + 1
    return len(content) > 200_000 or (len(content) > 20_000 and len(content) / lines > 800)


def load_mockup(path, include_vendor=False):
    """Devuelve [(nombre, tipo, contenido)] con el texto fuente del mockup."""
    sources = []
    if os.path.isdir(path):
        for f in expand([path], MOCK_EXT):
            ext, c = os.path.splitext(f)[1].lower(), read(f)
            if include_vendor or ext in ('.html', '.htm') or not is_vendor(c):
                sources.append((os.path.relpath(f, path), ext, c))
        return sources
    content = read(path)
    if is_bundle(content):
        template, assets, _ = unpack(content)
        sources.append(('template.html', '.html', template))
        for key, mime, data in assets:
            ext = CODE_MIMES.get(mime)
            if not ext:
                continue
            c = data.decode('utf-8', 'replace')
            if include_vendor or not is_vendor(c):
                sources.append((key + ext, ext, c))
        return sources
    sources.append((os.path.basename(path), os.path.splitext(path)[1].lower() or '.html', content))
    return sources


# ---------------------------------------------------------------- textos

class _TextParser(HTMLParser):
    ATTRS = {'placeholder', 'title', 'aria-label', 'alt', 'label'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.texts = []
        self.scripts = []
        self.styles = []
        self._buf = None

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
            self._buf = []
        for k, v in attrs:
            if k in self.ATTRS and v:
                self.texts.append(v)

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.skip:
            self.skip -= 1
            (self.scripts if tag == 'script' else self.styles).append(''.join(self._buf or []))
            self._buf = None

    def handle_data(self, data):
        if self.skip:
            if self._buf is not None:
                self._buf.append(data)
        else:
            self.texts.append(data)


STR_RE = re.compile(r"""'((?:[^'\\\n]|\\.){2,200})'|"((?:[^"\\\n]|\\.){2,200})"|`((?:[^`\\]|\\.){2,400})`""")
JSX_TEXT_RE = re.compile(r'>\s*([^<>{}\n][^<>{}]{1,200}?)\s*<')
TPL_EXPR_RE = re.compile(r'\$\{[^}]*\}')
CODEISH = re.compile(
    r'(=>|\(\)|;\s*$|^\s*[.#@$]|^--|\b(?:var|rgba?|calc|url|translate[XY]?)\(|https?:|\.(?:png|svg|jpg|js|css)\b'
    r'|^[\w-]+:\s*\S+;|^\s*<|</|\{|\}|\\n|^[\w.\-/]+$'
    r'|^\s*[,;:)\]?]|\b[a-z]\w*:\s*(?:null|true|false|\d|$)|\b[a-z]+[A-Z]\w*\s*[:=(]'
    r'|^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$|^(?:-?[\d.]+(?:px|rem|em|%|vh|vw|s|ms|deg)?\s*)+$'
    r'|\b\w+\([^)]*\)|\w=\w|\w=["\']|&&|\|\||==|!=|^\s*["\'\[]|["\']\s*[,\]]\s*\w+:|`|">|\';|//|system-ui|sans-serif|-apple-system)'
)
LETTER = re.compile(r'[A-Za-zÀ-ÿ]')
NONASCII_LETTER = re.compile(r'[À-ÿ]')


def clean(s):
    s = htmllib.unescape(s)
    s = s.replace('\\n', ' ').replace("\\'", "'").replace('\\"', '"')
    s = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)
    return re.sub(r'\s+', ' ', s).strip()


def looks_like_copy(s):
    if not (2 <= len(s) <= 200) or not LETTER.search(s):
        return False
    if ' ' not in s:
        # Una sola palabra: solo si empieza en mayuscula o trae acentos (evita identificadores y clases).
        if not (s[0].isupper() or NONASCII_LETTER.search(s)) or re.search(r'[a-z][A-Z]', s) or '_' in s:
            return False
    if CODEISH.search(s):
        return False
    if re.fullmatch(r'[\w\s-]+', s) and s == s.lower() and not NONASCII_LETTER.search(s):
        words = s.split()
        if len(words) <= 2 or any(re.search(r'[a-z]\d|\d[a-z]', w) for w in words):
            return False  # "flex row", "space-between", "t12 muted mt4"...
    return True


def strings_from_code(code):
    out = []
    for m in STR_RE.finditer(code):
        s = next(g for g in m.groups() if g is not None)
        for part in TPL_EXPR_RE.split(s):  # partes fijas de un template literal
            out.append(part)
        if TPL_EXPR_RE.search(s):
            out.append(TPL_EXPR_RE.sub('{}', s))  # tambien el patron completo: "Meta {}"
    out += JSX_TEXT_RE.findall(code)
    return out


def extract_texts(sources):
    counts = {}
    for _, kind, content in sources:
        raw = []
        if kind in ('.html', '.htm', '.vue', '.svelte'):
            p = _TextParser()
            p.feed(content)
            raw += p.texts
            for sc in p.scripts:
                raw += strings_from_code(sc)
        elif kind == '.css':
            continue
        elif kind == '.xaml':
            raw += XAML_TEXT_RE.findall(content)
        else:
            raw += strings_from_code(content)
        for r in raw:
            t = clean(r)
            if looks_like_copy(t):
                counts[t] = counts.get(t, 0) + 1
    return counts


# ---------------------------------------------------------------- colores

HEX_RE = re.compile(r'(?<![\w&])#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b')
RGB_RE = re.compile(r'rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)')
DART_RE = re.compile(r'0x([0-9A-Fa-f]{2})([0-9A-Fa-f]{6})\b')


def norm_hex(h):
    h = h.lower()
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h)
    rgb, alpha = h[:6], (h[6:8] if len(h) == 8 else 'ff')
    return '#' + rgb, alpha


def norm_hex_xaml(h):
    """XAML usa #AARRGGBB (alfa primero), al revés que CSS (#RRGGBBAA)."""
    h = h.lower()
    if len(h) == 8:
        return '#' + h[2:], h[:2]
    if len(h) == 4:
        return '#' + ''.join(c * 2 for c in h[1:]), h[0] * 2
    return norm_hex(h)


def extract_colors(sources):
    counts = {}

    def add(key):
        counts[key] = counts.get(key, 0) + 1

    for _, kind, content in sources:
        for m in HEX_RE.finditer(content):
            rgb, a = norm_hex_xaml(m.group(1)) if kind == '.xaml' else norm_hex(m.group(1))
            add(rgb if a == 'ff' else f'{rgb}@{a}')
        for m in RGB_RE.finditer(content):
            r, g, b = (min(255, int(x)) for x in m.group(1, 2, 3))
            rgb = '#%02x%02x%02x' % (r, g, b)
            al = m.group(4)
            if al is None or al in ('1', '1.0', '100%'):
                add(rgb)
            else:
                v = float(al.rstrip('%')) / (100 if al.endswith('%') else 1)
                add(f'{rgb}@{round(v * 255):02x}')
    return counts


def extract_fonts(sources):
    fonts = {}
    for _, _, content in sources:
        for m in re.finditer(r'font-family\s*:\s*([^;}\n"]+)', content):
            fam = m.group(1).split(',')[0].strip().strip('\'"')
            if fam and not fam.startswith('var(') and not fam.startswith('inherit'):
                fonts[fam] = fonts.get(fam, 0) + 1
        for m in re.finditer(r'fontFamily\s*:\s*[\'"]([^\'"]+)', content):
            fam = m.group(1).split(',')[0].strip().strip('\'"')
            fonts[fam] = fonts.get(fam, 0) + 1
        for m in re.finditer(r'fonts\.googleapis\.com/css2?\?[^"\')\s]*', content):
            for fam in re.findall(r'family=([^:&"\']+)', m.group(0)):
                fam = fam.replace('+', ' ')
                fonts[fam] = fonts.get(fam, 0) + 1
    return fonts


def _lab(hex6):
    r, g, b = (int(hex6[i:i + 2], 16) / 255 for i in (1, 3, 5))

    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    r, g, b = lin(r), lin(g), lin(b)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883

    def f(t):
        return t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116

    fx, fy, fz = f(x), f(y), f(z)
    return 116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)


def delta_e(h1, h2):
    a, b = _lab(h1), _lab(h2)
    return sum((p - q) ** 2 for p, q in zip(a, b)) ** 0.5


# ---------------------------------------------------------------- proyecto: tokens

TOKEN_PATTERNS = [
    # Dart: static const Color primary950 = Color(0xFF1E224F);
    re.compile(r'(?P<name>\w+)\s*=\s*(?:const\s+)?Color\(\s*0x(?P<a>[0-9A-Fa-f]{2})(?P<rgb>[0-9A-Fa-f]{6})\s*\)'),
    # CSS / SCSS / LESS: --primary: #1E224F;  $primary: #1E224F;  @primary: #1E224F;
    re.compile(r'(?P<name>--[\w-]+|\$[\w-]+|@[\w-]+)\s*:\s*#(?P<hex>[0-9a-fA-F]{3,8})\b'),
    # JS / TS / JSON: primary: '#1E224F'   "primary-500": "#1E224F"
    re.compile(r'[\'"]?(?P<name>[\w-]+)[\'"]?\s*:\s*[\'"]#(?P<hex>[0-9a-fA-F]{3,8})[\'"]'),
]


BUILTIN_TOKENS = [  # Colors.white / Colors.black / #fff de CSS: existen aunque el tema no los declare
    {'name': 'white (built-in)', 'hex': '#ffffff', 'alpha': 'ff', 'file': '—', 'line': 0},
    {'name': 'black (built-in)', 'hex': '#000000', 'alpha': 'ff', 'file': '—', 'line': 0},
]


def load_tokens(paths):
    tokens = [dict(t) for t in BUILTIN_TOKENS]
    for f in expand(paths, TOKEN_EXT):
        rel = f
        if f.lower().endswith('.xaml'):
            # <Color x:Key="Primary">#FF1E224F</Color> · <SolidColorBrush x:Key="X" Color="#FF1E224F"/>
            for n, line in enumerate(read(f).splitlines(), 1):
                for m in re.finditer(r'x:Key="([\w.]+)"[^>]*?(?:Color="#([0-9A-Fa-f]{6,8})"|>\s*#([0-9A-Fa-f]{6,8})\s*<)', line):
                    rgb, a = norm_hex_xaml(m.group(2) or m.group(3))
                    tokens.append({'name': m.group(1), 'hex': rgb, 'alpha': a, 'file': rel, 'line': n})
            continue
        for n, line in enumerate(read(f).splitlines(), 1):
            named = False
            for pat in TOKEN_PATTERNS:
                for m in pat.finditer(line):
                    d = m.groupdict()
                    if d.get('rgb'):
                        rgb, a = '#' + d['rgb'].lower(), d['a'].lower()
                    else:
                        rgb, a = norm_hex(d['hex'])
                    tokens.append({'name': d['name'], 'hex': rgb, 'alpha': a, 'file': rel, 'line': n})
                    named = True
            if not named:
                for m in DART_RE.finditer(line):
                    tokens.append({'name': None, 'hex': '#' + m.group(2).lower(), 'alpha': m.group(1).lower(), 'file': rel, 'line': n})
    return tokens


def match_colors(colors, tokens, de_exact, de_near):
    rows = []
    for key, cnt in sorted(colors.items(), key=lambda kv: -kv[1]):
        hex6 = key.split('@')[0]
        best, best_de = None, None
        for t in tokens:
            d = delta_e(hex6, t['hex'])
            if best_de is None or d < best_de or (abs(d - best_de) < 1e-9 and t['name'] and not best['name']):
                best, best_de = t, d
        alpha = key.split('@')[1] if '@' in key else 'ff'
        if best is None:
            state = '—'
        elif best_de <= de_exact:
            state = 'igual' if best['alpha'] == alpha else 'igual (otro alfa)'
        elif best_de <= de_near:
            state = 'cercano'
        else:
            state = 'sin token'
        rows.append({'color': key, 'count': cnt, 'token': best, 'de': best_de, 'state': state})
    return rows


# ---------------------------------------------------------------- proyecto: idiomas

def _flatten(obj, prefix=''):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if str(k).startswith('@'):
                continue
            yield from _flatten(v, f'{prefix}.{k}' if prefix else str(k))
    elif isinstance(obj, str):
        yield prefix, obj


def load_i18n(paths):
    entries = []
    for f in expand(paths, I18N_EXT):
        ext = os.path.splitext(f)[1].lower()
        try:
            if ext in ('.arb', '.json'):
                for k, v in _flatten(json.loads(read(f))):
                    entries.append({'key': k, 'value': v, 'file': os.path.basename(f)})
            elif ext in ('.resx', '.resw'):
                for d in ET.parse(f).getroot().iter('data'):
                    v = d.find('value')
                    if d.get('name') and v is not None and v.text:
                        entries.append({'key': d.get('name'), 'value': v.text, 'file': os.path.basename(f)})
        except (ValueError, ET.ParseError) as e:
            print(f'  aviso: no se pudo leer {f}: {e}', file=sys.stderr)
    return entries


def norm_text(s):
    s = s.replace('\u2019', "'").replace('\u201c', '"').replace('\u201d', '"').replace('\u00ab', '"').replace('\u00bb', '"')
    s = re.sub(r'\{[^}]*\}', '{}', s)
    s = re.sub(r'\s+', ' ', s).strip().rstrip('.:').casefold()
    return s


def match_texts(texts, entries):
    index = {}
    for e in entries:
        index.setdefault(norm_text(e['value']), []).append(e)
    keys = list(index)
    rows = []
    for text, cnt in sorted(texts.items(), key=lambda kv: (-kv[1], kv[0])):
        n = norm_text(text)
        if n in index:
            rows.append({'text': text, 'count': cnt, 'state': 'existe', 'hits': index[n]})
            continue
        close = difflib.get_close_matches(n, keys, n=1, cutoff=0.82) if entries else []
        if close:
            rows.append({'text': text, 'count': cnt, 'state': 'parecido', 'hits': index[close[0]]})
        else:
            rows.append({'text': text, 'count': cnt, 'state': 'nuevo' if entries else '—', 'hits': []})
    return rows


# ---------------------------------------------------------------- flujo (modo backend)

NAV_KEYS = {'screen', 'view', 'page', 'route', 'step', 'stage', 'tab', 'modal', 'sheet', 'dialog', 'panel', 'subview'}
# Variables de la maqueta (índices, DOM, estilos) que no son estados del negocio
NOISE_FLOW_KEYS = {'length', 'protocol', 'shape', 'size', 'width', 'height', 'key', 'id', 'idx', 'index',
                   'targetIdx', 'ev', 'event', 'readyState', 'nodeType', 'tagName', 'nodeName', 'display',
                   'position', 'align', 'variant', 'color', 'theme', 'dir'}
NAV_FN = r'(?:go|goTo|navigate|navigateTo|push|replace|open|openModal|showModal)'
LIT = r"""(?:'([^'\n]{0,60})'|"([^"\n]{0,60})"|(true|false|null|-?\d+(?:\.\d+)?))"""


def _lit(m, base=1):
    for i in range(base, base + 3):
        if m.group(i) is not None:
            return m.group(i)
    return None


def _balanced(code, start):
    """Devuelve el texto entre la llave en `start` y su cierre (sin contar strings)."""
    depth, i, q = 0, start, None
    while i < len(code):
        c = code[i]
        if q:
            if c == '\\':
                i += 1
            elif c == q:
                q = None
        elif c in '\'"`':
            q = c
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return code[start + 1:i]
        i += 1
    return code[start + 1:]


def _top_level_pairs(obj):
    """key: literal del primer nivel de un objeto JS."""
    pairs, depth = [], 0
    for m in re.finditer(r'[{}\[\]()]|(?<![\w$.])([A-Za-z_$][\w$]*)\s*:\s*' + LIT, obj):
        tok = m.group(0)
        if tok in '{[(':
            depth += 1
        elif tok in '}])':
            depth -= 1
        elif depth == 0 and m.group(1):
            pairs.append((m.group(1), _lit(m, 2)))
    return pairs


def _is_nav(key):
    k = key.lower()
    return (k in NAV_KEYS or any(k.endswith(n) for n in NAV_KEYS) or 'scenario' in k or 'escenario' in k
            or k.startswith('navegaci'))


def _xattr(attrs, *names):
    for n in names:
        m = re.search(r'\b' + re.escape(n) + r'\s*=\s*"([^"{][^"]*)"', attrs)
        if m:
            return m.group(1)
    return ''


def _flow_xaml(name_src, content, actions, fields):
    """WinUI / WPF: comandos y eventos como acciones, controles de entrada como campos."""
    page = os.path.splitext(os.path.basename(name_src))[0]
    for m in re.finditer(r'<([\w:.]+)\b([^>]*)>', content):
        tag, attrs = m.group(1), m.group(2)
        for c in XAML_CMD_RE.finditer(attrs):
            label = _xattr(attrs, 'Content', 'Text', 'Label', 'AutomationProperties.Name', 'ToolTipService.ToolTip')
            actions.append((c.group(2).split('.')[-1], f'{c.group(1)} en `{tag.split(":")[-1]}`' + (f' «{label}»' if label else '') + f' ({page})'))
    for m in XAML_INPUT_RE.finditer(content):
        attrs = m.group(2)
        label = _xattr(attrs, 'Header', 'PlaceholderText', 'Content', 'AutomationProperties.Name', 'x:Name')
        fields.append((m.group(1), page, label))


def _flow_cs(content, actions, seen):
    """Code-behind / ViewModel de WinUI: navegación entre páginas y comandos."""
    for m in re.finditer(r'Navigate\(\s*typeof\(\s*(\w+)\s*\)', content):
        seen('navegación (go/navigate)', m.group(1), 'nav')
    for m in re.finditer(r'\[RelayCommand\][^\n]*\n\s*(?:\[[^\]]*\]\s*)*(?:public|private|internal|protected)?\s*(?:async\s+)?[\w<>]+\s+(\w+)\s*\(', content):
        actions.append((m.group(1) + 'Command', 'comando (ViewModel)'))
    for m in re.finditer(r'(\w+)\s*=\s*(?:new\s+)?(?:Relay|Async|Delegate)\w*Command\w*\(', content):
        actions.append((m.group(1), 'comando (ViewModel)'))
    for m in re.finditer(r'(\w+)\s*(?:==|!=)\s*(\w+)\.(\w+)\b', content):
        if m.group(2)[0].isupper() and m.group(2).endswith(('Status', 'State', 'Estado', 'Estatus', 'Type', 'Tipo')):
            seen(m.group(2), m.group(3), 'compara')


def extract_flow(sources):
    initial, values, actions, fields = {}, {}, [], []

    def seen(key, val, how):
        if val is None or len(str(val)) > 60 or len(key) <= 1 or key in NOISE_FLOW_KEYS:
            return
        values.setdefault(key, {}).setdefault(str(val), set()).add(how)

    for name_src, kind, content in sources:
        if kind == '.xaml':
            _flow_xaml(name_src, content, actions, fields)
            continue
        if kind == '.cs':
            _flow_cs(content, actions, seen)
            continue
        code = content
        if kind in ('.html', '.htm', '.vue', '.svelte'):
            p = _TextParser()
            p.feed(content)
            code = '\n'.join(p.scripts) + '\n' + content
        # Estado inicial: class `state = {...}`, `this.state = {...}`, `data() { return {...} }`, useState(lit)
        for m in re.finditer(r'(?:\bstate|this\.state|initialState)\s*=\s*\{', code):
            for k, v in _top_level_pairs(_balanced(code, m.end() - 1)):
                initial.setdefault(k, v)
                seen(k, v, 'inicial')
        for m in re.finditer(r'const\s*\[\s*(\w+)\s*,\s*set\w+\s*\]\s*=\s*(?:React\.)?useState\(\s*' + LIT, code):
            initial.setdefault(m.group(1), _lit(m, 2))
            seen(m.group(1), _lit(m, 2), 'inicial')
        # Cambios de estado
        for m in re.finditer(r'setState\(\s*(?:\(?\s*\w*\s*\)?\s*=>\s*\(?\s*)?\{', code):
            for k, v in _top_level_pairs(_balanced(code, m.end() - 1)):
                seen(k, v, 'set')
        for m in re.finditer(r'\bset([A-Z]\w*)\(\s*' + LIT + r'\s*\)', code):
            seen(m.group(1)[0].lower() + m.group(1)[1:], _lit(m, 2), 'set')
        for m in re.finditer(r'(?<![\w$])(?:this\.)?' + NAV_FN + r"\(\s*['\"]([\w/:.-]{1,60})['\"]", code):
            seen('navegación (go/navigate)', m.group(1), 'nav')
        # Comparaciones: s.screen === 'bandeja'
        for m in re.finditer(r'(?:[\w$]+\.)*([A-Za-z_$][\w$]*)\s*[!=]==?\s*' + LIT, code):
            seen(m.group(1), _lit(m, 2), 'compara')
        for m in re.finditer(r'switch\s*\(\s*(?:[\w$]+\.)*([\w$]+)\s*\)\s*\{', code):
            body = _balanced(code, m.end() - 1)
            for c in re.finditer(r"case\s+['\"]([^'\"]{1,60})['\"]\s*:", body):
                seen(m.group(1), c.group(1), 'switch')
        # Acciones: handlers con nombre y su efecto
        for m in re.finditer(r'(?<![\w$.])([A-Za-z_$][\w$]*)\s*[=:]\s*(?:async\s*)?(?:\([^()]*\)|[\w$]+)\s*=>\s*', code):
            name, rest = m.group(1), code[m.end():m.end() + 240]
            eff = None
            n = re.match(r'\{?\s*(?:this\.)?(' + NAV_FN + r')\(\s*[\'"]([^\'"]+)[\'"]', rest)
            s = re.match(r'\{?\s*(?:this\.)?setState\(\s*(?:\(?\s*\w*\s*\)?\s*=>\s*\(?\s*)?\{', rest)
            c = re.match(r'\{?\s*(?:this\.)?([\w$]+)\(\s*[\'"]([^\'"]+)[\'"]', rest)
            if n:
                eff = f'navega → `{n.group(2)}`'
            elif s:
                body = _balanced(rest, s.end() - 1)
                parts = [f'{k}={v}' for k, v in _top_level_pairs(body)]
                parts += [f'{k}=¬{k}' for k in re.findall(r'(\w+)\s*:\s*!\s*\w+\.\1\b', body)]
                eff = 'estado: ' + ', '.join(parts) if parts else 'cambia estado'
            elif c and re.fullmatch(r'set[A-Z]\w*', c.group(1)) and c.group(1) != 'setState':
                eff = f'estado: {c.group(1)[3].lower() + c.group(1)[4:]}={c.group(2)}'
            elif c and c.group(1) not in ('require', 'import', 'fetch', 'log'):
                eff = f'`{c.group(1)}(\'{c.group(2)}\')`'
            if eff and not name.startswith('_') and name not in ('then', 'catch', 'map', 'filter'):
                actions.append((name, eff))
        # Campos de formulario
        for m in re.finditer(r'<(input|select|textarea)\b([^>]*)>', content, re.I):
            attrs = dict((a.lower(), (b or c)) for a, b, c in re.findall(r'([\w-]+)\s*=\s*(?:"([^"]*)"|\'([^\']*)\')', m.group(2)))
            label = attrs.get('placeholder') or attrs.get('aria-label') or attrs.get('name') or attrs.get('id') or ''
            if '{' in label:
                label = ''
            fields.append((m.group(1).lower(), attrs.get('type', ''), label))
    actions = list(dict.fromkeys(actions))
    fields = list(dict.fromkeys(fields))
    return initial, values, actions, fields


QTY_RE = re.compile(
    r'\b(\d+|un[ao]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|one|two|three|four|five|twice|once)\s+'
    r'(d[ií]as?|days?|veces|times|meses|months?|semanas?|weeks?|horas?|hours?|afiliaciones|affiliations|'
    r'puntos|points|lugares|spots|miembros|members|personas|people|generaciones|generations|intentos|attempts|'
    r'rechazos|rejections|invitaciones|invitations|c[oó]digos|codes)\b'
    r'|\b(m[aá]ximo|m[ií]nimo|hasta|al menos|more than|less than|at least|up to|más de|menos de)\s+\d+',
    re.I)


def quantity_report(texts):
    """Textos con una cantidad escrita: casi siempre esconden un parámetro (contenido-configurable §1)."""
    hits = sorted(t for t in texts if QTY_RE.search(t) and not re.fullmatch(r'[\d\s.,:/-]+', t))
    if not hits:
        return ''
    L = ['', '### Textos que mencionan cantidades (posibles parámetros)', '',
         '> Si el número es una regla (días, rechazos, cupos, metas), va como parámetro del programa y el texto',
         '> lleva un placeholder que resuelve el back. Si es un dato de ejemplo del mockup, se ignora.', '']
    return '\n'.join(L + [f'- {md_escape(t)}' for t in hits]) + '\n'


def flow_report(initial, values, actions, fields):
    L = ['', '## Flujo (heurístico)', '',
         '> Sale del código del mockup (estado, handlers, comparaciones). Sirve para armar el mapa de pantallas,',
         '> las máquinas de estado y las acciones; confirmar recorriendo el mockup en el navegador.']
    multi = {k: v for k, v in values.items() if len(v) >= 2 or _is_nav(k)}
    nav = sorted(k for k in multi if _is_nav(k))
    other = sorted(k for k in multi if not _is_nav(k))
    for title, keys in (('Navegación y escenarios', nav), ('Variables con varios estados', other)):
        if not keys:
            continue
        L += ['', f'### {title}', '', '| Variable | Inicial | Valores vistos |', '|---|---|---|']
        for k in keys:
            vals = ', '.join(f'`{v}`' for v in sorted(multi[k], key=str))
            L.append(f'| `{md_escape(k)}` | {md_escape(initial.get(k, "—"))} | {md_escape(vals)} |')
    if actions:
        L += ['', '### Acciones (handlers)', '', '| Handler | Efecto |', '|---|---|']
        L += [f'| `{md_escape(n)}` | {md_escape(e)} |' for n, e in actions]
    if fields:
        L += ['', '### Campos de formulario', '', '| Elemento | Tipo / página | Etiqueta |', '|---|---|---|']
        L += [f'| {e} | {t or "—"} | {md_escape(l) or "—"} |' for e, t, l in fields]
    if initial:
        L += ['', '### Estado inicial completo', '', ', '.join(f'`{k}={md_escape(v)}`' for k, v in initial.items())]
    return '\n'.join(L) + '\n'


# ---------------------------------------------------------------- varios canales (app, web, ...)

def norm_val(v):
    """'/mis-equipos', 'mis_equipos' y 'Mis equipos' cuentan como el mismo valor."""
    return re.sub(r'[\s/_.-]+', '_', str(v).strip('/ ')).casefold()


ADMIN_ROLE_NAMES = {'admin', 'erp', 'winui', 'backoffice', 'desktop', 'escritorio', 'administracion', 'administración'}


def channel_role(name, role=None):
    if role:
        return 'admin' if role.lower().startswith('admin') else 'cliente'
    return 'admin' if name.lower() in ADMIN_ROLE_NAMES else 'cliente'


def channels_report(chans, min_count=1):
    """chans: [(nombre, ruta, sources, rol)]; rol 'cliente' (app, web…) o 'admin' (WinUI, ERP…).

    Los canales cliente se comparan entre sí (mismos procesos, pequeñas diferencias). Los de
    administración no repiten esos procesos: administran lo que generan los clientes, así que se
    cruzan contra los estados y variables de los clientes y se listan aparte.
    """
    names = [c[0] for c in chans]
    role = {c[0]: c[3] for c in chans}
    clients = [n for n in names if role[n] == 'cliente'] or names
    admins = [n for n in names if role[n] == 'admin' and n not in clients]
    data = {}
    for name, path, src, _ in chans:
        initial, values, actions, fields = extract_flow(src)
        acts = {}
        for an, eff in actions:  # mismo handler visto en la vista y en el ViewModel: un solo renglón
            acts[an] = eff if an not in acts else (acts[an] if eff in acts[an] else f'{acts[an]} · {eff}')
        data[name] = {'path': path, 'role': role[name], 'initial': initial, 'values': values,
                      'actions': acts, 'fields': fields, 'texts': extract_texts(src)}

    def label(n):
        return f'{n} (admin)' if n in admins else n

    def cell_vals(name, key, exclusive):
        vals = data[name]['values'].get(key)
        if not vals:
            return '—'
        return ', '.join(f'**`{v}`**' if norm_val(v) in exclusive else f'`{v}`' for v in sorted(vals, key=str))

    def table_head(first, cols, last=None):
        h = f'| {first} | ' + ' | '.join(label(n) for n in cols) + ' |' + (f' {last} |' if last else '')
        s = '|---' * (len(cols) + 1 + (1 if last else 0)) + '|'
        return [h, s]

    L = ['', '## Comparación por canal', '',
         '> Equivalencias por nombre exacto (normalizado: `/mis-equipos` = `mis_equipos`). Pantallas o acciones',
         '> que se llaman distinto en cada canal aparecen como exclusivas: emparejarlas a mano en «00 - Matriz de canales».',
         '> En **negritas**, los valores que solo tiene ese canal (en un canal admin: los que ningún cliente usa).', '',
         '| Canal | Rol | Mockup | Textos | Variables con estados | Acciones | Campos |', '|---|---|---|---|---|---|---|']
    for n in names:
        d = data[n]
        multi = sum(1 for k, v in d['values'].items() if len(v) >= 2 or _is_nav(k))
        L.append(f"| {n} | {'administración' if n in admins else 'cliente'} | "
                 f"`{md_escape(os.path.basename(os.path.normpath(d['path'])))}` | {len(d['texts'])} | {multi} | "
                 f"{len(d['actions'])} | {len(d['fields'])} |")

    # Variables: clientes comparados entre sí; admin como columna extra
    keys = set()
    for n in names:
        keys |= {k for k, v in data[n]['values'].items() if len(v) >= 2 or _is_nav(k)}
    per = {k: {n: {norm_val(v) for v in data[n]['values'].get(k, {})} for n in names} for k in keys}
    rows = {'nav': [], 'other': []}
    for k in sorted(keys):
        p = per[k]
        present = [n for n in clients if p[n]]
        if not present:
            state = 'solo admin'
        elif len(present) == 1 and len(clients) > 1:
            state = f'solo {present[0]}'
        elif all(p[n] == p[present[0]] for n in present) and len(present) == len(clients):
            state = 'igual'
        else:
            state = 'difiere'
        union_clients = set().union(*(p[n] for n in clients))
        excl = {}
        for n in clients:
            excl[n] = p[n] - set().union(*(p[m] for m in clients if m != n)) if len(present) > 1 else set()
        for n in admins:
            excl[n] = p[n] - union_clients if union_clients else set()
        if admins and any(excl[n] for n in admins) and present:
            state += ' · admin agrega estados'
        cells = ' | '.join(cell_vals(n, k, excl[n]) for n in clients + admins)
        rows['nav' if _is_nav(k) else 'other'].append(f'| `{md_escape(k)}` | {cells} | {state} |')
    cols = clients + admins
    for title, key in (('Navegación y escenarios por canal', 'nav'), ('Variables con estados por canal', 'other')):
        if rows[key]:
            L += ['', f'### {title}', ''] + table_head('Variable', cols, 'Estado') + rows[key]

    # Acciones y campos: solo entre clientes (admin va en su propia sección)
    all_actions = sorted(set().union(*(data[n]['actions'].keys() for n in clients)))
    if all_actions and len(clients) > 1:
        L += ['', '### Acciones por canal (clientes)', ''] + table_head('Handler', clients, 'Nota')
        for a in all_actions:
            effs = {n: data[n]['actions'].get(a) for n in clients}
            marks = ' | '.join('✓' if effs[n] else '—' for n in clients)
            got = [e for e in effs.values() if e]
            note = 'efecto distinto' if len(got) > 1 and len({norm_val(e) for e in got}) > 1 else ''
            if note:
                note += ': ' + ' / '.join(f'{n}: {md_escape(effs[n])}' for n in clients if effs[n])
            L.append(f'| `{md_escape(a)}` | {marks} | {note} |')
    fmap = {}
    for n in clients:
        for el, typ, lab in data[n]['fields']:
            fmap.setdefault(norm_val(lab or el), {})[n] = f'{el}{":" + typ if typ else ""}'
    if fmap and len(clients) > 1:
        L += ['', '### Campos de formulario por canal (clientes)', ''] + table_head('Campo', clients)
        for f in sorted(fmap):
            L.append(f'| {md_escape(f)} | ' + ' | '.join(fmap[f].get(n, '—') for n in clients) + ' |')

    # Textos exclusivos entre clientes
    norm_t = {n: {norm_text(t): t for t, c in data[n]['texts'].items() if c >= min_count} for n in names}
    if len(clients) > 1:
        shared = set.intersection(*(set(norm_t[n]) for n in clients))
        L += ['', '### Textos (clientes)', '', f'- En todos los canales cliente: {len(shared)}']
        excl_t = {n: sorted(norm_t[n][k] for k in norm_t[n] if all(k not in norm_t[m] for m in clients if m != n))
                  for n in clients}
        L += [f'- Solo en {n}: {len(excl_t[n])}' for n in clients]
        for n in clients:
            if excl_t[n]:
                L += ['', f'#### Solo en {n}', ''] + [f'- {md_escape(t)}' for t in excl_t[n]]

    # Administración
    for a in admins:
        d = data[a]
        L += ['', f'## Administración — {a}', '',
              '> No repite los procesos de los clientes: administra lo que generan. Cruzar contra entidades y',
              '> estados (00 §5 y §6 de flujo-backend.md), no pantalla contra pantalla.']
        # Cruce por valor: la variable puede llamarse distinto (InvitationStatus vs status)
        client_index = {}
        for n in clients:
            for ck, cvals in data[n]['values'].items():
                for cv in cvals:
                    client_index.setdefault(norm_val(cv), set()).add(f'{n}.{ck}')
        rows_a = []
        for k in sorted(d['values']):
            if len(d['values'][k]) < 2 or _is_nav(k):  # las pantallas de admin son propias por naturaleza
                continue
            for v in sorted(d['values'][k], key=str):
                where = sorted(client_index.get(norm_val(v), ()))
                rows_a.append(f"| `{md_escape(k)}` | `{md_escape(v)}` | "
                              + (', '.join(f'`{w}`' for w in where[:4]) if where else '**ningún cliente** — lo asigna o lo ve solo administración')
                              + ' |')
        if rows_a:
            L += ['', '### Estados de administración contra los clientes', '',
                  '| Variable (admin) | Valor | En clientes como |', '|---|---|---|'] + rows_a
        shared_vars = sorted(k for k in keys if per[k][a] and any(per[k][n] for n in clients))
        if shared_vars:
            L += ['', '### Variables compartidas con los clientes', '', ', '.join(f'`{k}`' for k in shared_vars)]
        if d['actions']:
            L += ['', '### Acciones', '', '| Acción | Efecto |', '|---|---|']
            L += [f'| `{md_escape(n)}` | {md_escape(e)} |' for n, e in d['actions'].items()]
        if d['fields']:
            L += ['', '### Campos', '', '| Elemento | Tipo / página | Etiqueta |', '|---|---|---|']
            L += [f'| {e} | {t or "—"} | {md_escape(lb) or "—"} |' for e, t, lb in d['fields']]
        only_admin_t = sorted(norm_t[a][k] for k in norm_t[a] if all(k not in norm_t[n] for n in clients))
        if only_admin_t:
            L += ['', f'### Textos solo en {a} ({len(only_admin_t)})', ''] + [f'- {md_escape(t)}' for t in only_admin_t]
    return '\n'.join(L) + '\n', data


# ---------------------------------------------------------------- reporte

def md_escape(s):
    return str(s).replace('|', '\\|').replace('\n', ' ')


def fmt_hits(hits, limit=3):
    seen = []
    for h in hits:
        tag = f"`{h['key']}` ({h['file']})"
        if tag not in seen:
            seen.append(tag)
    more = f' +{len(seen) - limit}' if len(seen) > limit else ''
    return ', '.join(seen[:limit]) + more


def report(args, sources, texts, colors, fonts, cmp_data, tokens, entries):
    L = []
    name = os.path.basename(os.path.normpath(args.mockup))
    L.append(f'# Inventario del mockup — `{name}`')
    L.append('')
    L.append(f'- Fuentes leídas del mockup: {len(sources)}')
    if cmp_data:
        L.append(f'- Modo delta contra: `{args.compare}`')
    L.append(f'- Textos: {len(texts)} · Colores: {len(colors)} · Fuentes: {", ".join(sorted(fonts)) or "—"}')
    if args.tokens:
        real = [t for t in tokens if t['line']]
        L.append(f'- Tokens del proyecto: {len(real)} ({len({t["file"] for t in real})} archivos) + blanco/negro')
    if args.i18n:
        L.append(f'- Entradas de idioma del proyecto: {len(entries)} ({len({e["file"] for e in entries})} archivos)')
    L.append('')
    L.append('> Heurístico: orienta la lectura del código, no la reemplaza. Confirmar cada fila contra el archivo citado.')

    show_texts, show_colors = texts, colors
    if cmp_data:
        old_t, old_c, old_f = cmp_data
        show_texts = {k: v for k, v in texts.items() if k not in old_t}
        show_colors = {k: v for k, v in colors.items() if k not in old_c}
        gone_t = sorted(k for k in old_t if k not in texts)
        gone_c = sorted(k for k in old_c if k not in colors)
        L += ['', '## Delta contra el mockup anterior', '',
              f'- Textos nuevos: {len(show_texts)} · textos que ya no están: {len(gone_t)}',
              f'- Colores nuevos: {len(show_colors)} · colores que ya no están: {len(gone_c)}',
              f'- Fuentes nuevas: {", ".join(sorted(set(fonts) - set(old_f))) or "—"} · '
              f'quitadas: {", ".join(sorted(set(old_f) - set(fonts))) or "—"}']
        if gone_t:
            L += ['', '### Textos que ya no están', ''] + [f'- {md_escape(t)}' for t in gone_t]
        if gone_c:
            L += ['', '### Colores que ya no están', '', ', '.join(f'`{c}`' for c in gone_c)]

    show_texts = {k: v for k, v in show_texts.items() if v >= args.min_count}
    trows = match_texts(show_texts, entries)
    L += ['', '## Textos' + (' nuevos' if cmp_data else ''), '']
    if args.i18n:
        order = {'nuevo': 0, 'parecido': 1, 'existe': 2}
        trows.sort(key=lambda r: (order.get(r['state'], 3), -r['count'], r['text']))
        L += ['| Texto | Veces | Estado | Llave en el proyecto |', '|---|---|---|---|']
        for r in trows:
            L.append(f"| {md_escape(r['text'])} | {r['count']} | {r['state']} | {fmt_hits(r['hits']) or '—'} |")
    else:
        L += ['| Texto | Veces |', '|---|---|']
        for r in trows:
            L.append(f"| {md_escape(r['text'])} | {r['count']} |")

    crows = match_colors(show_colors, tokens, args.de_exact, args.de_near)
    L += ['', '## Colores' + (' nuevos' if cmp_data else ''), '']
    if args.tokens:
        L += ['| Color | Veces | Estado | Token más cercano | ΔE | Dónde |', '|---|---|---|---|---|---|']
        for r in crows:
            t = r['token']
            if t:
                name = f"`{t['name']}`" if t['name'] else '(sin nombre)'
                hexa = t['hex'] + ('' if t['alpha'] == 'ff' else f"@{t['alpha']}")
                L.append(f"| `{r['color']}` | {r['count']} | {r['state']} | {name} `{hexa}` | {r['de']:.1f} | {md_escape(t['file'])}:{t['line']} |")
            else:
                L.append(f"| `{r['color']}` | {r['count']} | — | — | — | — |")
    else:
        L += ['| Color | Veces |', '|---|---|']
        for r in crows:
            L.append(f"| `{r['color']}` | {r['count']} |")

    L += ['', '## Fuentes', '']
    for f, c in sorted(fonts.items(), key=lambda kv: -kv[1]):
        L.append(f'- {f} ({c})')
    return '\n'.join(L) + '\n', trows, crows


def main():
    ap = argparse.ArgumentParser(description='Inventario de textos, colores y fuentes de un mockup.')
    ap.add_argument('mockup', nargs='?')
    ap.add_argument('--channel', action='append', default=[], metavar='NOMBRE[:rol]=RUTA',
                    help='Modo flujo con varios canales del mismo proyecto (repetir: --channel app=… --channel web=…)')
    ap.add_argument('--compare')
    ap.add_argument('--tokens', nargs='+', default=[])
    ap.add_argument('--i18n', nargs='+', default=[])
    ap.add_argument('--de-exact', type=float, default=1.5)
    ap.add_argument('--de-near', type=float, default=6.0)
    ap.add_argument('--min-count', type=int, default=1)
    ap.add_argument('--include-vendor', action='store_true')
    ap.add_argument('--flow', action='store_true', help='Agrega navegación, estados, acciones y campos (modo flujo)')
    ap.add_argument('--root', help='Raiz para mostrar rutas relativas (default: raiz comun de --tokens)')
    ap.add_argument('--out')
    ap.add_argument('--json')
    args = ap.parse_args()

    if args.channel:
        return main_channels(args)
    if not args.mockup:
        ap.error('falta <mockup> (o usa --channel nombre=ruta)')
    sources = load_mockup(args.mockup, args.include_vendor)
    texts, colors, fonts = extract_texts(sources), extract_colors(sources), extract_fonts(sources)
    cmp_data = None
    if args.compare:
        old = load_mockup(args.compare, args.include_vendor)
        cmp_data = (extract_texts(old), extract_colors(old), extract_fonts(old))
    tokens = load_tokens(args.tokens) if args.tokens else []
    if tokens:
        files = sorted({t['file'] for t in tokens if t['line']})
        if files:
            root = args.root or (os.path.dirname(files[0]) if len(files) == 1 else os.path.commonpath(files))
            for t in tokens:
                if t['line']:
                    t['file'] = os.path.relpath(t['file'], root).replace('\\', '/')
    entries = load_i18n(args.i18n) if args.i18n else []

    md, trows, crows = report(args, sources, texts, colors, fonts, cmp_data, tokens, entries)
    flow = None
    if args.flow:
        flow = extract_flow(sources)
        md += flow_report(*flow) + quantity_report(texts)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(md)
        print(f'reporte -> {args.out} ({len(trows)} textos, {len(crows)} colores)')
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        print(md)
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as f:
            data = {'texts': trows, 'colors': crows, 'fonts': fonts}
            if flow:
                initial, values, actions, fields = flow
                data['flow'] = {'initial': initial, 'values': {k: sorted(v) for k, v in values.items()},
                                'actions': actions, 'fields': fields}
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
    return 0


def main_channels(args):
    chans = []
    for spec in args.channel:
        if '=' not in spec:
            print(f'--channel espera nombre=ruta, llegó: {spec}', file=sys.stderr)
            return 1
        name, path = spec.split('=', 1)
        name, _, role = name.strip().partition(':')
        chans.append((name, path.strip(), load_mockup(path.strip(), args.include_vendor), channel_role(name, role or None)))
    if len(chans) < 2:
        print('Aviso: con un solo canal la comparación no aporta; usa --flow.', file=sys.stderr)
    md, data = channels_report(chans, args.min_count)
    md = f'# Inventario por canal — {" · ".join(c[0] for c in chans)}\n' + md
    if args.flow:
        for name, _, src, _ in chans:
            md += flow_report(*extract_flow(src)).replace('## Flujo (heurístico)', f'## Flujo — {name}', 1)
            md += quantity_report(data[name]['texts'])
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(md)
        print(f'reporte -> {args.out} ({len(chans)} canales)')
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        print(md)
    if args.json:
        out = {n: {'path': d['path'], 'initial': d['initial'],
                   'values': {k: sorted(v) for k, v in d['values'].items()},
                   'actions': d['actions'], 'fields': d['fields'], 'texts': d['texts']} for n, d in data.items()}
        with open(args.json, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=2, ensure_ascii=False, default=str)
    return 0


if __name__ == '__main__':
    sys.exit(main())
