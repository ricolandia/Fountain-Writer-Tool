# SESSION.md — Fountain Writer (PySide6)

Projeto: `/home/ricardo/Documentos/31_APPS_GITHUB/Fountain-Writer-Tool`
Entry point: `main.py`
Stack: Python 3.13, PySide6, QSS
28 arquivos .py, ~3.500 linhas

---

## Estrutura

```
Fountain-Writer-Tool/
├── main.py                          ← Entry point (44 linhas)
├── app/
│   ├── core/
│   │   ├── config.py                ← QSettings (tema, geometria, preferências, idioma)
│   │   ├── theme.py                 ← QSS light/dark completo + tokens (monocromático)
│   │   ├── i18n.py                  ← Internacionalização JSON
│   │   └── exporter.py              ← Export HTML + plain text
│   ├── models/
│   │   ├── fountain.py              ← Parser Fountain: get_line_type, iter_scenes, etc.
│   │   ├── meta.py                  ← Dataclasses: Character, Location, Beat, Relationship, ProjectMeta
│   │   └── references.py            ← Sistema de referências {CHAR:}, {LOC:}, {BEAT:}
│   ├── editor/
│   │   ├── editor.py                ← QTextEdit + gutter + autocomplete + formatação visual
│   │   ├── highlighter.py           ← QSyntaxHighlighter (cores Fountain)
│   │   └── line_numbers.py          ← Gutter com números de linha + separador de página
│   ├── dockers/ (7 docks)
│   │   ├── scene_navigator.py       ← Cenas com filtro, checkbox compile, INT/EXT, navegação
│   │   ├── right_panel.py           ← Abas Characters/Locations (wrapper)
│   │   ├── character_dock.py        ← CRUD personagens completo
│   │   ├── location_dock.py         ← CRUD locais com categoria
│   │   ├── beat_board.py            ← Lista/cards beats com drag reorder
│   │   ├── dialogue_tuner.py        ← Filtra diálogo por personagem
│   │   └── global_search.py         ← Busca unificada (texto, cenas, chars, locs, beats)
│   ├── dialogs/
│   │   ├── find_replace.py          ← Busca/substituição
│   │   ├── help_dialog.py           ← Ajuda + Sobre (autor)
│   │   ├── beat_editor.py           ← Editar beat (título, descrição, ato, trama, cor, cena)
│   │   └── title_page.py            ← Folha de rosto (formulário)
│   └── main_window.py               ← QMainWindow (menus, toolbar, docks, status bar)
├── resources/
│   └── lang/
│       ├── pt-BR.json               ← ~180 chaves em português
│       └── en.json                  ← ~180 chaves em inglês
└── archive/                         ← Versão Tkinter antiga
```

---

## Como executar

```bash
cd /home/ricardo/Documentos/31_APPS_GITHUB/Fountain-Writer-Tool
python3 main.py
```

---

## Features implementadas

### Editor
- Destaque de sintaxe Fountain (cores via QSyntaxHighlighter)
- Gutter com números de linha + separador de página (Pg.1, Pg.2...)
- Autocomplete de personagens (popup manual, sem QCompleter)
- Hide markup (botão H: oculta `*itálico*` `**negrito**`)
- Formatação visual Fountain via indentação de bloco (aplicada ao abrir arquivo ou manualmente)
- Auto-registro de personagens ao pressionar Enter em linha CHARACTER
- Auto-registro de cenas como beats ao pressionar Enter em linha SCENE
- Auto-registro de locais INT/EXT ao pressionar Enter em linha SCENE
- Folha de rosto (formulário Title Page) — inserida no PDF, não no editor
- Idioma selecionável (Português/English), com reinicialização
- Quebra de página visual no gutter (linha + label "Pg.N")
- Cores monocromáticas (tons de cinza)

### Arquivos
- Novo, Abrir, Salvar (.fountain, .txt)
- Autosave a cada 2 minutos
- Backup automático `.bak.YYYYMMDD-HHMMSS` ao salvar
- Export HTML (salvo automaticamente junto, CSS com margens percentuais)
- Export PDF (via reportlab, A4/Letter, folha de rosto centralizada)
- Último arquivo restaurado ao abrir

### Docks (7)
1. **Scene Navigator** — Lista de cenas com filtro, checkbox compile, INT/EXT, navegação
2. **Characters** (tab via RightPanel) — CRUD personagens: nome, idade, arquétipo, física, personalidade, bio, objetivo, medo
3. **Locations** (tab via RightPanel) — CRUD locais: nome, INT/EXT, categoria, descrição, notas
4. **Beat Board** — Lista/cards beats, drag reorder, botão inserir no editor, toggle visualização
5. **Dialogue Tuner** — Filtra e exibe diálogo por personagem
6. **Global Search** — Busca em texto, cenas, chars, locs, beats
7. **Find/Replace** — Ctrl+H, case-sensitive, replace all

### Internacionais
- Sistema i18n via JSON (pt-BR + en)
- Fallback: pt-BR → en → key
- `_(key, **kwargs)` em todo o código
- Menu Idioma no menu bar (Português / English)

### Interface
- Tema claro/escuro via QSS completo (tons de cinza)
- Menu bar: File, Edit, View, Idioma, Help
- Toolbar com texto sob ícones (Courier)
- Status bar: cenas, palavras, caracteres, duração estimada, timer de escrita, página/linha
- Modo foco (F11): oculta tudo, padding maior
- Fonte: Courier New / Courier, monospace (12pt editor, 11pt toolbar)

---

## Atalhos

| Tecla | Ação |
|---|---|
| Ctrl+S | Salvar |
| Ctrl+O | Abrir |
| Ctrl+N | Novo |
| Ctrl+H/F | Buscar |
| F11 | Modo foco |
| Esc | Sair do foco |
| Tab | Posicionar cursor (CHARACTER→200, DIALOGUE→120) |
| Ctrl+↑/↓ | Rolar 55 linhas |
| Ctrl+Z | Desfazer |
| Ctrl+Y | Refazer |

---

## Dependências

- **PySide6** — única dependência obrigatória
- **reportlab** — opcional, para export PDF

---

## 🐞 Bugs conhecidos

- Nenhum bug crítico conhecido no momento. A auditoria completa (Jul/2026) encontrou e corrigiu:
  - 5 críticos (crash/ perda de dados)
  - 16 médios (i18n quebrado, page calc, imports redundantes)
  - 20 leves (código morto, cosmetica)
  - 4 documentação (SESSION.md desatualizado)

## Observações importantes

- `QSyntaxHighlighter` só aplica **cores**. Margens e alinhamento Fountain são aplicados via `QTextBlockFormat.setIndent()` ao abrir arquivo ou manualmente (botão Formatar).
- `QCompleter` do Qt **não é usado** — causa segfault no Python 3.13. Substituído por popup manual `QFrame + QListWidget`.
- `_` como variável descartável (`for _, x in ...`) conflita com `_()` do i18n. Usar `_col`, `_val`, etc.
- RightPanel usa `QDockWidget(None)` para extrair widgets — os docks órfãos não são mostrados, apenas os widgets internos vão para QTabWidget.
- Idioma é alterado via menu `Idioma`; o aplicativo reinicia para aplicar.
- Folha de rosto é armazenada em memória e renderizada apenas no PDF exportado.
