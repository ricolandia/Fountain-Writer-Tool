"""
Reference system — cross-linking entities within text.
Inspired by Manuskript's {C:5}, {T:42} reference pattern.

Our format: {CHAR:NAME} {LOC:NAME} {BEAT:TITLE}
"""

import re

_RE_CHAR = re.compile(r"\{CHAR:([^}]+)\}", re.IGNORECASE)
_RE_LOC  = re.compile(r"\{LOC:([^}]+)\}", re.IGNORECASE)
_RE_BEAT = re.compile(r"\{BEAT:([^}]+)\}", re.IGNORECASE)


def find_references(text: str) -> list[tuple[str, str, int, int]]:
    """Return list of (type, name, start, end) for all references found."""
    refs = []
    for m in _RE_CHAR.finditer(text):
        refs.append(("CHAR", m.group(1), m.start(), m.end()))
    for m in _RE_LOC.finditer(text):
        refs.append(("LOC", m.group(1), m.start(), m.end()))
    for m in _RE_BEAT.finditer(text):
        refs.append(("BEAT", m.group(1), m.start(), m.end()))
    return refs


def find_references_in_scene(text: str) -> list[tuple[str, str]]:
    """Simplified: return list of (type, name) for a scene's text."""
    refs = set()
    for m in _RE_CHAR.finditer(text):
        refs.add(("CHAR", m.group(1)))
    for m in _RE_LOC.finditer(text):
        refs.add(("LOC", m.group(1)))
    for m in _RE_BEAT.finditer(text):
        refs.add(("BEAT", m.group(1)))
    return sorted(refs)


def has_references(text: str) -> bool:
    return bool(_RE_CHAR.search(text) or _RE_LOC.search(text) or _RE_BEAT.search(text))
