# Changelog

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
