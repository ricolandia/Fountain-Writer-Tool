"""
Scene Navigator — redesigned to match app-ui.html reference.
Shows scenes with number, location, time-of-day, and active bullet.
"""

from PySide6.QtCore import Qt
from ..core.i18n import _
from PySide6.QtGui import QColor, QFont, QAction
from PySide6.QtWidgets import (QDockWidget, QWidget, QVBoxLayout, QHBoxLayout,
                                QLabel, QLineEdit, QFrame, QSizePolicy)

from ..models.fountain import iter_scenes


class SceneNavigator(QDockWidget):
    def __init__(self, parent=None):
        super().__init__(_("scenes.title"), parent)
        self.setObjectName("SceneNavigator")
        self.setFeatures(QDockWidget.DockWidgetFeature.NoDockWidgetFeatures)
        self.setMinimumWidth(200)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        # Header
        header = QFrame()
        header.setObjectName("SceneHeader")
        hl = QHBoxLayout(header)
        hl.setContentsMargins(14, 8, 14, 8)

        title = QLabel(_("scenes.header"))
        title.setStyleSheet("font-weight: 600; font-size: 11px; letter-spacing: 0.08em; color: #6b6b78; text-transform: uppercase;")
        hl.addWidget(title)

        self._count_badge = QLabel("0")
        self._count_badge.setObjectName("SceneCount")
        hl.addWidget(self._count_badge)
        hl.addStretch()

        self._filter_edit = QLineEdit()
        self._filter_edit.setPlaceholderText(_("scenes.filter"))
        self._filter_edit.setObjectName("SceneFilter")
        self._filter_edit.setClearButtonEnabled(True)
        hl.addWidget(self._filter_edit)

        layout.addWidget(header)

        # Scene items container
        self._items_frame = QFrame()
        self._items_layout = QVBoxLayout(self._items_frame)
        self._items_layout.setContentsMargins(6, 4, 6, 4)
        self._items_layout.setSpacing(1)
        self._items_layout.addStretch()
        layout.addWidget(self._items_frame, 1)

        self.setWidget(container)

        self._scene_data: list[tuple[int, str, str]] = []
        self._compile_flags: dict[str, bool] = {}
        self._item_widgets: list[QFrame] = []
        self._active_index = -1

        self._filter_edit.textChanged.connect(self._do_filter)

    def update_scenes(self, scenes: list[tuple[int, str, str]],
                      compile_flags: dict[str, bool] | None = None):
        self._scene_data = scenes
        if compile_flags is not None:
            self._compile_flags = compile_flags
        self._count_badge.setText(str(len(scenes)))
        self._do_filter()

    def get_compile_flags(self) -> dict[str, bool]:
        return self._compile_flags

    def set_compile_flag(self, pos: str, compiled: bool):
        self._compile_flags[pos] = compiled

    def is_compiled(self, pos: str) -> bool:
        return self._compile_flags.get(pos, True)

    def _do_filter(self):
        query = self._filter_edit.text().strip().lower()
        # Clear existing items
        self._clear_items()
        self._item_widgets = []

        for idx, label, pos in self._scene_data:
            if query and query not in label.lower():
                continue
            self._add_scene_item(idx, label, pos)

        if not self._item_widgets:
            lbl = QLabel(_("scenes.empty"))
            lbl.setStyleSheet("color: #6b6b78; padding: 20px; font-size: 12px;")
            self._items_layout.insertWidget(0, lbl)
            self._item_widgets.append(lbl)

    def _clear_items(self):
        for w in self._item_widgets:
            self._items_layout.removeWidget(w)
            w.deleteLater()

    def _add_scene_item(self, idx, label, pos):
        frame = QFrame()
        frame.setFrameShape(QFrame.Shape.NoFrame)
        frame.setCursor(Qt.CursorShape.PointingHandCursor)
        frame.setStyleSheet("""
            SceneItem {
                border-radius: 4px; padding: 6px 8px;
            }
            SceneItem:hover {
                background: rgba(249,115,22,0.08);
            }
        """)

        hl = QHBoxLayout(frame)
        hl.setContentsMargins(8, 6, 8, 6)
        hl.setSpacing(6)

        # Compile checkbox
        from PySide6.QtWidgets import QCheckBox
        cb = QCheckBox()
        compiled = self._compile_flags.get(pos, True)
        cb.setChecked(compiled)
        cb.setFixedWidth(16)
        cb.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        cb.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        hl.addWidget(cb)

        # Number
        num = QLabel(str(idx))
        num.setFixedWidth(20)
        num.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        num.setStyleSheet("font-size: 11px; font-weight: 500; color: #6b6b78;")
        hl.addWidget(num)

        # Info
        info = QVBoxLayout()
        info.setSpacing(1)
        loc_name = label
        time_of_day = ""
        import re
        m = re.search(r'[-–—]\s*(.+)$', label)
        if m:
            loc_name = label[:m.start()].strip()
            time_of_day = m.group(1).strip()

        loc_label = QLabel(loc_name)
        loc_label.setStyleSheet("font-size: 12px; font-weight: 500; color: #ececed;")
        loc_label.setWordWrap(False)
        info.addWidget(loc_label)

        if time_of_day:
            tod_label = QLabel(time_of_day.upper())
            tod_label.setStyleSheet("font-size: 10px; color: #6b6b78; letter-spacing: 0.07em; text-transform: uppercase;")
            info.addWidget(tod_label)

        hl.addLayout(info, 1)

        # Active bullet
        bullet = QLabel()
        bullet.setFixedSize(6, 6)
        bullet.setStyleSheet(f"""
            background: #f97316; border-radius: 3px;
            min-width: 6px; min-height: 6px;
        """)
        bullet.hide()
        hl.addWidget(bullet)
        frame._bullet = bullet

        # Right-click context menu for compile toggle
        frame.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        frame.customContextMenuRequested.connect(
            lambda pt, p=pos: self._toggle_compile(p))

        self._items_layout.insertWidget(self._items_layout.count() - 1, frame)
        self._item_widgets.append(frame)

        # Click to navigate
        frame._scene_pos = pos
        frame.mousePressEvent = lambda e, p=pos, w=frame: self._on_item_click(p, w)

    def _on_item_click(self, pos, widget):
        for w in self._item_widgets:
            if hasattr(w, '_bullet'):
                w._bullet.hide()
        if hasattr(widget, '_bullet'):
            widget._bullet.show()
        self.parent().navigate_to_scene(pos)

    def _toggle_compile(self, pos):
        current = self._compile_flags.get(pos, True)
        self._compile_flags[pos] = not current
        self._do_filter()


