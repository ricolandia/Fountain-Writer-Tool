import re
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


_RE_SCENE = re.compile(
    r"^((INT|EXT|EST|I/E)[.\s]|\.)[\w\W]*", re.IGNORECASE)
_RE_TRANS = re.compile(r"^[A-ZÀ-Ú\s]+(TO|PARA):$")
_RE_CHAR = re.compile(r"^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$")
_RE_PAREN = re.compile(r"^\s*\(.*\)\s*$")


def get_line_type(text: str, prev_type: LineType = LineType.ACTION) -> LineType:
    clean = text.strip()
    if not clean:
        return LineType.BLANK
    if clean.startswith(">") and clean.endswith("<"):
        return LineType.CENTER
    # Fountain 1.1 force markers
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


def iter_line_types(text: str):
    prev = LineType.ACTION
    for line in text.split("\n"):
        t = get_line_type(line, prev)
        yield t, line
        prev = t


def iter_scenes(text: str):
    prev = LineType.ACTION
    for i, line in enumerate(text.split("\n"), 1):
        t = get_line_type(line, prev)
        if t == LineType.SCENE:
            clean = line.strip().upper()
            if clean.startswith("."):
                clean = clean[1:]
            label = clean[:28] + "…" if len(clean) > 28 else clean
            yield i, label, f"{i}.0"
        prev = t


def get_character_names(text: str) -> list[str]:
    names = set()
    prev = LineType.ACTION
    for line in text.split("\n"):
        t = get_line_type(line, prev)
        if t == LineType.CHARACTER:
            names.add(line.strip().upper())
        prev = t
    return sorted(names)


def count_words(text: str) -> int:
    return len([p for p in text.split() if p])


def count_chars(text: str) -> int:
    return len(text.rstrip("\n"))


def estimate_pages(text: str) -> int:
    return max(1, text.count("\n") // 55)


def estimate_duration(pages: int) -> str:
    h, m = pages // 60, pages % 60
    if h:
        return f"~{h}h{m:02d}min"
    if m > 1:
        return f"~{m}min"
    return ""
