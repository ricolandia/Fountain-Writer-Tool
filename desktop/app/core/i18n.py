"""
Internationalization — JSON-based translation loader.
Usage:
    from .i18n import _
    _("app.name")                     # → "Fountain Writer"
    _("scene.count", n=5)             # → "Cenas: 5"
    _("menu.file.new")                # → "Novo"
"""

import json
import os

_LANG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
    "resources", "lang")


class I18n:
    instance = None

    def __init__(self, lang="pt-BR"):
        self._strings = {}
        self._fallback = {}
        self._lang = lang
        self._load()

    def _load(self):
        path = os.path.join(_LANG_DIR, f"{self._lang}.json")
        try:
            with open(path, encoding="utf-8") as f:
                self._strings = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self._strings = {}

        fallback_path = os.path.join(_LANG_DIR, "en.json")
        try:
            with open(fallback_path, encoding="utf-8") as f:
                self._fallback = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            self._fallback = {}

    def get(self, key, **kwargs):
        val = self._strings.get(key)
        if val is None:
            val = self._fallback.get(key)
        if val is None:
            return key
        if kwargs:
            try:
                return val.format(**kwargs)
            except KeyError:
                return val
        return val

    @classmethod
    def init(cls, lang="pt-BR"):
        cls.instance = cls(lang)
        return cls.instance

    @classmethod
    def set_lang(cls, lang):
        if cls.instance:
            cls.instance._lang = lang
            cls.instance._load()


def _(key, **kwargs):
    if I18n.instance is None:
        I18n.init()
    return I18n.instance.get(key, **kwargs)
