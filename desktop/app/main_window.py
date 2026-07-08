import os
import sys

from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                                QToolBar, QStatusBar, QLabel, QFileDialog,
                                QMessageBox, QPushButton, QFrame, QSizePolicy)
from PySide6.QtGui import QAction, QIcon, QColor

from .editor.editor import FountainEditor
from .dockers.scene_navigator import SceneNavigator
from .dockers.right_panel import RightPanel
from .dockers.beat_board import BeatBoard
from .dockers.dialogue_tuner import DialogueTuner
from .dockers.global_search import GlobalSearch
from .dialogs.find_replace import FindReplaceDialog
from .core.config import Config
from .core.theme import ThemeManager
from .core.i18n import _
from .models.fountain import (iter_scenes, count_words, count_chars,
                              estimate_pages, estimate_duration,
                              get_character_names, get_line_type, LineType)
from .models.meta import ProjectMeta, Character, Location

APP_NAME = "Fountain Writer"
UNTITLED = "Sem título"


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self._current_file = None
        self._is_modified = False
        self._focus_mode = False
        self._focus_dock_states: dict[str, bool] = {}
        self._find_dialog = None
        self._title_data: dict | None = None
        self._restart_pending = False
        self._render_timer = QTimer(self)
        self._render_timer.setSingleShot(True)
        self._render_timer.timeout.connect(self._do_render)

        self._config = Config()

        self._setup_ui()
        self._setup_menus()
        self._setup_toolbar()
        self._setup_status_bar()

        self._project_meta = ProjectMeta()

        self._scene_navigator = SceneNavigator(self)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea,
                           self._scene_navigator)

        self._right_panel = RightPanel(self)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea,
                           self._right_panel)
        self._right_panel.hide()

        self._beat_board = BeatBoard(self)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea,
                           self._beat_board)
        self._beat_board.hide()

        self._beat_board.set_beats(self._project_meta.beats)

        self._dialogue_tuner = DialogueTuner(self)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea,
                           self._dialogue_tuner)
        self._dialogue_tuner.hide()

        self._global_search = GlobalSearch(self)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea,
                           self._global_search)
        self._global_search.hide()

        self._editor = FountainEditor()
        self.setCentralWidget(self._editor)
        self._editor.character_entered.connect(self._on_character_entered)
        self._editor.scene_entered.connect(self._on_scene_entered)

        # Focus mode overlay
        self._focus_overlay = QLabel(self._editor)
        self._focus_overlay.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._focus_overlay.setStyleSheet("""
            background: rgba(0,0,0,0.85);
            color: #6b6b78;
            font: 14px 'Inter',sans-serif;
        """)
        self._focus_overlay.setText(
            "Focus Mode<br><br>"
            "Press <b>F11</b> or click the focus icon to exit.<br>"
            "Sidebars hidden. Just you and your script.")
        self._focus_overlay.hide()

        # Autosave timer
        self._autosave_timer = QTimer(self)
        self._autosave_timer.setInterval(120000)  # 2 minutes
        self._autosave_timer.timeout.connect(self._autosave)
        self._autosave_timer.start()

        # Productivity timer
        self._writing_seconds = 0
        self._writing_timer = QTimer(self)
        self._writing_timer.setInterval(1000)
        self._writing_timer.timeout.connect(self._tick_writing_timer)
        self._last_keystroke = 0

        self._editor.textChanged.connect(self._on_text_changed)
        self._editor.cursorPositionChanged.connect(self._update_status)
        self._editor.resizeEvent = self._on_editor_resize

        # Connect scene navigation from docks
        self._dialogue_tuner.scene_selected.connect(self.navigate_to_scene)
        self._global_search.navigate_requested.connect(self._search_navigate)

        # Connect meta changed signals (must be in __init__ for new files too)
        self._right_panel.changed.connect(self._on_meta_changed)
        self._beat_board.changed.connect(self._on_meta_changed)

        self._apply_theme(self._config.get_theme())
        self._restore_geometry()
        self._load_last_file()

    # ---- UI Setup ----
    def _setup_ui(self):
        self.setWindowTitle(f"{UNTITLED} — {APP_NAME}")
        self.setMinimumSize(800, 500)

    def _setup_menus(self):
        menubar = self.menuBar()
        file_m = menubar.addMenu(_("menu.file"))
        file_m.addAction(_("menu.file.new"), self._new_file, "Ctrl+N")
        file_m.addAction(_("menu.file.open"), self._open_file, "Ctrl+O")
        file_m.addAction(_("menu.file.save"), self._save_file, "Ctrl+S")
        file_m.addSeparator()
        file_m.addAction(_("menu.title_page"), self._show_title_page)
        self._title_menu_action = file_m.actions()[-1]
        file_m.addSeparator()
        file_m.addAction(_("menu.file.export_pdf"), self._export_pdf)
        file_m.addSeparator()
        file_m.addAction(_("menu.file.quit"), self.close)

        edit_m = menubar.addMenu(_("menu.edit"))
        edit_m.addAction(_("menu.edit.undo"), lambda: self._editor.undo(), "Ctrl+Z")
        edit_m.addAction(_("menu.edit.redo"), lambda: self._editor.redo(), "Ctrl+Y")
        edit_m.addSeparator()
        edit_m.addAction(_("menu.edit.find"), self._open_find, "Ctrl+H")

        view_m = menubar.addMenu(_("menu.view"))
        view_m.addAction(_("menu.view.scene_nav"), self._toggle_sidebar)
        view_m.addAction(_("menu.view.char_loc"), self._toggle_characters)
        view_m.addAction(_("menu.view.beat_board"), self._toggle_beat_board)
        view_m.addAction(_("menu.view.dialogue_tuner"), self._toggle_dialogue_tuner)
        view_m.addSeparator()
        view_m.addAction(_("menu.view.focus"), self._toggle_focus, "F11")
        view_m.addAction(_("menu.view.theme"), self._toggle_theme)

        lang_m = menubar.addMenu(_("menu.language"))
        lang_m.addAction("Português (BR)", lambda: self._set_lang("pt-BR"))
        lang_m.addAction("English", lambda: self._set_lang("en"))

        help_m = menubar.addMenu(_("menu.help"))
        help_m.addAction(_("menu.help.about"), self._show_help)

    def _setup_toolbar(self):
        toolbar = QToolBar()
        toolbar.setMovable(False)
        toolbar.setObjectName("MainToolbar")
        toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        self.addToolBar(Qt.ToolBarArea.TopToolBarArea, toolbar)

        self._add_toolbar_action(toolbar, "📄", _("toolbar.new"), self._new_file)
        self._add_toolbar_action(toolbar, "📂", _("toolbar.open"), self._open_file)
        self._add_toolbar_action(toolbar, "💾", _("toolbar.save"), self._save_file)

        self._add_toolbar_separator(toolbar)
        self._add_toolbar_action(toolbar, "📑", _("toolbar.pdf"), self._export_pdf)
        self._add_toolbar_action(toolbar, "📄", _("toolbar.title_page"), self._show_title_page)
        self._title_btn = toolbar.actions()[-1]
        self._add_toolbar_action(toolbar, "🔍", _("toolbar.find"), self._open_find)
        self._add_toolbar_action(toolbar, "📐", _("toolbar.format"), self._format_script)

        self._add_toolbar_separator(toolbar)
        self._add_toolbar_action(toolbar, "👤", _("toolbar.char_loc"), self._toggle_characters)
        self._add_toolbar_action(toolbar, "📋", _("menu.view.beat_board"), self._toggle_beat_board)
        self._add_toolbar_action(toolbar, "💬", _("dialogue.title"), self._toggle_dialogue_tuner)
        self._add_toolbar_action(toolbar, "🔎", _("search.title"), self._toggle_global_search)

        self._add_toolbar_separator(toolbar)
        self._add_toolbar_action(toolbar, "H", _("toolbar.hide"), self._toggle_hide_markup)
        self._add_toolbar_action(toolbar, "🎯", _("toolbar.focus"), self._toggle_focus)
        self._add_toolbar_action(toolbar, "🌗", _("toolbar.theme"), self._toggle_theme)
        self._add_toolbar_action(toolbar, "❓", _("toolbar.help"), self._show_help)

        spacer = QWidget()
        spacer.setSizePolicy(QSizePolicy.Policy.Expanding,
                             QSizePolicy.Policy.Preferred)
        toolbar.addWidget(spacer)

        self._add_toolbar_action(toolbar, "✕", _("toolbar.quit"), self.close, color="#ff6b6b")

    def _add_toolbar_action(self, toolbar, icon, label, slot, color=None):
        action = QAction(f"{icon}  {label}", self)
        action.triggered.connect(slot)
        action.setToolTip(label)
        toolbar.addAction(action)
        if color:
            widget = toolbar.widgetForAction(action)
            if widget:
                widget.setStyleSheet(f"color: {color};")
        return action

    def _add_toolbar_separator(self, toolbar):
        sep = QWidget()
        sep.setFixedSize(4, 24)
        sep.setStyleSheet("border-right: 1px solid #2a2a32;")
        toolbar.addWidget(sep)

    def _setup_status_bar(self):
        sb = QStatusBar()
        self.setStatusBar(sb)

        self._lbl_scenes = QLabel(_("status.scenes", n=0))
        sb.addWidget(self._lbl_scenes)

        self._lbl_words = QLabel(_("status.words", n=0))
        sb.addWidget(self._lbl_words)

        self._lbl_chars = QLabel(_("status.chars", n=0))
        sb.addWidget(self._lbl_chars)

        self._lbl_time = QLabel("")
        sb.addWidget(self._lbl_time)

        self._lbl_timer = QLabel("⏱ 00:00")
        self._lbl_timer.setStyleSheet("color: #6b6b78;")
        sb.addPermanentWidget(self._lbl_timer)

        self._lbl_saved = QLabel("")
        self._unsaved_title = _("confirm.discard.title")
        self._unsaved_text = _("confirm.discard.text")
        sb.addPermanentWidget(self._lbl_saved)

        self._lbl_page = QLabel(_("status.page_line", page=1, line=1))
        sb.addPermanentWidget(self._lbl_page)

    # ---- File Operations ----
    def _update_title(self):
        name = (os.path.basename(self._current_file)
                if self._current_file else UNTITLED)
        mod = " •" if self._is_modified else ""
        self.setWindowTitle(f"{name}{mod} — {APP_NAME}")

    def _confirm_discard(self):
        if not self._is_modified:
            return True
        resp = QMessageBox.question(
            self, _("confirm.discard.title"),
            _("confirm.discard.text"),
            QMessageBox.StandardButton.Yes |
            QMessageBox.StandardButton.No |
            QMessageBox.StandardButton.Cancel)
        if resp == QMessageBox.StandardButton.Cancel:
            return False
        if resp == QMessageBox.StandardButton.Yes:
            return self._save_file()
        return True

    def _new_file(self):
        if not self._confirm_discard():
            return
        self._editor.clear()
        self._current_file = None
        self._is_modified = False
        self._project_meta = ProjectMeta()
        self._right_panel.set_characters([])
        self._right_panel.set_locations([])
        self._beat_board.set_beats([])
        self._update_title()
        self._lbl_saved.setText("")
        self._do_render()
        self._editor.format_script()

    def _open_file(self):
        if not self._confirm_discard():
            return
        last_dir = self._config.get_last_dir() or os.path.expanduser("~")
        fp, _filter = QFileDialog.getOpenFileName(
            self, _("dialog.open.title"), last_dir,
            "Fountain (*.fountain);;Texto (*.txt);;Todos (*)")
        if not fp:
            return
        self._config.set_last_dir(os.path.dirname(fp))
        try:
            with open(fp, "r", encoding="utf-8") as f:
                content = f.read()
            self._editor.setPlainText(content)
            self._current_file = fp
            self._is_modified = False
            self._project_meta = ProjectMeta.load(fp)
            self._right_panel.set_characters(self._project_meta.characters)
            self._right_panel.set_locations(self._project_meta.locations)
            self._beat_board.set_beats(self._project_meta.beats)
            self._update_title()
            self._lbl_saved.setText("")
            self._do_render()
            self._sync_beats_from_scenes(list(iter_scenes(self._editor.toPlainText())))
            self._editor.format_script()
        except Exception as e:
            QMessageBox.critical(self, _("error.open"), str(e))

    def _save_file(self):
        fp = self._current_file
        if not fp:
            last_dir = self._config.get_last_dir() or os.path.expanduser("~")
            fp, _filter = QFileDialog.getSaveFileName(
                self, _("dialog.save.title"), last_dir,
                "Fountain (*.fountain);;Texto (*.txt)")
            if not fp:
                return False
        self._config.set_last_dir(os.path.dirname(fp))
        try:
            # Backup existing file
            if os.path.exists(fp):
                from datetime import datetime as _dt
                bak = fp + ".bak." + _dt.now().strftime("%Y%m%d-%H%M%S")
                import shutil
                shutil.copy2(fp, bak)
            with open(fp, "w", encoding="utf-8") as f:
                f.write(self._editor.toPlainText())
            # Save HTML companion
            try:
                from .core.exporter import export_html
                html = export_html(self._editor.toPlainText(),
                                   os.path.basename(fp))
                html_path = os.path.splitext(fp)[0] + ".html"
                with open(html_path, "w", encoding="utf-8") as hf:
                    hf.write(html)
            except Exception:
                pass
            self._current_file = fp
            self._project_meta.characters = self._right_panel.get_characters()
            self._project_meta.locations = self._right_panel.get_locations()
            self._project_meta.beats = self._beat_board.get_beats()
            self._project_meta.compile_flags = self._scene_navigator.get_compile_flags()
            self._project_meta.save(fp)
            self._is_modified = False
            self._update_title()
            self._lbl_saved.setText("✓ Salvo")
            self._lbl_saved.setStyleSheet("color: #4caf50;")
            QTimer.singleShot(3000, lambda: self._lbl_saved.setText(""))
            return True
        except Exception as e:
            QMessageBox.critical(self, _("error.save"), str(e))
            return False

    def _load_last_file(self):
        last = self._config.get_last_file()
        if last and os.path.exists(last):
            try:
                with open(last, "r", encoding="utf-8") as f:
                    self._editor.setPlainText(f.read())
                self._current_file = last
                self._is_modified = False
                self._project_meta = ProjectMeta.load(last)
                self._right_panel.set_characters(self._project_meta.characters)
                self._right_panel.set_locations(self._project_meta.locations)
                self._beat_board.set_beats(self._project_meta.beats)
                self._update_title()
                self._do_render()
                self._sync_beats_from_scenes(list(iter_scenes(self._editor.toPlainText())))
                self._editor.format_script()
            except Exception:
                pass

    # ---- Render ----
    def _do_render(self):
        text = self._editor.toPlainText()
        scenes = list(iter_scenes(text))
        self._scene_navigator.update_scenes(scenes, self._project_meta.compile_flags)
        self._lbl_scenes.setText(_("status.scenes", n=len(scenes)))

        # Merge character names from text + meta
        text_names = get_character_names(text)
        meta_names = self._right_panel.get_character_names()
        all_names = sorted(set(text_names + meta_names))
        self._editor.set_completer_names(all_names)
        self._update_counters(text)
        self._update_status()

        # Remove orphan auto-detected beats whose scene was deleted
        self._cleanup_orphan_beats(scenes)

        # Update text-derived docks
        self._dialogue_tuner.set_text(text)

        # Update global search
        self._global_search.set_data(text, self._scene_navigator,
                                     self._right_panel, self._beat_board)

    def _sync_beats_from_scenes(self, scenes):
        if not scenes:
            return
        from .models.meta import Beat
        existing_refs = set(b.scene_ref for b in self._project_meta.beats if b.scene_ref)
        new_beats = []
        for _idx, label, _pos in scenes:
            if label not in existing_refs:
                beat = Beat(title=label, scene_ref=label, order=len(self._project_meta.beats) + len(new_beats), auto_detected=True)
                new_beats.append(beat)
                existing_refs.add(label)
        if new_beats:
            self._project_meta.beats.extend(new_beats)
            self._beat_board.set_beats(self._project_meta.beats)

    def _cleanup_orphan_beats(self, scenes):
        active_refs = set(s[1] for s in scenes)
        before = len(self._project_meta.beats)
        self._project_meta.beats = [
            b for b in self._project_meta.beats
            if not b.auto_detected or b.scene_ref in active_refs
        ]
        if len(self._project_meta.beats) != before:
            self._beat_board.set_beats(self._project_meta.beats)

    def _on_scene_entered(self, heading):
        from .models.meta import Beat
        import re
        clean = heading.strip().upper()
        exists = any(b.scene_ref == clean for b in self._project_meta.beats)
        if not exists:
            beat = Beat(title=clean, scene_ref=clean, order=len(self._project_meta.beats), auto_detected=True)
            self._project_meta.beats.append(beat)
            self._beat_board.set_beats(self._project_meta.beats)
        m = re.match(r"^(INT|EXT|EST|I/E)[.\s]+(.+?)(\s*[-–—].*)?$", heading.strip(), re.IGNORECASE)
        if m:
            loc_name = m.group(2).strip().upper()
            if loc_name:
                existing_locs = set(l.name.upper() for l in self._right_panel.get_locations())
                if loc_name not in existing_locs:
                    is_int = heading.strip().upper().startswith("INT")
                    self._right_panel._locations.append(Location(name=loc_name, interior=is_int, auto_detected=True))
                    self._right_panel._refresh_list()

    def _on_character_entered(self, name):
        text = name.strip().upper()
        if len(text) < 2:
            return
        existing = set(c.name.upper() for c in self._right_panel.get_characters())
        if text not in existing:
            from .models.meta import Character
            self._right_panel._characters.append(Character(name=text, auto_detected=True))
            self._right_panel._refresh_list()
            self._on_meta_changed()

    def _search_navigate(self, data):
        if data.startswith("LOC:"):
            self._toggle_locations()
        elif data.startswith("BEAT:"):
            self._toggle_beat_board()
        else:
            self.navigate_to_scene(data)

    def _tick_writing_timer(self):
        from time import time
        now = int(time())
        if now - self._last_keystroke > 300:  # 5 min idle → pause
            self._writing_timer.stop()
            return
        self._writing_seconds += 1
        m, s = divmod(self._writing_seconds, 60)
        h, m = divmod(m, 60)
        if h:
            self._lbl_timer.setText(f"⏱ {h}:{m:02d}:{s:02d}")
        else:
            self._lbl_timer.setText(f"⏱ {m:02d}:{s:02d}")

    def _on_text_changed(self):
        if not self._is_modified:
            self._is_modified = True
            self._update_title()
            self._lbl_saved.setText("")
        if not self._writing_timer.isActive():
            self._writing_timer.start()
        from time import time
        self._last_keystroke = int(time())
        self._render_timer.start(50)

    def _autosave(self):
        if self._current_file and self._is_modified:
            try:
                with open(self._current_file, "w", encoding="utf-8") as f:
                    f.write(self._editor.toPlainText())
                self._lbl_saved.setText("💾 Auto saved")
                QTimer.singleShot(3000, lambda: self._lbl_saved.setText(""))
            except Exception:
                pass

    def _on_editor_resize(self, event):
        from PySide6.QtWidgets import QTextEdit
        QTextEdit.resizeEvent(self._editor, event)
        self._focus_overlay.setGeometry(self._editor.rect())
        self._editor._line_number_area.setGeometry(
            self._editor.contentsRect().left(),
            self._editor.contentsRect().top(),
            self._editor.line_number_width(),
            self._editor.contentsRect().height())

    def _on_meta_changed(self):
        self._is_modified = True
        self._update_title()
        self._lbl_saved.setText("")
        self._do_render()

    def _update_counters(self, text=None):
        if text is None:
            text = self._editor.toPlainText()
        words = count_words(text)
        chars = count_chars(text)
        pages = estimate_pages(text)
        duration = estimate_duration(pages)

        self._lbl_words.setText(_("status.words", n=words))
        self._lbl_chars.setText(_("status.chars", n=chars))
        self._lbl_time.setText(_("status.duration", duration=duration) if duration else "")

    def _format_script(self):
        self._editor.format_script()

    def _show_title_page(self):
        from .dialogs.title_page import TitlePageDialog
        if self._title_data:
            from PySide6.QtWidgets import QMessageBox
            resp = QMessageBox.question(
                self, _("menu.title_page"),
                _("title.has_data"),
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No |
                QMessageBox.StandardButton.Cancel)
            if resp == QMessageBox.StandardButton.Cancel:
                return
            if resp == QMessageBox.StandardButton.No:
                self._title_data = None
                self._title_btn.setText("📄 " + _("toolbar.title_page"))
                self._title_menu_action.setText(_("menu.title_page"))
                return
        dlg = TitlePageDialog(self, data=self._title_data)
        if dlg.exec() == TitlePageDialog.DialogCode.Accepted:
            self._title_data = dlg.get_data()
            self._title_btn.setText("📄 " + _("toolbar.edit_title"))
            self._title_menu_action.setText(_("menu.edit_title"))

    def _update_status(self):
        try:
            cursor = self._editor.textCursor()
            line = cursor.blockNumber() + 1
            page_line = self._editor.page_line()
            page = ((line - 1) // page_line) + 1
            self._lbl_page.setText(_("status.page_line", page=page, line=line))
        except Exception:
            pass

    def navigate_to_scene(self, pos):
        if not pos or not isinstance(pos, str):
            return
        parts = pos.split(".")
        try:
            line_num = int(parts[0])
        except (ValueError, IndexError):
            return
        max_line = self._editor.document().blockCount()
        if line_num < 1 or line_num > max_line:
            return
        cursor = self._editor.textCursor()
        block = self._editor.document().findBlockByNumber(line_num - 1)
        if block.isValid():
            cursor.setPosition(block.position())
            self._editor.setTextCursor(cursor)
            self._editor.ensureCursorVisible()
            self._editor.setFocus()

    # ---- Find ----
    def _open_find(self):
        if self._find_dialog and self._find_dialog.isVisible():
            self._find_dialog.raise_()
            self._find_dialog.activateWindow()
            return
        self._find_dialog = FindReplaceDialog(self._editor, self)
        self._find_dialog.show()

    # ---- Focus Mode ----
    def _toggle_hide_markup(self):
        self._editor.toggle_hide_markup()

    def _toggle_focus(self):
        self._focus_mode = not self._focus_mode
        if self._focus_mode:
            self._focus_dock_states = {
                "toolbar": self.findChild(QToolBar, "MainToolbar").isVisible(),
                "menubar": self.menuBar().isVisible(),
                "scenes": self._scene_navigator.isVisible(),
                "right": self._right_panel.isVisible(),
                "beats": self._beat_board.isVisible(),
                "dialogue": self._dialogue_tuner.isVisible(),
                "search": self._global_search.isVisible(),
            }
            self.findChild(QToolBar, "MainToolbar").hide()
            self.menuBar().hide()
            self._scene_navigator.hide()
            self._right_panel.hide()
            self._beat_board.hide()
            self._dialogue_tuner.hide()
            self._global_search.hide()
            self._editor.setStyleSheet(self._editor.styleSheet() +
                                       "padding: 100px 150px;")
            self._lbl_saved.setText(_("focus.status"))
            QTimer.singleShot(3000, lambda: self._lbl_saved.setText(""))
            self._focus_overlay.show()
            self._focus_overlay.raise_()
        else:
            self.findChild(QToolBar, "MainToolbar").setVisible(
                self._focus_dock_states.get("toolbar", True))
            self.menuBar().setVisible(
                self._focus_dock_states.get("menubar", True))
            self._scene_navigator.setVisible(
                self._focus_dock_states.get("scenes", True))
            self._right_panel.setVisible(
                self._focus_dock_states.get("right", False))
            self._beat_board.setVisible(
                self._focus_dock_states.get("beats", False))
            self._dialogue_tuner.setVisible(
                self._focus_dock_states.get("dialogue", False))
            self._global_search.setVisible(
                self._focus_dock_states.get("search", False))
            self._focus_overlay.hide()
            self._apply_theme(self._config.get_theme())
        self._editor.setFocus()

    # ---- Character / Location / Beat Docks ----
    def _sync_toolbar_dock_indicators(self):
        docks = {
            _("toolbar.char_loc"): self._right_panel,
            _("menu.view.beat_board"): self._beat_board,
            _("dialogue.title"): self._dialogue_tuner,
            _("search.title"): self._global_search,
        }
        toolbar = self.findChild(QToolBar, "MainToolbar")
        if not toolbar:
            return
        for action in toolbar.actions():
            for label, dock in docks.items():
                if label in action.text() or any(c in action.text() for c in "👤📋💬🔎"):
                    action.setChecked(dock.isVisible())
                    break

    def _toggle_characters(self):
        visible = not self._right_panel.isVisible()
        self._right_panel.setVisible(visible)
        if visible:
            self._right_panel._tabs.setCurrentIndex(0)
            self._right_panel.raise_()
        self._sync_toolbar_dock_indicators()

    def _toggle_locations(self):
        visible = not self._right_panel.isVisible()
        self._right_panel.setVisible(visible)
        if visible:
            self._right_panel._tabs.setCurrentIndex(1)
            self._right_panel.raise_()
        self._sync_toolbar_dock_indicators()

    def _toggle_beat_board(self):
        visible = not self._beat_board.isVisible()
        self._beat_board.setVisible(visible)
        if visible:
            self._beat_board.raise_()
        self._sync_toolbar_dock_indicators()

    def _toggle_dialogue_tuner(self):
        visible = not self._dialogue_tuner.isVisible()
        self._dialogue_tuner.setVisible(visible)
        if visible:
            self._dialogue_tuner.raise_()
        self._sync_toolbar_dock_indicators()

    def _toggle_global_search(self):
        visible = not self._global_search.isVisible()
        self._global_search.setVisible(visible)
        if visible:
            self._global_search.raise_()
            self._global_search._input.setFocus()
        self._sync_toolbar_dock_indicators()

    def _toggle_sidebar(self):
        visible = not self._scene_navigator.isVisible()
        self._scene_navigator.setVisible(visible)
        self._config.set_sidebar_visible(visible)
        self._sync_toolbar_dock_indicators()

    # ---- Theme ----
    def _toggle_theme(self):
        new_mode = "dark" if self._config.get_theme() == "light" else "light"
        self._apply_theme(new_mode)
        self._config.set_theme(new_mode)

    def _set_lang(self, lang):
        resp = QMessageBox.information(
            self, _("menu.language"),
            _("lang.restart_warning"),
            QMessageBox.StandardButton.Ok | QMessageBox.StandardButton.Cancel)
        if resp != QMessageBox.StandardButton.Ok:
            return
        self._config.set_language(lang)
        self._restart_pending = True
        self.close()

    def _apply_theme(self, mode):
        qss = ThemeManager.get_qss(mode)
        self.setStyleSheet(qss)
        for dock in (self._right_panel,
                     self._beat_board, self._dialogue_tuner,
                     self._scene_navigator,
                     self._global_search):
            dock.setStyleSheet(qss)
        colors = ThemeManager.get_colors(mode)
        self._editor.apply_colors(colors)
        self._editor._highlighter.rehighlight()
        self._editor._apply_hide_markup()
        self._editor.update()

    # ---- PDF ----
    def _export_pdf(self):
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import A4, LETTER
            from reportlab.lib.units import inch
        except ImportError:
            QMessageBox.information(
                self, "PDF não disponível",
                "Para exportar PDF, instale reportlab:\n\n"
                "    pip install reportlab")
            return

        # Choose page size
        sizes = {"A4 (210x297mm)": A4, "Letter (216x279mm)": LETTER}
        keys = list(sizes.keys())
        from PySide6.QtWidgets import QDialog, QVBoxLayout, QComboBox, QDialogButtonBox, QLabel
        dlg = QDialog(self)
        dlg.setWindowTitle("Exportar PDF")
        dlg.setFixedWidth(360)
        vl = QVBoxLayout(dlg)
        vl.addWidget(QLabel("Tamanho da página:"))
        combo = QComboBox()
        combo.addItems(keys)
        vl.addWidget(combo)
        btn_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btn_box.accepted.connect(dlg.accept)
        btn_box.rejected.connect(dlg.reject)
        vl.addWidget(btn_box)
        if dlg.exec() != QDialog.DialogCode.Accepted:
            return

        page_size = sizes[combo.currentText()]

        last_dir = self._config.get_last_dir() or os.path.expanduser("~")
        fp, _filter = QFileDialog.getSaveFileName(
            self, "Exportar PDF", last_dir, "PDF (*.pdf)")
        if not fp:
            return
        self._config.set_last_dir(os.path.dirname(fp))

        try:
            cv = canvas.Canvas(fp, pagesize=page_size)
            pw, ph = page_size
            top_m = ph - inch
            bot_m = inch
            left_m = 1.5 * inch

            import textwrap

            tobj = cv.beginText(left_m, top_m)
            tobj.setFont("Courier", 12)

            # Render title page if data exists (centered)
            if self._title_data:
                from .dialogs.title_page import TitlePageDialog
                title_fountain = TitlePageDialog.to_fountain(self._title_data)
                cv.setFont("Courier", 12)
                center_x = pw / 2
                y = top_m
                title_lines = title_fountain.rstrip().split("\n")
                # Remove the === page break from rendering on title page
                title_lines = [l for l in title_lines if l.strip() != "==="]
                for line in title_lines:
                    if y < bot_m:
                        cv.showPage()
                        cv.setFont("Courier", 12)
                        y = top_m
                    cv.drawCentredString(center_x, y, line)
                    y -= 14
                cv.showPage()
                y = top_m
                tobj = cv.beginText(left_m, top_m)
                tobj.setFont("Courier", 12)

            prev = LineType.ACTION

            for line in self._editor.toPlainText().split("\n"):
                ltype = get_line_type(line, prev)
                clean = line.strip()
                indent, wrap_w = 0, 60

                if ltype == LineType.CHARACTER:
                    indent, wrap_w = 22, 40
                elif ltype == LineType.DIALOGUE:
                    indent, wrap_w = 12, 35
                elif ltype == LineType.PARENTHETICAL:
                    indent, wrap_w = 16, 30
                elif ltype == LineType.TRANSITION:
                    indent, wrap_w = 45, 15
                elif ltype == LineType.CENTER:
                    clean = clean.replace(">", "").replace("<", "").strip()
                    indent = 25

                wrapped = textwrap.wrap(clean, width=wrap_w) if clean else [""]
                for wl in (wrapped or [""]):
                    if tobj.getY() < bot_m:
                        cv.drawText(tobj)
                        cv.showPage()
                        tobj = cv.beginText(left_m, top_m)
                        tobj.setFont("Courier", 12)
                    tobj.textLine(" " * indent + wl)

                prev = ltype

            cv.drawText(tobj)
            cv.save()
            QMessageBox.information(self, "PDF exportado", f"Arquivo salvo:\n{fp}")
        except Exception as e:
            QMessageBox.critical(self, "Erro ao exportar PDF", str(e))

    # ---- Help ----
    def _show_help(self):
        from .dialogs.help_dialog import HelpDialog
        dlg = HelpDialog()
        dlg.setStyleSheet("""
            QDialog { background: #f0f0f0; color: #000; }
            QLabel { color: #000; font: 12pt 'Courier New',monospace; }
            QFrame { color: #ccc; }
            QPushButton { background: #ddd; color: #000;
                           border: 1px solid #aaa; border-radius: 4px;
                           padding: 6px 24px; font-size: 10pt; }
        """)
        dlg.exec()

    # ---- Config Persistence ----
    def _restore_geometry(self):
        geom = self._config.get_geometry()
        if geom:
            try:
                self.restoreGeometry(geom)
            except Exception:
                self.resize(1100, 720)
        else:
            self.resize(1100, 720)

        state = self._config.get_window_state()
        if state:
            try:
                self.restoreState(state)
            except Exception:
                pass

        if not self._config.get_sidebar_visible():
            self._scene_navigator.hide()

    def _save_state(self):
        self._config.set_geometry(self.saveGeometry())
        self._config.set_window_state(self.saveState())
        self._config.set_sidebar_visible(self._scene_navigator.isVisible())
        if self._current_file:
            self._config.set_last_file(self._current_file)

    def closeEvent(self, event):
        if not self._confirm_discard():
            self._restart_pending = False
            event.ignore()
            return
        self._save_state()
        if self._restart_pending:
            import subprocess
            main_py = os.path.join(os.path.dirname(os.path.dirname(__file__)), "main.py")
            subprocess.Popen([sys.executable, main_py])
        super().closeEvent(event)

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_F11:
            self._toggle_focus()
            return
        if event.key() == Qt.Key.Key_Escape:
            if self._focus_mode:
                self._toggle_focus()
                return
        if event.modifiers() == Qt.KeyboardModifier.ControlModifier:
            if event.key() == Qt.Key.Key_S:
                self._save_file()
                return
            elif event.key() == Qt.Key.Key_O:
                self._open_file()
                return
            elif event.key() == Qt.Key.Key_N:
                self._new_file()
                return
            elif event.key() in (Qt.Key.Key_H, Qt.Key.Key_F):
                self._open_find()
                return
            elif event.key() == Qt.Key.Key_Up:
                self._scroll_page(-1)
                return
            elif event.key() == Qt.Key.Key_Down:
                self._scroll_page(1)
                return
        super().keyPressEvent(event)

    def _scroll_page(self, direction):
        cursor = self._editor.textCursor()
        block = cursor.block()
        current_line = block.blockNumber() + 1
        page_line = self._editor.page_line()
        target = max(1, current_line + direction * page_line)
        target_block = self._editor.document().findBlockByNumber(target - 1)
        if target_block.isValid():
            cursor.setPosition(target_block.position())
            self._editor.setTextCursor(cursor)
            self._editor.ensureCursorVisible()
