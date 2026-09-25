#!/usr/bin/env python3
"""
graph_viz.py  —  Visualizador de impacto SDD
Lee _graph.md y genera _graph_viz.html (vis.js, standalone).

Uso:
  python graph_viz.py                          # genera HTML
  python graph_viz.py --query "sp1,tabla1"     # + analisis de impacto en consola
  python graph_viz.py --graph <ruta>           # ruta alternativa al _graph.md
  python graph_viz.py --output <ruta.html>     # ruta de salida alternativa
"""

import re
import json
import argparse
import sys
from pathlib import Path

# Rutas por defecto (vars.RUTA_GRAPH y misma carpeta para output)
DEFAULT_GRAPH  = Path(r"D:\ProyNet\contextos\.github\ProjectContexts\_graph.md")
DEFAULT_OUTPUT = Path(r"D:\ProyNet\contextos\.github\ProjectContexts\_graph_viz.html")

STATE_COLORS = {
    "ARCHIVADO":            "#9e9e9e",
    "Completado":           "#66bb6a",
    "En progreso":          "#ffa726",
    "ARCHIVADO sin deploy": "#ffcc80",
}
STATE_FONT = {
    "ARCHIVADO":            "#444",
    "Completado":           "#1b5e20",
    "En progreso":          "#e65100",
    "ARCHIVADO sin deploy": "#bf360c",
}


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_graph(text: str) -> dict:
    """Retorna dict: tkt_id -> {domains, state, objects, related}"""
    tickets: dict = {}

    # 1. Tabla principal de tickets
    # Columnas: | Ticket | Dominio | Estado | Artefactos | Contexto |
    row_re = re.compile(
        r'^\|\s*\[\[([^\]]+)\]\][^|]*\|([^|]+)\|([^|]+)\|',
        re.MULTILINE
    )
    for m in row_re.finditer(text):
        tkt_id     = m.group(1).strip()
        doms_raw   = m.group(2)
        state_raw  = m.group(3).strip()

        if tkt_id.lower() in ("ticket", "dominio", "estado"):
            continue

        domains = re.findall(r'\[\[([^\]]+)\]\]', doms_raw)
        state   = next((s for s in STATE_COLORS if state_raw.startswith(s)), "otro")

        tickets.setdefault(tkt_id, {
            "domains": domains,
            "state":   state,
            "objects": [],
            "related": [],
        })

    # 2. Secciones detalladas: ### [[TKT-X]]: titulo
    section_re = re.compile(
        r'###\s+\[\[([^\]]+)\]\][^\n]*\n(.*?)(?=\n---|\n###\s|\Z)',
        re.DOTALL
    )
    for m in section_re.finditer(text):
        tkt_id = m.group(1).strip()
        body   = m.group(2)

        obj_m   = re.search(r'\*\*Objetos clave\*\*:\s*(.+)',  body)
        rel_m   = re.search(r'\*\*Relacionado con\*\*:\s*(.+)', body)
        state_m = re.search(r'\*\*Estado\*\*:\s*(.+)',          body)
        dom_m   = re.search(r'\*\*Dominios\*\*:\s*(.+)',        body)

        objects = re.findall(r'`([^`]+)`',        obj_m.group(1))   if obj_m   else []
        related = re.findall(r'\[\[([^\]]+)\]\]', rel_m.group(1))   if rel_m   else []
        state_s = state_m.group(1).strip()                           if state_m else ""
        state   = next((s for s in STATE_COLORS if s in state_s), None)
        domains = re.findall(r'\[\[([^\]]+)\]\]', dom_m.group(1))   if dom_m   else []

        if tkt_id not in tickets:
            tickets[tkt_id] = {"domains": [], "state": "otro", "objects": [], "related": []}

        if objects: tickets[tkt_id]["objects"] = objects
        if related: tickets[tkt_id]["related"] = related
        if state:   tickets[tkt_id]["state"]   = state
        if domains: tickets[tkt_id]["domains"] = domains

    return tickets


# ---------------------------------------------------------------------------
# Analisis de impacto (CLI)
# ---------------------------------------------------------------------------

def impact_report(tickets: dict, query: str) -> None:
    query_set = {o.strip().lower() for o in query.split(",") if o.strip()}

    hits: dict = {}
    for tkt_id, data in tickets.items():
        for obj in data["objects"]:
            if obj.lower() in query_set:
                hits.setdefault(obj, []).append((tkt_id, data["state"]))

    print("\n=== Analisis de Impacto SDD ===")
    print(f"Objetos consultados: {', '.join(query_set)}\n")

    if not hits:
        print("Sin colisiones — ningun ticket historico registrado toca esos objetos.")
    else:
        for obj, tkts in hits.items():
            print(f"  {obj}:")
            for tkt_id, state in tkts:
                activo = "  <-- ACTIVO" if state == "En progreso" else ""
                print(f"    -> {tkt_id}  [{state}]{activo}")

    # Zonas calientes
    obj_counts: dict = {}
    for data in tickets.values():
        for obj in data["objects"]:
            obj_counts[obj] = obj_counts.get(obj, 0) + 1

    hot = sorted(
        [(o, c) for o, c in obj_counts.items() if c >= 3],
        key=lambda x: -x[1]
    )[:12]

    if hot:
        print("\nZonas calientes del sistema (>=3 tickets):")
        for obj, count in hot:
            marker = "  <-- CONSULTA" if obj.lower() in query_set else ""
            print(f"  {obj}: {count} tickets{marker}")


# ---------------------------------------------------------------------------
# Build vis.js data
# ---------------------------------------------------------------------------

def build_vis_data(tickets: dict) -> tuple:
    nodes, edges = [], []
    tkt_to_id: dict = {}
    obj_to_id: dict = {}
    nid = 1

    for tkt_id, data in tickets.items():
        color      = STATE_COLORS.get(data["state"], "#eeeeee")
        font_color = STATE_FONT.get(data["state"], "#333")
        domain     = data["domains"][0] if data["domains"] else "otros"
        objs_html  = "<br>".join(data["objects"]) if data["objects"] else "<i>sin detalle</i>"
        title = (
            f"<b>{tkt_id}</b><br>"
            f"Estado: {data['state']}<br>"
            f"Dominios: {', '.join(data['domains'])}<br>"
            f"Objetos ({len(data['objects'])}):<br>{objs_html}"
        )
        tkt_to_id[tkt_id] = nid
        nodes.append({
            "id":    nid,
            "label": tkt_id,
            "title": title,
            "group": domain,
            "color": {
                "background": color,
                "border":     "#555",
                "highlight":  {"background": "#fffde7", "border": "#f57f17"},
            },
            "font":  {"size": 11, "color": font_color},
            "shape": "box",
        })
        nid += 1

    for tkt_id, data in tickets.items():
        for obj in data["objects"]:
            if obj not in obj_to_id:
                obj_to_id[obj] = nid
                nodes.append({
                    "id":    nid,
                    "label": obj,
                    "title": obj,
                    "group": "object",
                    "color": {"background": "#bbdefb", "border": "#1565c0"},
                    "font":  {"size": 9, "color": "#0d47a1"},
                    "shape": "diamond",
                })
                nid += 1
            edges.append({
                "from":  tkt_to_id[tkt_id],
                "to":    obj_to_id[obj],
                "color": {"color": "#cccccc", "opacity": 0.5},
                "width": 1,
            })

    seen: set = set()
    for tkt_id, data in tickets.items():
        for rel in data["related"]:
            if rel in tkt_to_id and tkt_id in tkt_to_id:
                key = tuple(sorted([tkt_to_id[tkt_id], tkt_to_id[rel]]))
                if key not in seen:
                    seen.add(key)
                    edges.append({
                        "from":   tkt_to_id[tkt_id],
                        "to":     tkt_to_id[rel],
                        "dashes": True,
                        "color":  {"color": "#888888", "opacity": 0.4},
                        "width":  1,
                    })

    return nodes, edges


# ---------------------------------------------------------------------------
# HTML template
# ---------------------------------------------------------------------------

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>SDD Impact Graph — nesgo</title>
<script src="https://unpkg.com/vis-network@9.1.9/standalone/umd/vis-network.min.js"></script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #1e1e1e; color: #ccc; font-family: 'Segoe UI', sans-serif;
       height: 100vh; display: flex; flex-direction: column; }
#bar { padding: 6px 12px; background: #252526; border-bottom: 1px solid #333;
       display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }
#bar h1 { font-size: 13px; font-weight: 600; color: #ddd; white-space: nowrap; }
input  { padding: 4px 8px; border-radius: 4px; border: 1px solid #555;
         background: #333; color: #ccc; font-size: 12px; width: 220px; }
button { padding: 4px 10px; border-radius: 4px; border: 1px solid #555;
         background: #3a3a3a; color: #ccc; cursor: pointer; font-size: 12px; }
button:hover  { background: #4a4a4a; }
button.active { background: #0e639c; border-color: #1177bb; }
#legend { display: flex; gap: 10px; font-size: 11px; flex-wrap: wrap; }
.dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block;
       margin-right: 3px; vertical-align: middle; }
#stats { font-size: 11px; color: #888; white-space: nowrap; }
#network { flex: 1; }
</style>
</head>
<body>
<div id="bar">
  <h1>SDD Impact Graph</h1>
  <input id="search" placeholder="Buscar TKT u objeto SQL…" oninput="onSearch(this.value)" />
  <button id="btnObj" class="active" onclick="toggleObjects()">Objetos SQL</button>
  <button onclick="network.fit({animation:{duration:500}})">Recentrar</button>
  <div id="legend">
    <span><span class="dot" style="background:#66bb6a"></span>Completado</span>
    <span><span class="dot" style="background:#ffa726"></span>En progreso</span>
    <span><span class="dot" style="background:#9e9e9e"></span>ARCHIVADO</span>
    <span><span class="dot" style="background:#bbdefb;border:1px solid #1565c0"></span>Objeto SQL</span>
  </div>
  <span id="stats"></span>
</div>
<div id="network"></div>
<script>
var RAW_NODES = __NODES__;
var RAW_EDGES = __EDGES__;

var nodes   = new vis.DataSet(RAW_NODES);
var edges   = new vis.DataSet(RAW_EDGES);
var showObj = true;
var origColors = {};
RAW_NODES.forEach(function(n) { origColors[n.id] = n.color; });

var network = new vis.Network(
  document.getElementById("network"),
  { nodes: nodes, edges: edges },
  {
    physics: {
      stabilization: { iterations: 250 },
      barnesHut: { gravitationalConstant: -9000, springLength: 140, damping: 0.2 }
    },
    interaction: { hover: true, tooltipDelay: 150, navigationButtons: true },
    edges: { smooth: { type: "continuous" } },
    nodes: { borderWidth: 1 }
  }
);

document.getElementById("stats").textContent =
  RAW_NODES.filter(function(n){ return n.group !== "object"; }).length + " tickets · " +
  RAW_NODES.filter(function(n){ return n.group === "object"; }).length + " objetos SQL";

function toggleObjects() {
  showObj = !showObj;
  document.getElementById("btnObj").classList.toggle("active", showObj);
  nodes.update(nodes.get()
    .filter(function(n){ return n.group === "object"; })
    .map(function(n){ return { id: n.id, hidden: !showObj }; }));
  edges.update(edges.get().map(function(e) {
    var toN   = nodes.get(e.to);
    var fromN = nodes.get(e.from);
    var isObj = (toN && toN.group === "object") || (fromN && fromN.group === "object");
    return { id: e.id, hidden: (!showObj && isObj) };
  }));
}

function onSearch(val) {
  val = val.toLowerCase().trim();
  if (!val) {
    nodes.update(nodes.get().map(function(n) {
      return { id: n.id, color: origColors[n.id], hidden: (n.group === "object" && !showObj) };
    }));
    return;
  }
  nodes.update(nodes.get().map(function(n) {
    var match = n.label.toLowerCase().includes(val) || ((n.title || "").toLowerCase().includes(val));
    return {
      id:     n.id,
      hidden: !match,
      color:  match ? { background: "#fffde7", border: "#f57f17" } : origColors[n.id]
    };
  }));
}
</script>
</body>
</html>
"""


def generate_html(tickets: dict) -> str:
    nodes, edges = build_vis_data(tickets)
    html = HTML_TEMPLATE.replace("__NODES__", json.dumps(nodes, ensure_ascii=False))
    html = html.replace("__EDGES__", json.dumps(edges, ensure_ascii=False))
    return html


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="SDD graph visualizer")
    parser.add_argument("--graph",  default=str(DEFAULT_GRAPH),  help="Ruta al _graph.md")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Ruta HTML de salida")
    parser.add_argument("--query",  default="",                  help="Objetos SQL a consultar (csv)")
    args = parser.parse_args()

    graph_path = Path(args.graph)
    if not graph_path.exists():
        print(f"ERROR: No se encontro {graph_path}", file=sys.stderr)
        sys.exit(1)

    text    = graph_path.read_text(encoding="utf-8")
    tickets = parse_graph(text)
    print(f"Parsed: {len(tickets)} tickets")

    if args.query:
        impact_report(tickets, args.query)

    html = generate_html(tickets)
    Path(args.output).write_text(html, encoding="utf-8")
    print(f"HTML -> {args.output}")


if __name__ == "__main__":
    main()
