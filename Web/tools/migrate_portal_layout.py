import re
from pathlib import Path

SKIP = {"LoginPage.tsx", "ForbiddenPage.tsx", "CambiarPasswordPage.tsx", "ValidarPasePage.tsx"}
WIDTH = {"2xl": "2xl", "3xl": "3xl", "4xl": "4xl", "5xl": "5xl"}


def add_import(text: str) -> str:
    if "PortalPageLayout" in text:
        return text

    def repl(m: re.Match[str]) -> str:
        names = m.group(1)
        if "PortalPageLayout" in names:
            return m.group(0)
        return f"import {{ {names.strip()}, PortalPageLayout }} from '../shared/components/admin'"

    return re.sub(
        r"import \{([^}]+)\} from '\.\./shared/components/admin'",
        repl,
        text,
        count=1,
    )


def main_class_to_portal(cls: str) -> str:
    width = "fluid"
    for k, v in WIDTH.items():
        if f"max-w-{k}" in cls:
            width = v
            break
    extras: list[str] = []
    if "space-y-8" in cls:
        extras.append("space-y-8")
    elif "space-y-6" in cls:
        extras.append("space-y-6")
    elif "space-y-4" in cls:
        extras.append("space-y-4")
    if "flex flex-col gap-6" in cls or ("flex" in cls and "gap-6" in cls):
        extras.append("flex flex-col gap-6")
    elif "flex flex-col gap-4" in cls or ("flex" in cls and "gap-4" in cls):
        extras.append("flex flex-col gap-4")
    attr = f' width="{width}"'
    if extras:
        attr += f' className="{" ".join(extras)}"'
    return f"<PortalPageLayout{attr}>"


pages = Path(__file__).resolve().parent.parent / "src" / "pages"
for path in pages.glob("*.tsx"):
    if path.name in SKIP or path.name.startswith("Admin"):
        continue
    text = path.read_text(encoding="utf-8")
    if "<main className=\"mx-auto" not in text:
        continue
    new = add_import(text)
    new = re.sub(
        r"<main className=\"([^\"]+)\">",
        lambda m: main_class_to_portal(m.group(1)),
        new,
    )
    new = new.replace("</main>", "</PortalPageLayout>")
    if new != text:
        path.write_text(new, encoding="utf-8")
        print(path.name)
