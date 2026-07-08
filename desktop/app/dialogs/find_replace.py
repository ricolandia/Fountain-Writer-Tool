import re

from PySide6.QtCore import Qt
from PySide6.QtGui import QTextCursor
from PySide6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                                QLineEdit, QCheckBox, QPushButton)

from ..core.i18n import _


class FindReplaceDialog(QDialog):
    def __init__(self, editor, parent=None):
        super().__init__(parent)
        self._editor = editor
        self.setWindowTitle(_("find.title"))
        self.setFixedSize(460, 200)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowContextHelpButtonHint)

        layout = QVBoxLayout(self)
        layout.setSpacing(6)

        self._find_edit = QLineEdit()
        self._find_edit.setPlaceholderText(_("find.find_ph"))
        layout.addLayout(self._make_row(_("find.find"), self._find_edit))

        self._replace_edit = QLineEdit()
        self._replace_edit.setPlaceholderText(_("find.replace_ph"))
        layout.addLayout(self._make_row(_("find.replace"), self._replace_edit))

        opt_row = QHBoxLayout()
        self._case_check = QCheckBox(_("find.case"))
        opt_row.addWidget(self._case_check)
        self._count_label = QLabel("")
        self._count_label.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        opt_row.addWidget(self._count_label, 1)
        layout.addLayout(opt_row)

        btn_row = QHBoxLayout()
        self._prev_btn = QPushButton(_("find.prev"))
        self._next_btn = QPushButton(_("find.next"))
        self._replace_btn = QPushButton(_("find.replace_one"))
        self._replace_all_btn = QPushButton(_("find.replace_all"))

        self._next_btn.setDefault(True)
        btn_row.addWidget(self._prev_btn)
        btn_row.addWidget(self._next_btn)
        btn_row.addSpacing(10)
        btn_row.addWidget(self._replace_btn)
        btn_row.addWidget(self._replace_all_btn)
        btn_row.addStretch()
        layout.addLayout(btn_row)

        self._find_edit.textChanged.connect(self._on_find_change)
        self._find_edit.returnPressed.connect(self._on_find_next)
        self._case_check.stateChanged.connect(self._on_find_change)
        self._next_btn.clicked.connect(self._on_find_next)
        self._prev_btn.clicked.connect(self._on_find_prev)
        self._replace_btn.clicked.connect(self._on_replace)
        self._replace_all_btn.clicked.connect(self._on_replace_all)

        self._current = -1

    def _make_row(self, label, widget):
        row = QHBoxLayout()
        lbl = QLabel(label)
        lbl.setFixedWidth(90)
        row.addWidget(lbl)
        row.addWidget(widget, 1)
        return row

    def _flags(self):
        return re.IGNORECASE if not self._case_check.isChecked() else 0

    def _on_find_change(self):
        term = self._find_edit.text()
        if not term:
            self._count_label.setText("")
            self._find_cursors = []
            self._current = -1
            return
        self._find_all(term, move_first=False)

    def _find_all(self, term, move_first=True):
        self._find_cursors = []
        self._current = -1

        text = self._editor.toPlainText()
        try:
            pattern = re.compile(re.escape(term), self._flags())
        except re.error:
            return

        for m in pattern.finditer(text):
            cur = self._editor.textCursor()
            cur.setPosition(m.start())
            cur.setPosition(m.end(), cur.MoveMode.KeepAnchor)
            self._find_cursors.append(cur)

        total = len(self._find_cursors)
        if total == 0:
            self._count_label.setText(_("find.no_results"))
            return

        if move_first:
            self._current = 0
        else:
            self._current = 0 if self._current < 0 else min(self._current, total - 1)

        self._highlight_current()

    def _highlight_current(self):
        if self._current < 0 or self._current >= len(self._find_cursors):
            return
        cur = self._find_cursors[self._current]
        self._editor.setTextCursor(cur)
        self._editor.ensureCursorVisible()
        n = len(self._find_cursors)
        self._count_label.setText(f"{self._current + 1} / {n}")

    def _move(self, direction):
        if not self._find_cursors:
            return
        self._current = (self._current + direction) % len(self._find_cursors)
        self._highlight_current()

    def _on_find_next(self):
        self._move(1)

    def _on_find_prev(self):
        self._move(-1)

    def _on_replace(self):
        if self._current < 0 or self._current >= len(self._find_cursors):
            return
        cur = self._find_cursors[self._current]
        replacement = self._replace_edit.text()
        if cur.hasSelection():
            cur.insertText(replacement)
        self._on_find_change()

    def _on_replace_all(self):
        term = self._find_edit.text()
        replacement = self._replace_edit.text()
        if not term:
            return
        text = self._editor.toPlainText()
        try:
            pattern = re.compile(re.escape(term), self._flags())
        except re.error:
            return
        new_text, count = pattern.subn(replacement, text)
        if count:
            self._editor.setPlainText(new_text)
        self._on_find_change()

    def closeEvent(self, event):
        super().closeEvent(event)
