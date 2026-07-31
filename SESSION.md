# SESSION.md — Fonte (Atualizado em 09/Jul/2026)

## Estado atual

**Último commit:** `59fd82c` — "docs: perfis de especialistas + primeira auditoria (63/64 ✅)"
**Tag:** `v2.3.0`
**Branch:** `main`
**Remote:** `origin/main`
**Status:** Tudo commitado, working tree limpo.

---

## Decisões da sessão (09/Jul/2026)

### Excalidraw — pendência adiada
O problema do `LOAD_SCENE` (cena salva no `.json` mas não carrega no iframe ao reabrir
o projeto) será resolvido **junto com o app executável (v2.4 — PyInstaller)**.
No desktop, o WebView tem comportamento mais previsível que o navegador.

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
Testes Linux com limitações (WebKitGTK).
**Também deve resolver o problema do Excalidraw LOAD_SCENE** (WebView mais previsível).

### 2. Excalidraw — cena via LOAD_SCENE não confiável
**Decisão (09/Jul): adiar — resolver junto com o app desktop (item 1).**
O `postMessage({ type: 'LOAD_SCENE', scene })` para o iframe nem sempre funciona,
porque a API do Excalidraw (`r.current`) pode não estar pronta quando a mensagem chega.

**Comportamento atual:**
- Desenha, fecha, reabre (mesmo projeto): ✅ funciona (iframe preserva estado)
- Novo projeto: ✅ iframe recarregado → canvas vazio
- Abre projeto com cena: ⚠️ tenta LOAD_SCENE (pode ou não funcionar)
- Abre projeto sem cena: ✅ iframe recarregado → canvas vazio

**Possíveis soluções futuras:**
- Retry de LOAD_SCENE a cada 200ms (10 tentativas)
- Modificar `index.excalidraw.html` para receber cena via URL
- Usar `iframe.onload` + setTimeout para garantir API pronta

### 3. Deploy no site
Copiar `deploy/` para `www.ricolandia.com/Demo/`.

### ❌ Descartado
- **Galeria de quadros** (múltiplos desenhos por projeto) — sem sentido sem resolver o LOAD_SCENE. Botão "＋ Novo desenho" mantido.
- **Contador de quadros no status** — removido.
- **Tema sépia** — descartado.
- **Import .fdx/.celtx** — tutorial `MIGRAR-ROTEIROS.md` cobre.
- **PWA Mobile instruções** — autor fará screencast próprio.
