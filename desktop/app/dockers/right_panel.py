"""
Right Panel — wraps CharacterDock and LocationDock in a single
tabbed dock (matching app-ui.html reference layout).
"""

from PySide6.QtCore import Qt, Signal
from ..core.i18n import _
from PySide6.QtWidgets import QDockWidget, QWidget, QVBoxLayout, QTabWidget

from .character_dock import CharacterDock
from .location_dock import LocationDock


class RightPanel(QDockWidget):
    changed = Signal()

    def __init__(self, parent=None):
        super().__init__("", parent)
        self.setObjectName("RightPanel")
        self.setMinimumWidth(220)
        self.setFeatures(QDockWidget.DockWidgetFeature.NoDockWidgetFeatures)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        self._tabs = QTabWidget()
        self._tabs.setDocumentMode(True)
        self._tabs.tabBar().setStyleSheet("""
            QTabBar { border-bottom: 1px solid #2a2a32; }
            QTabBar::tab {
                font: 11px 'Inter',sans-serif; font-weight: 500;
                text-transform: uppercase; letter-spacing: 0.07em;
                padding: 8px 14px; color: #6b6b78;
                border-bottom: 2px solid transparent;
                background: transparent;
            }
            QTabBar::tab:selected { color: #f97316; border-bottom-color: #f97316; }
            QTabBar::tab:hover { color: #ececed; }
        """)

        self._char_dock = CharacterDock(None)
        self._char_widget = self._char_dock.widget()
        self._char_dock.setWidget(None)
        self._tabs.addTab(self._char_widget, _("right_panel.characters"))

        self._loc_dock = LocationDock(None)
        self._loc_widget = self._loc_dock.widget()
        self._loc_dock.setWidget(None)
        self._tabs.addTab(self._loc_widget, _("right_panel.locations"))

        layout.addWidget(self._tabs)
        self.setWidget(container)

        self._char_dock.changed.connect(self._on_inner_changed)
        self._loc_dock.changed.connect(self._on_inner_changed)

    # ── Delegate API ──
    def set_characters(self, chars):
        self._char_dock.set_characters(chars)

    def set_locations(self, locs):
        self._loc_dock.set_locations(locs)

    def get_characters(self):
        return self._char_dock.get_characters()

    def get_locations(self):
        return self._loc_dock.get_locations()

    def get_character_names(self):
        return self._char_dock.get_character_names()

    @property
    def _characters(self):
        return self._char_dock._characters

    @property
    def _locations(self):
        return self._loc_dock._locations

    def _refresh_list(self):
        self._char_dock._refresh_list()
        self._loc_dock._refresh_list()

    def _on_inner_changed(self):
        self.changed.emit()

    def setStyleSheet(self, qss):
        super().setStyleSheet(qss)
        self._char_dock.setStyleSheet(qss)
        self._loc_dock.setStyleSheet(qss)
