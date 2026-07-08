"""
Export module — HTML and plain text output.
Inspired by Manuskript's exporter/plainText.py
"""

import html as html_mod
from ..models.fountain import LineType, get_line_type

CSS = """
<style>
body { font-family: 'Courier New', Courier, monospace; font-size: 12pt;
       line-height: 1.2; max-width: 800px; margin: 40px auto; padding: 60px 80px;
       background: #fff; color: #111; }
.scene-heading { text-transform: uppercase; font-weight: bold;
                 margin-top: 2em; margin-bottom: 1em; }
.character { text-transform: uppercase; margin-left: 37%; }
.dialogue { margin-left: 20%; margin-right: 20%; margin-bottom: 1em; }
.parenthetical { margin-left: 31%; margin-right: 33%; font-style: italic; }
.action { margin: 1em 0; }
.transition { text-transform: uppercase; text-align: right; margin-top: 2em; }
.center { text-align: center; margin: 1em 0; }
.title { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 0.25em; }
.blank { height: 1em; }
</style>
"""


def export_html(text: str, title: str = "Script") -> str:
    """Convert Fountain text to HTML."""
    lines = []
    lines.append("<!DOCTYPE html><html><head><meta charset='utf-8'>")
    lines.append(f"<title>{html_mod.escape(title)}</title>{CSS}</head><body>")

    prev = LineType.ACTION
    for line in text.split("\n"):
        clean = line.strip()
        if not clean:
            lines.append("<div class='blank'></div>")
            prev = LineType.BLANK
            continue

        ltype = get_line_type(line, prev)
        escaped = html_mod.escape(clean)

        if ltype == LineType.SCENE:
            lines.append(f"<div class='scene-heading'>{escaped}</div>")
        elif ltype == LineType.CHARACTER:
            lines.append(f"<div class='character'>{escaped}</div>")
        elif ltype == LineType.PARENTHETICAL:
            lines.append(f"<div class='parenthetical'>{escaped}</div>")
        elif ltype == LineType.DIALOGUE:
            lines.append(f"<div class='dialogue'>{escaped}</div>")
        elif ltype == LineType.TRANSITION:
            lines.append(f"<div class='transition'>{escaped}</div>")
        elif ltype == LineType.CENTER:
            clean_c = clean.replace(">", "").replace("<", "").strip()
            lines.append(f"<div class='center'>{html_mod.escape(clean_c)}</div>")
        else:
            lines.append(f"<div class='action'>{escaped}</div>")

        prev = ltype

    lines.append("</body></html>")
    return "\n".join(lines)


def export_plain_text(text: str, line_width: int = 72) -> str:
    """Convert Fountain to plain text with proper indentation."""
    import textwrap
    result = []
    prev = LineType.ACTION
    for line in text.split("\n"):
        ltype = get_line_type(line, prev)
        clean = line.strip()
        indent, wrap_w = 0, line_width

        if ltype == LineType.CHARACTER:
            indent, wrap_w = 22, 40
        elif ltype == LineType.DIALOGUE:
            indent, wrap_w = 12, 35
        elif ltype == LineType.PARENTHETICAL:
            indent, wrap_w = 16, 30
        elif ltype == LineType.TRANSITION:
            indent, wrap_w = 45, 15
        elif ltype == LineType.CENTER:
            clean = clean.replace(">", "").replace("<", "").strip()
            indent = 25

        if clean:
            wrapped = textwrap.wrap(clean, width=wrap_w) if clean else [""]
            for wl in (wrapped or [""]):
                result.append(" " * indent + wl)
        else:
            result.append("")

        prev = ltype

    return "\n".join(result)
