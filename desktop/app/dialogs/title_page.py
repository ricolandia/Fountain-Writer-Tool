from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QDialog, QVBoxLayout, QFormLayout,
                                QLineEdit, QTextEdit, QPushButton, QHBoxLayout,
                                QLabel)

from ..core.i18n import _


FIELDS = [
    ("title", _("title.title")),
    ("credit", _("title.credit")),
    ("author", _("title.author")),
    ("source", _("title.source")),
    ("draft_date", _("title.draft_date")),
    ("contact", _("title.contact")),
]


class TitlePageDialog(QDialog):
    def __init__(self, parent=None, data: dict | None = None):
        super().__init__(parent)
        self.setWindowTitle(_("menu.title_page"))
        self.setMinimumSize(400, 400)

        layout = QVBoxLayout(self)
        layout.setSpacing(6)

        form = QFormLayout()
        form.setSpacing(4)
        self._fields = {}

        for key, label in FIELDS:
            if key == "contact":
                ed = QTextEdit()
                ed.setMaximumHeight(80)
            else:
                ed = QLineEdit()
            self._fields[key] = ed
            form.addRow(label, ed)

        layout.addLayout(form)

        if data:
            self.set_data(data)

        layout.addStretch()

        btn_row = QHBoxLayout()
        btn_ok = QPushButton(_("title.save"))
        btn_ok.setDefault(True)
        btn_ok.clicked.connect(self.accept)
        btn_cancel = QPushButton(_("title.cancel"))
        btn_cancel.clicked.connect(self.reject)
        btn_row.addStretch()
        btn_row.addWidget(btn_ok)
        btn_row.addWidget(btn_cancel)
        layout.addLayout(btn_row)

    def set_data(self, data: dict):
        for key, val in data.items():
            field = self._fields.get(key)
            if field:
                if isinstance(field, QTextEdit):
                    field.setPlainText(val)
                else:
                    field.setText(val)

    def get_data(self) -> dict:
        result = {}
        for key, label in FIELDS:
            val = self._fields[key]
            text = (val.toPlainText().strip() if isinstance(val, QTextEdit)
                    else val.text().strip())
            if text:
                result[key] = text
        return result

    @staticmethod
    def to_fountain(data: dict) -> str:
        lines = []
        for key, label in FIELDS:
            text = data.get(key, "").strip()
            if text:
                label_clean = label.rstrip(":")
                lines.append(f"{label_clean}:")
                for line in text.split("\n"):
                    lines.append(f"    {line}")
                lines.append("")
        if lines:
            lines.append("===\n")
        return "\n".join(lines)
