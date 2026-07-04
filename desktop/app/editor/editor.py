from PySide6.QtCore import Qt, QRect, QTimer, Signal, QPoint
from PySide6.QtGui import QFont, QColor, QTextCursor, QPalette, QKeyEvent, QTextCharFormat
from PySide6.QtWidgets import (QTextEdit, QWidget, QFrame,
                                QListWidget, QVBoxLayout, QListWidgetItem)

from .highlighter import FountainHighlighter
from .line_numbers import LineNumberArea
from ..core.i18n import _
from ..models.fountain import get_character_names, get_line_type, LineType
from PySide6.QtGui import QTextBlockFormat
import re


class FountainEditor(QTextEdit):
    scene_navigated = Signal(str)
    character_entered = Signal(str)
    scene_entered = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._line_number_area = LineNumberArea(self)
        self._highlighter = FountainHighlighter(self.document())

        self.setFont(QFont("Courier New", 13))
        self.setTabStopDistance(self.fontMetrics().horizontalAdvance(" ") * 4)
        self.setAcceptRichText(False)
        self.setLineWrapMode(QTextEdit.LineWrapMode.WidgetWidth)
        self.setUndoRedoEnabled(True)
        self.setCursorWidth(2)

        self.textChanged.connect(self.update_line_number_width)

        self._page_line = 55
        self._char_names: list[str] = []
        self._hide_markup = False
        self._forced_types: dict[int, LineType] = {}
        self._folded_scenes: set[int] = set()

        # Manual autocomplete popup (no QCompleter — avoids Qt C++ use-after-free bug)
        self._ac_popup = QFrame(self, Qt.WindowType.Popup)
        self._ac_popup.setObjectName("ACPopup")
        self._ac_list = QListWidget()
        self._ac_list.setFrameShape(QListWidget.Shape.NoFrame)
        self._ac_list.itemClicked.connect(self._ac_accept)
        l = QVBoxLayout(self._ac_popup)
        l.setContentsMargins(0, 0, 0, 0)
        l.addWidget(self._ac_list)

        self._ac_timer = QTimer(self)
        self._ac_timer.setSingleShot(True)
        self._ac_timer.timeout.connect(self._do_autocomplete)

        self._highlighter.set_colors({
            "paper": "#ffffff", "text": "#111111", "cursor": "#000000",
            "line_highlight": "#f0f0f0", "gutter_bg": "#f5f5f5",
            "gutter_fg": "#999999", "gutter_sep": "#cccccc",
            "scene": "#666666", "char": "#555555", "trans": "#555555",
            "paren": "#777777", "dialogue": "#111111", "action": "#111111",
            "center": "#111111",
        })

        self.update_line_number_width()

    # ---- Line Numbers ----
    def line_number_width(self):
        digits = 1
        max_num = max(1, self.document().blockCount())
        while max_num >= 10:
            max_num //= 10
            digits += 1
        return 26 + self.fontMetrics().horizontalAdvance("9") * digits

    def update_line_number_width(self):
        self.setViewportMargins(self.line_number_width(), 0, 0, 0)

    def scrollContentsBy(self, dx, dy):
        super().scrollContentsBy(dx, dy)
        self._line_number_area.scroll(0, dy)
        self._line_number_area.update()

    def resizeEvent(self, event):
        super().resizeEvent(event)
        cr = self.contentsRect()
        self._line_number_area.setGeometry(
            QRect(cr.left(), cr.top(), self.line_number_width(), cr.height()))
        self.update_line_number_width()

    def setPlainText(self, text):
        self._forced_types = {}
        self._folded_scenes = set()
        super().setPlainText(text)

    # ---- Scene Folding ----
    def _get_scene_range(self, block_number: int):
        """Return (start, end) block indices for the scene at block_number."""
        doc = self.document()
        start = block_number
        end = doc.blockCount()
        for i in range(block_number + 1, doc.blockCount()):
            b = doc.findBlockByNumber(i)
            if b.isValid() and b.isVisible():
                t = b.text().strip()
                if t and get_line_type(t, LineType.ACTION) in (LineType.SCENE,):
                    end = i
                    break
        return start, end

    def toggle_fold(self, block_number: int):
        if block_number in self._folded_scenes:
            self._unfold_scene(block_number)
        elif self._is_scene_heading(block_number):
            self._fold_scene(block_number)

    def _is_scene_heading(self, block_number: int) -> bool:
        block = self.document().findBlockByNumber(block_number)
        if not block.isValid():
            return False
        text = block.text().strip()
        return bool(text) and get_line_type(text, LineType.ACTION) == LineType.SCENE

    def _fold_scene(self, block_number: int):
        self._folded_scenes.add(block_number)
        doc = self.document()
        doc.blockSignals(True)
        start, end = self._get_scene_range(block_number)
        for i in range(start + 1, end):
            b = doc.findBlockByNumber(i)
            if b.isValid():
                b.setVisible(False)
        doc.blockSignals(False)
        self.viewport().update()

    def _unfold_scene(self, block_number: int):
        self._folded_scenes.discard(block_number)
        doc = self.document()
        doc.blockSignals(True)
        start, end = self._get_scene_range(block_number)
        for i in range(start + 1, end):
            b = doc.findBlockByNumber(i)
            if b.isValid():
                b.setVisible(True)
        doc.blockSignals(False)
        self.viewport().update()

    def format_script(self):
        doc = self.document()
        try:
            prev = LineType.ACTION
            cursor = QTextCursor(doc)
            for i in range(doc.blockCount()):
                block = doc.findBlockByNumber(i)
                if not block.isValid() or not block.isVisible():
                    continue
                text = block.text().strip()
                if i in self._forced_types:
                    ltype = self._forced_types[i]
                    # Remove stale force: if natural type with real context matches
                    if text:
                        natural = get_line_type(text, prev)
                        if natural == ltype:
                            del self._forced_types[i]
                elif text:
                    ltype = get_line_type(text, prev)
                else:
                    ltype = LineType.BLANK

                fmt = QTextBlockFormat()
                if ltype == LineType.CHARACTER:
                    fmt.setIndent(10)
                elif ltype == LineType.DIALOGUE:
                    fmt.setIndent(6)
                elif ltype == LineType.PARENTHETICAL:
                    fmt.setIndent(8)
                elif ltype == LineType.TRANSITION:
                    fmt.setAlignment(Qt.AlignmentFlag.AlignRight)
                elif ltype == LineType.CENTER:
                    fmt.setAlignment(Qt.AlignmentFlag.AlignCenter)
                elif ltype == LineType.BLANK:
                    fmt.setTopMargin(4)
                    fmt.setBottomMargin(4)
                else:
                    fmt.setIndent(1)

                cursor.setPosition(block.position())
                cursor.setBlockFormat(fmt)
                if text:
                    prev = ltype
        except RuntimeError:
            pass

    # ---- Theme / Colors ----
    def apply_colors(self, colors: dict):
        paper = colors.get("paper", "#121216")
        text = colors.get("text", "#ececed")
        cursor = colors.get("cursor", "#888888")
        gutter_bg = colors.get("gutter_bg", "#121216")
        gutter_fg = colors.get("gutter_fg", "#4a4a56")
        gutter_sep = colors.get("gutter_sep", "#4a4a56")
        accent = "#888888"

        self.setStyleSheet(f"""
            QTextEdit {{
                background-color: {paper};
                color: {text};
                selection-background-color: rgba(136,136,136,0.3);
                selection-color: #ffffff;
                padding: 60px 80px;
                font-family: 'Courier New', Courier, monospace;
                font-size: 12pt;
                line-height: 1.2;
            }}
        """)
        self.setCursorWidth(2)

        pal = self.palette()
        pal.setColor(QPalette.ColorRole.Text, QColor(text))
        pal.setColor(QPalette.ColorRole.Base, QColor(paper))
        pal.setColor(QPalette.ColorRole.Highlight, QColor(accent))
        self.setPalette(pal)

        self._line_number_area.set_colors(gutter_bg, gutter_fg, gutter_sep)

        is_dark = self._is_dark_color(paper)
        popup_bg = "#2a2a32" if is_dark else "#ffffff"
        popup_fg = "#ececed" if is_dark else "#111111"
        popup_border = "#444" if is_dark else "#ccc"
        popup_sel = "#444" if is_dark else "#0066cc"
        self._ac_popup.setStyleSheet(f"""
            #ACPopup {{ background: {popup_bg}; border: 1px solid {popup_border}; border-radius: 4px; }}
            QListWidget {{ border: none; font: 10pt 'Courier New'; color: {popup_fg}; background: {popup_bg}; }}
            QListWidget::item {{ padding: 4px 8px; }}
            QListWidget::item:selected {{ background: {popup_sel}; color: #fff; }}
        """)

        self._highlighter.set_colors(colors)

    @staticmethod
    def _is_dark_color(hex_color):
        h = hex_color.lstrip("#")
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return (r + g + b) / 3 < 128

    # ---- Autocomplete (manual popup, no QCompleter) ----
    def set_completer_names(self, names: list[str]):
        self._char_names = names

    def _ac_accept(self, item=None):
        if item is None:
            item = self._ac_list.currentItem()
        if item is None:
            self._ac_popup.hide()
            return
        name = item.text()
        try:
            tc = self.textCursor()
            btext = tc.block().text()
            pos = tc.positionInBlock()
            tc.movePosition(QTextCursor.MoveOperation.Left,
                            QTextCursor.MoveMode.KeepAnchor,
                            min(pos, len(btext)))
            tc.insertText(name)
            self.setTextCursor(tc)
        except RuntimeError:
            pass
        self._ac_popup.hide()
        self.setFocus()

    def keyPressEvent(self, event: QKeyEvent):
        if self._ac_popup.isVisible():
            if event.key() in (Qt.Key.Key_Enter, Qt.Key.Key_Return, Qt.Key.Key_Tab):
                self._ac_accept()
                return
            elif event.key() == Qt.Key.Key_Up:
                prev = self._ac_list.currentRow() - 1
                if prev >= 0:
                    self._ac_list.setCurrentRow(prev)
                return
            elif event.key() == Qt.Key.Key_Down:
                nxt = self._ac_list.currentRow() + 1
                if nxt < self._ac_list.count():
                    self._ac_list.setCurrentRow(nxt)
                return
            elif event.key() == Qt.Key.Key_Escape:
                self._ac_popup.hide()
                return

        super().keyPressEvent(event)

        # Auto-register character/scene when Enter is pressed
        if event.key() in (Qt.Key.Key_Enter, Qt.Key.Key_Return):
            tc = self.textCursor()
            block = tc.block()
            prev_block = block.previous()
            if prev_block.isValid():
                prev_text = prev_block.text().strip()
                prev_ltype = get_line_type(prev_text, LineType.ACTION)
                if prev_text:
                    if prev_ltype == LineType.CHARACTER:
                        self.character_entered.emit(prev_text)
                    elif prev_ltype == LineType.SCENE:
                        self.scene_entered.emit(prev_text)

        cancel_keys = (Qt.Key.Key_Up, Qt.Key.Key_Down, Qt.Key.Key_Left,
                       Qt.Key.Key_Right, Qt.Key.Key_Backspace, Qt.Key.Key_Delete,
                       Qt.Key.Key_Home, Qt.Key.Key_End, Qt.Key.Key_PageUp,
                       Qt.Key.Key_PageDown)
        if event.key() in cancel_keys:
            self._ac_timer.stop()
            self._ac_popup.hide()
            return

        if event.text() and event.text().isprintable():
            self._ac_timer.start(80)

    # ---- Context Menu (Fountain force type) ----
    def contextMenuEvent(self, event):
        menu = self.createStandardContextMenu()
        menu.addSeparator()
        menu.addAction(_("menu.force_scene"), lambda: self._force_type(LineType.SCENE))
        menu.addAction(_("menu.force_action"), lambda: self._force_type(LineType.ACTION))
        menu.addAction(_("menu.force_char"), lambda: self._force_type(LineType.CHARACTER))
        menu.addAction(_("menu.force_dialogue"), lambda: self._force_type(LineType.DIALOGUE))
        menu.addAction(_("menu.force_paren"), lambda: self._force_type(LineType.PARENTHETICAL))
        menu.addAction(_("menu.force_transition"), lambda: self._force_type(LineType.TRANSITION))
        menu.exec(event.globalPos())

    def _force_type(self, ltype: LineType):
        tc = self.textCursor()
        block = tc.block()
        line = block.blockNumber()
        self._forced_types[line] = ltype
        self.format_script()

    def _do_autocomplete(self):
        if self._ac_popup.isVisible():
            self._ac_popup.hide()

        try:
            tc = self.textCursor()
            block_text = tc.block().text()
            prefix = block_text[:tc.positionInBlock()]
        except RuntimeError:
            return

        if len(prefix) < 2 or not re.search(r'[A-ZÀ-Ú]', prefix):
            return

        matches = [n for n in self._char_names
                   if n.upper().startswith(prefix.upper()) and n.upper() != prefix.upper()]
        if not matches:
            return

        self._ac_list.clear()
        for m in matches[:10]:
            self._ac_list.addItem(m)
        self._ac_list.setCurrentRow(0)
        self._ac_list.setFixedWidth(
            max(180, self._ac_list.sizeHintForColumn(0) + 30))
        self._ac_list.setFixedHeight(min(200, self._ac_list.count() * 24 + 4))

        cr = self.cursorRect()
        global_pos = self.viewport().mapToGlobal(cr.bottomLeft())
        screen = self.screen()
        if screen:
            sg = screen.availableGeometry()
            popup_w = self._ac_list.width() + 2
            popup_h = self._ac_list.height() + 2
            if global_pos.x() + popup_w > sg.right():
                global_pos.setX(sg.right() - popup_w)
            if global_pos.y() + popup_h > sg.bottom():
                global_pos.setY(cr.top() - self.viewport().mapTo(self, QPoint(0, 0)).y() - popup_h)
        self._ac_popup.move(global_pos)
        self._ac_popup.show()

    # ---- Hide Fountain Markup ----
    def toggle_hide_markup(self):
        self._hide_markup = not self._hide_markup
        self._apply_hide_markup()
        return self._hide_markup

    def _apply_hide_markup(self):
        import re
        pat = re.compile(r"(\*\*[^*]+\*\*|\*[^*]+\*)")
        text = self.toPlainText()

        base_selections = [s for s in self.extraSelections()
                           if not getattr(s, '_hide_markup', False)]
        self.setExtraSelections(base_selections)

        if not self._hide_markup:
            return

        extra = []
        bg = self.palette().color(self.palette().ColorRole.Base)
        for m in pat.finditer(text):
            sel = QTextEdit.ExtraSelection()
            sel._hide_markup = True
            sel.format.setBackground(bg)
            sel.format.setForeground(bg)
            c = self.textCursor()
            c.setPosition(m.start())
            c.setPosition(m.end(), QTextCursor.MoveMode.KeepAnchor)
            sel.cursor = c
            extra.append(sel)
        selections = base_selections + extra
        self.setExtraSelections(selections)

    # ---- Page Separator Info ----
    def page_line(self):
        return self._page_line

    def set_page_line(self, n):
        self._page_line = n
        self._line_number_area.update()
