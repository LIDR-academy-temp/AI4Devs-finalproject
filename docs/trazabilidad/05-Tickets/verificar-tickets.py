"""Cruza el documento de tickets contra el backlog. Uso: verificar-tickets.py TICKETS BACKLOG"""
import re
import sys

t = open(sys.argv[1], encoding="utf-8").read()
tl = t.splitlines()
bl = open(sys.argv[2], encoding="utf-8").read().splitlines()
ok = True


def falla(msg):
    global ok
    ok = False
    print("  FALLA:", msg)


# Criterios del backlog
crit = {}
for l in bl:
    m = re.match(r"^\| (HU-\d\d)\.CA-(\d+) \|", l)
    if m:
        crit.setdefault(m.group(1), set()).add(int(m.group(2)))
total_crit = sum(len(v) for v in crit.values())
print("criterios en el backlog:", total_crit, {h: len(v) for h, v in sorted(crit.items())})

# Tickets
tk = {}
for l in tl:
    m = re.match(r"^\| (HU-\d\d\.\d+|H-\d+) \|", l)
    if not m:
        continue
    c = [x.strip() for x in l.split("|")][1:-1]
    if len(c) != 6:
        continue
    ident, titulo, tipo, col4, dep, talla = c
    deps = re.findall(r"HU-\d\d\.\d+|H-\d+", dep)
    her = [int(x) for x in re.findall(r"\d+", col4)] if ident.startswith("HU") else []
    if ident in tk:
        falla("ticket repetido " + ident)
    tk[ident] = dict(tipo=tipo, her=her, deps=deps, talla=talla)

hist = [k for k in tk if k.startswith("HU")]
hab = [k for k in tk if k.startswith("H-")]
tallas = {s: sum(v["talla"] == s for v in tk.values()) for s in "SML"}
print("tickets:", len(tk), "| de historia", len(hist), "| habilitación", len(hab), "| tallas", tallas)
tipos = {}
for v in tk.values():
    tipos[v["tipo"]] = tipos.get(v["tipo"], 0) + 1
print("tipos:", tipos)

# Dependencias existen
for k, v in tk.items():
    for d in v["deps"]:
        if d not in tk:
            falla(f"{k} depende de {d}, que no existe")

# Tramos por nivel y ciclos
nivel = {}


def niv(k, pila=()):
    if k in pila:
        falla("ciclo: " + " -> ".join(pila + (k,)))
        return 0
    if k not in nivel:
        nivel[k] = 1 + max((niv(d, pila + (k,)) for d in tk[k]["deps"] if d in tk), default=-1)
    return nivel[k]


for k in tk:
    niv(k)
calc = {}
for k, n in nivel.items():
    calc.setdefault(n, set()).add(k)
print("tramos calculados:", len(calc), [len(calc[n]) for n in sorted(calc)])

# Tabla de tramos del documento
doc = {}
for l in tl:
    m = re.match(r"^\| (\d+) \| ((?:HU-|H-)[^|]+) \| (\d+) \|", l)
    if m:
        ids = set(re.findall(r"HU-\d\d\.\d+|H-\d+", m.group(2)))
        doc[int(m.group(1))] = ids
        if len(ids) != int(m.group(3)):
            falla(f"tramo {m.group(1)}: lista {len(ids)} y dice {m.group(3)}")
if doc != calc:
    for n in sorted(set(doc) | set(calc)):
        if doc.get(n) != calc.get(n):
            falla(f"tramo {n}: documento {sorted(doc.get(n, []))} | calculado {sorted(calc.get(n, []))}")
else:
    print("tabla de tramos = niveles calculados")

# Reglas de orden (ronda 3): lo que una Definition of Done exige debe existir antes
def ancestros(k, visto=None):
    visto = set() if visto is None else visto
    for d in tk[k]["deps"]:
        if d in tk and d not in visto:
            visto.add(d)
            ancestros(d, visto)
    return visto


anc = {k: ancestros(k) for k in tk}
if "HU-02.4" in tk:
    for k, v in tk.items():
        if v["tipo"] == "Endpoint/API" and "HU-02.4" not in anc[k]:
            falla(f"{k} es Endpoint/API y no depende de la matriz de permisos (HU-02.4)")
if "HU-02.1" in tk:
    for k, v in tk.items():
        if v["tipo"] == "Migración/DB" and k != "HU-02.1":
            if k not in anc["HU-02.1"] and "HU-02.1" not in anc[k]:
                falla(f"{k} crea tablas en paralelo a las reglas por rol (HU-02.1): ni antes ni después")
if "H-1" in tk:
    previos = anc["H-1"] | {"H-1"}
    for k in tk:
        if k not in previos and "H-1" not in anc[k]:
            falla(f"{k} no depende de la especificación inicial (H-1) ni la precede")
    if "H-2" not in anc["H-1"]:
        falla("H-1 no depende de H-2 y su Definition of Done exige la integración continua")
print("reglas de orden comprobadas: endpoints tras la matriz, tablas respecto de las reglas por rol, todo tras H-1")

# Camino más largo
def camino(k):
    ds = [d for d in tk[k]["deps"] if d in tk]
    if not ds:
        return [k]
    return max((camino(d) for d in ds), key=len) + [k]


largo = max((camino(k) for k in tk), key=len)
print("camino más largo:", len(largo), " -> ".join(largo))

# Mermaid: aristas = dependencias
i = tl.index("```mermaid")
j = tl.index("```", i + 1)
alias = {}
ar = set()
for l in tl[i + 1:j]:
    for a, nombre in re.findall(r"(\w+)\[((?:HU-\d\d\.\d+|H-\d+))", l):
        alias[a] = nombre
for l in tl[i + 1:j]:
    nodos = re.findall(r"(\w+)(?:\[[^\]]*\])?\s*(?:-->|$)", l.strip())
    nodos = [n for n in re.split(r"\s*-->\s*", re.sub(r"\[[^\]]*\]", "", l.strip())) if n and n != "graph TD"]
    for a, b in zip(nodos, nodos[1:]):
        ar.add((alias.get(a, a), alias.get(b, b)))
esper = {(d, k) for k, v in tk.items() for d in v["deps"]}
if ar != esper:
    falla(f"diagrama: sobran {sorted(ar - esper)} | faltan {sorted(esper - ar)}")
else:
    print("diagrama = dependencias:", len(ar), "aristas")

# Cobertura: completo / en parte / en espera
mp = re.search(r"^### Los (\d+) en parte$", t, re.M)
me = re.search(r"^### Los (\d+) en espera$", t, re.M)
parte_txt = t[mp.end():me.start()]
espera_txt = re.split(r"\n##+ ", t[me.end():])[0]
parte = set(re.findall(r"^\| (HU-\d\d\.CA-\d+) \|", parte_txt, re.M))
espera = set(re.findall(r"^\| (HU-\d\d\.CA-\d+) \|", espera_txt, re.M))
if int(mp.group(1)) != len(parte):
    falla(f"título dice {mp.group(1)} en parte y la tabla trae {len(parte)}")
if int(me.group(1)) != len(espera):
    falla(f"título dice {me.group(1)} en espera y la tabla trae {len(espera)}")
print("en parte:", len(parte), "| en espera:", len(espera), "| completos:", total_crit - len(parte) - len(espera))
if parte & espera:
    falla("criterio en las dos tablas: " + str(parte & espera))

hered = {}
for k in hist:
    hered.setdefault(k[:5], set()).update(tk[k]["her"])
resumen = {}
for h in sorted(crit):
    e = {int(x.split("-")[-1]) for x in espera if x.startswith(h + ".")}
    p = {int(x.split("-")[-1]) for x in parte if x.startswith(h + ".")}
    hd = hered.get(h, set())
    if hd - crit[h]:
        falla(f"{h}: hereda criterios que no existen {sorted(hd - crit[h])}")
    if crit[h] - hd - e:
        falla(f"{h}: criterios sin ticket y sin espera {sorted(crit[h] - hd - e)}")
    if hd & e:
        falla(f"{h}: en espera y heredado a la vez {sorted(hd & e)}")
    if p - hd:
        falla(f"{h}: en parte y no heredado {sorted(p - hd)}")
    resumen[h] = (len(crit[h]), len(crit[h]) - len(p) - len(e), len(p), len(e))
# Tabla resumen del documento
for l in tl:
    m = re.match(r"^\| (HU-\d\d) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|", l)
    if m and tuple(int(x) for x in m.groups()[1:]) != resumen.get(m.group(1)):
        falla(f"tabla de cobertura {m.group(1)}: documento {m.groups()[1:]} | calculado {resumen.get(m.group(1))}")
print("cobertura por historia (total, completos, parte, espera):", resumen)

# Encabezados de historia: «— N criterios»
for h, n in re.findall(r"^### (HU-\d\d) .* — (\d+) criterios", t, re.M):
    if int(n) != len(crit[h]):
        falla(f"encabezado {h} dice {n}, backlog {len(crit[h])}")

# Totales declarados
dec = re.search(r"\*\*Totales de este documento:\*\*(.*?)\n\n", t, re.S).group(1).replace("\n", " ")
print("declarado:", dec.strip())
esperado = [
    f"{len(crit)} historias descompuestas", f"{len(hist)} tickets de historia",
    f"{len(hab)} tickets de habilitación", f"{len(tk)} tickets en total",
    f"{total_crit} criterios heredados", f"{total_crit - len(parte) - len(espera)} quedan",
    f"{len(parte)} solo en parte", f"{len(espera)} esperan",
    f"{tallas['S']} S", f"{tallas['M']} M", f"{len(calc)} tramos",
]
for e in esperado:
    if e not in dec:
        falla("totales: no aparece «" + e + "»")
print("TODO COHERENTE" if ok else "HAY DIFERENCIAS")
