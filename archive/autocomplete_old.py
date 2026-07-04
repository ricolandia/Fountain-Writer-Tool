from PySide6.QtCore import Qt, QStringListModel
from PySide6.QtWidgets import QCompleter


class CharacterCompleter(QCompleter):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setCaseSensitivity(Qt.CaseSensitivity.CaseInsensitive)
        self.setFilterMode(Qt.MatchFlag.MatchStartsWith)
        self.setCompletionMode(QCompleter.CompletionMode.PopupCompletion)
        self.setMaxVisibleItems(8)
        self._model = QStringListModel()
        self.setModel(self._model)

    def update_names(self, names: list[str]):
        self._model.setStringList(names)

    def block_completion(self):
        return False
