from ..core.i18n import _
from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (QDockWidget, QWidget, QVBoxLayout, QHBoxLayout,
                                QListWidget, QPushButton, QLabel, QLineEdit,
                                QTextEdit, QFormLayout, QSplitter, QCheckBox,
                                QMessageBox)

from ..models.meta import Location


class LocationDock(QDockWidget):
    changed = Signal()

    def __init__(self, parent=None):
        super().__init__(_('loc.title'), parent)
        self.setObjectName("LocationDock")
        self.setMinimumWidth(300)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(10, 6, 10, 6)

        splitter = QSplitter(Qt.Orientation.Horizontal)

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

        self._form_container = QWidget()
        self._form_container.setMinimumWidth(180)
        self._form = QVBoxLayout(self._form_container)
        self._form.setContentsMargins(6, 2, 6, 2)
        self._form.setSpacing(6)

        # Name + INT/EXT in a row
        name_row = QHBoxLayout()
        self._field_name = QLineEdit()
        self._field_name.setPlaceholderText("Nome do local")
        name_row.addWidget(self._field_name, 1)
        self._check_interior = QCheckBox("INT")
        self._check_interior.setChecked(True)
        name_row.addWidget(self._check_interior)
        self._form.addLayout(name_row)

        cat_row = QHBoxLayout()
        self._field_category = QLineEdit()
        self._field_category.setPlaceholderText("Category (World, City, Room...)")
        cat_row.addWidget(QLabel("Category:"))
        cat_row.addWidget(self._field_category, 1)
        self._form.addLayout(cat_row)

        from PySide6.QtWidgets import QGroupBox
        desc_group = QGroupBox("Descrição")
        dg_layout = QVBoxLayout(desc_group)
        dg_layout.setContentsMargins(4, 10, 4, 4)
        self._field_desc = QTextEdit()
        self._field_desc.setMaximumHeight(60)
        self._field_desc.setPlaceholderText("Descrição do local...")
        dg_layout.addWidget(self._field_desc)
        self._form.addWidget(desc_group)

        notes_group = QGroupBox("Notas")
        ng_layout = QVBoxLayout(notes_group)
        ng_layout.setContentsMargins(4, 10, 4, 4)
        self._field_notes = QTextEdit()
        self._field_notes.setMaximumHeight(60)
        self._field_notes.setPlaceholderText("Observações...")
        ng_layout.addWidget(self._field_notes)
        self._form.addWidget(notes_group)

        self._form.addStretch()

        splitter.addWidget(left)
        splitter.addWidget(self._form_container)
        splitter.setSizes([140, 160])

        layout.addWidget(splitter)

        self.setWidget(container)

        self._locations: list[Location] = []
        self._updating = False

        self._list.currentRowChanged.connect(self._on_select)
        self._btn_add.clicked.connect(self._add_location)
        self._btn_del.clicked.connect(self._delete_location)

        self._field_name.textChanged.connect(self._on_field_change)
        self._check_interior.toggled.connect(self._on_field_change)
        self._field_category.textChanged.connect(self._on_field_change)
        self._field_desc.document().contentsChanged.connect(self._on_field_change)
        self._field_notes.document().contentsChanged.connect(self._on_field_change)

        self._on_select()

    # ---- API ----
    def set_locations(self, locs: list[Location]):
        self._locations = locs
        self._refresh_list()
        if locs:
            self._list.setCurrentRow(0)
        else:
            self._clear_form()

    def get_locations(self) -> list[Location]:
        return self._locations

    # ---- List ----
    def _refresh_list(self):
        self._updating = True
        current = self._list.currentRow()
        self._list.clear()
        for loc in self._locations:
            name = loc.name if loc.name else "(sem nome)"
            prefix = "INT" if loc.interior else "EXT"
            cat = f" [{loc.category}]" if loc.category else ""
            self._list.addItem(f"{prefix}  {name}{cat}")
        if 0 <= current < len(self._locations):
            self._list.setCurrentRow(current)
        self._updating = False

    def _on_select(self, row=None):
        if self._updating:
            return
        if row is not None and 0 <= row < len(self._locations):
            self._load_location(self._locations[row])
        else:
            self._clear_form()

    def _load_location(self, loc: Location):
        self._updating = True
        self._field_name.setText(loc.name)
        self._field_category.setText(loc.category)
        self._check_interior.setChecked(loc.interior)
        self._field_desc.setPlainText(loc.description)
        self._field_notes.setPlainText(loc.notes)
        self._form_container.setEnabled(True)
        self._updating = False

    def _clear_form(self):
        self._updating = True
        self._field_name.clear()
        self._field_category.clear()
        self._check_interior.setChecked(True)
        self._field_desc.clear()
        self._field_notes.clear()
        self._form_container.setEnabled(False)
        self._updating = False

    def _add_location(self):
        loc = Location(name="Novo Local")
        self._locations.append(loc)
        self._refresh_list()
        self._list.setCurrentRow(len(self._locations) - 1)
        self._field_name.setFocus()
        self._field_name.selectAll()
        self.changed.emit()

    def _delete_location(self):
        row = self._list.currentRow()
        if row < 0 or row >= len(self._locations):
            return
        loc = self._locations[row]
        resp = QMessageBox.question(
            self, "Remover local",
            f"Remover '{loc.name}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if resp != QMessageBox.StandardButton.Yes:
            return
        del self._locations[row]
        self._refresh_list()
        if self._locations:
            self._list.setCurrentRow(min(row, len(self._locations) - 1))
        else:
            self._clear_form()
        self.changed.emit()

    def _on_field_change(self):
        if self._updating:
            return
        row = self._list.currentRow()
        if row < 0 or row >= len(self._locations):
            return
        loc = self._locations[row]
        loc.name = self._field_name.text()
        loc.interior = self._check_interior.isChecked()
        loc.category = self._field_category.text()
        loc.description = self._field_desc.toPlainText()
        loc.notes = self._field_notes.toPlainText()
        self._refresh_list()
        self.changed.emit()
