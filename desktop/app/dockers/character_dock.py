from ..core.i18n import _
from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (QDockWidget, QWidget, QVBoxLayout, QHBoxLayout,
                                QListWidget, QPushButton, QLabel, QLineEdit,
                                QTextEdit, QFormLayout, QSplitter, QFrame,
                                QMessageBox, QComboBox)
from PySide6.QtGui import QColor

from ..models.meta import Character


class CharacterDock(QDockWidget):
    changed = Signal()

    def __init__(self, parent=None):
        super().__init__(_('char.title'), parent)
        self.setObjectName("CharacterDock")
        self.setMinimumWidth(320)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(10, 6, 10, 6)

        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Left: list + buttons
        left = QWidget()
        left_layout = QVBoxLayout(left)
        left_layout.setContentsMargins(0, 0, 4, 0)
        left_layout.setSpacing(4)

        self._list = QListWidget()
        self._list.setFrameShape(QListWidget.Shape.NoFrame)
        left_layout.addWidget(self._list, 1)

        btn_row = QHBoxLayout()
        self._btn_add = QPushButton("+")
        self._btn_del = QPushButton("−")
        btn_row.addWidget(self._btn_add)
        btn_row.addWidget(self._btn_del)
        left_layout.addLayout(btn_row)

        # Right: form
        self._form_container = QWidget()
        self._form = QFormLayout(self._form_container)
        self._form.setContentsMargins(4, 0, 0, 0)
        self._form.setSpacing(4)

        self._field_name = QLineEdit()
        self._field_age = QLineEdit()
        self._field_archetype = QLineEdit()
        self._field_physical = QTextEdit()
        self._field_physical.setMaximumHeight(60)
        self._field_personality = QTextEdit()
        self._field_personality.setMaximumHeight(60)
        self._field_biography = QTextEdit()
        self._field_biography.setMaximumHeight(80)
        self._field_goal = QLineEdit()
        self._field_fear = QLineEdit()

        self._form.addRow("Nome:", self._field_name)
        self._form.addRow("Idade:", self._field_age)
        self._form.addRow("Arquétipo:", self._field_archetype)
        self._form.addRow("Física:", self._field_physical)
        self._form.addRow("Personalidade:", self._field_personality)
        self._form.addRow("Biografia:", self._field_biography)
        self._form.addRow("Objetivo:", self._field_goal)
        self._form.addRow("Medo:", self._field_fear)

        splitter.addWidget(left)
        splitter.addWidget(self._form_container)
        splitter.setSizes([140, 180])

        layout.addWidget(splitter)

        self.setWidget(container)

        self._characters: list[Character] = []
        self._updating = False

        self._list.currentRowChanged.connect(self._on_select)
        self._btn_add.clicked.connect(self._add_character)
        self._btn_del.clicked.connect(self._delete_character)

        self._field_name.textChanged.connect(self._on_field_change)
        self._field_age.textChanged.connect(self._on_field_change)
        self._field_archetype.textChanged.connect(self._on_field_change)
        self._field_physical.document().contentsChanged.connect(self._on_field_change)
        self._field_personality.document().contentsChanged.connect(self._on_field_change)
        self._field_biography.document().contentsChanged.connect(self._on_field_change)
        self._field_goal.textChanged.connect(self._on_field_change)
        self._field_fear.textChanged.connect(self._on_field_change)

        self._on_select()

    # ---- API ----
    def set_characters(self, chars: list[Character]):
        self._characters = chars
        self._refresh_list()
        if chars:
            self._list.setCurrentRow(0)
        else:
            self._clear_form()

    def get_characters(self) -> list[Character]:
        return self._characters

    def get_character_names(self) -> list[str]:
        return sorted([c.name.upper() for c in self._characters if c.name])

    # ---- List ----
    def _refresh_list(self):
        self._updating = True
        current = self._list.currentRow()
        self._list.clear()
        for c in self._characters:
            name = c.name if c.name else "(sem nome)"
            self._list.addItem(name.upper())
        if 0 <= current < len(self._characters):
            self._list.setCurrentRow(current)
        self._updating = False

    def _on_select(self, row=None):
        if self._updating:
            return
        if row is not None and 0 <= row < len(self._characters):
            self._load_character(self._characters[row])
        else:
            self._clear_form()

    def _load_character(self, char: Character):
        self._updating = True
        self._field_name.setText(char.name)
        self._field_age.setText(char.age)
        self._field_archetype.setText(char.archetype)
        self._field_physical.setPlainText(char.physical)
        self._field_personality.setPlainText(char.personality)
        self._field_biography.setPlainText(char.biography)
        self._field_goal.setText(char.goal)
        self._field_fear.setText(char.fear)
        self._form_container.setEnabled(True)
        self._updating = False

    def _clear_form(self):
        self._updating = True
        for field in (self._field_name, self._field_age, self._field_archetype,
                      self._field_goal, self._field_fear):
            field.clear()
        for field in (self._field_physical, self._field_personality,
                      self._field_biography):
            field.clear()
        self._form_container.setEnabled(False)
        self._updating = False

    def _add_character(self):
        char = Character(name="Novo Personagem")
        self._characters.append(char)
        self._refresh_list()
        self._list.setCurrentRow(len(self._characters) - 1)
        self._field_name.setFocus()
        self._field_name.selectAll()
        self.changed.emit()

    def _delete_character(self):
        row = self._list.currentRow()
        if row < 0 or row >= len(self._characters):
            return
        char = self._characters[row]
        resp = QMessageBox.question(
            self, "Remover personagem",
            f"Remover '{char.name}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if resp != QMessageBox.StandardButton.Yes:
            return
        del self._characters[row]
        self._refresh_list()
        if self._characters:
            self._list.setCurrentRow(min(row, len(self._characters) - 1))
        else:
            self._clear_form()
        self.changed.emit()

    def _on_field_change(self):
        if self._updating:
            return
        row = self._list.currentRow()
        if row < 0 or row >= len(self._characters):
            return
        char = self._characters[row]
        char.name = self._field_name.text()
        char.age = self._field_age.text()
        char.archetype = self._field_archetype.text()
        char.physical = self._field_physical.toPlainText()
        char.personality = self._field_personality.toPlainText()
        char.biography = self._field_biography.toPlainText()
        char.goal = self._field_goal.text()
        char.fear = self._field_fear.text()
        self._refresh_list()
        self.changed.emit()
