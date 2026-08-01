"""
Project metadata — characters, locations, beats, etc.
Stored as .meta JSON alongside the .fountain file.
"""

import json
import os
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class Character:
    name: str = ""
    age: str = ""
    archetype: str = ""
    physical: str = ""
    personality: str = ""
    biography: str = ""
    goal: str = ""
    fear: str = ""
    notes: str = ""
    color: str = "#569cd6"
    auto_detected: bool = False


@dataclass
class Location:
    name: str = ""
    interior: bool = True
    category: str = ""
    description: str = ""
    notes: str = ""
    auto_detected: bool = False


@dataclass
class Beat:
    title: str = ""
    description: str = ""
    act: str = "Ato 1"
    plotline: str = ""
    color: str = "#569cd6"
    scene_ref: str = ""
    order: int = 0
    auto_detected: bool = False


@dataclass
class Relationship:
    char1: str = ""
    char2: str = ""
    rel_type: str = ""
    description: str = ""
    color: str = "#569cd6"


@dataclass
class ProjectMeta:
    characters: list[Character] = field(default_factory=list)
    locations: list[Location] = field(default_factory=list)
    beats: list[Beat] = field(default_factory=list)
    relationships: list[Relationship] = field(default_factory=list)
    compile_flags: dict[str, bool] = field(default_factory=dict)

    @staticmethod
    def path_for(fountain_path: str) -> str:
        base, _ = os.path.splitext(fountain_path)
        return base + ".meta"

    def save(self, fountain_path: str):
        fp = self.path_for(fountain_path)
        data = {
            "characters": [asdict(c) for c in self.characters],
            "locations": [asdict(l) for l in self.locations],
            "beats": [asdict(b) for b in self.beats],
            "relationships": [asdict(r) for r in self.relationships],
            "compile_flags": self.compile_flags,
        }
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    @staticmethod
    def load(fountain_path: str) -> "ProjectMeta":
        fp = ProjectMeta.path_for(fountain_path)
        try:
            with open(fp, encoding="utf-8") as f:
                data = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return ProjectMeta()

        chars = [Character(**c) for c in data.get("characters", [])]
        locs = [Location(**l) for l in data.get("locations", [])]
        beats = [Beat(**b) for b in data.get("beats", [])]
        rels = [Relationship(**r) for r in data.get("relationships", [])]
        cflags = data.get("compile_flags", {})
        return ProjectMeta(characters=chars, locations=locs,
                           beats=beats, relationships=rels,
                           compile_flags=cflags)

    def get_character_names(self) -> list[str]:
        return sorted([c.name.upper() for c in self.characters if c.name])

    def get_location_names(self) -> list[str]:
        return sorted([l.name for l in self.locations if l.name])

    def get_beats_by_act(self) -> dict[str, list[Beat]]:
        acts: dict[str, list[Beat]] = {}
        for b in sorted(self.beats, key=lambda x: x.order):
            acts.setdefault(b.act or "Ato 1", []).append(b)
        return acts
