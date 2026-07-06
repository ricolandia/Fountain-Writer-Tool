console.log("🧩 Canvas Template Inserter iniciado!");

/**
 * ╔══════════════════════════════════════════════════════╗
 * ║        Canvas Template Inserter — TriliumNext       ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * Exibe um botão 🧩 em notas Canvas.
 * Permite inserir templates Excalidraw completos dentro
 * do canvas atual.
 *
 * ── INSTALAÇÃO ─────────────────────────────────────────
 * 1. Crie uma nova nota
 * 2. Tipo: JS Frontend
 * 3. Adicione o label: #widget
 * 4. Cole este código inteiro
 * 5. Recarregue o Trilium (F5)
 *
 * ── COMO FUNCIONA ──────────────────────────────────────
 * • Templates são notas do tipo Canvas
 * • Adicione o label:
 *
 *      #canvasTemplate
 *
 * • O título da nota será o nome do template
 *
 * ── EXEMPLOS ───────────────────────────────────────────
 * GTD
 * SWOT
 * Golden Circle
 * AIDA
 * GANTT
 * Design Thinking
 *
 * ── USO ────────────────────────────────────────────────
 * • Abra um Canvas
 * • Clique no botão 🧩
 * • Escolha um template
 * • Template é inserido no canvas atual
 */

const TEMPLATE_CONFIG = {
    offsetX: 120,
    offsetY: 120,
};

class CanvasTemplateInserterWidget extends api.NoteContextAwareWidget {

    get position()     { return 99; }
    get parentWidget() { return 'center-pane'; }
    isEnabled()        { return true; }

    doRender() {

        this.$widget = $('<div style="display:none;"></div>');

        if (!document.getElementById('cti-root')) {
            this._injectUI();
        }

        window._cti = {
            loadTemplates: () => this._loadTemplates(),
            insertTemplate: (noteId, title) =>
                this._insertTemplate(noteId, title),
        };

        return this.$widget;
    }

    /* ─────────────────────────────────────────────────── */
    /* UI */
    /* ─────────────────────────────────────────────────── */

    _injectUI() {

        const html = `
        <div id="cti-root" style="
            position: fixed;
            bottom: 155px;
            right: 15px;
            z-index: 9999;
            display: none;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
            font-family: var(--detail-font-family, 'Segoe UI', sans-serif);
        ">

            <div id="cti-panel" style="
                display:none;
                width:280px;
                max-height:420px;
                overflow-y:auto;
                background: var(--accented-background-color, #1e1e2e);
                border: 1px solid var(--main-border-color, #45475a);
                border-radius: 12px;
                padding: 14px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.45);
                animation: ctiFade .15s ease;
            ">

                <div style="
                    display:flex;
                    align-items:center;
                    gap:8px;
                    margin-bottom:12px;
                ">
                    <span style="font-size:16px;">🧩</span>

                    <span style="
                        font-size:11px;
                        font-weight:600;
                        text-transform:uppercase;
                        letter-spacing:.08em;
                        color: var(--muted-text-color, #6c7086);
                    ">
                        Inserir template
                    </span>
                </div>

                <div id="cti-list"></div>

                <div id="cti-status" style="
                    display:none;
                    margin-top:10px;
                    font-size:11px;
                    color: var(--muted-text-color, #6c7086);
                    text-align:center;
                "></div>

            </div>

            <button id="cti-btn"
                title="Inserir template no canvas"
                style="
                    width:44px;
                    height:44px;
                    border-radius:50%;
                    border:1px solid var(--main-border-color, #45475a);
                    background: var(--button-background-color, #313244);
                    color: var(--main-text-color, #cdd6f4);
                    cursor:pointer;
                    font-size:18px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    transition:.12s;
                    box-shadow:0 3px 12px rgba(0,0,0,0.4);
                "
            >🧩</button>
        </div>

        <style>

        @keyframes ctiFade {
            from {
                opacity:0;
                transform:translateY(8px) scale(.98);
            }
            to {
                opacity:1;
                transform:translateY(0) scale(1);
            }
        }

        #cti-btn:hover {
            transform:scale(1.08);
            background: var(--hover-item-background-color, #45475a) !important;
        }

        .cti-item:hover {
            background: var(--hover-item-background-color, #313244);
            border-color: var(--main-border-color, #45475a) !important;
        }

        </style>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        document
            .getElementById('cti-btn')
            .addEventListener('click', async () => {

                const panel = document.getElementById('cti-panel');

                const open = panel.style.display !== 'none';

                if (open) {
                    panel.style.display = 'none';
                    return;
                }

                panel.style.display = 'block';

                await window._cti.loadTemplates();
            });

        document.addEventListener('click', (e) => {

            const root = document.getElementById('cti-root');

            if (root && !root.contains(e.target)) {
                document.getElementById('cti-panel').style.display = 'none';
            }
        });
    }

    /* ─────────────────────────────────────────────────── */
    /* LOAD TEMPLATES */
    /* ─────────────────────────────────────────────────── */

    async _loadTemplates() {

        const $list   = document.getElementById('cti-list');
        const $status = document.getElementById('cti-status');

        $list.innerHTML = '';

        $status.style.display = 'block';
        $status.textContent = 'Carregando templates...';

        try {

            const templates = await api.runOnBackend(() => {

                return api
                    .searchForNotes('#canvasTemplate')
                    .map(note => ({
                        noteId: note.noteId,
                        title: note.title || '(sem título)',
                    }))
                    .sort((a, b) =>
                        a.title.localeCompare(b.title)
                    );
            });

            $status.style.display = 'none';

            if (!templates.length) {

                $status.textContent =
                    'Nenhum template encontrado.';
                $status.style.display = 'block';

                return;
            }

            for (const tpl of templates) {

                const item = document.createElement('div');

                item.className = 'cti-item';

                item.style.cssText = `
                    padding:10px;
                    border-radius:8px;
                    cursor:pointer;
                    border:1px solid transparent;
                    transition:.1s;
                    color: var(--main-text-color, #cdd6f4);
                    margin-bottom:6px;
                `;

                item.innerHTML = `
                    <div style="
                        font-weight:600;
                        font-size:13px;
                    ">
                        ${tpl.title}
                    </div>
                `;

                item.addEventListener('click', () => {
                    window._cti.insertTemplate(
                        tpl.noteId,
                        tpl.title
                    );
                });

                $list.appendChild(item);
            }

        } catch (err) {

            console.error(err);

            $status.textContent =
                'Erro ao carregar templates';

            $status.style.display = 'block';
        }
    }

    /* ─────────────────────────────────────────────────── */
    /* INSERT TEMPLATE */
    /* ─────────────────────────────────────────────────── */

    async _insertTemplate(templateNoteId, templateTitle) {

        const canvasNoteId = this.noteId;

        const $status = document.getElementById('cti-status');

        $status.style.display = 'block';
        $status.textContent = 'Inserindo template...';

        try {

            await api.runOnBackend((canvasNoteId,
                                    templateNoteId,
                                    config) => {

                const canvasNote =
                    api.getNote(canvasNoteId);

                if (!canvasNote) {
                    throw new Error(
                        'Canvas atual não encontrado.'
                    );
                }

                const templateNote =
                    api.getNote(templateNoteId);

                if (!templateNote) {
                    throw new Error(
                        'Template não encontrado.'
                    );
                }

                let canvasData;
                let templateData;

                try {
                    canvasData =
                        JSON.parse(
                            canvasNote.getContent() || '{}'
                        );
                } catch (_) {
                    canvasData = {};
                }

                try {
                    templateData =
                        JSON.parse(
                            templateNote.getContent() || '{}'
                        );
                } catch (_) {
                    throw new Error(
                        'Template inválido.'
                    );
                }

                if (!canvasData.elements)
                    canvasData.elements = [];

                /* posição automática */

                const existing =
                    canvasData.elements
                        .filter(e => !e.isDeleted);

                let maxX = 0;
                let maxY = 0;

                for (const el of existing) {

                    if (typeof el.x === 'number')
                        maxX = Math.max(maxX, el.x);

                    if (typeof el.y === 'number')
                        maxY = Math.max(maxY, el.y);
                }

                const offsetX =
                    maxX + config.offsetX;

                const offsetY =
                    maxY + config.offsetY;

                /* clona elementos */

                const clonedElements = [];

                for (const el of (templateData.elements || [])) {

                    const clone =
                        JSON.parse(JSON.stringify(el));

                    clone.id =
                        'tpl_' +
                        Math.random()
                            .toString(36)
                            .substr(2, 12);

                    if (typeof clone.x === 'number')
                        clone.x += offsetX;

                    if (typeof clone.y === 'number')
                        clone.y += offsetY;

                    clone.seed =
                        Math.floor(Math.random() * 999999);

                    clone.versionNonce =
                        Math.floor(Math.random() * 999999);

                    clonedElements.push(clone);
                }

                canvasData.elements.push(
                    ...clonedElements
                );

                canvasNote.setContent(
                    JSON.stringify(canvasData)
                );

            }, [
                canvasNoteId,
                templateNoteId,
                TEMPLATE_CONFIG
            ]);

            document.getElementById('cti-panel')
                .style.display = 'none';

            api.showMessage(
                `Template "${templateTitle}" inserido!`
            );

            await api.activateNote(canvasNoteId);

        } catch (err) {

            console.error(err);

            api.showError(
                'Erro ao inserir template: ' +
                err.message
            );

            $status.textContent =
                'Erro ao inserir template.';
        }
    }

    /* ─────────────────────────────────────────────────── */
    /* NOTE REFRESH */
    /* ─────────────────────────────────────────────────── */

    async refreshWithNote(note) {

        const root =
            document.getElementById('cti-root');

        if (!root) return;

        if (note && note.type === 'canvas') {

            root.style.display = 'flex';

        } else {

            root.style.display = 'none';

            const panel =
                document.getElementById('cti-panel');

            if (panel)
                panel.style.display = 'none';
        }
    }

    entitledToRefreshWithNote() {
        return true;
    }
}

module.exports =
    new CanvasTemplateInserterWidget();