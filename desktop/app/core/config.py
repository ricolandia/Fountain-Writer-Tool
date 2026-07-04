from PySide6.QtCore import QSettings, QByteArray

APP_NAME = "Fountain Writer"
ORG_NAME = "FountainWriter"

class Config:
    def __init__(self):
        self._settings = QSettings(ORG_NAME, APP_NAME)

    def get_theme(self):
        return self._settings.value("theme", "light")

    def set_theme(self, mode):
        self._settings.setValue("theme", mode)

    def get_geometry(self):
        return self._settings.value("geometry", None)

    def set_geometry(self, value):
        self._settings.setValue("geometry", value)

    def get_sidebar_visible(self):
        return self._settings.value("sidebar_visible", True, type=bool)

    def set_sidebar_visible(self, visible):
        self._settings.setValue("sidebar_visible", visible)

    def get_last_dir(self):
        return self._settings.value("last_dir", "")

    def set_last_dir(self, path):
        self._settings.setValue("last_dir", path)

    def get_window_state(self):
        return self._settings.value("window_state", None)

    def set_window_state(self, state):
        if state:
            self._settings.setValue("window_state", QByteArray(state))

    def get_last_file(self):
        return self._settings.value("last_file", "")

    def set_last_file(self, path):
        self._settings.setValue("last_file", path)

    def get_language(self):
        return self._settings.value("language", "pt-BR")

    def set_language(self, lang):
        self._settings.setValue("language", lang)

    def is_language_remembered(self):
        return self._settings.value("language_remembered", False, type=bool)
