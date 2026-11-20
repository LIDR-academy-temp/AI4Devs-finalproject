import re
import sys

p = open(sys.argv[1], encoding="utf-8").read().splitlines()


def filas(patron):
    return sum(bool(re.match(patron, l)) for l in p)


i = p.index("### Sale del MVP y queda contemplado")
j = p.index("### Fuera del MVP, explícito")
sale = [l for l in p[i:j] if l.startswith("| ") and not l.startswith("| Qué sale") and not l.startswith("|---")]
print("RF", filas(r"^\| RF-\d+ \|"), "| RNF", filas(r"^\| RNF-\d+ \|"), "| R", filas(r"^\| R-\d \|"),
      "| M", filas(r"^\| M-\d \|"), "| RA", filas(r"^\| RA-\d+ \|"), "| sale del MVP", len(sale),
      "| S", filas(r"^\| S-\d \|"), "| PA-P", filas(r"^\| PA-P\d \|"))
txt = " ".join(p)
dec = sorted({int(x) for x in re.findall(r"D-(\d+)", txt) if int(x) >= 42})
print("decisiones 42+ citadas:", dec)
print("ausentes entre 42 y 64:", [n for n in range(42, 65) if n not in dec])
print("linea de totales:", [l for l in p if "riesgos aceptados ·" in l])
print("lineas:", len(p))
