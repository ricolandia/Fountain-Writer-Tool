/* Fonte — paginador de roteiro
 *
 * Converte os blocos do parser (Fountain.parseBlocks) em PÁGINAS, aplicando as
 * convenções de roteiro: Courier 12pt, 55 linhas por página, indentação por
 * elemento, quebra de diálogo com (MORE)/(CONT'D), número de página a partir da
 * segunda e — opcional — numeração de cenas.
 *
 * Por que NÃO mede o DOM: Courier é monoespaçada, então a largura de um
 * caractere é constante. Todo o layout vira aritmética em CARACTERES
 * (ação = 60, diálogo = 35, ...), o que faz deste módulo uma função pura:
 * roda no `node --test` sem jsdom e é determinístico no desktop/PWA.
 *
 * Este módulo não desenha nada. O desenho (PDF) é do web/js/pdf.js.
 */
const Paginator = (function () {

    /* Tamanhos de página em pontos (1 pt = 1/72"). A4 é o default porque é o
     * que a impressão atual do app já usa (`@page{size:A4}`). */
    const PAGE_SIZES = {
        a4:     { width: 595, height: 842 },
        letter: { width: 612, height: 792 },
    };

    const DEFAULTS = {
        pageSize:        'a4',
        linesPerPage:    55,
        titlePage:       true,
        /* Numeração de cenas: usa o `#n#` quando existe; senão, a sequência.
         * Default OFF porque roteiro-spec vai sem número; draft de produção vai
         * com (a UI decide). A contagem de cenas sai sempre em stats.scenes. */
        sceneNumbers:    false,
        /* A spec do Fountain diz que Sections são ignoradas na saída formatada
         * (fountain.io/syntax). O print atual do app as mostra — diferença
         * documentada; a UI escolhe. */
        includeSections: false,
        continuations:   true,
        metrics: {
            scene_heading: { indent: 0,  width: 60 },
            action:        { indent: 0,  width: 60 },
            character:     { indent: 23, width: 37 },
            parenthetical: { indent: 15, width: 30 },
            dialogue:      { indent: 10, width: 35 },
            transition:    { indent: 45, width: 15 },
            centered:      { indent: 0,  width: 60 },
            dualLeft:      { indent: 6,  width: 24 },
            dualRight:     { indent: 36, width: 24 },
        },
    };

    /* ── Ênfase inline → "runs" ─────────────────────────────────────────────
     * Fountain: ***negrito itálico***, **negrito**, *itálico*, _sublinhado_. */
    const RUN_RE = /(\*{3})([^*]+?)\1|(\*{2})([^*]+?)\3|(\*)([^*]+?)\5|(_)([^_]+?)\7/g;

    function splitRuns(text) {
        const runs = [];
        let last = 0, m;
        RUN_RE.lastIndex = 0;
        while ((m = RUN_RE.exec(text)) !== null) {
            if (m.index > last) runs.push({ text: text.slice(last, m.index) });
            if (m[1])      runs.push({ text: m[2], bold: true, italic: true });
            else if (m[3]) runs.push({ text: m[4], bold: true });
            else if (m[5]) runs.push({ text: m[6], italic: true });
            else           runs.push({ text: m[8], underline: true });
            last = m.index + m[0].length;
        }
        if (last < text.length) runs.push({ text: text.slice(last) });
        return runs.filter(r => r.text.length > 0);
    }

    function styleOf(run) {
        const s = {};
        if (run.bold)      s.bold = true;
        if (run.italic)    s.italic = true;
        if (run.underline) s.underline = true;
        return s;
    }

    function mergeRuns(runs) {
        const out = [];
        for (const r of runs) {
            const prev = out[out.length - 1];
            if (prev && !!prev.bold === !!r.bold && !!prev.italic === !!r.italic &&
                !!prev.underline === !!r.underline) {
                prev.text += r.text;
            } else {
                out.push(Object.assign({ text: r.text }, styleOf(r)));
            }
        }
        return out;
    }

    function runsLength(runs) {
        return runs.reduce((n, r) => n + r.text.length, 0);
    }

    function upperRuns(runs) {
        return runs.map(r => ({ text: r.text.toUpperCase(), bold: r.bold, italic: r.italic, underline: r.underline }));
    }

    /* Quebra os runs na largura (em CARACTERES). Devolve array de linhas, cada
     * linha um array de runs. Sempre devolve ao menos uma linha. */
    function wrapRuns(runs, width) {
        if (!(width >= 1)) width = DEFAULTS.metrics.action.width;   // nunca 0/NaN (laço infinito)
        const lines = [];
        let cur = [], curLen = 0;

        const flush = () => {
            while (cur.length) {                       // sem espaço sobrando no fim
                const last = cur[cur.length - 1];
                const trimmed = last.text.replace(/\s+$/, '');
                if (trimmed === last.text) break;
                if (trimmed.length === 0) cur.pop();
                else { last.text = trimmed; break; }
            }
            lines.push(mergeRuns(cur));
            cur = []; curLen = 0;
        };

        for (const run of runs) {
            const style = styleOf(run);
            for (const part of run.text.split(/(\s+)/)) {
                if (!part) continue;
                if (/^\s+$/.test(part)) {
                    if (curLen > 0) { cur.push(Object.assign({ text: ' ' }, style)); curLen += 1; }
                    continue;
                }
                if (curLen > 0 && curLen + part.length > width) flush();
                let word = part;
                while (word.length > width) {           // palavra maior que a linha
                    lines.push(mergeRuns([Object.assign({ text: word.slice(0, width) }, style)]));
                    word = word.slice(width);
                }
                if (word.length) { cur.push(Object.assign({ text: word }, style)); curLen += word.length; }
            }
        }
        if (cur.length) flush();
        return lines.length ? lines : [[]];
    }

    /* ── Linhas de layout ─────────────────────────────────────────────────── */

    function textLine(runs, metric, align, extra) {
        const line = {
            type: 'text', runs, indent: metric.indent, width: metric.width,
            align: align || 'left',
        };
        if (extra) Object.assign(line, extra);
        return line;
    }

    /* Quebra um texto de bloco em linhas de layout PRESERVANDO as quebras de
     * linha explícitas do autor (o Fountain respeita cada retorno digitado:
     * o tokenizer só separa blocos em \n{2,}, então um \n simples dentro do
     * bloco é intencional). */
    function blockLines(text, metric, align, transform) {
        const lines = [];
        for (const raw of String(text).split('\n')) {
            let runs = splitRuns(raw);
            if (transform) runs = transform(runs);
            for (const wrapped of wrapRuns(runs, metric.width)) {
                lines.push(textLine(wrapped, metric, align));
            }
        }
        return lines;
    }

    /* Grupo de diálogo: PERSONAGEM + parentéticos + falas, já quebrados. */
    function dialogueLines(group, m) {
        const lines = [];
        if (group.character) {
            lines.push(textLine(upperRuns(splitRuns(group.character)), m.character, 'left'));
        }
        for (const part of group.lines) {
            const metric = part.type === 'parenthetical' ? m.parenthetical : m.dialogue;
            for (const raw of String(part.text).split('\n')) {
                for (const runs of wrapRuns(splitRuns(raw), metric.width)) {
                    lines.push(textLine(runs, metric, 'left'));
                }
            }
        }
        return lines;
    }

    function dualLines(groups, m) {
        const left  = dialogueLines(groups[0], m);
        const right = dialogueLines(groups[1], m);
        const n = Math.max(left.length, right.length);
        const out = [];
        for (let k = 0; k < n; k++) {
            out.push({
                type: 'dual',
                left:  left[k]  ? { runs: left[k].runs,  indent: m.dualLeft.indent  } : null,
                right: right[k] ? { runs: right[k].runs, indent: m.dualRight.indent } : null,
            });
        }
        return out;
    }

    /* Lê um grupo de diálogo a partir do token `dialogue_begin`. */
    function collectDialogue(blocks, start) {
        let i = start + 1;                              // pula dialogue_begin
        const group = { character: '', lines: [] };
        while (i < blocks.length && blocks[i].type !== 'dialogue_end') {
            const t = blocks[i];
            if (t.type === 'character')          group.character = t.text;
            else if (t.type === 'parenthetical') group.lines.push({ type: 'parenthetical', text: t.text });
            else if (t.type === 'dialogue')      group.lines.push({ type: 'dialogue', text: t.text });
            i++;
        }
        return { group, next: i + 1 };                  // +1 pula dialogue_end
    }

    /* ── Blocos → unidades de layout ──────────────────────────────────────── */

    const TITLE_TOKENS = ['title', 'credit', 'author', 'authors', 'source',
                          'draft_date', 'date', 'contact', 'copyright', 'notes'];
    const SKIPPED = ['note', 'boneyard_begin', 'boneyard_end', 'synopsis'];

    function buildUnits(blocks, o, m) {
        const units = [];
        const title = [];
        let i = 0;

        while (i < blocks.length) {
            const b = blocks[i];

            if (TITLE_TOKENS.indexOf(b.type) >= 0) {
                if (o.titlePage) title.push(b);
                i++; continue;
            }
            if (SKIPPED.indexOf(b.type) >= 0) { i++; continue; }

            if (b.type === 'page_break') { units.push({ kind: 'break' });   i++; continue; }
            if (b.type === 'line_break') { units.push({ kind: 'blank' });   i++; continue; }

            if (b.type === 'section') {
                if (o.includeSections) {
                    units.push({
                        kind: 'section',
                        lines: blockLines(b.text || '', m.centered, 'center',
                                          runs => runs.map(r => Object.assign({}, r, { bold: true }))),
                    });
                }
                i++; continue;
            }

            if (b.type === 'scene_heading') {
                units.push({
                    kind: 'heading',
                    sceneNumber: b.scene_number,
                    lines: blockLines(b.text, m.scene_heading, 'left', upperRuns),
                });
                i++; continue;
            }

            if (b.type === 'action') {
                units.push({ kind: 'action', lines: blockLines(b.text, m.action, 'left') });
                i++; continue;
            }

            if (b.type === 'centered') {
                units.push({ kind: 'centered', lines: blockLines(b.text, m.centered, 'center') });
                i++; continue;
            }

            if (b.type === 'transition') {
                units.push({ kind: 'transition', lines: blockLines(b.text, m.transition, 'right', upperRuns) });
                i++; continue;
            }

            if (b.type === 'dual_dialogue_begin') {
                const groups = [];
                i++;
                while (i < blocks.length && blocks[i].type !== 'dual_dialogue_end') {
                    if (blocks[i].type === 'dialogue_begin') {
                        const got = collectDialogue(blocks, i);
                        groups.push(got.group);
                        i = got.next;
                    } else i++;
                }
                i++;                                    // pula dual_dialogue_end
                if (groups.length >= 2)      units.push({ kind: 'dual', lines: dualLines(groups, m) });
                else if (groups.length === 1) units.push({ kind: 'dialogue', character: groups[0].character, lines: groups[0].lines });
                continue;
            }

            if (b.type === 'dialogue_begin') {
                const got = collectDialogue(blocks, i);
                units.push({ kind: 'dialogue', character: got.group.character, lines: got.group.lines });
                i = got.next;
                continue;
            }

            i++;                                        // token inesperado
        }
        return { title, units };
    }

    /* ── Folha de rosto ───────────────────────────────────────────────────── */

    function buildTitlePage(titleBlocks, m) {
        if (!titleBlocks.length) return null;
        const byKey = {};
        for (const t of titleBlocks) if (!(t.type in byKey)) byKey[t.type] = t.text;

        const top = [], bottom = [];
        const push = (target, text, extra, align) => {
            /* Valores podem ter várias linhas (endereço, co-autores): cada \n
             * é uma linha de verdade. */
            for (const raw of String(text).split('\n')) {
                const runs = splitRuns(raw);
                if (runs.length === 0) continue;
                const opts = Object.assign({ centerOn: 'page' }, extra || {});
                target.push(textLine(runs, m.centered, align || 'center', opts));
            }
        };

        if (byKey.title)  push(top, byKey.title, { size: 'title' });
        if (byKey.credit) push(top, byKey.credit);
        const author = byKey.author || byKey.authors;
        if (author)       push(top, author);
        if (byKey.source) push(top, byKey.source);
        if (byKey.notes)  push(top, byKey.notes);

        if (byKey.contact)    push(bottom, byKey.contact, null, 'left');
        if (byKey.draft_date) push(bottom, byKey.draft_date, null, 'left');
        if (byKey.date)       push(bottom, byKey.date, null, 'left');

        return { top, bottom };
    }

    /* ── Paginação ────────────────────────────────────────────────────────── */

    function mergeOptions(defaults, given) {
        const out = Object.assign({}, defaults);
        if (given) {
            for (const k of Object.keys(given)) {
                if (given[k] !== undefined && given[k] !== null) out[k] = given[k];
            }
        }
        return out;
    }

    function sanitizeMetrics(given) {
        const out = {};
        for (const key of Object.keys(DEFAULTS.metrics)) {
            const def = DEFAULTS.metrics[key];
            const got = mergeOptions(def, given && given[key]);
            const width  = Math.floor(Number(got.width));
            const indent = Math.floor(Number(got.indent));
            out[key] = {
                width:  Number.isFinite(width) && width >= 4 ? width : def.width,
                indent: Number.isFinite(indent) && indent >= 0 ? indent : def.indent,
            };
        }
        return out;
    }

    function paginate(blocks, options) {
        const o = mergeOptions(DEFAULTS, options);
        const m = sanitizeMetrics((options || {}).metrics);
        /* Sanidade: um linesPerPage não-numérico (ou 0) viraria NaN e o laço de
         * quebra de diálogo nunca terminaria. Nunca confiar na opção. */
        const capacidade = Math.floor(Number(o.linesPerPage));
        o.linesPerPage = Number.isFinite(capacidade) && capacidade >= 4
            ? capacidade : DEFAULTS.linesPerPage;

        const size = PAGE_SIZES[o.pageSize] || PAGE_SIZES.a4;
        const built = buildUnits(blocks, o, m);
        const capacity = o.linesPerPage;

        const pages = [];
        let page = null, sceneIndex = 0;

        const newPage = () => {
            page = { number: pages.length + 1, header: null, lines: [] };
            pages.push(page);
            return page;
        };
        const remaining  = () => capacity - page.lines.length;
        const lastBlank  = () => page.lines.length > 0 && page.lines[page.lines.length - 1].type === 'blank';
        const addBlank   = () => { if (page.lines.length > 0 && !lastBlank()) page.lines.push({ type: 'blank' }); };
        const pushLines  = (lines) => {
            for (const l of lines) {
                if (page.lines.length >= capacity) newPage();
                page.lines.push(l);
            }
        };

        newPage();

        for (const u of built.units) {
            if (u.kind === 'break') { if (page.lines.length) newPage(); continue; }
            if (u.kind === 'blank') { addBlank(); continue; }

            if (u.kind === 'heading') {
                sceneIndex++;
                const lines = u.lines.map(l => Object.assign({}, l));
                if (o.sceneNumbers) {
                    lines[0].sceneNumber = (u.sceneNumber !== undefined)
                        ? u.sceneNumber : String(sceneIndex);
                }
                if (page.lines.length > 0) {
                    addBlank();
                    /* Título de cena nunca fica órfão no pé: exige 1 linha de
                     * conteúdo depois dele na mesma página. */
                    if (remaining() < lines.length + 1) newPage();
                }
                pushLines(lines);
                continue;
            }

            if (u.kind === 'transition' || u.kind === 'section' || u.kind === 'centered') {
                if (page.lines.length > 0) {
                    addBlank();
                    if (remaining() < u.lines.length + 1) newPage();
                }
                pushLines(u.lines);
                addBlank();
                continue;
            }

            if (u.kind === 'action') {
                if (page.lines.length > 0) {
                    addBlank();
                    /* Não começa um bloco de ação deixando 1 linha só no pé. */
                    if (remaining() < Math.min(u.lines.length, 2)) newPage();
                }
                pushLines(u.lines);                 // ação longa flui entre páginas
                continue;
            }

            if (u.kind === 'dual') {
                if (page.lines.length > 0) {
                    addBlank();
                    if (remaining() < 2) newPage();
                }
                pushLines(u.lines);
                continue;
            }

            if (u.kind === 'dialogue') {
                const lines = dialogueLines(u, m);
                if (page.lines.length > 0) {
                    addBlank();
                    /* PERSONAGEM + ao menos 1 linha de fala juntos. */
                    if (remaining() < Math.min(lines.length, 2)) newPage();
                }
                let rest = lines;
                while (rest.length) {
                    if (rest.length <= remaining()) { pushLines(rest); break; }

                    const needMore = o.continuations;
                    const take = remaining() - (needMore ? 1 : 0);   // reserva a linha do (MORE)
                    /* `!(take >= 1)` (e não `take < 1`) também barra NaN. */
                    if (!(take >= 1) || (take < 2 && page.lines.length > 0)) { newPage(); continue; }

                    pushLines(rest.slice(0, take));
                    rest = rest.slice(take);

                    if (needMore) {
                        page.lines.push({
                            type: 'text', runs: [{ text: '(MORE)' }],
                            indent: m.transition.indent, width: m.transition.width,
                            align: 'right',
                        });
                        newPage();
                        rest = [textLine([{ text: (u.character || '').toUpperCase() + " (CONT'D)" }], m.character, 'left')]
                            .concat(rest);
                    } else {
                        newPage();
                    }
                }
                continue;
            }
        }

        /* Aparência final: sem linha em branco no topo nem sobrando no pé;
         * número de página a partir da segunda (convenção: no cabeçalho). */
        for (const p of pages) {
            while (p.lines.length && p.lines[0].type === 'blank') p.lines.shift();
            while (p.lines.length && p.lines[p.lines.length - 1].type === 'blank') p.lines.pop();
            p.header = p.number >= 2 ? p.number + '.' : null;
        }

        const titlePage = o.titlePage ? buildTitlePage(built.title, m) : null;
        let scenes = 0;
        for (const u of built.units) if (u.kind === 'heading') scenes++;

        return {
            titlePage,
            pages,
            pageSize: size,
            metrics: m,
            options: o,
            stats: {
                pages: pages.length,
                scenes,
                lines: pages.reduce((n, p) => n + p.lines.length, 0),
            },
        };
    }

    return { paginate, splitRuns, wrapRuns, runsLength, PAGE_SIZES, DEFAULTS };
})();
