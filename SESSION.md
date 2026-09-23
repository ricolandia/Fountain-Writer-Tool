# SESSION.md — Fonte (Atualizado em 23/Set/2026)

## Estado atual

**Versão de trabalho:** v2.5.0 (ainda não commitada/taggeada — working tree com as mudanças)
**Último commit:** `893a124` — "fix: Excalidraw restaura cena salva em conexões lentas + sw v5 network-first"
**Tag anterior:** `v2.4.2`
**Branch:** `main`

> ⚠️ As mudanças da v2.5.0 estão no working tree (sem commit). Para publicar:
> revisar `git diff`, commitar, criar tag `v2.5.0` e push (o CI roda os testes
> e publica o zip/release).

---

## 🆕 Sessão 23/Set/2026 — auditoria + melhorias (v2.5.0)

Auditoria completa do app (código, SW, CI, desktop, repo) e execução das
correções em 4 fases. Resumo do que mudou (detalhes no CHANGELOG):

### P0 — perda de dados
- `_fileHandle` é desfeito em `newFile()`/`openProject()`/import (Ctrl+S não
  sobrescreve mais o arquivo de outro projeto no Chrome/Edge).
- Helper `store()` com tratamento de cota + aviso visível (`notifyStorageError`).
- Documento vazio sobrevive ao reload (`stored !== null`).
- `newFile()` não apaga mais `fw_backups`.
- `restoreBackup` restaura ficha/projeto cultural/elenco (backup agora guarda tudo).
- Cronograma do Projeto Cultural persistido via `_cronoDraft`.
- Undo nativo preservado: `_setEditorValue()` via `execCommand('insertText')`
  em replace-all, restore, import, marcador de ato, autocomplete, wrap.

### P1 — qualidade
- **Quadro lazy**: iframe sem `src` até abrir; bundle de 5,5 MB fora do precache.
- **SW v6**: chave de cache normalizada (remove `?_=`), network-first para
  documentos/app shell, stale-while-revalidate para `lib/` e `templates/`,
  fallback de navegação não devolve mais o app dentro do iframe.
- Parser: `scene_number` escapado (XSS na preview/export).
- `.fountain.json` com `version: 1` + `migrateProject()`; `shareProject` usa o
  payload completo (`_buildProjectData()`).
- CI: job de testes em push/PR; release depende dos testes; zip sem dev files.
- Testes: 42 (novos: migrateProject, actLabel, XSS do scene number, moveScene).

### P2 — UX/acessibilidade/perf/produto
- Acessibilidade: `role="dialog"`/`aria-modal` + Esc fecha modais + foco volta
  ao editor; botões de painel mobile focáveis; `aria-live` em toast/indicador;
  editor com aria-label; ações dos beats viraram `<button>`.
- i18n: Estatísticas, cronograma, CPF, total, captura do Quadro, modal Apoio,
  placeholders do Projeto, "Act N" em inglês (`actLabel()`).
- Perf: memo do `guessType` (`_guess` + cache) — update deixa de varrer o
  texto 6–8×; `renderCharsLocs` sem O(locais×texto)... (memo cobre).
- Produto: **seletor de 12 modelos** no Quadro; **drag reorder de cenas**
  (com reapontamento de beats/cores/marcações e undo); ↑/↓ nos beats.
- Mobile/PWA: `100dvh`, manifest com id/maskable/theme-color.
- Backend opcional: CORS restrito (env `FONTE_CORS_ORIGINS`), filename
  sanitizado, `fountain_utils` documentado como simplificado.

### P3 — higiene
- Removidos: `codemirror-fountain.js`, `moveActToScene`, `openFountainGuide`,
  `console.log` de debug, variável morta.
- Mapas de cor unificados (`PLOT_COLORS`/`ACT_COLORS`/`MARK_COLORS`).
- `sync-deploy.sh` (web/ → deploy/ sem lixo; deploy/ sincronizado nesta sessão).
- Docs: README (5 versões, templates, reorder), CHANGELOG v2.5.0 (PT+EN).

---

## 🩹 Hotfix 23/Set/2026 (v2.5.1) — seletor de modelos do Quadro

**Sintoma:** clicar num modelo da lista do Quadro não fazia nada.

**Causa (duas frentes):**
1. `fetch()` é bloqueado em **file://** — zip universal aberto direto e app
   desktop (QWebEngineView carrega via `QUrl.fromLocalFile`) → o carregamento
   falhava; em alguns contextos o erro ficava invisível.
2. No site, o `.htaccess` antigo cacheava `.js` por 1 semana → podia servir
   `index.html` novo com `app.js` velho (sem `loadExcalidrawTemplate`).

**Correção:**
- `web/templates/templates.js` (153 KB) com os 12 modelos embutidos,
  carregado sob demanda via `<script>` (funciona em file://); `fetch` segue
  como alternativa. Regenerar após editar templates (comando no cabeçalho
  do arquivo).
- Feedback visível: toast "🧩 Modelo carregado" e aviso no cabeçalho do
  Quadro em caso de falha.
- `.htaccess` do demo com `no-cache` p/ html/js/css + SW **v7** com precache
  `cache: 'reload'` e revalidação a cada carga (mata cache preso).
- Testes: `test_templates.js` (sincronia bundle ↔ .excalidraw ↔ seletor) e
  smoke do Quadro agora usa o seletor de verdade + verifica os embutidos.

> ⚠️ Quem já visitou o site antes precisa de **um reload extra** (ou
> Ctrl+Shift+R) para o SW v7 assumir e substituir o app.js velho do cache.

## Como testar

```bash
# Testes unitários (node ou bun)
node --test web/tests/*.js
~/.bun/bin/bun test ./web/tests/test_*.js    # alternativa sem node

# Smoke test no navegador (Chrome headless ou manual)
python3 serve.py
google-chrome --headless=new --disable-gpu --no-sandbox \
  --virtual-time-budget=25000 --dump-dom \
  http://localhost:8000/web/tests/browser-smoke.html | grep -E "PASS|FAIL"
google-chrome --headless=new --disable-gpu --no-sandbox \
  --virtual-time-budget=45000 --dump-dom \
  http://localhost:8000/web/tests/browser-smoke-board.html | grep -E "PASS|FAIL"

# Sincronizar deploy
./sync-deploy.sh   # depois subir deploy/ para ricolandia.com/.../Demo/
```

---

## Arquivos do projeto

```
Fountain-Writer-Tool/
├── web/                        # app (fonte da verdade)
│   ├── index.html              # UI completa (toolbar, modais, projeto, ficha)
│   ├── index.excalidraw.html   # iframe do Quadro (lazy)
│   ├── css/app.css
│   ├── js/app.js               # núcleo (~2900 linhas; _guess com memo)
│   ├── js/i18n.js              # PT/EN + structureOpts
│   ├── js/fountain-parser.js   # parser Fountain → HTML
│   ├── lib/                    # bundle Excalidraw vendorizado (5,5 MB)
│   ├── templates/              # 12 modelos .excalidraw
│   ├── tests/                  # 42 testes + 2 smoke tests de navegador
│   ├── sw.js                   # service worker v6
│   ├── manifest.json           # PWA
│   ├── server.py               # API opcional (não usada pelo frontend)
│   └── fountain_utils.py       # classificador simplificado (API opcional)
├── deploy/                     # cópia publicada no site (sync-deploy.sh)
├── desktop/                    # PySide6 + QWebEngineView (v2.4.0)
├── .github/workflows/          # build.yml (web) + build-desktop.yml (3-OS)
├── sync-deploy.sh
├── CHANGELOG.md · README.md · ROADMAP.md
└── SESSION.md (este arquivo)
```

## Funcionalidades (resumo)

Editor Fountain com preview ao vivo, corkboard, cenas (com drag reorder),
beats (CRUD, plotlines, comentários, ↑/↓), timeline atos×tramas, personagens/
locais, autocomplete de personagens, find/replace, folha de rosto, ficha do
filme, estrutura McKee, projeto cultural (11 seções + cronograma + orçamento),
Quadro Excalidraw (12 modelos), pomodoro/metas/highlights/auto-backup,
export HTML/PDF/Fountain, i18n PT/EN, temas, PWA offline, desktop nativo.

## Pendências

1. **Publicar a v2.5.0** — revisar diff, commit, tag, push; subir `deploy/`
   para o site (Demo).
2. **Testar no desktop** (PySide6) as mudanças do web — em especial o Quadro
   lazy (o `webapp.py` tem NoCache; o iframe sem src deve funcionar igual) e o
   seletor de modelos (o desktop empacota `web/`, então `templates/` está lá).
3. **Descartado anteriormente (mantém-se):** galeria de múltiplos quadros,
   contador de quadros, tema sépia, import .fdx/.celtx (tutorial cobre).
4. **Não feito nesta rodada (avaliar depois):**
   - Migrar os ~80 `onclick` inline para `addEventListener` + CSP (refactor
     grande; os botões já são focáveis).
   - Export PDF client-side "de verdade" (hoje é `window.print()`).
   - Memória de undo interna própria (hoje usa o undo nativo do textarea).
