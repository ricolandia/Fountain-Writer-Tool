# Changelog

## v2.4.2 (2026-08-04)

### 🇧🇷 Português

#### 🐛 Correções
- **Quadro Excalidraw não restaurava a cena salva no site (demo)** — a
  restauração dependia de uma janela fixa de 3s para a API do bundle montar;
  em conexões lentas (bundle de 5,5 MB), a cena se perdia e o quadro abria
  vazio. Agora há retry persistente a cada 400ms até a API ficar pronta
  (ou o modal fechar).
- **Service worker v5 + network-first** — atualizações passam a valer na
  primeira visita (antes, o cache-first escondia versões novas até bump
  manual da versão). Offline mantido via cache runtime + app shell.

---

### 🇺🇸 English

#### 🐛 Bug Fixes
- **Excalidraw board did not restore the saved scene on the website (demo)**
  — restore depended on a fixed 3s window for the bundle API to mount; on
  slow connections (5.5 MB bundle) the scene was lost and the board opened
  empty. Now there is a persistent retry every 400ms until the API is ready
  (or the modal closes).
- **Service worker v5 + network-first** — updates now take effect on the
  first visit (previously, cache-first hid new versions until a manual
  version bump). Offline kept via runtime cache + app shell.

---

## v2.4.1 (2026-08-04)

### 🇧🇷 Português

#### 🐛 Correções
- **Desktop Linux não abria** — `QtWebEngineProcess` era empacotado sem
  permissão de execução (bug do PyInstaller), causando `failed to execvp`
  e FATAL no zygote do Chromium. Correção dupla:
  - `fonte.spec`: dá `+x` ao binário no bundle a cada build (3 OS)
  - `webapp.py`: auto-cura em runtime (chmod + `QTWEBENGINEPROCESS_PATH`)
    — downloads já existentes passam a funcionar sem rebaixar
- **Sanidade do CI mais rígida** — além de checar se o app sobe, agora
  verifica a permissão do `QtWebEngineProcess` e se o processo do
  webengine é criado de fato (pegava regressões como esta)

---

### 🇺🇸 English

#### 🐛 Bug Fixes
- **Linux desktop would not open** — `QtWebEngineProcess` was bundled
  without the executable bit (known PyInstaller bug), causing
  `failed to execvp` and a FATAL zygote crash in Chromium. Double fix:
  - `fonte.spec`: chmod `+x` on the binary in every build (3 OS)
  - `webapp.py`: runtime self-heal (chmod + `QTWEBENGINEPROCESS_PATH`)
    — existing downloads work without reinstalling
- **Stricter CI sanity check** — besides checking the app launches, it now
  verifies the `QtWebEngineProcess` permission and that the webengine
  process is actually spawned (would catch regressions like this one)

---

## v2.4.0 (2026-07-10)

### 🇧🇷 Português

#### ✨ Novidades
- **🖥 Desktop nativo** — janela PySide6 + QWebEngineView com o app web completo
  - Menus nativos (Arquivo, Visualizar, Ajuda) com atalhos Ctrl+N/O/S/Q
  - Download nativo (.json, .excalidraw, .html abrem diálogo de salvar)
  - Diálogos nativos (confirm/alert/prompt Qt)
- **📦 Build automático 3-OS** — GitHub Actions gera executáveis para
  Windows (.exe), Linux e macOS (.app) a cada release
- **🧩 Excalidraw integrado** — causa raiz corrigida (API incompatível no bundle):
  desenhar, salvar no `.json` e restaurar agora funcionam no desktop E no navegador
- **PWA atualizado** — service worker v4, Excalidraw funcionando no mobile

#### 🔧 Melhorias
- Sistema de backup validado (listagem, restore, auto-backup 5min)
- Pasta web/ completa incluída nos executáveis desktop
- Empacotamento de release com Python (cross-platform)

#### 🐛 Correções
- Excalidraw: `LOAD_SCENE`/`GET_SCENE` falhavam silenciosamente (bundle usava
  `importScene`/`exportScene` inexistentes — corrigido com a API real `updateScene`)
- Excalidraw: "Loading scene" infinito (updateScene antes da montagem)
- Excalidraw: canvas resetava ao desenhar (LOAD_SCENE duplicado)
- Desktop: `confirm()` não mostrava diálogo (QtWebEngine retorna false por padrão)
- Desktop: cache do WebView servia arquivos antigos

---

### 🇺🇸 English

#### ✨ New Features
- **🖥 Native desktop** — PySide6 + QWebEngineView window with the full web app
  - Native menus (File, View, Help) with Ctrl+N/O/S/Q shortcuts
  - Native downloads (.json, .excalidraw, .html open save dialog)
  - Native dialogs (Qt confirm/alert/prompt)
- **📦 3-OS auto build** — GitHub Actions builds Windows (.exe), Linux and
  macOS (.app) executables on every release
- **🧩 Excalidraw integrated** — root cause fixed (incompatible API in bundle):
  draw, save to `.json` and restore now work on desktop AND browser
- **PWA updated** — service worker v4, Excalidraw working on mobile

#### 🔧 Improvements
- Backup system validated (listing, restore, 5-min auto backup)
- Full web/ folder included in desktop executables
- Release packaging with Python (cross-platform)

#### 🐛 Bug Fixes
- Excalidraw: `LOAD_SCENE`/`GET_SCENE` failed silently (bundle used non-existent
  `importScene`/`exportScene` — fixed with real `updateScene` API)
- Excalidraw: infinite "Loading scene" (updateScene before mount)
- Excalidraw: canvas reset while drawing (duplicate LOAD_SCENE)
- Desktop: `confirm()` showed no dialog (QtWebEngine returns false by default)
- Desktop: WebView cache served old files

---

## v2.3.0 (2026-07-09)

### 🇧🇷 Português

#### ✨ Novidades
- **Auto-completar personagens** — dropdown ao digitar nome, sugere personagens já usados no texto
- **Compartilhar projeto** — Web Share API (mobile) + download + toast (desktop)
- **Modal de exportação** — escolha quais seções incluir: Folha de Rosto, Ficha do Filme, Estrutura
- **Seção 11 — Pitch** no Projeto Cultural (tagline, comparação, diferencial, similares, pitch narrativo, elenco)
- **Testes automatizados** — 30 testes (parser Fountain, i18n, guessType, estrutura)
- **API desacoplada** — `fountain_utils.py` independente do PySide6

#### 🔧 Melhorias
- i18n completo de botões (Projeto, Quadro, Roteiro, Compartilhar)
- i18n dos dropdowns da Estrutura (~87 opções PT↔EN)
- i18n do Beat Guide modal (10 chaves novas)
- i18n do save-indicator e status bar
- i18n do botão "Gerar PDF" na Ficha
- i18n do tooltip "Remover ato" e mensagens da timeline
- Contraste melhorado no tema claro (--fg-sec, --accent, --border)
- Fontes maiores no Projeto Cultural (9pt→10pt, 10pt→11pt)
- Responsividade mobile: sem scroll horizontal na Estrutura e no Projeto
- Service worker cache v3 (força recache do i18n.js novo)

#### 🐛 Correções
- Botões "Projeto" e "Quadro" agora traduzem ao mudar idioma
- toggleProjeto() usava texto fixo em PT — agora usa _()
- Status bar exibia "beats" (EN) + "Salve seu projeto" (PT) misturados
- save-indicator mostrava "✓ Salvo" mesmo em EN
- Ortografia: "marca mudança" → "marca a mudança" (fountain_acts)
- "Cartaz, filipetas, etc" → "Cartaz, filipeta, etc." (proj_div_mat_ph)
- "Full format at" → "Full format at:" (fountain_full EN)
- "Descriptive Subtitles" → "Closed Captions" (proj_acess_legendas EN)

---

### 🇺🇸 English

#### ✨ New Features
- **Character autocomplete** — dropdown with suggestions as you type character names
- **Share project** — Web Share API (mobile) + download + toast (desktop)
- **Export modal** — choose which sections to include: Title Page, Film Sheet, Structure
- **Section 11 — Pitch** in Cultural Project (tagline, comparison, USP, pitch paragraph, cast)
- **Automated tests** — 30 tests (Fountain parser, i18n, guessType, structure)
- **Decoupled API** — `fountain_utils.py` independent from PySide6

#### 🔧 Improvements
- Full i18n for toolbar buttons (Project, Board, Script, Share)
- Structure dropdowns i18n (~87 options PT↔EN)
- Beat Guide modal i18n (10 new keys)
- Save indicator and status bar i18n
- "Generate PDF" button i18n in Film Sheet
- "Remove act" tooltip and timeline messages i18n
- Improved contrast in light theme (--fg-sec, --accent, --border)
- Larger fonts in Cultural Project (9pt→10pt, 10pt→11pt)
- Mobile responsiveness: no horizontal scroll in Structure and Project
- Service worker cache v3 (forces new i18n.js reload)

#### 🐛 Bug Fixes
- "Project" and "Board" buttons now translate on language switch
- toggleProjeto() used hardcoded PT text — now uses _()
- Status bar mixed language ("beats" + PT "Salve seu projeto")
- Save indicator showed "✓ Salvo" even in EN mode
- "marca mudança" → "marca a mudança" (missing article in fountain_acts)
- "Cartaz, filipetas, etc" → "Cartaz, filipeta, etc." (typo in proj_div_mat_ph)
- "Full format at" → "Full format at:" (missing colon in fountain_full EN)
- "Descriptive Subtitles" → "Closed Captions" (more accurate term)

---

## v2.2.0 (2026-07-08)

### 🇧🇷 Português

#### ✨ Novidades
- **Ficha do Filme** — logline, sinopse, argumento, gênero, duração, público-alvo
- **Estrutura da História** — McKee: ideia governante, valor central, premissa, força antagônica, dilema, tipo de trama, perguntas guiadas
- **PWA** — instalável como app, service worker com cache offline
- **12 templates Excalidraw** — novos: Diagrama de Relações, Linha do Tempo, Arco de Personagem
- **Toolbar reorganizada** — grupos lógicos por função

#### 🔧 Melhorias
- Nome padronizado para "Fonte"
- Modal de apoio (☕ Pix, PayPal, GitHub, licença MIT)
- i18n completo: 129 chaves PT/EN, todos os modais traduzidos
- Favicon + apple-touch-icon
- Layout mobile da Ficha adaptado (empilhado, sem scroll horizontal)
- Timeline com min-width nas colunas para mobile (scroll horizontal)

#### 🐛 Correções
- Cronograma do Projeto Cultural não era salvo ao clicar "Salvar Dados"
- Emoji duplicado no header do Excalidraw
- Traduções faltando em modais (beat, personagem, excalidraw)

---

### 🇺🇸 English

#### ✨ New Features
- **Film Sheet** — logline, synopsis, treatment, genre, duration, target audience
- **Story Structure** — McKee: governing idea, central value, premise, antagonistic force, dilemma, plot type, guided questions
- **PWA** — installable as app, service worker with offline cache
- **12 Excalidraw templates** — new: Relationship Diagram, Timeline, Character Arc
- **Rearranged toolbar** — logical grouping by function

#### 🔧 Improvements
- Name standardized to "Fonte"
- Support modal (☕ Pix, PayPal, GitHub, MIT license)
- Complete i18n: 129 keys PT/EN, all modals translated
- Favicon + apple-touch-icon
- Mobile layout for Film Sheet (stacked, no horizontal scroll)
- Timeline with `minmax(110px,1fr)` for mobile horizontal scroll

#### 🐛 Bug Fixes
- Cultural Project timeline not saving when clicking "Save Data"
- Duplicate emoji in Excalidraw header
- Missing translations in beat, character, and excalidraw modals

---

## 📦 Download

`Fonte-web.zip` — baixe, extraia e abra `index.html` no navegador. Funciona offline em Windows, Linux, macOS e Android.
