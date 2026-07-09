import re
import html as html_mod
from enum import Enum, auto


class LineType(Enum):
    BLANK = auto()
    SCENE = auto()
    CHARACTER = auto()
    DIALOGUE = auto()
    PARENTHETICAL = auto()
    TRANSITION = auto()
    CENTER = auto()
    ACTION = auto()


_RE_SCENE = re.compile(r"^((INT|EXT|EST|I/E)[.\s]|\.)[\w\W]*", re.IGNORECASE)
_RE_TRANS = re.compile(r"^[A-ZÀ-Ú\s]+(TO|PARA):$")
_RE_CHAR = re.compile(r"^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$")
_RE_PAREN = re.compile(r"^\s*\(.*\)\s*$")


def get_line_type(text: str, prev_type: LineType = LineType.ACTION) -> LineType:
    clean = text.strip()
    if not clean:
        return LineType.BLANK
    if clean.startswith(">") and clean.endswith("<"):
        return LineType.CENTER
    if clean.startswith("!"):
        return LineType.ACTION
    if clean.startswith("@"):
        return LineType.CHARACTER
    if clean.startswith(">"):
        return LineType.TRANSITION
    if clean.startswith("."):
        return LineType.SCENE
    if _RE_SCENE.match(clean):
        return LineType.SCENE
    if _RE_TRANS.match(clean):
        return LineType.TRANSITION
    if _RE_CHAR.match(clean) and not _RE_SCENE.match(clean):
        return LineType.CHARACTER
    if _RE_PAREN.match(clean):
        return LineType.PARENTHETICAL
    if prev_type in (LineType.CHARACTER, LineType.PARENTHETICAL, LineType.DIALOGUE):
        return LineType.DIALOGUE
    return LineType.ACTION


def export_fountain_to_html(text: str, title: str = "Script") -> str:
    lines = []
    lines.append("<!DOCTYPE html><html><head><meta charset='utf-8'>")
    lines.append(f"<title>{html_mod.escape(title)}</title></head><body>")
    prev = LineType.ACTION
    for line in text.split("\n"):
        clean = line.strip()
        if not clean:
            lines.append("<br>")
            prev = LineType.BLANK
            continue
        ltype = get_line_type(line, prev)
        escaped = html_mod.escape(clean)
        if ltype == LineType.SCENE:
            lines.append(f"<h3>{escaped}</h3>")
        elif ltype == LineType.CHARACTER:
            lines.append(f"<h4>{escaped}</h4>")
        elif ltype == LineType.PARENTHETICAL:
            lines.append(f"<p><i>{escaped}</i></p>")
        elif ltype == LineType.DIALOGUE:
            lines.append(f"<p>{escaped}</p>")
        elif ltype == LineType.TRANSITION:
            lines.append(f"<h2>{escaped}</h2>")
        elif ltype == LineType.CENTER:
            cc = clean.replace(">", "").replace("<", "").strip()
            lines.append(f"<p style='text-align:center'>{html_mod.escape(cc)}</p>")
        else:
            lines.append(f"<p>{escaped}</p>")
        prev = ltype
    lines.append("</body></html>")
    return "\n".join(lines)
