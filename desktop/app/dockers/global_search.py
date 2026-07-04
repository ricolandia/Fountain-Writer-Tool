"""
Global Search — unified search across all entities.
Inspired by Manuskript's search system.
"""

from PySide6.QtCore import Qt, Signal, QTimer
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (QDockWidget, QWidget, QVBoxLayout, QHBoxLayout,
                                QLabel, QLineEdit, QListWidget, QListWidgetItem,
                                QFrame, QCheckBox, QPushButton)

from ..core.i18n import _
from ..models.fountain import iter_scenes, get_character_names, iter_line_types, LineType


class GlobalSearch(QDockWidget):
    navigate_requested = Signal(str)

    def __init__(self, parent=None):
        super().__init__(_("search.title"), parent)
        self.setObjectName("GlobalSearch")
        self.setMinimumWidth(280)

        c = QWidget()
        l = QVBoxLayout(c)
        l.setContentsMargins(6, 4, 6, 4)
        l.setSpacing(4)

        # Search input
        self._input = QLineEdit()
        self._input.setPlaceholderText(_("search.placeholder"))
        self._input.textChanged.connect(self._on_change)
        l.addWidget(self._input)

        # Filters row
        filters = QHBoxLayout()
        filters.setSpacing(6)
        self._filter_text = QCheckBox(_("search.text"))
        self._filter_text.setChecked(True)
        self._filter_scenes = QCheckBox(_("search.scenes"))
        self._filter_scenes.setChecked(True)
        self._filter_chars = QCheckBox(_("search.chars"))
        self._filter_chars.setChecked(True)
        self._filter_locs = QCheckBox(_("search.locs"))
        self._filter_locs.setChecked(True)
        self._filter_beats = QCheckBox(_("search.beats"))
        self._filter_beats.setChecked(True)
        filters.addWidget(self._filter_text)
        filters.addWidget(self._filter_scenes)
        filters.addWidget(self._filter_chars)
        filters.addWidget(self._filter_locs)
        filters.addWidget(self._filter_beats)
        l.addLayout(filters)

        # Results
        self._results = QListWidget()
        self._results.setFrameShape(QListWidget.Shape.NoFrame)
        self._results.setWordWrap(True)
        self._results.itemClicked.connect(self._on_result_clicked)
        self._results.setSpacing(1)
        l.addWidget(self._results, 1)

        self.setWidget(c)

        self._scene_navigator = None
        self._right_panel = None
        self._beat_board = None
        self._text_content = ""

        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.timeout.connect(self._search)
        self._input.textChanged.connect(lambda: self._timer.start(200))

    def set_data(self, text, scene_nav, right_panel, beat_board):
        self._text_content = text
        self._scene_navigator = scene_nav
        self._right_panel = right_panel
        self._beat_board = beat_board
        if self._input.text():
            self._search()

    def _on_change(self, text):
        if not text.strip():
            self._results.clear()
            return

    def _search(self):
        query = self._input.text().strip().lower()
        self._results.clear()

        if not query:
            return

        if self._filter_text.isChecked():
            self._search_text(query)
        if self._filter_scenes.isChecked():
            self._search_scenes(query)
        if self._filter_chars.isChecked():
            self._search_chars(query)
        if self._filter_locs.isChecked():
            self._search_locs(query)
        if self._filter_beats.isChecked():
            self._search_beats(query)

        if self._results.count() == 0:
            item = QListWidgetItem(_("search.no_results"))
            item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsSelectable)
            item.setForeground(Qt.GlobalColor.gray)
            self._results.addItem(item)

    def _search_text(self, query):
        lines = self._text_content.split("\n")
        for i, line in enumerate(lines):
            if query in line.lower():
                text = line.strip()[:80]
                if text:
                    item = QListWidgetItem(f"[L{i+1}]  {text}")
                    item.setData(Qt.ItemDataRole.UserRole, f"{i+1}.1")
                    item.setForeground(Qt.GlobalColor.darkGray) if i % 2 == 0 else None
                    self._results.addItem(item)

    def _search_scenes(self, query):
        scenes = list(iter_scenes(self._text_content))
        for idx, label, pos in scenes:
            if query in label.lower():
                item = QListWidgetItem(f"🎬  {idx}. {label}")
                item.setData(Qt.ItemDataRole.UserRole, pos)
                self._results.addItem(item)

    def _search_chars(self, query):
        names = get_character_names(self._text_content)
        for name in names:
            if query in name.lower():
                item = QListWidgetItem(f"👤  {name}")
                item.setData(Qt.ItemDataRole.UserRole, name)
                self._results.addItem(item)

    def _search_locs(self, query):
        if not self._right_panel:
            return
        for loc in self._right_panel.get_locations():
            if query in loc.name.lower():
                item = QListWidgetItem(f"📍  {loc.name}")
                item.setData(Qt.ItemDataRole.UserRole, f"LOC:{loc.name}")
                self._results.addItem(item)

    def _search_beats(self, query):
        if not self._beat_board:
            return
        for beat in self._beat_board.get_beats():
            if query in beat.title.lower():
                item = QListWidgetItem(f"📋  {beat.title}")
                item.setData(Qt.ItemDataRole.UserRole, f"BEAT:{beat.title}")
                self._results.addItem(item)

    def _on_result_clicked(self, item):
        data = item.data(Qt.ItemDataRole.UserRole)
        if data:
            self.navigate_requested.emit(data)
