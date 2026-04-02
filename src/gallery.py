from pathlib import Path
import yaml
import html


SRC = Path("plugin_overview.yml")
DST = Path("_build/temp/plugin_overview.txt")


def esc(t: str) -> str:
    # Minimal escaping for safety inside Markdown
    return html.escape(t or "", quote=False)


items = yaml.safe_load(SRC.read_text(encoding="utf-8"))

lines = []

lines.append("|name|functionalities|type|requirements|status|maintainer(s)|Embed link|")
lines.append("|---|---|---|---|---|---|---|")

for it in items:
    # Use `or ""` not `.get(key, "")` to allow for explicit `null` values in the YAML
    name = esc(it.get("name") or "")
    functionalities = esc(it.get("functionalities") or "")
    plugin_type = esc(it.get("type") or "")
    requirements = esc(it.get("requirements") or "")
    status = esc(it.get("status") or "")
    maintainers = ", ".join(it.get("maintainers") or [])
    url = it.get("embed_link")
    link = f"[Link]({url})" if url else "-"

    lines.append(
        f"|**{name}**|{functionalities}|{plugin_type}"
        f"|{requirements}|{status}|{maintainers}|{link}|"
    )

DST.parent.mkdir(parents=True, exist_ok=True)
DST.write_text("\n".join(lines), encoding="utf-8")

print(f"✅ plugin_overview.txt generated at {DST}")
