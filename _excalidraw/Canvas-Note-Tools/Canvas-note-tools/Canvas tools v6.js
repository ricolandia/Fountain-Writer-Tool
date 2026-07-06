console.log("🚀 Canvas Linker widget carregado (v6.2)");
/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        Canvas Note Linker — TriliumNext  v6         ║
 * ║        + Modo Captura (persistido em atributo)      ║
 * ║        + Nova Nota Filha                            ║
 * ║        + Relações Semânticas por seta               ║
 * ║        + Opção de pular relação                     ║
 * ║        + Auto-detecção de texto da seta             ║
 * ║        + Fix: posição de cards (só conta CLW cards) ║
 * ║        + Fix: escape de HTML nos resultados         ║
 * ║        + Fix: Escape fecha painéis                  ║
 * ║        + Fix: clean() sem duplicação                ║
 * ║        + Remoção de card do canvas                  ║
 * ╚══════════════════════════════════════════════════════╝
 */

// ── Constantes ──────────────────────────────────────────
const CARD_CONFIG = {
    width:           330,
    strokeColor:     '#5c5f77',
    backgroundColor: 'transparent',
    titleFontSize:   24,
    excerptFontSize: 14,
    fontFamily:      2,
    roughness:       0,
    cornerRadius:    { type: 3 },
    cols:            5,
    colGap:          280,
    rowGap:          40,
    originX:         60,
    originY:         60,
    padX:            18,
    padY:            14,
    excerptSlice:    240,
};

const RELATION_TYPES = [
    { value: 'relatedTo',   label: 'Relacionado'  },
    { value: 'inspires',    label: 'Inspira'      },
    { value: 'contradicts', label: 'Contradiz'    },
    { value: 'supports',    label: 'Sustenta'     },
    { value: 'precedes',    label: 'Precede'      },
    { value: 'exemplifies', label: 'Exemplifica'  },
];

const RELATION_OPTIONS_HTML =
    '<option value="none">Pular (sem relação)</option>' +
    RELATION_TYPES.map(r => `<option value="${r.value}">${r.label}</option>`).join('');

const TEXT_TO_RELATION = {
    'inspira':      'inspires',
    'inspires':     'inspires',
    'contradiz':    'contradicts',
    'contradicts':  'contradicts',
    'sustenta':     'supports',
    'supports':     'supports',
    'suporta':      'supports',
    'precede':      'precedes',
    'precedes':     'precedes',
    'exemplifica':  'exemplifies',
    'exemplifies':  'exemplifies',
    'relacionado':  'relatedTo',
    'related':      'relatedTo',
    'relacao':      'relatedTo',
    'causa':        'precedes',
    'exemplo':      'exemplifies',
    'contra':       'contradicts',
    'refuta':       'contradicts',
    'discorda':     'contradicts',
    'apoia':        'supports',
};

// Regex para limpeza de HTML (usada nos callbacks de runOnBackend)
const HTML_CLEAN_PATTERN = [
    [/<style[^>]*>[\s\S]*?<\/style>/gi, ''],
    [/<script[^>]*>[\s\S]*?<\/script>/gi, ''],
    [/<\/(p|div|li|h[1-6]|br)>/gi, ' '],
    [/<[^>]+>/g, ''],
    [/&nbsp;/g, ' '],
    [/&amp;/g, '&'],
    [/&lt;/g, '<'],
    [/&gt;/g, '>'],
    [/&quot;/g, '"'],
    [/&#39;/g, "'"],
    [/&[a-z]+;/g, ' '],
    [/&#\d+;/g, ' '],
    [/\s+/g, ' '],
];

// ── Helpers ──────────────────────────────────────────────
/**
 * Escapa caracteres especiais de HTML para evitar XSS
 * ao inserir strings não-confiáveis em innerHTML.
 */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Serializa HTML_CLEAN_PATTERN para passagem via runOnBackend.
 * Centraliza a lógica que antes era duplicada em _onSearch e _insertCard.
 */
function getCleanPatterns() {
    return HTML_CLEAN_PATTERN.map(([reSrc, repl]) => [reSrc.source, reSrc.flags, repl]);
}

// ────────────────────────────────────────────────────────
class CanvasLinkerWidget extends api.NoteContextAwareWidget {
    get position()     { return 100; }
    get parentWidget() { return 'center-pane'; }
    isEnabled()        { return true; }

    _captureMode         = false;
    _captureCanvasNoteId = null;

    /* ── Ciclo de vida ─────────────────────────────────── */
    doRender() {
        this.$widget = $('<div style="display:none;height:0;overflow:hidden;">');
        if (!document.getElementById('clw-root')) {
            this._injectFloat();
        }
        window._clw = {
            search:               (q)                  => this._onSearch(q),
            insert:               (id, title, excerpt) => this._insertCard(id, title, excerpt),
            generateLongform:     ()                   => this._generateLongform(),
            toggleCapture:        ()                   => this._toggleCapture(),
            createNote:           ()                   => this._createNote(),
            openRelationsPanel:   ()                   => this._openRelationsPanel(),
            confirmSaveRelations: ()                   => this._confirmSaveRelations(),
            removeCard:           ()                   => this._openRemovePanel(),
        };
        // Restaura modo captura se estava ativo antes de um hot-reload
        setTimeout(() => this._restoreCaptureState(), 200);
        return this.$widget;
    }

    /* ── Helpers de DOM ────────────────────────────────── */
    _el(id) { return document.getElementById(id); }
    _els(sel, parent) { return (parent || document).querySelectorAll(sel); }
    _show(id) { const el = this._el(id); if (el) el.style.display = 'block'; }
    _hide(id) { const el = this._el(id); if (el) el.style.display = 'none'; }

    /* ── UI: Injeção da estrutura flutuante ────────────── */
    _injectFloat() {
        const html = /* html */`
        <div id="clw-root">
            <!-- Painel de busca -->
            <div id="clw-panel" class="clw-panel">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🔗</span>
                    <span class="clw-panel-title">Inserir nota no Canvas</span>
                </div>
                <input id="clw-search" class="clw-input" type="text"
                    placeholder="Buscar nota por título…"
                    autocomplete="off" spellcheck="false" />
                <div id="clw-results" class="clw-scroll"></div>
                <div id="clw-status" class="clw-status">Nenhuma nota encontrada.</div>
            </div>

            <!-- Painel de nova nota -->
            <div id="clw-newnote-float" class="clw-panel" style="width:340px">
                <div class="clw-panel-title">Nova nota filha</div>
                <div class="clw-row">
                    <input id="clw-newnote-title" class="clw-input" type="text"
                        placeholder="Título da nota…"
                        autocomplete="off" spellcheck="false" />
                    <button id="clw-newnote-confirm" class="clw-btn-primary">Criar</button>
                </div>
            </div>

            <!-- Painel de relações -->
            <div id="clw-relmap-panel" class="clw-panel clw-panel--green" style="width:340px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🕸️</span>
                    <span class="clw-panel-title">Relações detectadas</span>
                    <button id="clw-relmap-close" class="clw-panel-close">✕</button>
                </div>
                <div id="clw-relmap-list" class="clw-scroll clw-rel-list"></div>
                <div id="clw-relmap-empty" class="clw-status">
                    Nenhuma seta conectando cards encontrada.
                </div>
                <button id="clw-relmap-save" class="clw-btn-primary clw-btn--green clw-btn-block">
                    Salvar relações
                </button>
            </div>

            <!-- Painel de remoção de card -->
            <div id="clw-remove-panel" class="clw-panel clw-panel--danger" style="width:300px">
                <div class="clw-panel-header">
                    <span class="clw-panel-icon">🗑️</span>
                    <span class="clw-panel-title">Remover card do canvas</span>
                    <button id="clw-remove-close" class="clw-panel-close">✕</button>
                </div>
                <div id="clw-remove-results" class="clw-scroll" style="max-height:220px"></div>
                <div id="clw-remove-empty" class="clw-status">Nenhum card vinculado encontrado.</div>
            </div>

            <!-- Banner captura -->
            <div id="clw-capture-banner" class="clw-banner">
                <span class="clw-banner-icon">🎯</span>
                <span>Modo Captura ativo &mdash; toda nota clicada entra no canvas</span>
            </div>

            <!-- Toolbar de botões -->
            <div class="clw-toolbar">
                <button id="clw-btn"          class="clw-round-btn" title="Inserir nota no Canvas">🔗</button>
                <button id="clw-btn-capture"  class="clw-round-btn" title="Modo Captura">🎯</button>
                <button id="clw-btn-newnote"  class="clw-round-btn" title="Criar nova nota filha">📝</button>
                <button id="clw-btn-saverel"  class="clw-round-btn" title="Relações por setas">🕸️</button>
                <button id="clw-btn-longform" class="clw-round-btn" title="Gerar Longform">📄</button>
                <button id="clw-btn-remove"   class="clw-round-btn clw-round-btn--danger" title="Remover card do Canvas">🗑️</button>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Injeta CSS como stylesheet para melhor organização e performance
        const style = document.createElement('style');
        style.id = 'clw-style';
        style.textContent = /* css */`
/* ═══════════════════ CLW — CSS ═══════════════════ */
@keyframes clwSlideIn {
    from { opacity:0; transform:translateY(10px) scale(0.96); }
    to   { opacity:1; transform:translateY(0)   scale(1);    }
}
@keyframes clwPulse {
    0%   { box-shadow:0 0 0 0    rgba(243,139,168,0.7); }
    70%  { box-shadow:0 0 0 10px rgba(243,139,168,0);   }
    100% { box-shadow:0 0 0 0    rgba(243,139,168,0);   }
}
@keyframes clwFadeIn {
    from { opacity:0; }
    to   { opacity:1; }
}

/* ── Root container ── */
#clw-root {
    position:fixed; bottom:90px; right:14px; z-index:9999;
    display:none; flex-direction:column; align-items:flex-end; gap:12px;
    font-family:var(--detail-font-family,'Segoe UI',system-ui,sans-serif);
    font-size:13px; pointer-events:none;
}
#clw-root > * { pointer-events:auto; }

/* ── Painéis ── */
.clw-panel {
    display:none;
    background:var(--accented-background-color,#1e1e2e);
    border:1px solid var(--main-border-color,#45475a);
    border-radius:14px; padding:16px; width:300px;
    box-shadow:
        0 0 0 1px rgba(203,166,247,0.06),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
    animation:clwSlideIn 0.18s cubic-bezier(0.16,1,0.3,1);
    backdrop-filter:blur(8px);
}
.clw-panel--green {
    box-shadow:
        0 0 0 1px rgba(166,227,161,0.06),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
}
.clw-panel-header {
    display:flex; align-items:center; gap:8px; margin-bottom:12px;
}
.clw-panel-icon   { font-size:16px; line-height:1; }
.clw-panel-title  {
    font-size:11px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.08em; color:var(--muted-text-color,#6c7086);
}
.clw-panel-close {
    margin-left:auto; background:none; border:none;
    color:var(--muted-text-color,#6c7086); cursor:pointer;
    font-size:16px; line-height:1; padding:2px 6px; border-radius:5px;
    transition:color 0.15s, background 0.15s;
}
.clw-panel-close:hover {
    color:var(--main-text-color,#cdd6f4); background:var(--hover-item-background-color,#313244);
}

/* ── Inputs ── */
.clw-input {
    width:100%; padding:9px 12px; border:1px solid var(--main-border-color,#45475a);
    border-radius:8px; background:var(--main-background-color,#181825);
    color:var(--main-text-color,#cdd6f4); font-size:13px;
    box-sizing:border-box; outline:none;
    transition:border-color 0.2s, box-shadow 0.2s;
}
.clw-input:focus {
    border-color:#cba6f7 !important;
    box-shadow:0 0 0 3px rgba(203,166,247,0.15);
}
.clw-input::placeholder { color:var(--muted-text-color,#585b70); opacity:0.7; }

/* ── Status ── */
#clw-status {
    display:none; margin-top:10px; font-size:12px;
    color:var(--muted-text-color,#6c7086); text-align:center; padding:6px 0;
}

/* ── Scroll container ── */
.clw-scroll {
    overflow-y:auto; scrollbar-width:thin;
    scrollbar-color:var(--main-border-color,#45475a) transparent;
}
.clw-scroll::-webkit-scrollbar       { width:5px; }
.clw-scroll::-webkit-scrollbar-track { background:transparent; }
.clw-scroll::-webkit-scrollbar-thumb {
    background:var(--main-border-color,#45475a); border-radius:6px;
}
.clw-scroll::-webkit-scrollbar-thumb:hover {
    background:var(--muted-text-color,#6c7086);
}

/* ── Search results ── */
#clw-results {
    margin-top:10px; max-height:240px;
    display:flex; flex-direction:column; gap:2px;
}
.clw-result-item {
    padding:8px 11px; border-radius:7px; cursor:pointer;
    color:var(--main-text-color,#cdd6f4); line-height:1.4;
    transition:background 0.12s, border-color 0.12s;
    border:1px solid transparent;
    animation:clwFadeIn 0.15s ease both;
}
.clw-result-item:hover, .clw-result-item:focus-visible {
    background:var(--hover-item-background-color,#313244) !important;
    border-color:var(--main-border-color,#45475a) !important;
}
.clw-result-title {
    font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}
.clw-result-excerpt {
    font-size:11px; color:var(--muted-text-color,#6c7086);
    margin-top:3px; display:-webkit-box; -webkit-line-clamp:2;
    -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;
}

/* ── Row / Toolbar ── */
.clw-row  { display:flex; gap:7px; align-items:center; }
.clw-toolbar {
    display:flex; gap:10px; padding:2px;
}

/* ── Round buttons ── */
.clw-round-btn {
    width:46px; height:46px; border-radius:50%;
    background:var(--button-background-color,#313244);
    border:1px solid var(--main-border-color,#45475a);
    color:var(--main-text-color,#cdd6f4);
    cursor:pointer; font-size:19px; line-height:1;
    display:flex; align-items:center; justify-content:center;
    box-shadow:
        0 2px 8px  rgba(0,0,0,0.35),
        0 0 0 1px  rgba(255,255,255,0.04);
    transition: transform 0.18s cubic-bezier(0.16,1,0.3,1),
                box-shadow 0.18s, background 0.15s, border-color 0.15s;
    flex-shrink:0; user-select:none;
    -webkit-tap-highlight-color:transparent;
}
.clw-round-btn:hover {
    transform:scale(1.1);
    box-shadow:
        0 4px 16px rgba(0,0,0,0.5),
        0 0 0 1px  rgba(255,255,255,0.08);
    background:var(--hover-item-background-color,#45475a);
    border-color:var(--muted-text-color,#6c7086);
}
.clw-round-btn:active { transform:scale(0.95); }

/* ── Capture button active state ── */
#clw-btn-capture.clw-capture-active {
    background:#f38ba8 !important; border-color:#f38ba8 !important;
    color:#1e1e2e !important;
    animation:clwPulse 2s ease-out infinite;
}

/* ── Danger (remove) button ── */
.clw-round-btn--danger:hover {
    background:rgba(243,139,168,0.18) !important;
    border-color:#f38ba8 !important;
}

/* ── Painel danger (remoção) ── */
.clw-panel--danger {
    box-shadow:
        0 0 0 1px rgba(243,139,168,0.08),
        0 4px 24px rgba(0,0,0,0.45),
        0 1px 4px  rgba(0,0,0,0.3);
}
.clw-remove-item {
    display:flex; align-items:center; justify-content:space-between;
    padding:8px 10px; border-radius:7px; cursor:default;
    border:1px solid transparent;
    animation:clwFadeIn 0.15s ease both;
}
.clw-remove-item:nth-child(even) { background:rgba(243,139,168,0.03); }
.clw-remove-item-title {
    font-size:12px; color:var(--main-text-color,#cdd6f4);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    flex:1; margin-right:8px;
}
.clw-remove-item-btn {
    flex-shrink:0; padding:4px 10px; border-radius:6px;
    background:rgba(243,139,168,0.15); border:1px solid rgba(243,139,168,0.3);
    color:#f38ba8; font-size:11px; font-weight:600; cursor:pointer;
    transition:background 0.15s, border-color 0.15s;
    white-space:nowrap;
}
.clw-remove-item-btn:hover {
    background:rgba(243,139,168,0.3); border-color:#f38ba8;
}

/* ── Primary buttons ── */
.clw-btn-primary {
    padding:8px 14px; border-radius:8px;
    background:#cba6f7; border:none; color:#1e1e2e;
    font-size:13px; font-weight:700; cursor:pointer;
    white-space:nowrap; transition:background 0.15s, transform 0.1s, box-shadow 0.15s;
    box-shadow:0 1px 3px rgba(0,0,0,0.2);
}
.clw-btn-primary:hover   { background:#d4b8ff; }
.clw-btn-primary:active  { transform:scale(0.97); }
.clw-btn-block            { width:100%; text-align:center; }

.clw-btn--green           { background:#a6e3a1; }
.clw-btn--green:hover     { background:#b9f0b4; }

/* ── Banner ── */
.clw-banner {
    display:none;
    background:rgba(243,139,168,0.08);
    border:1px solid rgba(243,139,168,0.25);
    border-radius:10px; padding:8px 14px;
    font-size:12px; color:#f38ba8; text-align:center;
    width:260px; box-sizing:border-box; line-height:1.5;
    backdrop-filter:blur(4px);
}
.clw-banner-icon { margin-right:4px; }

/* ── Relations panel ── */
.clw-rel-list {
    max-height:320px; display:flex; flex-direction:column; gap:8px;
}
.clw-rel-row {
    display:grid;
    grid-template-columns:1fr 18px 1fr;
    align-items:center; gap:4px;
    padding:8px 10px; border-radius:8px;
    border:1px solid var(--main-border-color,#45475a);
    background:var(--main-background-color,#181825);
    animation:clwFadeIn 0.15s ease both;
}
.clw-rel-row:nth-child(even) { background:rgba(166,227,161,0.03); }
.clw-rel-name {
    font-size:12px; color:var(--main-text-color,#cdd6f4);
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    font-weight:500;
}
.clw-rel-arrow {
    font-size:13px; text-align:center;
    color:var(--muted-text-color,#6c7086);
}
.clw-rel-select {
    grid-column:1 / -1; margin-top:6px;
    padding:6px 8px;
    border:1px solid var(--main-border-color,#45475a);
    border-radius:7px;
    background:var(--accented-background-color,#1e1e2e);
    color:var(--main-text-color,#cdd6f4);
    font-size:12px; outline:none; cursor:pointer; width:100%;
    transition:border-color 0.2s, box-shadow 0.2s;
}
.clw-rel-select:focus {
    border-color:#a6e3a1 !important;
    box-shadow:0 0 0 3px rgba(166,227,161,0.15);
}
.clw-rel-select option {
    background:var(--accented-background-color,#1e1e2e);
    color:var(--main-text-color,#cdd6f4);
}

/* ── Botão de salvar posicionamento ── */
#clw-relmap-save   { margin-top:14px; display:none; }
#clw-relmap-empty   { display:none; }
.clw-status {
    font-size:12px; color:var(--muted-text-color,#6c7086);
    text-align:center; padding:16px 0;
}
        `;
        document.head.appendChild(style);

        // ── Event listeners ──
        this._el('clw-btn').addEventListener('click', () => this._togglePanel());
        this._el('clw-btn-longform').addEventListener('click', () => window._clw.generateLongform());
        this._el('clw-btn-capture').addEventListener('click', () => window._clw.toggleCapture());
        this._el('clw-btn-newnote').addEventListener('click', () => this._toggleNewNotePanel());
        this._el('clw-newnote-confirm').addEventListener('click', () => window._clw.createNote());
        this._el('clw-newnote-title').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') window._clw.createNote();
        });
        this._el('clw-btn-saverel').addEventListener('click', () => window._clw.openRelationsPanel());
        this._el('clw-relmap-close').addEventListener('click', () => this._hide('clw-relmap-panel'));
        this._el('clw-relmap-save').addEventListener('click', () => window._clw.confirmSaveRelations());
        this._el('clw-btn-remove').addEventListener('click', () => window._clw.removeCard());
        this._el('clw-remove-close').addEventListener('click', () => this._hide('clw-remove-panel'));

        // Fecha painéis com Escape
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            this._hide('clw-panel');
            this._hide('clw-newnote-float');
            this._hide('clw-relmap-panel');
            this._hide('clw-remove-panel');
        });

        let searchTimer;
        this._el('clw-search').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const q = e.target.value;
            searchTimer = setTimeout(() => window._clw?.search(q), 280);
        });

        // Fecha painéis ao clicar fora
        document.addEventListener('click', (e) => {
            const root = this._el('clw-root');
            if (root && !root.contains(e.target)) {
                this._hide('clw-panel');
                this._hide('clw-newnote-float');
                this._hide('clw-remove-panel');
            }
        });
    }

    /* ── Toggle do painel de busca ─────────────────────── */
    _togglePanel() {
        const panel = this._el('clw-panel');
        if (!panel) return;
        if (panel.style.display === 'block') {
            panel.style.display = 'none';
        } else {
            panel.style.display = 'block';
            const input = this._el('clw-search');
            if (input) { input.value = ''; }
            const results = this._el('clw-results');
            if (results) results.innerHTML = '';
            this._hide('clw-status');
            this._hide('clw-newnote-float');
            setTimeout(() => input?.focus(), 60);
        }
    }

    /* ── Toggle do painel de nova nota ─────────────────── */
    _toggleNewNotePanel() {
        const float = this._el('clw-newnote-float');
        if (!float) return;
        this._hide('clw-panel');
        if (float.style.display === 'block') {
            float.style.display = 'none';
        } else {
            float.style.display = 'block';
            const titleInput = this._el('clw-newnote-title');
            if (titleInput) { titleInput.value = ''; setTimeout(() => titleInput.focus(), 60); }
        }
    }

    /* ── MODO CAPTURA ──────────────────────────────────── */
    _toggleCapture() {
        if (!this._captureMode) {
            if (!this.noteId) { api.showError('Abra um Canvas para ativar a captura.'); return; }
            this._captureMode         = true;
            this._captureCanvasNoteId = this.noteId;
            this._el('clw-btn-capture').classList.add('clw-capture-active');
            this._show('clw-capture-banner');
            // Persiste o ID do canvas ativo para sobreviver a hot-reloads
            try { sessionStorage.setItem('clw_capture_canvas', this.noteId); } catch (_) {}
            api.showMessage('🎯 Modo Captura ativado — navegue pelas notas.');
        } else {
            this._captureMode         = false;
            this._captureCanvasNoteId = null;
            this._el('clw-btn-capture').classList.remove('clw-capture-active');
            this._hide('clw-capture-banner');
            try { sessionStorage.removeItem('clw_capture_canvas'); } catch (_) {}
            api.showMessage('⏹ Modo Captura desativado.');
        }
    }

    /* ── RESTAURA estado de captura após reload ────────── */
    _restoreCaptureState() {
        try {
            const savedId = sessionStorage.getItem('clw_capture_canvas');
            if (!savedId) return;
            this._captureMode         = true;
            this._captureCanvasNoteId = savedId;
            const btn = this._el('clw-btn-capture');
            if (btn) btn.classList.add('clw-capture-active');
            this._show('clw-capture-banner');
        } catch (_) {}
    }

    /* ── CRIAR NOVA NOTA FILHA ─────────────────────────── */
    async _createNote() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const titleInput = this._el('clw-newnote-title');
        const title = titleInput?.value.trim() || '';
        if (!title) { api.showError('Digite um título para a nova nota.'); titleInput?.focus(); return; }

        try {
            const newNoteId = await api.runOnBackend((canvasNoteId, title) => {
                const result = api.createNewNote({
                    parentNoteId: canvasNoteId, title,
                    content: '', type: 'text',
                });
                return result.note.noteId;
            }, [canvasNoteId, title]);

            if (titleInput) titleInput.value = '';
            this._hide('clw-newnote-float');
            await this._insertCard(newNoteId, title, '');
            api.showMessage(`✅ Nota "${title}" criada e inserida no canvas.`);
        } catch (err) {
            console.error('[CanvasLinker] createNote error:', err);
            api.showError('Erro ao criar nota: ' + err.message);
        }
    }

    /* ── REMOVER CARD DO CANVAS ────────────────────────── */
    /**
     * Abre painel listando todos os cards vinculados no canvas atual.
     * O usuário clica em "Remover" ao lado do card desejado.
     */
    async _openRemovePanel() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $results = this._el('clw-remove-results');
        const $empty   = this._el('clw-remove-empty');
        const $panel   = this._el('clw-remove-panel');

        $results.innerHTML      = '';
        $empty.style.display    = 'none';
        $panel.style.display    = 'block';

        // Fecha outros painéis
        this._hide('clw-panel');
        this._hide('clw-newnote-float');
        this._hide('clw-relmap-panel');

        try {
            // Lê todos os cards (rect + link) do canvas
            const cards = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return (data.elements || [])
                    .filter(e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/'))
                    .map(e => {
                        const noteId = e.link.replace('#root/', '');
                        const linked = api.getNote(noteId);
                        return { noteId, title: linked?.title || noteId };
                    });
            }, [canvasNoteId]);

            if (!cards || cards.length === 0) {
                $empty.style.display = 'block';
                return;
            }

            const fragment = document.createDocumentFragment();
            cards.forEach((card, i) => {
                const row = document.createElement('div');
                row.className = 'clw-remove-item';
                row.style.animationDelay = `${i * 25}ms`;
                row.innerHTML = `
                    <span class="clw-remove-item-title" title="${escapeHtml(card.title)}">${escapeHtml(card.title)}</span>
                    <button class="clw-remove-item-btn">Remover</button>
                `;
                row.querySelector('button').addEventListener('click', async () => {
                    if (!confirm('Remover este card do canvas?\nA nota continuará existindo no Trilium.')) return;
                    row.style.opacity = '0.4';
                    row.style.pointerEvents = 'none';
                    await this._doRemoveCard(canvasNoteId, card.noteId);
                    row.remove();
                    if (!this._el('clw-remove-results').children.length) {
                        $empty.style.display = 'block';
                    }
                });
                fragment.appendChild(row);
            });
            $results.appendChild(fragment);

        } catch (err) {
            console.error('[CanvasLinker] openRemovePanel error:', err);
            api.showError('Erro ao listar cards: ' + err.message);
            $panel.style.display = 'none';
        }
    }

    /**
     * Faz o soft-delete dos elementos do grupo vinculado à nota alvo.
     * Não deleta a nota do Trilium.
     */
    async _doRemoveCard(canvasNoteId, targetNoteId) {
        try {
            const removed = await api.runOnBackend((canvasNoteId, targetNoteId) => {
                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                const elements = data.elements || [];

                const link = '#root/' + targetNoteId;
                const rect = elements.find(e => !e.isDeleted && e.type === 'rectangle' && e.link === link);
                if (!rect) return 0;

                const groupIds = new Set(rect.groupIds || []);
                let count = 0;
                for (const el of elements) {
                    if (el.isDeleted) continue;
                    if (el.id === rect.id || el.groupIds?.some(gid => groupIds.has(gid))) {
                        el.isDeleted = true;
                        el.updated   = Date.now();
                        count++;
                    }
                }
                if (count > 0) canvasNote.setContent(JSON.stringify(data));
                return count;
            }, [canvasNoteId, targetNoteId]);

            if (removed > 0) {
                api.showMessage('🗑️ Card removido do canvas.');
            } else {
                api.showMessage('ℹ️ Card não encontrado no canvas.');
            }
        } catch (err) {
            console.error('[CanvasLinker] doRemoveCard error:', err);
            api.showError('Erro ao remover card: ' + err.message);
        }
    }

    /* ── PAINEL DE RELAÇÕES ────────────────────────────── */
    async _openRelationsPanel() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $list  = this._el('clw-relmap-list');
        const $empty = this._el('clw-relmap-empty');
        const $save  = this._el('clw-relmap-save');
        const $panel = this._el('clw-relmap-panel');

        $list.innerHTML      = '';
        $empty.style.display = 'none';
        $save.style.display  = 'none';
        $panel.style.display = 'block';

        try {
            const { pairs } = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); }
                catch (_) { data = {}; }
                const elements = (data.elements || []).filter(e => !e.isDeleted);

                const cardMap = {};
                elements.forEach(el => {
                    if (el.type === 'rectangle' && el.link?.startsWith('#root/')) {
                        cardMap[el.id] = el.link.replace('#root/', '');
                    }
                });

                const groupToCard = {};
                Object.keys(cardMap).forEach(rectId => {
                    const el = elements.find(e => e.id === rectId);
                    if (el?.groupIds) el.groupIds.forEach(gid => { groupToCard[gid] = rectId; });
                });

                const resolveToCard = (elId) => {
                    if (cardMap[elId]) return elId;
                    const el = elements.find(e => e.id === elId);
                    if (el?.groupIds) {
                        for (const gid of el.groupIds) {
                            if (groupToCard[gid]) return groupToCard[gid];
                        }
                    }
                    return null;
                };

                const pairs = [];
                const seen  = new Set();
                elements.forEach(el => {
                    if (
                        el.type === 'arrow' &&
                        el.startBinding?.elementId &&
                        el.endBinding?.elementId
                    ) {
                        const fromEl = resolveToCard(el.startBinding.elementId);
                        const toEl   = resolveToCard(el.endBinding.elementId);
                        if (!fromEl || !toEl || fromEl === toEl) return;
                        const key = cardMap[fromEl] + '→' + cardMap[toEl];
                        if (seen.has(key)) return;
                        seen.add(key);

                        // ── Extrai texto da seta ──
                        let arrowText = '';
                        let arrowTextElId = '';
                        if (el.boundElements && el.boundElements.length > 0) {
                            for (const be of el.boundElements) {
                                const textEl = elements.find(e => e.id === be.id);
                                if (textEl && textEl.type === 'text' && textEl.text) {
                                    arrowText = textEl.text.trim();
                                    arrowTextElId = textEl.id;
                                    break;
                                }
                            }
                        }

                        const fromNoteId = cardMap[fromEl];
                        const toNoteId   = cardMap[toEl];
                        const fromNote   = api.getNote(fromNoteId);
                        const toNote     = api.getNote(toNoteId);
                        pairs.push({
                            fromNoteId,
                            toNoteId,
                            fromTitle: fromNote?.title || fromNoteId,
                            toTitle:   toNote?.title   || toNoteId,
                            arrowText,
                            arrowTextElId: arrowTextElId || '',
                        });
                    }
                });
                return { pairs };
            }, [canvasNoteId]);

            if (!pairs || pairs.length === 0) {
                $empty.style.display = 'block';
                return;
            }

            const standardOptions = RELATION_OPTIONS_HTML;

            const fragment = document.createDocumentFragment();
            pairs.forEach((pair, i) => {
                const row = document.createElement('div');
                row.className    = 'clw-rel-row';
                row.dataset.from = pair.fromNoteId;
                row.dataset.to   = pair.toNoteId;
                row.dataset.textElId = pair.arrowTextElId || '';
                row.style.animationDelay = `${i * 30}ms`;

                const arrowText = pair.arrowText || '';
                let selectedValue = '';
                let customOption = '';

                if (arrowText) {
                    const lower = arrowText.toLowerCase().trim();

                    // 1. Match direto por valor
                    const direct = RELATION_TYPES.find(r => r.value === lower);
                    if (direct) {
                        selectedValue = direct.value;
                    } else {
                        // 2. Match por label traduzida (ex: "Inspira" → inspira)
                        const byLabel = RELATION_TYPES.find(r => r.label.toLowerCase() === lower);
                        if (byLabel) {
                            selectedValue = byLabel.value;
                        } else {
                            // 3. Match via tabela de mapeamento
                            const mapped = TEXT_TO_RELATION[lower];
                            if (mapped) {
                                selectedValue = mapped;
                            }
                        }
                    }

                    // 4. Se não casou com nenhum, vira opção custom
                    if (!selectedValue && lower) {
                        const safeValue = lower.replace(/"/g, '').slice(0, 60);
                        customOption = `<option value="${safeValue}" selected>${safeValue} (custom)</option>`;
                        selectedValue = safeValue;
                    }
                }

                row.innerHTML = `
                    <div class="clw-rel-name" title="${escapeHtml(pair.fromTitle)}">${escapeHtml(pair.fromTitle)}</div>
                    <div class="clw-rel-arrow">→</div>
                    <div class="clw-rel-name" title="${escapeHtml(pair.toTitle)}">${escapeHtml(pair.toTitle)}</div>
                    <select class="clw-rel-select" id="clw-rel-sel-${i}">
                        ${customOption}
                        ${standardOptions}
                    </select>
                `;

                // Pré-seleciona se for valor padrão (custom já está selected via atributo)
                if (selectedValue && !customOption) {
                    const sel = row.querySelector('select');
                    if (sel) {
                        const opt = [...sel.options].find(o => o.value === selectedValue);
                        if (opt) opt.selected = true;
                    }
                }

                fragment.appendChild(row);
            });
            $list.appendChild(fragment);
            $save.style.display = 'block';
        } catch (err) {
            console.error('[CanvasLinker] openRelationsPanel error:', err);
            api.showError('Erro ao ler canvas: ' + err.message);
            $panel.style.display = 'none';
        }
    }

    async _confirmSaveRelations() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const rows = this._els('.clw-rel-row', this._el('clw-relmap-list'));
        if (rows.length === 0) return;

        const relations = [];
        rows.forEach((row, i) => {
            const select = this._el(`clw-rel-sel-${i}`);
            if (!select || select.value === 'none') return;

            const textElId = row.dataset.textElId;
            let newText = '';
            if (textElId) {
                const rel = RELATION_TYPES.find(r => r.value === select.value);
                newText = rel ? rel.label : select.value;
            }

            relations.push({
                fromNoteId: row.dataset.from,
                toNoteId:   row.dataset.to,
                relType:    select.value,
                textElId:   textElId || '',
                newText,
            });
        });

        if (relations.length === 0) {
            this._hide('clw-relmap-panel');
            api.showMessage('ℹ️ Nenhuma relação selecionada.');
            return;
        }

        try {
            const saved = await api.runOnBackend((canvasNoteId, relations) => {
                let count = 0;
                for (const { fromNoteId, toNoteId, relType } of relations) {
                    try {
                        const note = api.getNote(fromNoteId);
                        if (!note) continue;
                        note.addRelation(relType, toNoteId);
                        count++;
                    } catch (err) {
                        console.error(
                            `[CanvasLinker] addRelation failed: ${fromNoteId} → ${toNoteId}`, err
                        );
                    }
                }

                const canvasNote = api.getNote(canvasNoteId);
                if (canvasNote) {
                    let data;
                    try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                    let dirty = false;
                    for (const { textElId, newText } of relations) {
                        if (!textElId || !newText) continue;
                        const el = (data.elements || []).find(e => e.id === textElId);
                        if (el && el.type === 'text' && el.text !== newText) {
                            el.text = newText;
                            el.originalText = newText;
                            dirty = true;
                        }
                    }
                    if (dirty) canvasNote.setContent(JSON.stringify(data));
                }

                return count;
            }, [canvasNoteId, relations]);

            this._hide('clw-relmap-panel');
            api.showMessage(`✅ ${saved} relação(ões) salvas.`);
        } catch (err) {
            console.error('[CanvasLinker] confirmSaveRelations error:', err);
            api.showError('Erro ao salvar relações: ' + err.message);
        }
    }

    /* ── GERADOR DE LONGFORM ───────────────────────────── */
    async _generateLongform() {
        const canvasNoteId = this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }
        api.showMessage('Lendo canvas…');

        try {
            const { elements, canvasTitle } = await api.runOnBackend((canvasNoteId) => {
                const note = api.getNote(canvasNoteId);
                if (!note) throw new Error('Nota canvas não encontrada.');
                let data;
                try { data = JSON.parse(note.getContent() || '{}'); } catch (_) { data = {}; }
                return {
                    elements:    (data.elements || []).filter(e => !e.isDeleted),
                    canvasTitle: note.title
                };
            }, [canvasNoteId]);

            const cardMap = {};
            const cardPos = {};
            elements.forEach(el => {
                if (el.type === 'rectangle' && el.link?.startsWith('#root/')) {
                    cardMap[el.id] = el.link.replace('#root/', '');
                    cardPos[el.id] = { x: el.x || 0, y: el.y || 0 };
                }
            });

            const totalCards = Object.keys(cardMap).length;
            if (totalCards === 0) {
                api.showError('Nenhum card com nota vinculada encontrado no canvas.');
                return;
            }

            const groupToCard = {};
            Object.keys(cardMap).forEach(rectId => {
                const el = elements.find(e => e.id === rectId);
                if (el?.groupIds) el.groupIds.forEach(gid => { groupToCard[gid] = rectId; });
            });

            const resolveToCard = (elId) => {
                if (cardMap[elId]) return elId;
                const el = elements.find(e => e.id === elId);
                if (el?.groupIds) {
                    for (const gid of el.groupIds) { if (groupToCard[gid]) return groupToCard[gid]; }
                }
                return null;
            };

            const adjList  = {};
            const inDegree = {};
            Object.keys(cardMap).forEach(id => { adjList[id] = []; inDegree[id] = 0; });

            let arrowCount = 0;
            elements.forEach(el => {
                if (el.type === 'arrow' && el.startBinding?.elementId && el.endBinding?.elementId) {
                    const from = resolveToCard(el.startBinding.elementId);
                    const to   = resolveToCard(el.endBinding.elementId);
                    if (from && to && from !== to) {
                        adjList[from].push(to); inDegree[to]++; arrowCount++;
                    }
                }
            });

            console.log(`[CanvasLinker] Longform: ${totalCards} cards, ${arrowCount} setas.`);

            const ordered = [];
            const visited = new Set();
            if (arrowCount > 0) {
                const queue = Object.keys(cardMap)
                    .filter(id => inDegree[id] === 0 && adjList[id].length > 0);
                if (queue.length === 0) {
                    console.warn('[CanvasLinker] Ciclo detectado — usando ordem por posição.');
                    api.showMessage('⚠️ Ciclo nas setas — ordenando por posição.');
                } else {
                    while (queue.length > 0) {
                        const current = queue.shift();
                        if (visited.has(current)) continue;
                        visited.add(current);
                        ordered.push(current);
                        for (const neighbor of adjList[current]) {
                            inDegree[neighbor]--;
                            if (inDegree[neighbor] === 0) queue.push(neighbor);
                        }
                    }
                }
            }

            const remaining = Object.keys(cardMap)
                .filter(id => !visited.has(id))
                .sort((a, b) => {
                    const dy = cardPos[a].y - cardPos[b].y;
                    return dy !== 0 ? dy : cardPos[a].x - cardPos[b].x;
                });

            const finalOrder = [...ordered, ...remaining];
            const noteIds    = finalOrder.map(elId => cardMap[elId]);

            const orderSource = arrowCount > 0 && ordered.length > 0
                ? `${ordered.length} via setas + ${remaining.length} por posição`
                : `${noteIds.length} por posição (nenhuma seta detectada)`;

            const newNoteId = await api.runOnBackend((canvasNoteId, noteIds, canvasTitle) => {
                let content = '';
                for (const nid of noteIds) {
                    const note = api.getNote(nid);
                    if (!note) continue;
                    // Remove apenas style/script embutidos — preserva o HTML estrutural da nota
                    const raw = (note.getContent() || '')
                        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
                    content += `<h2>${note.title}</h2>\n${raw}\n<br><hr><br>\n`;
                }
                const result = api.createNewNote({
                    parentNoteId: canvasNoteId,
                    title:        '📄 ' + canvasTitle,
                    content, type: 'text'
                });
                return result.note.noteId;
            }, [canvasNoteId, noteIds, canvasTitle]);

            api.showMessage(`✅ Longform: ${orderSource}`);
            setTimeout(() => api.activateNote(newNoteId), 300);
        } catch (err) {
            console.error('[CanvasLinker] longform error:', err);
            api.showError('Erro ao gerar longform: ' + err.message);
        }
    }

    /* ── BUSCA ──────────────────────────────────────────── */
    async _onSearch(query) {
        const $results = this._el('clw-results');
        const $status  = this._el('clw-status');
        $results.innerHTML = '';

        if (!query || query.trim().length < 2) {
            $status.style.display = 'none';
            return;
        }

        $status.textContent = 'Buscando…';
        $status.style.display = 'block';

        try {
            const sliceLen = CARD_CONFIG.excerptSlice;
            // Usa helper centralizado — elimina duplicação com _insertCard
            const cleanPatterns = getCleanPatterns();

            const notes = await api.runOnBackend((q, sliceLen, cleanPatterns) => {
                const patterns = cleanPatterns.map(([src, flags, repl]) => [new RegExp(src, flags), repl]);
                function clean(raw, max) {
                    if (!raw) return '';
                    let t = raw;
                    for (const [re, r] of patterns) t = t.replace(re, r);
                    t = t.trim();
                    return max ? t.slice(0, max) : t;
                }
                return api.searchForNotes(q).slice(0, 15).map(n => ({
                    noteId: n.noteId,
                    title: n.title,
                    excerpt: clean(n.getContent() || '', sliceLen)
                }));
            }, [query.trim(), sliceLen, cleanPatterns]);

            $status.style.display = 'none';
            if (!notes || notes.length === 0) {
                $status.textContent = 'Nenhuma nota encontrada.';
                $status.style.display = 'block';
                return;
            }

            const fragment = document.createDocumentFragment();
            notes.forEach((note, i) => {
                const title   = note.title   || '(sem título)';
                const excerpt = note.excerpt || '';
                const item    = document.createElement('div');
                item.className  = 'clw-result-item';
                item.title      = title;
                item.style.animationDelay = `${i * 30}ms`;
                item.dataset.noteId  = note.noteId;
                item.dataset.title   = title;
                item.dataset.excerpt = excerpt;

                // FIX: escapa HTML para prevenir XSS caso título/excerpt contenha tags
                item.innerHTML = [
                    `<div class="clw-result-title">${escapeHtml(title)}</div>`,
                    excerpt ? `<div class="clw-result-excerpt">${escapeHtml(excerpt)}</div>` : ''
                ].join('');

                item.addEventListener('click', () => {
                    window._clw?.insert(note.noteId, title, excerpt);
                });
                fragment.appendChild(item);
            });
            $results.appendChild(fragment);
        } catch (err) {
            $status.textContent = 'Erro na busca: ' + err.message;
            $status.style.display = 'block';
            console.error('[CanvasLinker] search error', err);
        }
    }

    /* ── INSERÇÃO DE CARDS ──────────────────────────────── */
    async _insertCard(noteId, title, excerpt) {
        const canvasNoteId = this._captureMode ? this._captureCanvasNoteId : this.noteId;
        if (!canvasNoteId) { api.showError('Nenhuma nota Canvas ativa.'); return; }

        const $status = this._el('clw-status');
        if ($status) {
            $status.textContent = 'Inserindo card…';
            $status.style.display = 'block';
            const results = this._el('clw-results');
            if (results) results.innerHTML = '';
        }

        try {
            // Usa helper centralizado — elimina duplicação com _onSearch
            const cleanConfig = getCleanPatterns();

            await api.runOnBackend((canvasNoteId, linkedNoteId, title, excerpt, cfg, cleanPatterns) => {
                // Reconstrói regexes
                const patterns = cleanPatterns.map(([src, flags, repl]) => [new RegExp(src, flags), repl]);

                function clean(raw, max) {
                    if (!raw) return '';
                    let t = raw;
                    for (const [re, r] of patterns) t = t.replace(re, r);
                    t = t.trim();
                    return max ? t.slice(0, max) : t;
                }

                function estimateTextHeight(text, fontSize, lineHeightRatio, availableWidth) {
                    if (!text) return 0;
                    const avgCharWidth = fontSize * 0.60;
                    const charsPerLine = Math.max(1, Math.floor(availableWidth / avgCharWidth));
                    const lines = text.split('\n').reduce((acc, paragraph) => {
                        return acc + Math.max(1, Math.ceil(paragraph.length / charsPerLine));
                    }, 0);
                    return Math.ceil(lines * fontSize * lineHeightRatio) + 20;
                }

                function wrapText(text, maxLen) {
                    if (!text || text.length <= maxLen) return text || '';
                    const words = text.split(' ');
                    const lines = [];
                    let current = '';
                    for (const word of words) {
                        const test = current ? current + ' ' + word : word;
                        if (test.length > maxLen && current) {
                            lines.push(current);
                            current = word;
                        } else {
                            current = test;
                        }
                    }
                    if (current) lines.push(current);
                    return lines.join('\n');
                }

                if (!excerpt) {
                    try {
                        const linkedNote = api.getNote(linkedNoteId);
                        excerpt = clean(linkedNote.getContent() || '', cfg.excerptSlice);
                    } catch (_) {}
                }

                if (excerpt) { excerpt = wrapText(excerpt, 40); }

                const canvasNote = api.getNote(canvasNoteId);
                if (!canvasNote) throw new Error('Nota canvas não encontrada: ' + canvasNoteId);

                let data;
                try { data = JSON.parse(canvasNote.getContent() || '{}'); } catch (_) { data = {}; }
                if (!data.type)     data.type     = 'excalidraw';
                if (!data.version)  data.version  = 2;
                if (!data.elements) data.elements = [];

                // FIX: conta apenas cards CLW (retângulos com link #root/) para não
                // desalinhar o grid quando o canvas tem formas, textos ou setas avulsas.
                const active = data.elements.filter(
                    e => !e.isDeleted && e.type === 'rectangle' && e.link?.startsWith('#root/')
                ).length;
                const col    = active % cfg.cols;
                const row    = Math.floor(active / cfg.cols);

                const estimatedCardH = cfg.padY + 36 + 6
                    + (excerpt ? estimateTextHeight(excerpt, cfg.excerptFontSize, 1.3, cfg.width - cfg.padX * 2) : 0)
                    + cfg.padY;

                const x = cfg.originX + col * cfg.colGap;
                const y = cfg.originY + row * (estimatedCardH + cfg.rowGap);

                const titleH = Math.ceil(cfg.titleFontSize * 1.25) + 4;
                const excerptH = excerpt
                    ? estimateTextHeight(excerpt, cfg.excerptFontSize, 1.3, cfg.width - cfg.padX * 2)
                    : 0;
                const totalH = cfg.padY + titleH + (excerpt ? 6 + excerptH : 0) + cfg.padY;

                const now     = Date.now();
                const groupId = 'clw_g_' + Math.random().toString(36).substr(2, 14);
                const rectId  = 'clw_r_' + Math.random().toString(36).substr(2, 14);
                const titleId = 'clw_t_' + Math.random().toString(36).substr(2, 14);
                const excrId  = 'clw_e_' + Math.random().toString(36).substr(2, 14);

                const makeSeed  = () => Math.floor(Math.random() * 999999);
                const makeNonce = () => Math.floor(Math.random() * 999999);

                data.elements.push({
                    id: rectId, type: 'rectangle',
                    x, y, width: cfg.width, height: totalH, angle: 0,
                    strokeColor: cfg.strokeColor, backgroundColor: cfg.backgroundColor,
                    fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
                    roughness: cfg.roughness, opacity: 100, groupIds: [groupId],
                    roundness: cfg.cornerRadius,
                    seed: makeSeed(), version: 1,
                    versionNonce: makeNonce(),
                    isDeleted: false, boundElements: [], updated: now,
                    link: '#root/' + linkedNoteId, locked: false
                });

                data.elements.push({
                    id: titleId, type: 'text',
                    x: x + cfg.padX, y: y + cfg.padY,
                    width: cfg.width - cfg.padX * 2, height: titleH, angle: 0,
                    strokeColor: cfg.strokeColor, backgroundColor: 'transparent',
                    fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
                    roughness: cfg.roughness, opacity: 100, groupIds: [groupId],
                    seed: makeSeed(), version: 1,
                    versionNonce: makeNonce(),
                    isDeleted: false, updated: now,
                    text: title, fontSize: cfg.titleFontSize, fontFamily: cfg.fontFamily,
                    textAlign: 'left', verticalAlign: 'top',
                    originalText: title, lineHeight: 1.25, autoResize: false
                });

                if (excerpt) {
                    data.elements.push({
                        id: excrId, type: 'text',
                        x: x + cfg.padX, y: y + cfg.padY + titleH + 6,
                        width: cfg.width - cfg.padX * 2, height: excerptH, angle: 0,
                        strokeColor: '#6c7086', backgroundColor: 'transparent',
                        fillStyle: 'solid', strokeWidth: 1, strokeStyle: 'solid',
                        roughness: cfg.roughness, opacity: 100, groupIds: [groupId],
                        seed: makeSeed(), version: 1,
                        versionNonce: makeNonce(),
                        isDeleted: false, updated: now,
                        text: excerpt, fontSize: cfg.excerptFontSize, fontFamily: cfg.fontFamily,
                        textAlign: 'left', verticalAlign: 'top',
                        originalText: excerpt, lineHeight: 1.3, autoResize: false
                    });
                }

                canvasNote.setContent(JSON.stringify(data));
            }, [canvasNoteId, noteId, title, excerpt || '', CARD_CONFIG, cleanConfig]);

            if (this._captureMode) {
                api.showMessage(`📌 "${title}" capturada`);
            } else {
                this._hide('clw-panel');
                api.showMessage(`Card "${title}" inserido!`);
                await api.activateNote(canvasNoteId);
            }
        } catch (err) {
            console.error('[CanvasLinker] insert error', err);
            if ($status) {
                $status.textContent = '✗ Erro: ' + err.message;
                $status.style.display = 'block';
            }
            api.showError('CanvasLinker: ' + err.message);
        }
    }

    /* ── REFRESH ────────────────────────────────────────── */
    async refreshWithNote(note) {
        const root = this._el('clw-root');
        if (!root) return;

        if (this._captureMode && note && note.noteId !== this._captureCanvasNoteId) {
            if (note.type === 'canvas') return;
            await this._insertCard(note.noteId, note.title, '');
            await api.activateNote(this._captureCanvasNoteId);
            return;
        }

        if (note && note.type === 'canvas') {
            root.style.display = 'flex';
        } else {
            root.style.display = 'none';
            this._hide('clw-panel');
            this._hide('clw-relmap-panel');
            this._hide('clw-remove-panel');
        }
    }

    entitledToRefreshWithNote() { return true; }
}

module.exports = new CanvasLinkerWidget();
