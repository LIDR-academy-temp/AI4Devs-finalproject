import re
from pathlib import Path

path = Path(__file__).resolve().parents[1] / "cuartaquinientos_schema.sql"
text = path.read_text(encoding="utf-8-sig")
parts = re.split(r"\r?\nGO\r?\n", text)
out = []
wrapped = 0
for part in parts:
    stripped = part.strip()
    if not stripped:
        out.append(part)
        continue
    if "IF OBJECT_ID" in stripped and "CREATE TABLE" in stripped:
        out.append(part)
        continue
    m = re.match(r"CREATE TABLE \[(\w+)\]\.\[(\w+)\]", stripped, re.I)
    if m:
        schema, table = m.group(1), m.group(2)
        obj = f"{schema}.{table}"
        wrapped_part = (
            f"IF OBJECT_ID(N'{obj}', N'U') IS NULL\nBEGIN\n{stripped}\nEND"
        )
        out.append(wrapped_part)
        wrapped += 1
    else:
        out.append(part)

new_text = "\nGO\n".join(out)
if not new_text.endswith("\n"):
    new_text += "\n"
path.write_text(new_text, encoding="utf-8-sig", newline="\r\n")
print(f"wrapped {wrapped} CREATE TABLE blocks")
