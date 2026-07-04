"""
Diálogo Tuner — filtra e exibe todo o diálogo de um personagem.
Permite navegar para a cena ou editar inline.
"""

from ..core.i18n import _
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (QDockWidget, QWidget, QVBoxLayout, QHBoxLayout,
                                QComboBox, QLabel, QTextEdit, QListWidget,
                                QListWidgetItem, QPushButton, QSplitter)

from ..models.fountain import LineType, get_character_names, get_line_type


class DialogueTuner(QDockWidget):
    scene_selected = Signal(str)

    def __init__(self, parent=None):
        super().__init__(_('dialogue.title'), parent)
        self.setObjectName("DialogueTuner")
        self.setMinimumWidth(300)

        c = QWidget()
        l = QVBoxLayout(c)
        l.setContentsMargins(4, 4, 4, 4)
        l.setSpacing(4)

        top = QHBoxLayout()
        self._combo = QComboBox()
        self._combo.setPlaceholderText("Selecione um personagem...")
        top.addWidget(QLabel("Personagem:"))
        top.addWidget(self._combo, 1)
        l.addLayout(top)

        self._list = QListWidget()
        self._list.setFrameShape(QListWidget.Shape.NoFrame)
        self._list.setSpacing(2)
        self._list.itemClicked.connect(self._on_item_clicked)
        l.addWidget(self._list, 1)

        self._preview = QTextEdit()
        self._preview.setReadOnly(True)
        self._preview.setMaximumHeight(80)
        self._preview.setPlaceholderText("Contexto da cena...")
        l.addWidget(self._preview)

        self.setWidget(c)

        self._text = ""
        self._dialogue_lines: list[tuple[str, int, str]] = []

        self._combo.currentTextChanged.connect(self._filter)

    def set_text(self, text: str):
        self._text = text
        self._refresh_characters()

    def _refresh_characters(self):
        current = self._combo.currentText()
        names = get_character_names(self._text)
        self._combo.clear()
        for n in names:
            self._combo.addItem(n)
        idx = self._combo.findText(current)
        if idx >= 0:
            self._combo.setCurrentIndex(idx)

    def _filter(self, char_name):
        self._list.clear()
        self._dialogue_lines = []
        self._preview.clear()
        if not char_name:
            return

        prev = LineType.ACTION
        lines = self._text.split("\n")
        for i, line in enumerate(lines):
            t = get_line_type(line, prev)
            if t == LineType.CHARACTER and line.strip().upper() == char_name.upper():
                # Next non-blank, non-paren line is dialogue
                for j in range(i + 1, min(i + 5, len(lines))):
                    t2 = get_line_type(lines[j], t)
                    if t2 == LineType.DIALOGUE:
                        dialogue = lines[j].strip()
                        context = self._get_context(lines, i)
                        self._dialogue_lines.append((dialogue, i, context))
                        item = QListWidgetItem(f"[L{i+1}]  {dialogue[:60]}")
                        item.setData(Qt.ItemDataRole.UserRole, len(self._dialogue_lines) - 1)
                        self._list.addItem(item)
                        break
                    elif t2 == LineType.BLANK or t2 == LineType.PARENTHETICAL:
                        continue
                    else:
                        break
            prev = t

    def _get_context(self, lines, char_line):
        """Get surrounding lines for context."""
        start = max(0, char_line - 3)
        end = min(len(lines), char_line + 4)
        return "\n".join(lines[start:end])

    def _on_item_clicked(self, item):
        idx = item.data(Qt.ItemDataRole.UserRole)
        if idx is None:
            return
        _, char_line, context = self._dialogue_lines[idx]
        self._preview.setPlainText(context)
        self.scene_selected.emit(f"{char_line + 1}.0")



