from PySide6.QtCore import Qt
from PySide6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QLabel,
                                QPushButton, QFrame, QScrollArea, QWidget)

from ..core.i18n import _


class HelpDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle(_("help.title"))
        self.setFixedSize(560, 600)
        self.setWindowFlags(self.windowFlags() & ~Qt.WindowType.WindowContextHelpButtonHint)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        layout.addWidget(scroll)

        container = QWidget()
        cl = QVBoxLayout(container)
        cl.setContentsMargins(28, 24, 28, 24)
        cl.setSpacing(8)

        def heading(text, size=14):
            lbl = QLabel(text)
            lbl.setStyleSheet(f"color: #000; font-size: {size}pt; font-weight: bold;")
            cl.addWidget(lbl)

        def sep():
            line = QFrame()
            line.setFrameShape(QFrame.Shape.HLine)
            line.setStyleSheet("color: palette(mid);")
            cl.addWidget(line)

        def key_row(key, desc):
            row = QHBoxLayout()
            k = QLabel(key)
            k.setStyleSheet("color: #000; font-family: 'Courier New',monospace; font-weight: bold; padding: 3px 8px;")
            k.setFixedWidth(130)
            k.setAlignment(Qt.AlignmentFlag.AlignCenter)
            row.addWidget(k)
            d = QLabel(desc)
            d.setStyleSheet("color: #000;")
            row.addWidget(d, 1)
            cl.addLayout(row)

        def tag_row(tag, desc):
            row = QHBoxLayout()
            t = QLabel(tag)
            t.setStyleSheet("color: #000; font-weight: bold; padding: 3px 6px;")
            t.setFixedWidth(110)
            t.setAlignment(Qt.AlignmentFlag.AlignCenter)
            row.addWidget(t)
            d = QLabel(desc)
            d.setStyleSheet("color: #000;")
            d.setWordWrap(True)
            row.addWidget(d, 1)
            cl.addLayout(row)

        heading("Fountain Writer", 16)
        lbl_author = QLabel("Ricardo A. B. Graça — www.ricolandia.com")
        lbl_author.setStyleSheet("color: #000; font-size: 10pt;")
        cl.addWidget(lbl_author)
        sep()

        heading(_("help.shortcuts"))
        key_row("Ctrl + S", _("help.short_save"))
        key_row("Ctrl + O", _("help.short_open"))
        key_row("Ctrl + N", _("help.short_new"))
        key_row("Ctrl + H / F", _("help.short_find"))
        key_row("F11", _("help.short_focus"))
        key_row("Esc", _("help.short_escape"))
        key_row("Ctrl + ↑/↓", _("help.short_page"))
        key_row("Ctrl + Z", _("help.short_undo"))
        key_row("Ctrl + Y", _("help.short_redo"))
        sep()

        heading(_("help.syntax"))
        tag_row("SCENE", _("help.syntax_scene"))
        tag_row("PERSONAGEM", _("help.syntax_char"))
        tag_row("DIÁLOGO", _("help.syntax_dialog"))
        tag_row("RUBRICA", _("help.syntax_paren"))
        tag_row("TRANSIÇÃO", _("help.syntax_trans"))
        tag_row("CENTRALIZAR", _("help.syntax_center"))

        cl.addStretch()

        btn_close = QPushButton(_("help.close"))
        btn_close.setStyleSheet("color: #000; padding: 6px 24px; font-size: 10pt;")
        btn_close.clicked.connect(self.accept)
        cl.addWidget(btn_close, 0, Qt.AlignmentFlag.AlignCenter)

        scroll.setWidget(container)
