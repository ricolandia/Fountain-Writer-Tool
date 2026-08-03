# SESSION.md — Fonte (Atualizado em 09/Jul/2026)

## Estado atual

**Último commit:** `0981946` — "fix: diálogos JS nativos no desktop (confirm/alert/prompt)"
**Tag:** `v2.3.0`
**Branch:** `main`
**Remote:** `origin/main`
**Status:** Tudo commitado, working tree limpo.

---

## 🖥 Desktop PySide6 + QWebEngineView — RESOLVIDO (09/Jul/2026)

O desktop nativo foi implementado e validado:

### O que funciona
- **`desktop/webapp.py`** — janela nativa Qt 1280×800 com QWebEngineView
  carregando o app web completo (100% das features)
- **Menus nativos**: Arquivo (Ctrl+N/O/S/Q), Visualizar (tema/idioma/foco), Ajuda
- **Download nativo**: .json, .excalidraw, .html abrem diálogo de salvar
- **Diálogos JS nativos**: `FontePage` subclasse com confirm/alert/prompt Qt
- **Excalidraw 100% integrado**: desenhar, salvar no .json, restaurar ao reabrir

### Excalidraw — CAUSA RAIZ encontrada e corrigida
O bundle vendorizado (`excalidraw-embed.js`) usava `importScene`/`exportScene`
(métodos inexistentes nesta versão da API — que usa `updateScene`/`getSceneElements`),
causando falha silenciosa. Correções:
1. **Patch no bundle**: passa `excalidrawAPI` prop no mount → expõe `window.__exAPI`
2. **Ponte anexada ao bundle**: responde GET_SCENE/LOAD_SCENE com a API correta
   (normaliza elementos + merge appState completo + sanitiza `collaborators`)
3. **LOAD_SCENE único** por abertura (flag `_excalidrawLoadSent`) — evita reset
   do canvas durante o desenho
4. **NoCache no WebView** — cache servia arquivos antigos (era a causa aparente
   de "nada funcionava")

### Backup — validado
- Listagem, restore, auto-backup 5min (limite 5) — testados ✅
- `confirm()` nativo corrigido (sem isso, restore era cancelado silenciosamente)

### Auditoria de regressão — 12/12 funcionalidades OK
Editor/auto-save, stats, parse cenas, sync beats, CRUD beats, personagens,
i18n PT/EN, Projeto Cultural, timeline, export modal, Excalidraw, download nativo.

---

## Decisões da sessão (09/Jul/2026)

### Excalidraw — RESOLVIDO (ver seção acima)
A pendência do LOAD_SCENE foi resolvida junto com o desktop (WebView).

### Testes de navegador — concluídos pelo autor
Todos os fluxos foram testados manualmente no navegador (editor, save/load,
i18n, export, mobile, Excalidraw). Combinado com os 30 testes unitários,
a v2.3.0 é considerada **totalmente validada** pelo autor.

### Auditoria por especialistas — criada
Novo arquivo `AUDITORIA-ESPECIALISTAS.md` com 4 perfis fixos:
🎬 Roteirista PhD · 👨‍💻 Programador Sênior · 🎨 Designer UI · ✍️ Redator PT/EN
**Resultado 1ª rodada:** 63/64 verificações aprovadas
(única atenção: `webkitAudioContext` — necessário para Safari iOS)

---

## Arquivos do projeto

```
Fountain-Writer-Tool/
├── web/
│   ├── index.html              (688 linhas)
│   ├── index.excalidraw.html   (15 linhas) — iframe do Excalidraw
│   ├── css/app.css             (307 linhas)
│   ├── js/app.js               (~2599 linhas)
│   ├── js/i18n.js              (421 linhas)
│   ├── js/fountain-parser.js   (264 linhas)
│   ├── fountain_utils.py       (API backend desacoplada)
│   ├── server.py               (FastAPI)
│   ├── lib/
│   │   ├── excalidraw-embed.js    (2.5 MB) — bundle UMD
│   │   └── excalidraw-assets/     (4.3 MB) — chunks vendor + 53 locales
│   ├── templates/                 (12 templates .excalidraw)
│   ├── tests/                     (30 testes: parser, i18n, guessType, structure)
│   ├── icons/                     (icon-192.png, icon-512.png)
│   ├── sw.js                      (service worker v3)
│   └── manifest.json              (PWA manifest)
├── deploy/                     (cópia estática sincronizada)
├── desktop/                     (PyWebView + PySide6/app/)
│   ├── desktop.py               (wrapper WebView)
│   ├── main.py                  (PySide6)
│   └── app/                     (22+ módulos PySide6)
├── .github/workflows/build.yml  (CI/CD com zip automático)
├── CHANGELOG.md
├── MIGRAR-ROTEIROS.md           (tutorial migração .fdx/.celtx → Fountain)
├── serve.py                     (servidor HTTP para dev)
├── SESSION.md
├── LANDING.md
├── ROADMAP.md
├── AUDITORIA.md                 (checklist de testes)
└── imagens/
```

## Funcionalidades

### Editor de roteiro
- Fountain nativo com preview ao vivo
- Corkboard (⊞/⊟) com cards visuais
- Beats CRUD com plotlines, comentários (autor + timestamp), drag reorder
- Timeline atos × tramas (expandível ⤢)
- Marcador `# Ato N`, botão 📍 para inserir, indicador de ato na barra
- Personagens e locais extraídos automaticamente com perfil
- **Auto-completar personagens** — dropdown ao digitar nome em contexto CHARACTER
- Find/Replace, Folha de rosto, temas claro/escuro
- Export: HTML, PDF, Fountain (.fountain), projeto (.fountain.json)
- **Export modal** — checkboxes para incluir/excluir Folha de Rosto, Ficha, Estrutura
- Import .fountain / .fountain.json
- **Compartilhar projeto (📤)** — Web Share API (mobile) + download + toast (desktop)
- i18n PT/EN: 228+ chaves, 100% de cobertura
  - Botões da toolbar (Projeto, Quadro, Roteiro, Compartilhar)
  - Dropdowns da Estrutura (~87 opções traduzidas)
  - Beat Guide modal
  - Save-indicator, status bar
  - Ortografia corrigida em PT e EN

### 🧩 Quadro de Planejamento Visual (Excalidraw)
- Bundle UMD offline (2.5 MB + 4.3 MB assets)
- 12 templates em `web/templates/`
- Modal com iframe, botão tela cheia ⛶
- Asset vendorizados localmente (sem CDN)
- Cena salva no `.fountain.json` via `saveProject()`
- Cena restaurada ao abrir projeto via `openProject()`
- **Aviso ao fechar** — confirm "Há alterações não salvas?"
- Comportamento: desenho preservado ao fechar/reabrir modal (iframe estático)
- Novo projeto / abrir outro → iframe recarregado (canvas limpo ou cena restaurada)

### Produtividade
- Pomodoro 25min + cronômetro, metas diárias, gráfico 7 dias
- Highlights coloridos (Ctrl+1/2/3), auto-backup 5min (5 versões)
- Som, zoom, foco (F11), atalhos Ctrl+B/I/U

### Projeto Cultural
- 11 seções (nova: Pitch com tagline, comparação, diferencial, pitch narrativo, elenco)
- Export PDF, dados no .json
- Fontes e espaçamento maiores (11pt)

### Mobile (≤768px)
- Cenas e Beats como overlay fixo (checkbox hack)
- Sem scroll horizontal na Estrutura e Projeto
- Touch targets melhorados (timeline 9pt, beats 13pt)

### Testes automatizados
- 30 testes: parser Fountain, i18n, guessType(), estrutura
- Rodam com `node --test web/tests/*.js`
- Framework: Node nativo (zero dependências)

### API Backend
- `web/server.py` (FastAPI) — independente do PySide6
- `web/fountain_utils.py` — `get_line_type()`, `LineType`, `export_fountain_to_html()`

### Desktop (PySide6)
- 28 módulos auditados — 0 stubs, 0 erros de sintaxe
- Pendente: compilação via PyInstaller (testes Linux com limitações)

## Bugs corrigidos (últimas rodadas)

### v2.3.0 — Correções de i18n
| Bug | Correção |
|-----|----------|
| Botões "Projeto"/"Quadro" fixos em PT | `data-i18n="tb_projeto/quadro"` + chaves i18n |
| toggleProjeto() texto fixo | `_('tb_roteiro')` e `_('tb_projeto')` |
| Status bar misturava PT/EN | `_('save_reminder')` em vez de "Salve seu projeto" |
| Save-indicator "✓ Salvo" mesmo em EN | `_('tb_saved')` |
| Beat Guide modal todo em PT | 10 chaves i18n + `data-i18n` nos parágrafos |
| Dropdowns da Estrutura em PT fixos | `structureOpts` com 87 pares PT↔EN |
| Acentos e pontuação em PT | "marca a mudança", "filipeta, etc." |

### v2.3.0 — Correções de dados e segurança
| Bug | Correção |
|-----|----------|
| Alertas hardcoded PT | `_('err_import')` e `_('err_file_size')` |
| `toLocaleString` sem locale do app | Passa `lang` como parâmetro |
| Nome de arquivo "roteiro" fixo | `lang === 'pt-BR' ? 'roteiro' : 'script'` |
| Extensão `.json` não tratada | Regex `/\.(?:fountain\.)?json$/` |
| `localStorage.setItem` sem try/catch | 7 locais protegidos (fw_draft, fw_scene_colors etc.) |
| `setInterval` sem guard | `if (this._autoSaveTimer) return` |
| `<html lang>` fixo | `document.documentElement.lang = lang` |

### v2.3.0 — Correções de UX e acessibilidade
| Bug | Correção |
|-----|----------|
| Foco do editor com borda feia | `#editor:focus-visible { outline:none; box-shadow:none }` |
| Falta aria-label em botões icone-only | `data-i18n-title` → `aria-label` via translateUI |
| Falta tags semânticas | `#toolbar` → `<header>`, `#panes` → `<main>` |
| Hardcoded PT em timeline/beats | `_('timeline_header')`, `_('beat_no_scene')` |
| Excalidraw não recarregava ao trocar projeto | `iframe.src = '...?_=' + Date.now()` |
| Excalidraw cena não restaurada do .json | `this._excalidrawScene = data.excalidrawScene \|\| null` |
| Excalidraw não fechava ao criar novo projeto | `closeExcalidraw()` em `newFile()` |

## ⚠️ Pendências para PRÓXIMA SESSÃO

### 1. Desktop executável (PyInstaller) — PRIORIDADE
Compilação para Windows/Linux/macOS usando GitHub Actions.
O `desktop/webapp.py` (PySide6 + QWebEngineView) já está validado no Linux.
Próximo passo: `pip install pyinstaller` + spec + jobs no CI (ubuntu/windows/macos).

### 2. Deploy no site
Copiar `deploy/` para `www.ricolandia.com/Demo/`.

### ❌ Descartado
- **Galeria de quadros** (múltiplos desenhos por projeto) — botão "＋ Novo desenho" mantido.
- **Contador de quadros no status** — removido.
- **Tema sépia** — descartado.
- **Import .fdx/.celtx** — tutorial `MIGRAR-ROTEIROS.md` cobre.
- **PWA Mobile instruções** — autor fará screencast próprio.

### ✅ Resolvido (09/Jul)
- **Excalidraw LOAD_SCENE** — patch no bundle (API correta `updateScene`/`getSceneElements`),
  ponte anexada, LOAD_SCENE único, NoCache no WebView. Funciona no desktop e navegador.
- **Backup** — validado (listagem, restore, auto-backup 5min). `confirm()` nativo corrigido.
- **Diálogos JS nativos** no desktop (FontePage: confirm/alert/prompt Qt).
