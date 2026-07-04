from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QPainter, QColor, QFont, QPen
from PySide6.QtWidgets import QWidget

from ..models.fountain import get_line_type, LineType


class LineNumberArea(QWidget):
    def __init__(self, editor):
        super().__init__(editor)
        self._editor = editor
        self._gutter_bg = "#f5f5f5"
        self._gutter_fg = "#999999"
        self._gutter_sep = "#cccccc"
        self._page_line = 55
        self._dark_mode = False

    def set_colors(self, bg, fg, sep):
        self._gutter_bg = bg
        self._gutter_fg = fg
        self._gutter_sep = sep
        self.update()

    def sizeHint(self):
        return QSize(self._editor.line_number_width(), 0)

    def mousePressEvent(self, event):
        try:
            scrollbar = self._editor.verticalScrollBar()
            scroll_y = scrollbar.value() if scrollbar else 0
            font_h = self._editor.fontMetrics().height() or 16
            line_height = font_h + 4
            clicked_line = int((event.position().y() + scroll_y - 2) // line_height)
            if self._editor._is_scene_heading(clicked_line):
                self._editor.toggle_fold(clicked_line)
        except RuntimeError:
            pass
        super().mousePressEvent(event)

    def paintEvent(self, event):
        try:
            painter = QPainter(self)
            try:
                painter.fillRect(event.rect(), QColor(self._gutter_bg))
                font = QFont("Segoe UI", 8)
                painter.setFont(font)
                painter.setPen(QColor(self._gutter_fg))

                doc = self._editor.document()
                scrollbar = self._editor.verticalScrollBar()
                scroll_y = scrollbar.value() if scrollbar else 0
                viewport_h = self._editor.viewport().height() if self._editor.viewport() else 600
                font_h = self._editor.fontMetrics().height() or 16
                line_height = font_h + 4
                first_visible = max(0, scroll_y // line_height)
                last_visible = min(doc.blockCount(), first_visible + (viewport_h // line_height) + 2)

                for i in range(first_visible, last_visible):
                    block = doc.findBlockByNumber(i)
                    if not block.isValid():
                        continue
                    line_num = i + 1
                    y = i * line_height - scroll_y + 2

                    painter.drawText(0, y, self.width() - 4, font_h,
                                     Qt.AlignmentFlag.AlignRight, str(line_num))

                    # Draw fold icon for scene headings
                    if self._editor._is_scene_heading(i):
                        is_folded = i in self._editor._folded_scenes
                        painter.setPen(QColor(self._gutter_fg))
                        painter.drawText(2, y, 12, font_h,
                                         Qt.AlignmentFlag.AlignCenter, "▶" if is_folded else "▼")

                    if line_num > 1 and (line_num - 1) % self._page_line == 0:
                        sep_pen = QPen(QColor(self._gutter_sep))
                        sep_pen.setWidth(2)
                        painter.setPen(sep_pen)
                        painter.drawLine(2, y - 2, self.width() - 2, y - 2)
                        page_num = ((line_num - 1) // self._page_line) + 1
                        painter.setPen(QColor(self._gutter_fg))
                        pg_font = QFont("Segoe UI", 6)
                        painter.setFont(pg_font)
                        painter.drawText(2, y - 12, self.width() - 4, 10,
                                         Qt.AlignmentFlag.AlignLeft, f"Pg.{page_num}")
                        painter.setFont(font)
                        painter.setPen(QColor(self._gutter_fg))
            finally:
                painter.end()
        except RuntimeError:
            pass
