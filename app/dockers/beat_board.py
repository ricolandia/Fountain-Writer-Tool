from ..core.i18n import _
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtGui import QFont
from PySide6.QtWidgets import (QDockWidget, QWidget, QVBoxLayout, QHBoxLayout,
                                QListWidget, QListWidgetItem, QPushButton, QLabel,
                                QAbstractItemView, QListView, QFrame)

from ..models.meta import Beat


class BeatCard(QFrame):
    def __init__(self, beat: Beat, index: int, on_insert, on_edit, active=False):
        super().__init__()
        self._beat = beat
        self._index = index
        self.setFrameShape(QFrame.Shape.Box)
        self.setFixedSize(210, 180)
        border_left = "4px solid #555" if active else "1px solid #bbb"
        tooltip = _("beat.in_use") if active else _("beat.not_in_use")
        self.setToolTip(tooltip)
        self.setStyleSheet(f"""
            BeatCard {{
                background: #f5f5f0;
                border: 1px solid #bbb;
                border-left: {border_left};
                border-radius: 4px;
                padding: 6px;
            }}
            BeatCard:hover {{
                background: #e8e8e0;
            }}
        """)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 6, 8, 6)
        layout.setSpacing(2)

        title = QLabel(beat.title or "(sem título)")
        title.setFont(QFont("Courier New", 10, QFont.Weight.Bold))
        title.setWordWrap(True)
        title.setStyleSheet("color: #222; border: none;")
        layout.addWidget(title)

        if beat.description:
            desc = QLabel(beat.description[:50])
            desc.setFont(QFont("Courier New", 8))
            desc.setWordWrap(True)
            desc.setStyleSheet("color: #666; border: none;")
            layout.addWidget(desc)

        act_label = QLabel(beat.act or "")
        act_label.setFont(QFont("Courier New", 8))
        act_label.setStyleSheet("color: #888; font-weight: bold; border: none;")
        layout.addWidget(act_label)

        layout.addStretch()

        btn_row = QHBoxLayout()
        btn_row.setSpacing(4)
        btn_insert = QPushButton(_("beat.insert"))
        btn_insert.setToolTip(_("beat.insert"))
        btn_insert.clicked.connect(lambda: on_insert(self._beat))
        btn_row.addWidget(btn_insert)

        btn_edit = QPushButton(_("beat.edit"))
        btn_edit.setToolTip(_("beat.edit"))
        btn_edit.clicked.connect(lambda: on_edit(self._index))
        btn_row.addWidget(btn_edit)

        btn_row.addStretch()
        layout.addLayout(btn_row)


class BeatBoard(QDockWidget):
    changed = Signal()

    def __init__(self, parent=None):
        super().__init__(_('beat.title'), parent)
        self.setObjectName("BeatBoard")
        self.setMinimumWidth(250)
        self.setFeatures(QDockWidget.DockWidgetFeature.NoDockWidgetFeatures)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(4)

        toolbar = QHBoxLayout()
        self._btn_add = QPushButton(_("beat.add"))
        toolbar.addWidget(self._btn_add)
        self._btn_view = QPushButton("☰ " + _("beat.cards"))
        self._btn_view.setToolTip(_("beat.toggle_view"))
        toolbar.addWidget(self._btn_view)
        toolbar.addStretch()
        layout.addLayout(toolbar)

        self._list = QListWidget()
        self._list.setFrameShape(QListWidget.Shape.NoFrame)
        self._list.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
        self._list.model().rowsMoved.connect(self._on_list_reordered)
        self._list.itemDoubleClicked.connect(self._edit_from_list)
        layout.addWidget(self._list, 1)

        self.setWidget(container)

        self._beats: list[Beat] = []
        self._view_mode = "list"
        self._btn_add.clicked.connect(self._add_beat)
        self._btn_view.clicked.connect(self._toggle_view)

    def set_beats(self, beats: list[Beat]):
        self._beats = beats
        self._refresh()

    def get_beats(self) -> list[Beat]:
        return self._beats

    def _get_active_refs(self):
        parent = self.parent()
        if parent and hasattr(parent, '_editor'):
            from ..models.fountain import iter_scenes
            text = parent._editor.toPlainText()
            return set(s[1] for s in iter_scenes(text))
        return set()

    def _refresh(self):
        if self._view_mode == "list":
            self._refresh_list()
        else:
            self._refresh_cards()

    def _refresh_list(self):
        self._list.clear()
        active_refs = self._get_active_refs()
        for i, b in enumerate(self._beats):
            label = b.title or "(sem título)"
            if b.auto_detected:
                label += " (auto)"
            if b.scene_ref in active_refs:
                label += " ✓"
            if b.act:
                label += f"  [{b.act}]"
            item = QListWidgetItem(label)
            item.setData(Qt.ItemDataRole.UserRole, i)
            self._list.addItem(item)

    def _refresh_cards(self):
        self._list.clear()
        active_refs = self._get_active_refs()
        for i, b in enumerate(self._beats):
            active = b.scene_ref in active_refs
            card = BeatCard(b, i, self._insert_beat, self._edit_from_card, active=active)
            item = QListWidgetItem()
            item.setSizeHint(card.sizeHint())
            item.setData(Qt.ItemDataRole.UserRole, i)
            self._list.addItem(item)
            self._list.setItemWidget(item, card)

    def _toggle_view(self):
        if self._view_mode == "list":
            self._view_mode = "cards"
            self._btn_view.setText("☰ " + _("beat.list"))
            self._list.setViewMode(QListView.ViewMode.IconMode)
            self._list.setGridSize(QSize(220, 190))
            self._list.setWordWrap(True)
            self._list.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
            self._refresh_cards()
        else:
            self._view_mode = "list"
            self._btn_view.setText("☰ " + _("beat.cards"))
            self._list.setViewMode(QListView.ViewMode.ListMode)
            self._list.setGridSize(QSize())
            self._list.setWordWrap(False)
            self._list.setDragDropMode(QAbstractItemView.DragDropMode.InternalMove)
            self._refresh_list()

    def _add_beat(self):
        from ..dialogs.beat_editor import BeatEditorDialog
        beat = Beat(title="Novo beat", act="Ato 1", order=len(self._beats))
        scenes = self._get_scenes()
        dlg = BeatEditorDialog(beat, self._beats, self, scenes=scenes)
        if dlg.exec() == BeatEditorDialog.DialogCode.Accepted:
            self._beats.append(beat)
            self._refresh()
            self.changed.emit()

    def _edit_from_list(self, item):
        index = item.data(Qt.ItemDataRole.UserRole)
        self._edit_beat(index)

    def _edit_from_card(self, index):
        self._edit_beat(index)

    def _edit_beat(self, index):
        if index is None or index < 0 or index >= len(self._beats):
            return
        from ..dialogs.beat_editor import BeatEditorDialog
        scenes = self._get_scenes()
        dlg = BeatEditorDialog(self._beats[index], self._beats, self, scenes=scenes)
        if dlg.exec() == BeatEditorDialog.DialogCode.Accepted:
            self._beats[index].auto_detected = False
            self._refresh()
            self.changed.emit()

    def _insert_beat(self, beat: Beat):
        parent = self.parent()
        if parent and hasattr(parent, '_editor'):
            editor = parent._editor
            cursor = editor.textCursor()
            text = beat.title or ""
            if text:
                cursor.insertText(text + "\n\n")
                editor.setTextCursor(cursor)

    def _get_scenes(self):
        parent = self.parent()
        if parent and hasattr(parent, '_editor'):
            from ..models.fountain import iter_scenes
            return list(iter_scenes(parent._editor.toPlainText()))
        return []

    def _on_list_reordered(self):
        new_order = []
        for i in range(self._list.count()):
            item = self._list.item(i)
            old_index = item.data(Qt.ItemDataRole.UserRole)
            if old_index is not None and 0 <= old_index < len(self._beats):
                new_order.append(self._beats[old_index])
        if len(new_order) == len(self._beats):
            self._beats = new_order
            for i, b in enumerate(self._beats):
                b.order = i
            self.changed.emit()
