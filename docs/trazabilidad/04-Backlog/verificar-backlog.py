import re
import sys

b = open(sys.argv[1], encoding="utf-8").read().splitlines()
hu = [l for l in b if re.match(r"^\| HU-\d\d \|", l)]
ca = [l for l in b if re.match(r"^\| HU-\d\d\.CA-\d+ \|", l)]
print("historias", len(hu), "| seccion 4", sum("Sección 4 |" in l for l in hu),
      "| solo listadas", sum("Solo listada |" in l for l in hu))
det = sorted({l[5:7] for l in ca})
print("criterios", len(ca), {h: sum(l.startswith("| HU-" + h + ".") for l in ca) for h in det})
pr = [l[2:13].strip() for l in ca if "[PROPUESTO]" in l]
print("propuestos", len(pr), pr)
pa = [l for l in b if re.match(r"^\| (~~)?PA-B\d(~~)? \|", l)]
print("PA-B", len(pa), "| cerrados", sum(l.startswith("| ~~") for l in pa),
      "| notas", sum(bool(re.match(r"^\| N-\d \|", l)) for l in b))

cubre = {}
for l in hu:
    c = l.split("|")
    cubre[c[1].strip()] = {int(x) for x in re.findall(r"RF-(\d+)", c[3])}
orig = {}
for l in ca:
    h = l[2:7]
    o = l.split("|")[-2]
    orig.setdefault(h, set()).update(int(x) for x in re.findall(r"RF-(\d+)", o))
mat = {}
i = b.index("### De requisito a historia")
j = b.index("### De historia a requisito")
for l in b[i:j]:
    c = [x.strip() for x in l.split("|")]
    for k in (1, 4):
        if len(c) > k + 1 and re.match(r"RF-\d+$", c[k]):
            for h in re.findall(r"HU-\d\d", c[k + 1]):
                mat.setdefault(h, set()).add(int(c[k][3:]))
ok = True
for h in sorted(cubre):
    d1 = cubre[h] ^ mat.get(h, set())
    d2 = orig.get(h, set()) - cubre[h]
    if d1 or d2:
        ok = False
        print(h, "| Cubre y matriz difieren en RF", sorted(d1),
              "| RF citados en criterios y ausentes de Cubre", sorted(d2))
todos = set()
for s in mat.values():
    todos |= s
print("RF con historia en la matriz:", len(todos), "| faltan", [n for n in range(1, 26) if n not in todos])
print("COBERTURA COHERENTE" if ok else "COBERTURA CON DIFERENCIAS")
