"""
Design system — tokens, QSS, and color maps.
Inspired by app-ui.html reference layout (dark theme with orange accent).
"""

import os

BASE = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

# ── Tokens ──────────────────────────────────────────────────────────────

DARK = {
    "bg":           "#0e0e12",
    "surface":      "#17171c",
    "surface2":     "#1e1e24",
    "surface3":     "#26262d",
    "fg":           "#ececed",
    "fg_sec":       "#9d9da8",
    "muted":        "#6b6b78",
    "border":       "#2a2a32",
    "accent":       "#888888",
    "accent_dim":   "#666666",
    "editor_bg":    "#121216",
    "line_num":     "#4a4a56",
    "sel_bg":       "rgba(136,136,136,0.2)",
}

LIGHT = {
    "bg":           "#f5f5f0",
    "surface":      "#fafaf8",
    "surface2":     "#f0f0ec",
    "surface3":     "#e8e8e2",
    "fg":           "#1a1a18",
    "fg_sec":       "#6b6b64",
    "muted":        "#9a9a92",
    "border":       "#d8d8d2",
    "accent":       "#888888",
    "accent_dim":   "#666666",
    "editor_bg":    "#fdfdfc",
    "line_num":     "#b0b0a8",
    "sel_bg":       "rgba(136,136,136,0.12)",
}

# ── QSS templates ───────────────────────────────────────────────────────

def _build_qss(t):
    return f"""
QMainWindow {{ background: {t['bg']}; }}
QMenuBar {{
    background: {t['surface']}; color: {t['fg']};
    border-bottom: 1px solid {t['border']};
    font: 12pt 'Courier New',Courier,monospace; padding: 2px 4px;
}}
QMenuBar::item {{
    padding: 4px 10px; border-radius: 4px;
    background: transparent; color: {t['fg']};
}}
QMenuBar::item:selected {{ background: {t['surface3']}; }}
QMenu {{
    background: {t['surface2']}; color: {t['fg']};
    border: 1px solid {t['border']}; border-radius: 6px; padding: 4px;
}}
QMenu::item {{ padding: 6px 28px 6px 16px; border-radius: 4px; }}
QMenu::item:selected {{ background: {t['surface3']}; }}
QMenu::separator {{ height: 1px; background: {t['border']}; margin: 4px 8px; }}

QToolBar {{
    background: {t['surface']}; border: none; border-bottom: 1px solid {t['border']};
    padding: 2px 8px; spacing: 2px;
}}
QToolBar QToolButton {{
    color: {t['fg']}; background: transparent; border: none;
    border-radius: 4px; padding: 6px 10px; font: 11pt 'Courier New',Courier,monospace;
}}
QToolBar QToolButton:hover {{ background: {t['surface3']}; }}
QToolBar QToolButton:pressed {{ background: {t['border']}; }}
QToolBar QToolButton:checked {{ background: {t['sel_bg']}; color: {t['accent']}; }}

QDockWidget {{
    background: {t['surface']}; color: {t['fg']};
    titlebar-close-icon: url(none);
}}
QDockWidget::title {{
    background: {t['surface']}; color: {t['muted']};
    padding: 6px 12px;
    font: 11pt 'Courier New',Courier,monospace;
    font-weight: bold;
    border-bottom: 1px solid {t['border']};
}}

QListWidget {{
    background: {t['surface']}; color: {t['fg']}; border: none;
    font: 13px 'Inter','Segoe UI',sans-serif; outline: none;
}}
QListWidget::item {{
    padding: 6px 10px; border-radius: 4px; margin: 0px 4px;
}}
QListWidget::item:selected {{
    background: {t['sel_bg']}; color: {t['accent']};
}}
QListWidget::item:hover {{
    background: {t['surface3']};
}}

QTreeWidget {{
    background: {t['surface']}; color: {t['fg']}; border: none;
    font: 13px 'Inter','Segoe UI',sans-serif; outline: none;
}}
QTreeWidget::item {{
    padding: 4px 6px; border-radius: 4px;
}}
QTreeWidget::item:selected {{
    background: {t['sel_bg']}; color: {t['accent']};
}}
QTreeWidget::item:hover {{
    background: {t['surface3']};
}}

QStatusBar {{
    background: {t['surface2']}; color: {t['muted']};
    font: 11px 'Inter','Segoe UI',sans-serif;
    border-top: 1px solid {t['border']};
}}
QStatusBar::item {{ border: none; }}

QDialog {{
    background: {t['surface']}; color: {t['fg']};
}}
QLineEdit {{
    padding: 4px 10px; border: 1px solid {t['border']};
    border-radius: 4px; background: {t['surface3']};
    color: {t['fg']}; font: 13px 'Inter','Segoe UI',sans-serif;
    selection-background-color: {t['accent']};
    selection-color: #fff;
}}
QLineEdit:focus {{ border-color: {t['accent']}; }}
QLineEdit::placeholder {{ color: {t['muted']}; }}

QTextEdit {{
    background: {t['surface3']}; color: {t['fg']};
    border: 1px solid {t['border']}; border-radius: 4px;
    selection-background-color: {t['accent']};
    selection-color: #fff;
}}

QPushButton {{
    background: {t['surface3']}; color: {t['fg_sec']};
    border: 1px solid {t['border']}; border-radius: 4px;
    padding: 5px 14px; font: 12px 'Inter','Segoe UI',sans-serif;
}}
QPushButton:hover {{ background: {t['border']}; color: {t['fg']}; }}
QPushButton:pressed {{ background: {t['surface3']}; }}
QPushButton:default {{
    background: {t['accent']}; color: #fff; border-color: {t['accent']};
}}
QPushButton:default:hover {{ background: {t['accent_dim']}; }}

QLabel {{
    color: {t['fg']}; font: 13px 'Inter','Segoe UI',sans-serif;
}}

QComboBox {{
    background: {t['surface3']}; color: {t['fg']};
    border: 1px solid {t['border']}; border-radius: 4px;
    padding: 4px 8px; font: 12px 'Inter','Segoe UI',sans-serif;
}}
QComboBox:hover {{ border-color: {t['accent']}; }}
QComboBox::drop-down {{
    border: none; width: 20px;
}}
QComboBox QAbstractItemView {{
    background: {t['surface2']}; color: {t['fg']};
    border: 1px solid {t['border']}; border-radius: 4px;
    selection-background-color: {t['surface3']};
    selection-color: {t['accent']};
}}

QCheckBox {{
    color: {t['fg_sec']}; font: 12px 'Inter','Segoe UI',sans-serif;
}}
QCheckBox::indicator {{
    width: 16px; height: 16px; border-radius: 3px;
    border: 1px solid {t['border']}; background: {t['surface3']};
}}
QCheckBox::indicator:checked {{
    background: {t['accent']}; border-color: {t['accent']};
}}

QScrollBar:vertical {{
    width: 6px; background: transparent; margin: 0;
}}
QScrollBar::handle:vertical {{
    background: {t['border']}; border-radius: 3px; min-height: 30px;
}}
QScrollBar::handle:vertical:hover {{ background: {t['muted']}; }}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
QScrollBar:horizontal {{
    height: 6px; background: transparent; margin: 0;
}}
QScrollBar::handle:horizontal {{
    background: {t['border']}; border-radius: 3px; min-width: 30px;
}}
QScrollBar::handle:horizontal:hover {{ background: {t['muted']}; }}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ width: 0; }}

QSplitter::handle {{
    background: {t['border']}; width: 1px; height: 1px;
}}

QGroupBox {{
    font-weight: 600; border: 1px solid {t['border']};
    border-radius: 4px; margin-top: 8px; padding-top: 14px;
    color: {t['fg_sec']};
}}
QGroupBox::title {{
    subcontrol-origin: margin; left: 10px; padding: 0 4px;
}}

#ACPopup QFrame {{
    background: {t['surface2']}; border: 1px solid {t['border']};
    border-radius: 4px;
}}

QFrame#SceneHeader {{
    background: {t['surface']}; border-bottom: 1px solid {t['border']};
}}
#SceneCount {{
    background: {t['accent']}; color: #fff; border-radius: 8px;
    font-size: 10px; font-weight: bold; padding: 1px 6px;
}}
#SceneFilter {{
    border: 1px solid {t['border']}; border-radius: 10px;
    padding: 2px 8px; background: {t['surface3']};
    color: {t['fg']}; font-size: 11px; max-width: 140px;
}}
#SceneFilter:focus {{ border-color: {t['accent']}; }}
"""


LIGHT_QSS = _build_qss(LIGHT)
DARK_QSS  = _build_qss(DARK)


class ThemeManager:
    THEME_COLORS = {
        "light": {
            "paper":     "#fdfdfc",
            "text":      "#1a1a18",
            "cursor":    "#1a1a18",
            "line_highlight": "rgba(136,136,136,0.12)",
            "gutter_bg": "#fdfdfc",
            "gutter_fg": "#b0b0a8",
            "gutter_sep": "#d8d8d2",
            "scene":     "#555555",
            "char":      "#333333",
            "trans":     "#555555",
            "paren":     "#666666",
            "dialogue":  "#1a1a18",
            "action":    "#1a1a18",
            "center":    "#1a1a18",
        },
        "dark": {
            "paper":     "#121216",
            "text":      "#ececed",
            "cursor":    "#ececed",
            "line_highlight": "rgba(255,255,255,0.06)",
            "gutter_bg": "#121216",
            "gutter_fg": "#4a4a56",
            "gutter_sep": "#4a4a56",
            "scene":     "#ececed",
            "char":      "#ececed",
            "trans":     "#ececed",
            "paren":     "#b0b0b0",
            "dialogue":  "#ececed",
            "action":    "#ececed",
            "center":    "#ececed",
        },
    }

    TOKENS = {"light": LIGHT, "dark": DARK}

    @staticmethod
    def get_qss(mode):
        return LIGHT_QSS if mode == "light" else DARK_QSS

    @staticmethod
    def get_colors(mode):
        return ThemeManager.THEME_COLORS.get(mode, ThemeManager.THEME_COLORS["light"])

    @staticmethod
    def get_tokens(mode):
        return ThemeManager.TOKENS.get(mode, LIGHT)
