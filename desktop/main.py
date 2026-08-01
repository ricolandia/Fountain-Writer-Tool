#!/usr/bin/env python3
"""
Fountain Writer — Editor de Roteiros no formato Fountain
Versão PySide6
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from PySide6.QtWidgets import (QApplication, QDialog, QVBoxLayout, QHBoxLayout,
                                QPushButton, QLabel, QCheckBox, QMessageBox)
from PySide6.QtCore import Qt

from app.core.config import Config
from app.core.i18n import I18n, _
from app.main_window import MainWindow


class StartDialog(QDialog):
    def __init__(self, config: Config):
        super().__init__()
        self._config = config
        self._lang = config.get_language()
        self.setWindowTitle("Fountain Writer")
        self.setFixedSize(380, 200)

        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        lbl = QLabel("Choose your language / Escolha seu idioma:")
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(lbl)

        btn_row = QHBoxLayout()
        btn_pt = QPushButton("Português (BR)")
        btn_pt.setMinimumHeight(40)
        btn_pt.clicked.connect(lambda: self._choose("pt-BR"))
        btn_en = QPushButton("English")
        btn_en.setMinimumHeight(40)
        btn_en.clicked.connect(lambda: self._choose("en"))
        btn_row.addWidget(btn_pt)
        btn_row.addWidget(btn_en)
        layout.addLayout(btn_row)

        self._remember = QCheckBox("Lembrar escolha / Remember my choice")
        self._remember.setChecked(True)
        layout.addWidget(self._remember)

        layout.addStretch()

        exit_btn = QPushButton("Sair / Exit")
        exit_btn.clicked.connect(self._exit_app)
        layout.addWidget(exit_btn)

    def _choose(self, lang):
        self._lang = lang
        if self._remember.isChecked():
            self._config.set_language(lang)
        self.accept()

    def _exit_app(self):
        sys.exit(0)

    def get_language(self):
        return self._lang


def main():
    app = QApplication(sys.argv)
    config = Config()

    # Show language selection on first run or if not remembered
    if not config.is_language_remembered():
        dlg = StartDialog(config)
        if dlg.exec() == StartDialog.Accepted:
            lang = dlg.get_language()
            config.set_language(lang)
            config._settings.setValue("language_remembered", dlg._remember.isChecked())
        else:
            sys.exit(0)
    else:
        lang = config.get_language()

    I18n.init(lang)
    app.setApplicationName(_("app.name"))
    app.setOrganizationName(_("org.name"))

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
