"""
QSyntaxHighlighter for Fountain format.
Applies COLORS only. Formatting (margins, alignment) is done elsewhere.
"""

from PySide6.QtCore import Qt, QRegularExpression
from PySide6.QtGui import QSyntaxHighlighter, QTextCharFormat, QFont, QColor

from ..models.fountain import get_line_type, LineType

BLOCK_NORMAL = 0
BLOCK_CHARACTER = 1
BLOCK_PAREN = 2
BLOCK_DIALOGUE = 3


class FountainHighlighter(QSyntaxHighlighter):
    def __init__(self, document):
        super().__init__(document)
        self._colors = {}
        self._formats = {}

    def set_colors(self, colors: dict):
        self._colors = colors
        self._build_formats()
        self.rehighlight()

    def _build_formats(self):
        c = self._colors
        self._formats = {
            "SCENE": self._make_format(c.get("scene", "#000099"), QFont.Bold),
            "CHARACTER": self._make_format(c.get("char", "#333333"), QFont.Normal),
            "DIALOGUE": self._make_format(c.get("dialogue", "#111111"), QFont.Normal),
            "PARENTHETICAL": self._make_format(c.get("paren", "#555555"), QFont.Normal),
            "TRANSITION": self._make_format(c.get("trans", "#000000"), QFont.Normal),
            "CENTER": self._make_format(c.get("center", "#111111"), QFont.Normal),
            "ACTION": self._make_format(c.get("action", "#111111"), QFont.Normal),
        }
        # Reference format {CHAR:}, {LOC:}, {BEAT:}
        self._ref_fmt = QTextCharFormat()
        self._ref_fmt.setForeground(QColor("#569cd6"))
        self._ref_fmt.setBackground(QColor(86, 156, 214, 38))
        self._ref_fmt.setFontWeight(QFont.Bold)
        self._ref_regex = QRegularExpression(r"\{[A-Z]+:[^}]+\}")

    def _make_format(self, color, weight):
        fmt = QTextCharFormat()
        fmt.setForeground(self._make_color(color))
        fmt.setFontWeight(weight)
        return fmt

    def _make_color(self, hex_color):
        h = hex_color.lstrip("#")
        return QColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))

    def highlightBlock(self, text):
        prev = self.previousBlockState()

        if not text.strip():
            self.setCurrentBlockState(BLOCK_NORMAL)
            return

        ltype = get_line_type(text, self._state_to_type(prev))
        key = str(ltype).split(".")[1]
        self.setFormat(0, len(text), self._formats.get(key, self._formats["ACTION"]))

        if ltype == LineType.CHARACTER:
            self.setCurrentBlockState(BLOCK_CHARACTER)
        elif ltype == LineType.PARENTHETICAL:
            self.setCurrentBlockState(BLOCK_PAREN)
        elif ltype == LineType.DIALOGUE:
            self.setCurrentBlockState(BLOCK_DIALOGUE)
        else:
            self.setCurrentBlockState(BLOCK_NORMAL)

        # Reference highlighting
        it = self._ref_regex.globalMatch(text)
        while it.hasNext():
            m = it.next()
            self.setFormat(m.capturedStart(), m.capturedLength(), self._ref_fmt)

    def _state_to_type(self, state):
        if state == BLOCK_CHARACTER:
            return LineType.CHARACTER
        elif state == BLOCK_PAREN:
            return LineType.PARENTHETICAL
        elif state == BLOCK_DIALOGUE:
            return LineType.DIALOGUE
        return LineType.ACTION
