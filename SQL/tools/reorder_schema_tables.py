"""Topological reorder of CREATE TABLE batches in cuartaquinientos_schema.sql."""
import re
from collections import defaultdict, deque
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "cuartaquinientos_schema.sql"
text = path.read_text(encoding="utf-8-sig")
parts = re.split(r"\r?\nGO\r?\n", text)

def table_name_from_batch(batch: str) -> str | None:
    m = re.search(r"IF OBJECT_ID\(N'([^']+)', N'U'\)", batch)
    if m:
        return m.group(1)
    m = re.match(r"CREATE TABLE \[(\w+)\]\.\[(\w+)\]", batch.strip(), re.I)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    return None

def fk_refs(batch: str) -> set[str]:
    refs = set()
    for m in re.finditer(
        r"REFERENCES \[(\w+)\]\.\[(\w+)\]", batch, re.I
    ):
        refs.add(f"{m.group(1)}.{m.group(2)}")
    return refs

table_batches: dict[str, str] = {}
other_batches: list[str] = []
first_table_idx = None

for i, part in enumerate(parts):
    name = table_name_from_batch(part)
    if name and "CREATE TABLE" in part:
        if first_table_idx is None:
            first_table_idx = i
        table_batches[name] = part
    else:
        other_batches.append((i, part))

if not table_batches:
    raise SystemExit("No table batches found")

names = set(table_batches.keys())
deps: dict[str, set[str]] = {}
for name, batch in table_batches.items():
    deps[name] = {r for r in fk_refs(batch) if r in names and r != name}

in_degree = {n: 0 for n in names}
adj: dict[str, list[str]] = defaultdict(list)
for n, ds in deps.items():
    for d in ds:
        adj[d].append(n)
        in_degree[n] += 1

q = deque(sorted(n for n in names if in_degree[n] == 0))
order: list[str] = []
while q:
    n = q.popleft()
    order.append(n)
    for child in sorted(adj[n]):
        in_degree[child] -= 1
        if in_degree[child] == 0:
            q.append(child)

if len(order) != len(names):
    remaining = names - set(order)
    raise SystemExit(f"Cycle or unresolved FK order; remaining: {sorted(remaining)[:10]}...")

# Rebuild: batches before first table + sorted tables + non-table batches in original order
preamble = parts[:first_table_idx]
tail_non_table = [p for i, p in other_batches if i >= first_table_idx]
# Non-table batches interleaved before first table (schemas, guard)
between = [p for i, p in other_batches if i < first_table_idx]

new_parts = preamble + between + [table_batches[n] for n in order] + tail_non_table
new_text = "\nGO\n".join(new_parts)
if not new_text.endswith("\n"):
    new_text += "\n"
path.write_text(new_text, encoding="utf-8-sig", newline="\r\n")
print(f"Reordered {len(order)} tables")
