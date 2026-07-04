#!/usr/bin/env python3
"""
Fountain Writer — Editor de Roteiros no formato Fountain

Funcionalidades:
  - Destaque de sintaxe Fountain (cenas, personagens, diálogos, transições)
  - Busca e substituição (Ctrl+H) com navegação entre resultados
  - Contador de palavras / caracteres / duração estimada na status bar
  - Navegador de cenas na sidebar
  - Modo foco (F11) — esconde toolbar/sidebar, papel centralizado
  - Números de linha com separador visual de página (55 linhas)
  - Autocomplete de personagens ao digitar em MAIÚSCULAS
  - Destaque da linha atual
  - Exportação para PDF (com reportlab)
  - Temas claro/escuro
  - Configuração persistente (tema, geometria, preferências)
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import re
import textwrap
import os
import json
import tkinter.font as tkfont

# --- VERIFICAÇÃO DE DEPENDÊNCIAS ---
HAS_PDF_SUPPORT = False
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    HAS_PDF_SUPPORT = True
except ImportError:
    pass


CONFIG_DIR  = os.path.expanduser("~/.fountain-writer")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
MONO_FONTS  = ["Courier New", "Courier", "Liberation Mono",
               "DejaVu Sans Mono", "Ubuntu Mono", "monospace"]

def resolve_mono_font(size=13):
    families = tkfont.families()
    for name in MONO_FONTS:
        if name in families:
            return (name, size)
    return ("Courier", size)


# ---------------------------------------------------------------------------
# BOTÃO COM HOVER
# ---------------------------------------------------------------------------
class HoverButton(tk.Button):
    """Botão com efeito hover — acessível via teclado."""

    def __init__(self, master, text, command=None, bg="#333", fg="#fff",
                 hover_bg="#555", **kwargs):
        super().__init__(
            master, text=text, bg=bg, fg=fg, cursor="hand2",
            command=command, relief="flat", activebackground=hover_bg,
            activeforeground=fg, **kwargs
        )
        self.default_bg = bg
        self.hover_bg   = hover_bg
        self.bind("<Enter>", lambda _: self.config(bg=self.hover_bg))
        self.bind("<Leave>", lambda _: self.config(bg=self.default_bg))
        self.config(font=("Segoe UI", 10), padx=14, pady=5, borderwidth=0)


# ---------------------------------------------------------------------------
# JANELA DE BUSCA E SUBSTITUIÇÃO
# ---------------------------------------------------------------------------
class FindReplaceDialog(tk.Toplevel):
    """
    Painel flutuante de busca/substituição.
    Fica sempre visível sobre o editor sem bloquear a edição.
    """

    def __init__(self, master, text_widget, theme_colors):
        super().__init__(master)
        self._text    = text_widget
        self._matches = []   # lista de (start, end) dos resultados
        self._current = -1   # índice do resultado destacado

        self.title("Buscar / Substituir")
        self.resizable(False, False)
        self.protocol("WM_DELETE_WINDOW", self._fechar)

        # Posicionar à direita superior do pai
        px = master.winfo_x() + master.winfo_width() - 460
        py = master.winfo_y() + 60
        self.geometry(f"440x215+{px}+{py}")

        c = theme_colors
        self.configure(bg=c["sidebar"])

        lbl_kw = dict(bg=c["sidebar"], fg=c["sidebar_fg"],
                      font=("Segoe UI", 10))

        # --- Linha: Buscar ---
        row1 = tk.Frame(self, bg=c["sidebar"])
        row1.pack(fill="x", padx=12, pady=(14, 2))
        tk.Label(row1, text="Buscar:", width=11, anchor="w", **lbl_kw).pack(side="left")
        self._entry_find = tk.Entry(
            row1, font=("Segoe UI", 10),
            bg=c["paper"], fg=c["text"],
            insertbackground=c["caret"], relief="flat")
        self._entry_find.pack(side="left", fill="x", expand=True, ipady=4)
        self._entry_find.bind("<Return>",     lambda _: self._buscar())
        self._entry_find.bind("<KeyRelease>", lambda _: self._buscar_auto())

        # --- Linha: Substituir ---
        row2 = tk.Frame(self, bg=c["sidebar"])
        row2.pack(fill="x", padx=12, pady=2)
        tk.Label(row2, text="Substituir:", width=11, anchor="w", **lbl_kw).pack(side="left")
        self._entry_replace = tk.Entry(
            row2, font=("Segoe UI", 10),
            bg=c["paper"], fg=c["text"],
            insertbackground=c["caret"], relief="flat")
        self._entry_replace.pack(side="left", fill="x", expand=True, ipady=4)

        # --- Opções + contador ---
        row3 = tk.Frame(self, bg=c["sidebar"])
        row3.pack(fill="x", padx=12, pady=(6, 2))
        self._var_case = tk.BooleanVar(value=False)
        tk.Checkbutton(
            row3, text="Diferenciar maiúsculas",
            variable=self._var_case,
            bg=c["sidebar"], fg=c["sidebar_fg"],
            selectcolor=c["sidebar"],
            activebackground=c["sidebar"],
            font=("Segoe UI", 9),
            command=self._buscar).pack(side="left")

        self._lbl_count = tk.Label(
            row3, text="", bg=c["sidebar"],
            fg=c["sidebar_fg"], font=("Segoe UI", 9))
        self._lbl_count.pack(side="right", padx=4)

        # --- Botões ---
        row4 = tk.Frame(self, bg=c["sidebar"])
        row4.pack(fill="x", padx=12, pady=(8, 12))

        btn_kw = dict(font=("Segoe UI", 9), padx=10, pady=4,
                      relief="flat", cursor="hand2")
        accent = "#264f78" if c["sidebar"] == "#252526" else "#0066cc"

        tk.Button(row4, text="◀ Anterior", command=self._anterior,
                  bg=c["sidebar_sel"], fg="#fff", **btn_kw).pack(side="left", padx=2)
        tk.Button(row4, text="Próximo ▶", command=self._proximo,
                  bg=accent, fg="#fff", **btn_kw).pack(side="left", padx=2)
        tk.Button(row4, text="Substituir", command=self._substituir,
                  bg=c["sidebar"], fg=c["sidebar_fg"],
                  relief="groove", **btn_kw).pack(side="left", padx=(12, 2))
        tk.Button(row4, text="Substituir tudo", command=self._substituir_tudo,
                  bg=c["sidebar"], fg=c["sidebar_fg"],
                  relief="groove", **btn_kw).pack(side="left", padx=2)
        tk.Button(row4, text="✕", command=self._fechar,
                  bg=c["sidebar"], fg="#888", relief="flat",
                  font=("Segoe UI", 10), padx=8, pady=4,
                  cursor="hand2").pack(side="right")

        # Tags de highlight no Text
        self._text.tag_configure("FIND_ALL",  background="#665500",
                                 foreground="#ffffff")
        self._text.tag_configure("FIND_CURR", background="#cc8800",
                                 foreground="#000000")

        self._entry_find.focus_set()

    # ------------------------------------------------------------------ helpers
    def _termo(self):
        return self._entry_find.get()

    def _flags(self):
        return 0 if self._var_case.get() else re.IGNORECASE

    def _limpar_tags(self):
        self._text.tag_remove("FIND_ALL",  "1.0", tk.END)
        self._text.tag_remove("FIND_CURR", "1.0", tk.END)

    # ------------------------------------------------------------------ busca
    def _buscar_auto(self):
        """Dispara busca ao digitar (sem mover cursor)."""
        if len(self._termo()) >= 1:
            self._buscar(mover=False)
        else:
            self._limpar_tags()
            self._matches = []
            self._current = -1
            self._lbl_count.config(text="")

    def _buscar(self, mover=True):
        self._limpar_tags()
        termo = self._termo()
        if not termo:
            self._matches = []
            self._current = -1
            self._lbl_count.config(text="")
            return

        conteudo = self._text.get("1.0", tk.END)
        try:
            pattern = re.compile(re.escape(termo), self._flags())
        except re.error:
            return

        self._matches = []
        for m in pattern.finditer(conteudo):
            start = self._text.index(f"1.0 + {m.start()} chars")
            end   = self._text.index(f"1.0 + {m.end()} chars")
            self._matches.append((start, end))
            self._text.tag_add("FIND_ALL", start, end)

        total = len(self._matches)
        if total == 0:
            self._lbl_count.config(text="Nenhum resultado")
            self._current = -1
            return

        if mover:
            self._current = 0
        else:
            self._current = 0 if self._current < 0 else min(self._current, total - 1)

        self._destacar_atual()

    def _destacar_atual(self):
        self._text.tag_remove("FIND_CURR", "1.0", tk.END)
        if not self._matches or self._current < 0:
            return
        s, e = self._matches[self._current]
        self._text.tag_add("FIND_CURR", s, e)
        self._text.see(s)
        self._text.mark_set("insert", s)
        n = len(self._matches)
        self._lbl_count.config(text=f"{self._current + 1} / {n}")

    def _proximo(self):
        if not self._matches:
            self._buscar()
            return
        self._current = (self._current + 1) % len(self._matches)
        self._destacar_atual()

    def _anterior(self):
        if not self._matches:
            self._buscar()
            return
        self._current = (self._current - 1) % len(self._matches)
        self._destacar_atual()

    # ------------------------------------------------------------------ subst.
    def _substituir(self):
        """Substitui apenas o resultado atual."""
        if not self._matches or self._current < 0:
            self._buscar()
            return
        s, e = self._matches[self._current]
        novo = self._entry_replace.get()
        self._text.delete(s, e)
        self._text.insert(s, novo)
        self._buscar()

    def _substituir_tudo(self):
        termo = self._termo()
        if not termo:
            return
        novo = self._entry_replace.get()
        conteudo = self._text.get("1.0", tk.END)
        try:
            pattern = re.compile(re.escape(termo), self._flags())
        except re.error:
            return
        novo_conteudo, n = pattern.subn(novo, conteudo)
        if n:
            self._text.delete("1.0", tk.END)
            self._text.insert("1.0", novo_conteudo)
            messagebox.showinfo("Substituição",
                                f"{n} ocorrência(s) substituída(s).",
                                parent=self)
        else:
            messagebox.showinfo("Substituição",
                                "Nenhuma ocorrência encontrada.",
                                parent=self)
        self._buscar(mover=False)

    # ------------------------------------------------------------------ fechar
    def _fechar(self):
        self._limpar_tags()
        self.destroy()


# ---------------------------------------------------------------------------
# EDITOR PRINCIPAL
# ---------------------------------------------------------------------------
class FountainEditor:
    APP_NAME = "Fountain Writer"
    UNTITLED  = "Sem título"

    def __init__(self, root):
        self.root = root

        # Fonte monoespaçada (fallback cross-platform)
        self._mono_font    = resolve_mono_font(13)
        self._mono_font_12 = (self._mono_font[0], 12)
        self._mono_bold    = (self._mono_font[0], 13, "bold")

        # Estado
        self._current_file       = None
        self._is_modified        = False
        self._render_job         = None
        self._wordcount_job      = None
        self._is_sidebar_visible = True
        self._focus_mode         = False
        self._find_dialog        = None
        self._scene_map          = []
        self._last_dir           = os.path.expanduser("~")
        self._char_names         = []

        # Autocomplete state
        self._ac_window  = None
        self._ac_listbox = None

        # Regex Fountain
        self._re_scene = re.compile(
            r"^((INT|EXT|EST|I/E)[.\s]|^\.)[\w\W]+", re.IGNORECASE)
        self._re_trans  = re.compile(r"^[A-ZÀ-Ú\s]+(TO|PARA):$")
        self._re_char   = re.compile(r"^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$")
        self._re_paren  = re.compile(r"^\s*\(.*\)\s*$")

        self._config = self._load_config()
        self.root.geometry(self._config.get("geometry", "1100x720"))
        self.root.minsize(800, 500)
        self._set_window_icon()
        self._is_sidebar_visible = self._config.get("sidebar_visible", True)
        self._last_dir           = self._config.get("last_dir",
                                                     os.path.expanduser("~"))
        self._update_title()
        self.root.protocol("WM_DELETE_WINDOW", self._sair)

        # Temas
        self._theme_mode = self._config.get("theme", "light")
        self._themes = {
            "light": {
                "desk":          "#f0f0f0",
                "paper":         "#ffffff",
                "text":          "#111111",
                "caret":         "#000000",
                "sidebar":       "#e8e8e8",
                "sidebar_fg":    "#333333",
                "sidebar_sel":   "#0066cc",
                "scene":         "#000099",
                "char":          "#333333",
                "trans":         "#000000",
                "parenthetical": "#555555",
                "statusbar":     "#dcdcdc",
                "statusbar_fg":  "#555555",
                "separator":     "#bbbbbb",
                "toolbar":       "#2c2c2c",
                "scroll_bg":     "#e0e0e0",
                "scroll_fg":     "#aaaaaa",
                "scroll_hover":  "#888888",
                "gutter_bg":     "#f5f5f5",
                "gutter_fg":     "#999999",
                "gutter_sep":    "#cccccc",
                "line_highlight":"#f0f4ff",
            },
            "dark": {
                "desk":          "#121212",
                "paper":         "#1e1e1e",
                "text":          "#d4d4d4",
                "caret":         "#569cd6",
                "sidebar":       "#252526",
                "sidebar_fg":    "#dcdcaa",
                "sidebar_sel":   "#264f78",
                "scene":         "#569cd6",
                "char":          "#dcdcaa",
                "trans":         "#c586c0",
                "parenthetical": "#808080",
                "statusbar":     "#121212",
                "statusbar_fg":  "#666666",
                "separator":     "#333333",
                "toolbar":       "#1a1a1a",
                "scroll_bg":     "#1e1e1e",
                "scroll_fg":     "#444444",
                "scroll_hover":  "#666666",
                "gutter_bg":     "#181818",
                "gutter_fg":     "#555555",
                "gutter_sep":    "#333333",
                "line_highlight":"#1e2530",
            },
        }

        self._margins = {
            "action":        20,
            "dialogue":      120,
            "character":     200,
            "parenthetical": 160,
            "transition":    20,
        }

        self._style = ttk.Style()
        self._style.theme_use("clam")

        self._build_ui()
        self._bind_shortcuts()
        self._apply_theme("light")

    # =========================================================================
    #  INTERFACE
    # =========================================================================
    def _build_ui(self):
        # ----- Toolbar -----
        self._toolbar = tk.Frame(self.root, bg="#2c2c2c", height=42)
        self._toolbar.pack(side="top", fill="x")
        self._toolbar.pack_propagate(False)

        self._add_toolbar_btn("☰  Cenas",  self._toggle_sidebar)
        self._add_toolbar_btn("📂  Abrir",  self._carregar_arquivo)
        self._add_toolbar_btn("💾  Salvar", self._salvar_arquivo)
        self._add_toolbar_btn("📄  Novo",   self._novo_arquivo)
        self._add_toolbar_btn("📑  PDF",    self._exportar_pdf)
        self._add_toolbar_btn("🔍  Buscar", self._abrir_busca)
        self._add_toolbar_btn("🎯  Foco",   self._alternar_foco)
        self._add_toolbar_btn("🌗  Tema",   self._alternar_tema)
        self._add_toolbar_btn("❓  Ajuda",  self._mostrar_ajuda)
        self._add_toolbar_btn("✕  Sair",   self._sair,
                               side="right", fg="#ff6b6b", hover_bg="#5a1e1e")

        tk.Label(self._toolbar, text=self.APP_NAME, bg="#2c2c2c",
                 fg="#888888", font=("Segoe UI", 9, "bold")).pack(
                     side="left", padx=20)

        # ----- Container principal -----
        self._main = tk.Frame(self.root)
        self._main.pack(fill="both", expand=True)

        # ----- Sidebar -----
        self._sidebar = tk.Frame(self._main, width=240)
        self._sidebar.pack(side="left", fill="y")
        self._sidebar.pack_propagate(False)

        self._lbl_nav = tk.Label(
            self._sidebar, text="CENAS",
            font=("Segoe UI", 8, "bold"), anchor="w")
        self._lbl_nav.pack(fill="x", padx=12, pady=(12, 4))

        self._scene_list = tk.Listbox(
            self._sidebar, font=("Segoe UI", 9), relief="flat",
            highlightthickness=0, bd=0, activestyle="none")
        self._scene_list.pack(fill="both", expand=True, padx=6, pady=4)
        self._scene_list.bind("<<ListboxSelect>>", self._navegar_cena)

        # ----- Área do papel -----
        self._desk = tk.Frame(self._main)
        self._desk.pack(side="left", fill="both", expand=True)

        self._paper_frame = tk.Frame(self._desk)
        self._paper_frame.pack(expand=True, fill="both", padx=30, pady=20)

        # Frame interno: gutter + texto
        self._text_frame = tk.Frame(self._paper_frame)
        self._text_frame.pack(side="left", fill="both", expand=True)

        # Gutter (números de linha + separador de página)
        self._line_canvas = tk.Canvas(
            self._text_frame, width=48, relief="flat",
            highlightthickness=0)
        self._line_canvas.pack(side="left", fill="y")

        self._scrollbar = ttk.Scrollbar(self._paper_frame, orient="vertical")
        self._scrollbar.pack(side="right", fill="y")

        self._text = tk.Text(
            self._text_frame, width=80, font=self._mono_font,
            relief="flat", padx=50, pady=50, undo=True, wrap="word",
            spacing1=4, spacing2=2,
            yscrollcommand=self._sync_scroll)
        self._text.pack(side="left", fill="both", expand=True)
        self._scrollbar.config(command=self._text.yview)
        self._text.focus_set()

        self._text.bind("<<Modified>>", self._on_text_modified)
        self._text.bind("<KeyRelease>",     self._on_key_release_all)
        self._text.bind("<ButtonRelease-1>", self._on_click)
        self._text.bind("<Configure>",      lambda _: self._redraw_line_numbers())
        self._text.tag_configure("CURRENT_LINE", foreground="")

        self._text_frame.bind("<Configure>", lambda _: self._redraw_line_numbers())

        # Autocomplete popup
        self._ac_window = tk.Toplevel(self.root)
        self._ac_window.withdraw()
        self._ac_window.overrideredirect(True)
        self._ac_listbox = tk.Listbox(
            self._ac_window, font=("Segoe UI", 10), height=8,
            relief="solid", bd=1, activestyle="none",
            selectbackground="#264f78", selectforeground="#fff")
        self._ac_listbox.pack(fill="both", expand=True)
        self._ac_listbox.bind("<ButtonRelease-1>", self._ac_inserir)
        self._ac_listbox.bind("<Return>",           self._ac_inserir)
        self._ac_listbox.bind("<Escape>",           lambda _: self._ac_esconder())
        self._ac_window.bind("<FocusOut>",          lambda _: self._ac_esconder())

        # ----- Status bar -----
        self._status_container = tk.Frame(self.root, height=26)
        self._status_container.pack(side="bottom", fill="x")
        self._status_container.pack_propagate(False)

        self._sep = tk.Frame(self._status_container, height=1)
        self._sep.pack(side="top", fill="x")

        self._status_bar = tk.Frame(self._status_container, height=25)
        self._status_bar.pack(fill="x")

        # Lado esquerdo da status bar
        self._lbl_scenes = tk.Label(
            self._status_bar, text="Cenas: 0", font=("Segoe UI", 9))
        self._lbl_scenes.pack(side="left", padx=16, pady=2)

        self._lbl_words = tk.Label(
            self._status_bar, text="Palavras: 0", font=("Segoe UI", 9))
        self._lbl_words.pack(side="left", padx=4, pady=2)

        self._lbl_chars = tk.Label(
            self._status_bar, text="| Caracteres: 0", font=("Segoe UI", 9))
        self._lbl_chars.pack(side="left", padx=4, pady=2)

        self._lbl_readtime = tk.Label(
            self._status_bar, text="", font=("Segoe UI", 9))
        self._lbl_readtime.pack(side="left", padx=4, pady=2)

        self._lbl_saved = tk.Label(
            self._status_bar, text="", font=("Segoe UI", 9))
        self._lbl_saved.pack(side="left", padx=10, pady=2)

        # Lado direito da status bar
        self._lbl_page = tk.Label(
            self._status_bar, text="Página: 1", font=("Segoe UI", 9))
        self._lbl_page.pack(side="right", padx=16, pady=2)

    def _add_toolbar_btn(self, text, command, side="left", fg=None,
                         hover_bg="#3e3e42"):
        if fg is None:
            fg = "#cccccc"
        btn = HoverButton(self._toolbar, text=text, command=command,
                          bg="#2c2c2c", fg=fg, hover_bg=hover_bg)
        btn.pack(side=side, padx=1, pady=4)

    def _bind_shortcuts(self):
        self.root.bind("<Control-s>",  lambda _: self._salvar_arquivo())
        self.root.bind("<Control-o>",  lambda _: self._carregar_arquivo())
        self.root.bind("<Control-n>",  lambda _: self._novo_arquivo())
        self.root.bind("<Control-h>",  lambda _: self._abrir_busca())
        self.root.bind("<Control-f>",  lambda _: self._abrir_busca())
        self.root.bind("<F11>",        lambda _: self._alternar_foco())
        self.root.bind("<Escape>",     self._escape_handler)
        self.root.bind("<Control-Up>",  lambda _: self._scroll_page(-1))
        self.root.bind("<Control-Down>", lambda _: self._scroll_page(1))

    def _escape_handler(self, _=None):
        """Escape: fecha autocomplete ou sai do modo foco."""
        if self._ac_window and self._ac_window.winfo_viewable():
            self._ac_esconder()
        elif self._focus_mode:
            self._alternar_foco()

    # =========================================================================
    #  ARQUIVOS
    # =========================================================================
    def _update_title(self):
        nome = (os.path.basename(self._current_file)
                if self._current_file else self.UNTITLED)
        mod = " •" if self._is_modified else ""
        self.root.title(f"{nome}{mod} — {self.APP_NAME}")

    def _on_text_modified(self, _=None):
        if self._text.edit_modified():
            if not self._is_modified:
                self._is_modified = True
                self._update_title()
                self._lbl_saved.config(text="")
            self._text.edit_modified(False)
        self._redraw_line_numbers()

    def _confirm_discard(self):
        if not self._is_modified:
            return True
        resp = messagebox.askyesnocancel(
            "Alterações não salvas",
            "Há alterações não salvas. Deseja salvar antes de continuar?")
        if resp is None:
            return False
        if resp:
            return self._salvar_arquivo()
        return True

    def _novo_arquivo(self):
        if not self._confirm_discard():
            return
        self._text.delete("1.0", tk.END)
        self._current_file = None
        self._is_modified  = False
        self._update_title()
        self._lbl_saved.config(text="")
        self._renderizar()
        self._atualizar_contador_palavras()

    def _carregar_arquivo(self):
        if not self._confirm_discard():
            return
        fp = filedialog.askopenfilename(
            initialdir=self._last_dir,
            filetypes=[("Fountain", "*.fountain"), ("Texto", "*.txt"),
                       ("Todos", "*.*")])
        if not fp:
            return
        self._last_dir = os.path.dirname(fp)
        try:
            with open(fp, "r", encoding="utf-8") as f:
                conteudo = f.read()
            self._text.delete("1.0", tk.END)
            self._text.insert(tk.END, conteudo)
            self._current_file = fp
            self._is_modified  = False
            self._update_title()
            self._renderizar()
            self._atualizar_contador_palavras()
        except Exception as e:
            messagebox.showerror("Erro ao abrir", str(e))

    def _salvar_arquivo(self):
        fp = self._current_file
        if not fp:
            fp = filedialog.asksaveasfilename(
                initialdir=self._last_dir,
                defaultextension=".fountain",
                filetypes=[("Fountain", "*.fountain"), ("Texto", "*.txt")])
            if not fp:
                return False
        self._last_dir = os.path.dirname(fp)
        try:
            with open(fp, "w", encoding="utf-8") as f:
                f.write(self._text.get("1.0", tk.END))
            self._current_file = fp
            self._is_modified  = False
            self._update_title()
            self._feedback_salvo()
            return True
        except Exception as e:
            messagebox.showerror("Erro ao salvar", str(e))
            return False

    def _feedback_salvo(self):
        self._lbl_saved.config(text="✓ Salvo", fg="#4caf50")
        self.root.after(3000, lambda: self._lbl_saved.config(text=""))

    def _sair(self, _=None):
        if self._confirm_discard():
            self._save_config()
            self.root.destroy()

    # =========================================================================
    #  BUSCA E SUBSTITUIÇÃO
    # =========================================================================
    def _abrir_busca(self):
        """Abre o painel (ou traz para foco se já estiver aberto)."""
        if self._find_dialog and self._find_dialog.winfo_exists():
            self._find_dialog.lift()
            self._find_dialog._entry_find.focus_set()
            return
        c = self._themes[self._theme_mode]
        self._find_dialog = FindReplaceDialog(self.root, self._text, c)

    # =========================================================================
    #  MODO FOCO
    # =========================================================================
    def _alternar_foco(self, _=None):
        """
        Modo foco: oculta toolbar e sidebar, aumenta o padding lateral
        para simular uma folha isolada. F11 ou Esc restaura.
        """
        self._focus_mode = not self._focus_mode
        c = self._themes[self._theme_mode]

        if self._focus_mode:
            self._toolbar.pack_forget()
            if self._is_sidebar_visible:
                self._sidebar.pack_forget()
            self._paper_frame.config(padx=80, pady=40)
            # Dica rápida
            self._lbl_saved.config(
                text="Modo foco  —  F11 ou Esc para sair",
                fg=c["statusbar_fg"])
            self.root.after(3000, lambda: self._lbl_saved.config(text=""))
        else:
            # Restaurar toolbar antes do _main
            self._toolbar.pack(side="top", fill="x", before=self._main)
            if self._is_sidebar_visible:
                self._sidebar.pack(side="left", fill="y", before=self._desk)
            self._paper_frame.config(padx=30, pady=20)

        self._redraw_line_numbers()
        self._highlight_current_line()
        self._text.focus_set()

    # =========================================================================
    #  CONTADOR DE PALAVRAS
    # =========================================================================
    def _atualizar_contador_palavras(self):
        """
        Conta palavras e caracteres. Estima duração do roteiro
        (padrão: ~1 min por página, onde 1 página ≈ 55 linhas).
        """
        conteudo = self._text.get("1.0", tk.END)

        palavras = len([p for p in conteudo.split() if p])
        chars    = len(conteudo.rstrip("\n"))

        linhas  = conteudo.count("\n")
        paginas = max(1, linhas // 55)
        horas   = paginas // 60
        minutos = paginas % 60
        if horas:
            tempo = f"~{horas}h{minutos:02d}min"
        elif minutos > 1:
            tempo = f"~{minutos}min"
        else:
            tempo = ""

        # Formatar com ponto como separador de milhar (pt-BR)
        def fmt(n):
            return f"{n:,}".replace(",", ".")

        self._lbl_words.config(text=f"Palavras: {fmt(palavras)}")
        self._lbl_chars.config(text=f"| Caracteres: {fmt(chars)}")
        self._lbl_readtime.config(
            text=f"| Duração est.: {tempo}" if tempo else "")

    def _agendar_contagem(self):
        """Debounce de 500 ms para não contar a cada tecla."""
        if self._wordcount_job:
            self.root.after_cancel(self._wordcount_job)
        self._wordcount_job = self.root.after(500, self._atualizar_contador_palavras)

    # =========================================================================
    #  RENDERIZAÇÃO & SINTAXE
    # =========================================================================
    def _get_line_type(self, line, previous_type):
        clean = line.strip()
        if not clean:
            return "BLANK"
        if clean.startswith(">") and clean.endswith("<"):
            return "CENTER"
        if self._re_scene.match(clean):
            return "SCENE"
        if self._re_trans.match(clean):
            return "TRANSITION"
        if self._re_char.match(clean) and not self._re_scene.match(clean):
            return "CHARACTER"
        if self._re_paren.match(clean):
            return "PARENTHETICAL"
        if previous_type in ("CHARACTER", "PARENTHETICAL", "DIALOGUE"):
            return "DIALOGUE"
        return "ACTION"

    def _renderizar(self):
        tags = ["SCENE", "ACTION", "CHARACTER", "DIALOGUE",
                "PARENTHETICAL", "TRANSITION", "CENTER"]
        for tag in tags:
            self._text.tag_remove(tag, "1.0", tk.END)

        content = self._text.get("1.0", tk.END)
        lines   = content.split("\n")
        previous_type = None
        new_map, new_titles = [], []

        for i, line in enumerate(lines):
            ltype      = self._get_line_type(line, previous_type)
            start, end = f"{i+1}.0", f"{i+1}.end"
            if ltype != "BLANK":
                self._text.tag_add(ltype, start, end)
                if ltype == "SCENE":
                    clean = line.strip().upper()
                    if clean.startswith("."):
                        clean = clean[1:]
                    label = (f"{len(new_titles)+1}. "
                             + (clean[:24] + "…" if len(clean) > 24 else clean))
                    new_titles.append(label)
                    new_map.append(f"{i+1}.0")
            previous_type = ltype

        self._lbl_scenes.config(text=f"Cenas: {len(new_titles)}")

        if list(self._scene_list.get(0, tk.END)) != new_titles:
            self._scene_list.delete(0, tk.END)
            self._scene_map = new_map
            for t in new_titles:
                self._scene_list.insert(tk.END, t)

    def _navegar_cena(self, _=None):
        sel = self._scene_list.curselection()
        if sel:
            idx = sel[0]
            if idx < len(self._scene_map):
                pos = self._scene_map[idx]
                self._text.see(pos)
                self._text.mark_set("insert", pos)
        self._redraw_line_numbers()
        self._highlight_current_line()
        self._text.focus_set()
        self._atualizar_status()

    def _on_key_release_all(self, event=None):
        self._agendar_renderizacao()
        self._agendar_contagem()
        self._atualizar_status()
        self._redraw_line_numbers()
        self._highlight_current_line()
        if event and event.keysym in ("Up", "Down", "Left", "Right",
                                       "BackSpace", "Delete"):
            self._ac_esconder()
        elif event and event.char and event.char.isprintable():
            self._atualizar_autocomplete()

    def _on_click(self, event=None):
        self._atualizar_status()
        self._highlight_current_line()
        self._redraw_line_numbers()
        self._ac_esconder()

    def _atualizar_status(self, _=None):
        try:
            line_num = int(self._text.index(tk.INSERT).split(".")[0])
            page     = (line_num // 55) + 1
            self._lbl_page.config(
                text=f"Página: {page}  |  Linha: {line_num}")
        except Exception:
            pass

    # -----------------------------------------------------------------
    #  GUTTER — NÚMEROS DE LINHA + SEPARADOR DE PÁGINA
    # -----------------------------------------------------------------
    def _sync_scroll(self, *args):
        self._scrollbar.set(*args)
        self._redraw_line_numbers()

    def _redraw_line_numbers(self):
        cv = self._line_canvas
        if not cv.winfo_exists():
            return
        cv.delete("all")
        c = self._themes[self._theme_mode]
        cv.config(bg=c["gutter_bg"])
        cw = cv.winfo_width()

        try:
            first = self._text.index("@0,0")
        except tk.TclError:
            return

        i = first
        page_sep_color = c["gutter_sep"]
        line_fg = c["gutter_fg"]

        while True:
            dline = self._text.dlineinfo(i)
            if dline is None:
                break
            x, y, w, h, baseline = dline
            if h <= 0:
                break
            line_num = int(i.split(".")[0])
            # Desenha separador de página a cada 55 linhas
            if line_num > 1 and (line_num - 1) % 55 == 0:
                sy = y - 2
                cv.create_line(0, sy, cw, sy, fill=page_sep_color, width=1,
                               stipple="gray50" if self._theme_mode == "dark" else "")
            cv.create_text(cw - 6, y, text=str(line_num),
                           anchor="ne", font=("Segoe UI", 8),
                           fill=line_fg)
            i = self._text.index(f"{i}+1line")
            if i == first:
                break

    # -----------------------------------------------------------------
    #  DESTAQUE DA LINHA ATUAL
    # -----------------------------------------------------------------
    def _highlight_current_line(self, event=None):
        self._text.tag_remove("CURRENT_LINE", "1.0", tk.END)
        try:
            cursor = self._text.index(tk.INSERT)
            line   = cursor.split(".")[0]
            self._text.tag_add("CURRENT_LINE", f"{line}.0", f"{line}.end+1c")
        except tk.TclError:
            pass

    # -----------------------------------------------------------------
    #  AUTOCOMPLETE DE PERSONAGENS
    # -----------------------------------------------------------------
    def _get_character_names(self):
        names = set()
        content = self._text.get("1.0", tk.END)
        prev = None
        for line in content.split("\n"):
            ltype = self._get_line_type(line, prev)
            if ltype == "CHARACTER":
                names.add(line.strip().upper())
            prev = ltype
        return sorted(names)

    def _atualizar_autocomplete(self):
        try:
            cursor = self._text.index(tk.INSERT)
            line_start = cursor.split(".")[0] + ".0"
            line_text  = self._text.get(line_start, cursor)
        except tk.TclError:
            self._ac_esconder()
            return

        if not line_text or not line_text.isupper() or len(line_text) < 2:
            self._ac_esconder()
            return

        characters = self._get_character_names()
        matches = [n for n in characters
                   if n.startswith(line_text.upper()) and n != line_text.upper()]
        if not matches:
            self._ac_esconder()
            return

        self._ac_listbox.delete(0, tk.END)
        for m in matches:
            self._ac_listbox.insert(tk.END, m)

        try:
            bbox = self._text.bbox(cursor)
        except tk.TclError:
            self._ac_esconder()
            return
        if not bbox:
            self._ac_esconder()
            return

        x = bbox[0] + self._text.winfo_rootx() - self._text_frame.winfo_x()
        y = bbox[1] + self._text.winfo_rooty() + 20

        self._ac_window.geometry(f"+{x}+{y}")
        self._ac_window.deiconify()
        self._ac_window.lift()
        self._ac_window.focus_set()

    def _ac_esconder(self):
        if self._ac_window and self._ac_window.winfo_exists():
            self._ac_window.withdraw()

    def _ac_inserir(self, event=None):
        sel = self._ac_listbox.curselection()
        if not sel:
            return
        nome = self._ac_listbox.get(sel[0])
        cursor = self._text.index(tk.INSERT)
        line_start = cursor.split(".")[0] + ".0"
        self._text.delete(line_start, cursor)
        self._text.insert(line_start, nome)
        self._ac_esconder()
        self._text.focus_set()

    # -----------------------------------------------------------------
    #  SCROLL POR PÁGINA
    # -----------------------------------------------------------------
    def _scroll_page(self, direction):
        """direction: -1 (anterior), +1 (próxima) — por bloco de 55 linhas"""
        try:
            cur_line = int(self._text.index(tk.INSERT).split(".")[0])
            target   = max(1, cur_line + direction * 55)
            self._text.see(f"{target}.0")
            self._text.mark_set("insert", f"{target}.0")
            self._atualizar_status()
            self._highlight_current_line()
            self._redraw_line_numbers()
        except Exception:
            pass

    # -----------------------------------------------------------------
    #  ÍCONE DA JANELA
    # -----------------------------------------------------------------
    def _set_window_icon(self):
        try:
            img = tk.PhotoImage(width=16, height=16)
            for y in range(16):
                for x in range(16):
                    inside = 2 <= x <= 13 and 2 <= y <= 13
                    if inside and x in (6, 7, 8, 9) and y == 2:
                        c = "#ffffff"
                    elif inside and x in (4, 11) and 4 <= y <= 11:
                        c = "#ffffff"
                    elif inside and x == 7 and y == 7:
                        c = "#ffffff"
                    elif inside:
                        c = "#569cd6"
                    else:
                        c = "#2c2c2c"
                    img.put(c, (x, y))
            self.root.iconphoto(True, img)
            self._icon_img = img
        except Exception:
            pass

    # -----------------------------------------------------------------
    #  CONFIG PERSISTENTE
    # -----------------------------------------------------------------
    def _load_config(self):
        try:
            with open(CONFIG_FILE, encoding="utf-8") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}

    def _save_config(self):
        try:
            os.makedirs(CONFIG_DIR, exist_ok=True)
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({
                    "theme":           self._theme_mode,
                    "geometry":        self.root.geometry(),
                    "sidebar_visible": self._is_sidebar_visible,
                    "last_dir":        self._last_dir,
                }, f, indent=2)
        except Exception:
            pass

    def _agendar_renderizacao(self):
        if self._render_job:
            self.root.after_cancel(self._render_job)
        self._render_job = self.root.after(300, self._renderizar)

    # =========================================================================
    #  SIDEBAR
    # =========================================================================
    def _toggle_sidebar(self):
        if self._focus_mode:
            return  # sidebar bloqueada no modo foco
        if self._is_sidebar_visible:
            self._sidebar.pack_forget()
        else:
            self._sidebar.pack(side="left", fill="y", before=self._desk)
        self._is_sidebar_visible = not self._is_sidebar_visible
        self._save_config()

    # =========================================================================
    #  TEMAS
    # =========================================================================
    def _alternar_tema(self):
        self._apply_theme("dark" if self._theme_mode == "light" else "light")
        self._save_config()

    def _apply_theme(self, mode):
        self._theme_mode = mode
        c = self._themes[mode]

        self._style.configure(
            "Vertical.TScrollbar",
            gripcount=0,
            background=c["scroll_fg"],
            darkcolor=c["scroll_fg"],
            lightcolor=c["scroll_fg"],
            troughcolor=c["scroll_bg"],
            bordercolor=c["scroll_bg"],
            arrowcolor=c["scroll_fg"],
        )
        self._style.map("Vertical.TScrollbar",
            background=[("active", c["scroll_hover"])],
            arrowcolor=[("active", c["scroll_hover"])],
        )

        self._main.config(bg=c["desk"])
        self._desk.config(bg=c["desk"])
        self._paper_frame.config(bg=c["paper"])
        self._sidebar.config(bg=c["sidebar"])
        self._lbl_nav.config(bg=c["sidebar"], fg=c["sidebar_fg"])
        self._text_frame.config(bg=c["paper"])

        self._scene_list.config(
            bg=c["sidebar"], fg=c["sidebar_fg"],
            selectbackground=c["sidebar_sel"],
            selectforeground="#ffffff")

        self._text.config(
            bg=c["paper"], fg=c["text"],
            insertbackground=c["caret"],
            selectbackground=c["sidebar_sel"])

        self._status_container.config(bg=c["statusbar"])
        self._status_bar.config(bg=c["statusbar"])
        self._sep.config(bg=c["separator"])
        for lbl in (self._lbl_page, self._lbl_scenes, self._lbl_saved,
                    self._lbl_words, self._lbl_chars, self._lbl_readtime):
            lbl.config(bg=c["statusbar"], fg=c["statusbar_fg"])

        # Gutter
        self._line_canvas.config(bg=c["gutter_bg"])
        self._redraw_line_numbers()

        # Current line highlight
        self._text.tag_configure("CURRENT_LINE",
                                 background=c["line_highlight"])

        self._setup_tags(c)
        self._renderizar()

    def _setup_tags(self, c):
        bold = self._mono_bold
        base = self._mono_font
        m    = self._margins
        self._text.tag_configure(
            "SCENE", foreground=c["scene"], font=bold,
            lmargin1=m["action"], lmargin2=m["action"],
            spacing1=20, spacing3=10)
        self._text.tag_configure(
            "ACTION", foreground=c["text"], font=base,
            lmargin1=m["action"], lmargin2=m["action"])
        self._text.tag_configure(
            "CHARACTER", foreground=c["char"], font=base,
            lmargin1=m["character"], lmargin2=m["character"], spacing1=15)
        self._text.tag_configure(
            "DIALOGUE", foreground=c["text"], font=base,
            lmargin1=m["dialogue"], lmargin2=m["dialogue"])
        self._text.tag_configure(
            "PARENTHETICAL", foreground=c["parenthetical"], font=base,
            lmargin1=m["parenthetical"], lmargin2=m["parenthetical"])
        self._text.tag_configure(
            "TRANSITION", foreground=c["trans"], font=base,
            justify="right", rmargin=m["action"])
        self._text.tag_configure("CENTER", font=base, justify="center")

    # =========================================================================
    #  EXPORTAR PDF
    # =========================================================================
    def _exportar_pdf(self):
        if not HAS_PDF_SUPPORT:
            messagebox.showinfo(
                "PDF não disponível",
                "Para exportar PDF, instale a biblioteca reportlab.\n\n"
                "Abra o terminal e execute:\n\n"
                "    pip install reportlab\n\n"
                "Depois reinicie o programa.")
            return

        fp = filedialog.asksaveasfilename(
            initialdir=self._last_dir,
            defaultextension=".pdf", filetypes=[("PDF", "*.pdf")])
        if not fp:
            return
        self._last_dir = os.path.dirname(fp)

        try:
            cv = canvas.Canvas(fp, pagesize=A4)
            _, height = A4
            top_m, bot_m, left_m = height - inch, inch, 1.5 * inch

            tobj = cv.beginText(left_m, top_m)
            tobj.setFont("Courier", 12)
            previous_type = None

            for line in self._text.get("1.0", tk.END).split("\n"):
                ltype = self._get_line_type(line, previous_type)
                clean = line.strip()
                indent, wrap_w = 0, 60

                if ltype == "CHARACTER":       indent, wrap_w = 22, 40
                elif ltype == "DIALOGUE":      indent, wrap_w = 12, 35
                elif ltype == "PARENTHETICAL": indent, wrap_w = 16, 30
                elif ltype == "TRANSITION":    indent, wrap_w = 45, 15
                elif ltype == "CENTER":
                    clean  = clean.replace(">", "").replace("<", "").strip()
                    indent = 25

                wrapped = textwrap.wrap(clean, width=wrap_w) if clean else [""]
                for wl in (wrapped or [""]):
                    if tobj.getY() < bot_m:
                        cv.drawText(tobj)
                        cv.showPage()
                        tobj = cv.beginText(left_m, top_m)
                        tobj.setFont("Courier", 12)
                    tobj.textLine(" " * indent + wl)

                previous_type = ltype

            cv.drawText(tobj)
            cv.save()
            messagebox.showinfo("PDF exportado", f"Arquivo salvo em:\n{fp}")
        except Exception as e:
            messagebox.showerror("Erro ao exportar PDF", str(e))

    # =========================================================================
    #  AJUDA
    # =========================================================================
    def _mostrar_ajuda(self):
        win = tk.Toplevel(self.root)
        win.title("Ajuda — Fountain Writer")
        win.resizable(False, False)

        w, h = 560, 660
        sx = self.root.winfo_screenwidth()
        sy = self.root.winfo_screenheight()
        win.geometry(f"{w}x{h}+{(sx-w)//2}+{(sy-h)//2}")
        win.configure(bg="#1e1e1e")
        win.grab_set()

        cv = tk.Canvas(win, bg="#1e1e1e", highlightthickness=0)
        sb = tk.Scrollbar(win, orient="vertical", command=cv.yview)
        frame = tk.Frame(cv, bg="#1e1e1e", padx=28, pady=24)
        frame.bind("<Configure>",
                   lambda e: cv.configure(scrollregion=cv.bbox("all")))
        cv.create_window((0, 0), window=frame, anchor="nw", width=w - 16)
        cv.configure(yscrollcommand=sb.set)
        cv.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")

        def lbl(text, font, fg, pady=0):
            tk.Label(frame, text=text, font=font, bg="#1e1e1e",
                     fg=fg, anchor="w").pack(anchor="w", pady=pady)

        lbl("Fountain Writer", ("Segoe UI", 16, "bold"), "white", pady=(0, 4))
        tk.Frame(frame, height=1, bg="#444").pack(fill="x", pady=(0, 14))

        # Atalhos
        lbl("Atalhos de Teclado", ("Segoe UI", 11, "bold"), "#569cd6", pady=(0, 8))
        atalhos = [
            ("Ctrl + S",     "Salvar arquivo"),
            ("Ctrl + O",     "Abrir arquivo"),
            ("Ctrl + N",     "Novo arquivo"),
            ("Ctrl + H",     "Buscar e substituir"),
            ("Ctrl + F",     "Buscar e substituir"),
            ("F11",          "Ativar / sair do modo foco"),
            ("Esc",          "Sair do modo foco"),
            ("Ctrl + ↑/↓",  "Rolar uma página (55 linhas)"),
            ("Ctrl + Z",     "Desfazer"),
            ("Ctrl + Y",     "Refazer"),
        ]
        for key, desc in atalhos:
            row = tk.Frame(frame, bg="#1e1e1e", pady=3)
            row.pack(fill="x", anchor="w")
            tk.Label(row, text=key, font=("Consolas", 9, "bold"),
                     bg="#333", fg="#fff", width=13,
                     anchor="center", padx=6, pady=3).pack(side="left")
            tk.Label(row, text=desc, font=("Segoe UI", 10),
                     bg="#1e1e1e", fg="#ccc").pack(side="left", padx=10)

        tk.Frame(frame, height=1, bg="#444").pack(fill="x", pady=(16, 12))

        # Sintaxe
        lbl("Sintaxe Fountain", ("Segoe UI", 11, "bold"), "#dcdcaa", pady=(0, 8))
        sintaxe = [
            ("CENA",        "INT ou EXT seguido de descrição"),
            ("PERSONAGEM",  "Linha em MAIÚSCULAS (ex: ANA)"),
            ("DIÁLOGO",     "Linha logo abaixo do personagem"),
            ("RUBRICA",     "Entre parênteses — ex: (sorrindo)"),
            ("TRANSIÇÃO",   "Maiúsculas terminando em ':' — CORTE PARA:"),
            ("CENTRALIZAR", "Texto entre > e <  — ex: > FIM <"),
        ]
        for titulo, desc in sintaxe:
            row = tk.Frame(frame, bg="#1e1e1e", pady=4)
            row.pack(fill="x", anchor="w")
            tk.Label(row, text=titulo, font=("Segoe UI", 9, "bold"),
                     bg="#264f78", fg="#fff", width=14,
                     anchor="center", padx=6, pady=3).pack(side="left")
            tk.Label(row, text=desc, font=("Segoe UI", 10),
                     bg="#1e1e1e", fg="#ccc",
                     wraplength=340, justify="left").pack(side="left", padx=10)

        tk.Frame(frame, height=1, bg="#444").pack(fill="x", pady=(16, 12))

        # PDF
        lbl("Exportar PDF", ("Segoe UI", 11, "bold"), "#c586c0", pady=(0, 6))
        lbl("Para habilitar a exportação PDF, execute no terminal:",
            ("Segoe UI", 10), "#aaa", pady=(0, 6))
        for sistema, cmd in [
            ("Windows",      "pip install reportlab"),
            ("Mac",          "pip3 install reportlab"),
            ("Linux Ubuntu", "sudo apt install python3-reportlab"),
        ]:
            tk.Label(frame, text=f"• {sistema}:",
                     font=("Segoe UI", 9, "bold"),
                     bg="#1e1e1e", fg="#fff").pack(anchor="w", pady=(4, 0))
            ef = tk.Frame(frame, bg="#333", padx=6, pady=4)
            ef.pack(anchor="w", fill="x", pady=(2, 2))
            e = tk.Entry(ef, font=("Consolas", 10), bg="#333", fg="#eee",
                         relief="flat", readonlybackground="#333")
            e.insert(0, cmd)
            e.config(state="readonly")
            e.pack(fill="x")

        tk.Button(frame, text="Fechar", command=win.destroy,
                  bg="#3e3e42", fg="white", relief="flat",
                  padx=24, pady=6, cursor="hand2",
                  font=("Segoe UI", 10)).pack(pady=(24, 8))


# ---------------------------------------------------------------------------
if __name__ == "__main__":
    root = tk.Tk()
    app  = FountainEditor(root)
    root.mainloop()
