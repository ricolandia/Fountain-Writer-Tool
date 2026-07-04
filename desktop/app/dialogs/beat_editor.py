from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (QDialog, QVBoxLayout, QHBoxLayout, QFormLayout,
                                QLabel, QLineEdit, QTextEdit, QPushButton,
                                QComboBox, QFrame, QMessageBox, QListWidget,
                                QListWidgetItem, QSplitter, QWidget,
                                QDialogButtonBox)

from ..models.meta import Beat


COLORS = [
    ("#569cd6", "Azul"), ("#4ec9b0", "Verde"), ("#dcdcaa", "Amarelo"),
    ("#c586c0", "Roxo"), ("#d16969", "Vermelho"), ("#6a9955", "Verde escuro"),
    ("#ce9178", "Laranja"), ("#9cdcfe", "Ciano"), ("#808080", "Cinza"),
]


class BeatEditorDialog(QDialog):
    def __init__(self, beat: Beat, all_beats: list[Beat], parent=None,
                 plotlines: list[str] | None = None,
                 scenes: list[tuple[int, str, str]] | None = None,
                 navigate_callback=None):
        super().__init__(parent)
        self._beat = beat
        self._all_beats = all_beats
        self._navigate_callback = navigate_callback
        self.setWindowTitle("Editar Beat")
        self.setMinimumSize(520, 420)

        layout = QVBoxLayout(self)
        layout.setSpacing(8)

        # Form + scene list in a horizontal splitter
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # Left: form
        form_widget = QWidget()
        form = QFormLayout(form_widget)
        form.setSpacing(6)
        form.setContentsMargins(0, 0, 0, 0)

        self._field_title = QLineEdit(beat.title)
        form.addRow("Título:", self._field_title)

        self._field_desc = QTextEdit()
        self._field_desc.setPlainText(beat.description)
        self._field_desc.setMaximumHeight(60)
        form.addRow("Descrição:", self._field_desc)

        self._combo_act = QComboBox()
        all_acts = sorted(set(b.act for b in all_beats if b.act)) or ["Ato 1"]
        if beat.act and beat.act not in all_acts:
            all_acts.append(beat.act)
        for a in all_acts:
            self._combo_act.addItem(a)
        idx = self._combo_act.findText(beat.act or "Ato 1")
        if idx >= 0:
            self._combo_act.setCurrentIndex(idx)
        self._combo_act.setEditable(True)
        form.addRow("Ato:", self._combo_act)

        self._combo_plot = QComboBox()
        all_plots = (sorted(set(b.plotline for b in all_beats if b.plotline))
                     if plotlines is None else list(plotlines))
        if not all_plots:
            all_plots = ["Principal"]
        if beat.plotline and beat.plotline not in all_plots:
            all_plots.append(beat.plotline)
        for pl in all_plots:
            self._combo_plot.addItem(pl)
        idx = self._combo_plot.findText(beat.plotline or "Principal")
        if idx >= 0:
            self._combo_plot.setCurrentIndex(idx)
        self._combo_plot.setEditable(True)
        form.addRow("Trama:", self._combo_plot)

        # Color picker
        color_row = QHBoxLayout()
        self._color_btns: list[QPushButton] = []
        self._selected_color = beat.color
        for hex_color, name in COLORS:
            btn = QPushButton()
            btn.setFixedSize(24, 24)
            btn.setStyleSheet(
                f"background: {hex_color}; border-radius: 12px; "
                f"border: {'3px solid #333' if hex_color == beat.color else '2px solid #ccc'};")
            btn.clicked.connect(lambda checked, c=hex_color: self._select_color(c))
            color_row.addWidget(btn)
            self._color_btns.append(btn)
        color_row.addStretch()
        form.addRow("Cor:", color_row)

        # Scene reference (manual)
        self._field_scene = QLineEdit(beat.scene_ref)
        self._field_scene.setPlaceholderText("Ex: INT. SALA - DIA")
        form.addRow("Cena ref.:", self._field_scene)

        splitter.addWidget(form_widget)

        # Right: scene list
        scenes_widget = QWidget()
        scenes_layout = QVBoxLayout(scenes_widget)
        scenes_layout.setContentsMargins(8, 0, 0, 0)
        scenes_layout.setSpacing(2)
        scenes_layout.addWidget(QLabel("Cenas do roteiro:"))
        self._scene_list = QListWidget()
        self._scene_list.setFrameShape(QListWidget.Shape.NoFrame)
        self._scene_list.itemDoubleClicked.connect(self._on_scene_selected)
        self._scene_list.setToolTip("Duplo clique para navegar e referenciar")

        if scenes:
            for idx, label, pos in scenes:
                item = QListWidgetItem(f"{idx}. {label[:40]}")
                item.setData(Qt.ItemDataRole.UserRole, pos)
                item.setToolTip(f"Posição: {pos}")
                self._scene_list.addItem(item)
        else:
            self._scene_list.addItem("(Nenhuma cena)")

        scenes_layout.addWidget(self._scene_list)
        splitter.addWidget(scenes_widget)
        splitter.setSizes([300, 200])

        layout.addWidget(splitter, 1)

        # Buttons
        btn_box = QHBoxLayout()
        self._btn_delete = QPushButton("Excluir")
        self._btn_delete.setStyleSheet("color: #d16969;")
        btn_box.addWidget(self._btn_delete)

        btn_save = QPushButton("Salvar")
        btn_save.setDefault(True)
        btn_save.clicked.connect(self._save)
        btn_box.addStretch()
        btn_box.addWidget(btn_save)

        btn_cancel = QPushButton("Cancelar")
        btn_cancel.clicked.connect(self.reject)
        btn_box.addWidget(btn_cancel)

        layout.addLayout(btn_box)

        self._btn_delete.clicked.connect(self._delete)

    def _select_color(self, hex_color):
        self._selected_color = hex_color
        for btn in self._color_btns:
            bg = [s for s in btn.styleSheet().split(";") if "background" in s]
            if bg and hex_color in bg[0]:
                btn.setStyleSheet(
                    f"background: {hex_color}; border-radius: 12px; border: 3px solid #333;")
            else:
                btn.setStyleSheet(
                    f"{bg[0] if bg else 'background: #ccc'}; border: 2px solid #ccc;")

    def _on_scene_selected(self, item):
        try:
            pos = item.data(Qt.ItemDataRole.UserRole)
            if pos:
                self._field_scene.setText(pos)
                if self._navigate_callback:
                    self._navigate_callback(pos)
        except Exception:
            pass

    def _save(self):
        self._beat.title = self._field_title.text().strip()
        self._beat.description = self._field_desc.toPlainText().strip()
        self._beat.act = self._combo_act.currentText().strip()
        self._beat.plotline = self._combo_plot.currentText().strip()
        self._beat.color = self._selected_color
        self._beat.scene_ref = self._field_scene.text().strip()
        self.accept()

    def _delete(self):
        resp = QMessageBox.question(
            self, "Excluir beat",
            f"Excluir '{self._beat.title}'?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No)
        if resp == QMessageBox.StandardButton.Yes:
            if self._beat in self._all_beats:
                self._all_beats.remove(self._beat)
            self.accept()
