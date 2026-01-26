from pathlib import Path
import yaml
import html


SRC = Path("../plugin_overview.yml")
DST = Path("_build/temp/plugin_overview.txt")

def esc(t: str) -> str:
    # Minimal escaping for safety inside Markdown
    return html.escape(t or "", quote=False)

items = yaml.safe_load(SRC.read_text(encoding="utf-8"))

lines = []

lines.append("|name|functionalities|type|requirements|status|maintainer(s)|Embed link|")
lines.append("|---|---|---|---|---|---|---|")

for it in items:
    name = esc(it.get("name", ""))
    functionalities = it.get("functionalities", "") 
    type = it.get("type", "")
    requirements = it.get("requirements", "")
    status = esc(it.get("status", ""))
    maintainers = it.get("maintainers","")
    url = it.get("embed_link", "")

    
    # Create the card
    lines.append(f"|{name}|{functionalities}|{type}|{requirements}|{status}|{maintainers}|{url}|")
    
DST.parent.mkdir(parents=True, exist_ok=True)
DST.write_text("\n".join(lines), encoding="utf-8")

print(f"✅ gallery.txt generated at {DST}")
