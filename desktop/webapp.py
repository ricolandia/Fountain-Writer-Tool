#!/usr/bin/env python3
"""Fonte — Desktop (PySide6 + QWebEngineView)

Janela nativa com o app web completo embutido.
QWebEngineView (Chromium do Qt) carrega web/index.html com 100% das features.

Uso:
    python3 desktop/webapp.py
"""
import os
import sys

from PySide6.QtCore import QUrl, QTimer
from PySide6.QtGui import QAction
from PySide6.QtWidgets import QApplication, QMainWindow, QMessageBox, QFileDialog
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile
from PySide6.QtWebEngineWidgets import QWebEngineView

APP_NAME = "Fonte"
WIDTH, HEIGHT = 1280, 800


def _resolve_web_index():
    if getattr(sys, 'frozen', False):
        base = sys._MEIPASS
    else:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    index = os.path.join(base, 'web', 'index.html')
    if not os.path.exists(index):
        raise SystemExit(f"web/index.html não encontrado em: {index}")
    return index


class FontePage(QWebEnginePage):
    """Página com diálogos JS nativos (confirm/alert/prompt).

    Sem isso, o QtWebEngine retorna false para window.confirm() — o que
    bloqueia restoreBackup, closeExcalidraw, newFile e outras ações.
    """
    def javaScriptConfirm(self, url, message):
        result = QMessageBox.question(
            None, APP_NAME, message, QMessageBox.Yes | QMessageBox.No)
        return result == QMessageBox.Yes

    def javaScriptAlert(self, url, message):
        QMessageBox.information(None, APP_NAME, message)

    def javaScriptPrompt(self, url, message, default_value, result):
        from PySide6.QtWidgets import QLineEdit, QDialog, QVBoxLayout, QLabel, QPushButton, QHBoxLayout
        dlg = QDialog()
        dlg.setWindowTitle(APP_NAME)
        lay = QVBoxLayout(dlg)
        lay.addWidget(QLabel(message))
        edit = QLineEdit(default_value)
        lay.addWidget(edit)
        btns = QHBoxLayout()
        ok = QPushButton("OK")
        cancel = QPushButton("Cancelar")
        ok.clicked.connect(dlg.accept)
        cancel.clicked.connect(dlg.reject)
        btns.addWidget(ok)
        btns.addWidget(cancel)
        lay.addLayout(btns)
        if dlg.exec():
            result.setText(edit.text())
            return True
        return False


class FonteWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle(APP_NAME)
        self.resize(WIDTH, HEIGHT)

        self.page = FontePage(self)
        self.view = QWebEngineView(self)
        self.view.setPage(self.page)
        self.view.setUrl(QUrl.fromLocalFile(_resolve_web_index()))
        self.setCentralWidget(self.view)

        # DEBUG: mostrar console.log do JS no terminal
        self.page.javaScriptConsoleMessage = self._js_console

        # Download handler: abrir diálogo nativo de salvar (ex: .json, .excalidraw, .html)
        profile = QWebEngineProfile.defaultProfile()
        profile.downloadRequested.connect(self._on_download)
        # Sem cache HTTP: evita servir app.js/bundle antigos entre execuções
        # (o bug do Excalidraw "null" era causado por cache do WebView)
        profile.setHttpCacheType(QWebEngineProfile.HttpCacheType.NoCache)

        self._setup_menus()
        self._run_js('document.title = "Fonte";')

    def _js_console(self, level, message, line, source):
        if message and 'GPUInfo' not in message:
            print(f"[JS] {message}")

    def _on_download(self, download):
        suggested = download.downloadFileName() or "arquivo"
        path, _ = QFileDialog.getSaveFileName(
            self, "Salvar arquivo", os.path.join(os.path.expanduser("~"), "Downloads", suggested))
        if path:
            download.setDownloadDirectory(os.path.dirname(path))
            download.setDownloadFileName(os.path.basename(path))
            download.accept()
        else:
            download.cancel()

    def _run_js(self, code):
        self.view.page().runJavaScript(code)

    def _setup_menus(self):
        mbar = self.menuBar()

        file_menu = mbar.addMenu("&Arquivo")
        act_new = QAction("Novo", self)
        act_new.setShortcut("Ctrl+N")
        act_new.triggered.connect(lambda: self._run_js('app.newFile()'))
        act_open = QAction("Abrir", self)
        act_open.setShortcut("Ctrl+O")
        act_open.triggered.connect(lambda: self._run_js('app.openProject()'))
        act_save = QAction("Salvar", self)
        act_save.setShortcut("Ctrl+S")
        act_save.triggered.connect(lambda: self._run_js('app.saveProject()'))
        act_save_as = QAction("Salvar como…", self)
        act_save_as.triggered.connect(lambda: self._run_js(
            'app._fileHandle = null; app.saveProject()'))
        act_exit = QAction("Sair", self)
        act_exit.setShortcut("Ctrl+Q")
        act_exit.triggered.connect(self.close)
        file_menu.addActions([act_new, act_open, act_save, act_save_as])
        file_menu.addSeparator()
        file_menu.addAction(act_exit)

        view_menu = mbar.addMenu("&Visualizar")
        act_theme = QAction("Alternar tema", self)
        act_theme.setShortcut("Ctrl+T")
        act_theme.triggered.connect(lambda: self._run_js('app.toggleTheme()'))
        act_lang = QAction("PT / EN", self)
        act_lang.setShortcut("Ctrl+L")
        act_lang.triggered.connect(lambda: self._run_js('app.toggleLang()'))
        act_focus = QAction("Modo foco", self)
        act_focus.setShortcut("F11")
        act_focus.triggered.connect(lambda: self._run_js('app.toggleFocus()'))
        view_menu.addActions([act_theme, act_lang, act_focus])

        help_menu = mbar.addMenu("&Ajuda")
        act_help = QAction("Guia Fountain", self)
        act_help.triggered.connect(lambda: self._run_js('app.openFountainGuide()'))
        act_manual = QAction("Manual do usuário", self)
        act_manual.triggered.connect(lambda: self._run_js(
            'window.open("https://www.ricolandia.com/editor-roteiros-gratuito/manual/", "_blank")'))
        help_menu.addActions([act_help, act_manual])

    def closeEvent(self, event):
        # Avise o app web antes de fechar (beforeunload)
        result = QMessageBox.question(
            self, APP_NAME,
            "Deseja fechar o Fonte?",
            QMessageBox.Yes | QMessageBox.No
        )
        if result == QMessageBox.Yes:
            event.accept()
        else:
            event.ignore()


def main():
    os.environ.setdefault('QTWEBENGINE_CHROMIUM_FLAGS', '--disable-gpu')
    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setOrganizationName("ricolandia")
    win = FonteWindow()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
