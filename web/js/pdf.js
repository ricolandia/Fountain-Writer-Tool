/* Fonte — gerador de PDF (sem dependência externa)
 *
 * Por que não usar uma biblioteca: o roteiro usa Courier, que está entre as 14
 * fontes PADRÃO do PDF — não precisa embutir fonte. Com isso, gerar o arquivo é
 * escrever uns poucos objetos PDF e um content stream de texto. São ~5 KB de
 * código em vez de ~420 KB de bundle (jsPDF) e, melhor, o resultado é
 * verificável com ferramenta independente (`pdfinfo`, `pdftotext`, `mutool`).
 *
 * Escopo atual: texto, fonte Courier 12pt, 4 variantes (regular/negrito/
 * itálico/negrito-itálico), sublinhado por traço, número de página no cabeçalho,
 * número de cena nas duas margens e folha de rosto. Sem imagens, sem cor (a cor
 * entra com o item "revisões coloridas").
 *
 * O layout (onde cada linha vai) NÃO mora aqui: vem pronto do web/js/paginator.js.
 */
const PdfBuilder = (function () {

    const FONT_SIZE   = 12;
    const CHAR_W      = FONT_SIZE * 0.6;        // Courier = 600/1000 em
    const LINE_H      = 12;
    const MARGIN      = { left: 108, top: 72, bottom: 72 };   // 1,5" | 1" | 1"
    const MIN_RIGHT   = 36;                     // margem direita mínima (0,5")
    const HEADER_FROM_TOP = 36;                 // número de página: 0,5" do topo
    const TEXT_WIDTH_CHARS = 60;                // largura da área de texto
    const GUTTER_CHARS = 3;                     // folga do número de cena

    const FONTS = {
        regular:    { ref: 'F1', base: 'Courier' },
        bold:       { ref: 'F2', base: 'Courier-Bold' },
        italic:     { ref: 'F3', base: 'Courier-Oblique' },
        boldItalic: { ref: 'F4', base: 'Courier-BoldOblique' },
    };

    /* cp1252: os 27 códigos de 0x80–0x9F que diferem do Latin-1 (travessão,
     * aspas curvas, reticências...). O resto de 0xA0–0xFF passa direto. */
    const CP1252 = {
        0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
        0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
        0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
        0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
        0x017E: 0x9E, 0x0178: 0x9F,
    };

    /* Converte para bytes WinAnsi (1 char = 1 byte). Sem isso, "AÇÃO" sairia
     * corrompido — e o PDF usa WinAnsiEncoding nas 14 fontes padrão. */
    function toWinAnsi(str) {
        let out = '';
        for (const ch of String(str)) {
            const c = ch.codePointAt(0);
            if (c === 9 || c === 10 || c === 13) { out += ' '; continue; }
            if (c < 0x80 || (c >= 0xA0 && c <= 0xFF)) out += String.fromCharCode(c);
            else if (CP1252[c] !== undefined)         out += String.fromCharCode(CP1252[c]);
            else                                      out += '?';
        }
        return out;
    }

    /* Escapa string de PDF: \ ( ) e normaliza para WinAnsi. */
    function pdfString(str) {
        return toWinAnsi(str).replace(/[\\()]/g, ch => '\\' + ch);
    }

    function num(n) {
        return (Math.round(n * 100) / 100).toString();
    }

    /* Cor em PDF: componentes 0..1 separados por espaço (operador `rg`). */
    function hexToRgb(hex) {
        const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return {
            r: ((n >> 16) & 255) / 255,
            g: ((n >> 8) & 255) / 255,
            b: (n & 255) / 255,
        };
    }

    function colorOp(hex, stroke) {
        const c = hexToRgb(hex);
        if (!c) return null;
        return num(c.r) + ' ' + num(c.g) + ' ' + num(c.b) + (stroke ? ' RG' : ' rg');
    }

    function fontKey(run) {
        if (run.bold && run.italic) return 'boldItalic';
        if (run.bold)               return 'bold';
        if (run.italic)             return 'italic';
        return 'regular';
    }

    function runsLength(runs) {
        return runs.reduce((n, r) => n + r.text.length, 0);
    }

    function textArea(size) {
        const right = Math.max(MIN_RIGHT, size.width - MARGIN.left - TEXT_WIDTH_CHARS * CHAR_W);
        return { left: MARGIN.left, right, width: TEXT_WIDTH_CHARS * CHAR_W, pageWidth: size.width };
    }

    /* Posição X de uma linha (indent + alinhamento), em pontos.
     * `scale` ajusta a métrica quando a linha usa corpo maior (o título, 14pt).
     * `centerOn:'page'` centraliza no PAPEL (folha de rosto), não na área de
     * texto — que é assimétrica (1,5" à esquerda, ~0,75" à direita). */
    function lineX(line, area, scale) {
        const cw = CHAR_W * (scale || 1);
        const len = runsLength(line.runs || []);
        if (line.align === 'right')  return area.left + ((line.indent + line.width) * cw) - len * cw;
        if (line.align === 'center') {
            const centro = (line.centerOn === 'page' && area.pageWidth)
                ? area.pageWidth / 2
                : area.left + (TEXT_WIDTH_CHARS * CHAR_W) / 2;
            return centro - (len * cw) / 2;
        }
        return area.left + line.indent * cw;
    }

    /* Desenha uma linha de texto; devolve operadores do content stream. */
    function drawText(ops, line, x, y, opts) {
        const size = opts.size || FONT_SIZE;
        const scale = size / FONT_SIZE;
        /* Cor explícita sempre: o estado gráfico do PDF persiste no content
         * stream, então sem isto o texto seguinte herdaria a cor da revisão. */
        const color = colorOp(opts.color, false) || '0 0 0 rg';
        let cx = x;
        for (const run of line.runs) {
            /* Marcação ({!…} {*…} {?…}) vira fundo colorido atrás do texto —
             * a mesma cor que a lista de cenas usa para a linha marcada. */
            if (run.highlight) {
                const fill = colorOp(run.highlight, false);
                if (fill) {
                    ops.push(fill);
                    ops.push(num(cx) + ' ' + num(y - 2 * scale) + ' ' +
                             num(run.text.length * CHAR_W * scale) + ' ' + num(LINE_H * scale) + ' re f');
                }
            }
            if (run.text.length) {
                ops.push('BT');
                ops.push(color);
                ops.push('/' + FONTS[fontKey(run)].ref + ' ' + num(size) + ' Tf');
                ops.push('1 0 0 1 ' + num(cx) + ' ' + num(y) + ' Tm');
                ops.push('(' + pdfString(run.text) + ') Tj');
                ops.push('ET');
            }
            if (run.underline) {
                const w = run.text.length * CHAR_W * scale;
                ops.push('0 0 0 RG');
                ops.push('0.75 w');
                ops.push(num(cx) + ' ' + num(y - 2) + ' m ' + num(cx + w) + ' ' + num(y - 2) + ' l S');
            }
            cx += run.text.length * CHAR_W * scale;
        }
        return ops;
    }

    /* Marca de revisão: asterisco na margem direita (é onde o Final Draft marca)
     * e uma barra colorida na borda da página revisada — o equivalente digital
     * da "página colorida" da produção. */
    function revisionOps(ops, page, size, rev) {
        if (!rev) return ops;
        const area = textArea(size);
        for (let idx = 0; idx < page.lines.length; idx++) {
            const line = page.lines[idx];
            if (!line.revised) continue;
            const y = size.height - MARGIN.top - idx * LINE_H;
            drawText(ops, { runs: [{ text: '*' }] },
                     area.left + (TEXT_WIDTH_CHARS + 3) * CHAR_W, y, { color: rev.color });
        }
        if (page.revised) {
            const fill = colorOp(rev.color, false);
            if (fill) {
                ops.push(fill);
                ops.push(num(size.width - 22) + ' ' + num(MARGIN.bottom) + ' 8 ' +
                         num(size.height - MARGIN.top - MARGIN.bottom) + ' re f');
            }
        }
        return ops;
    }

    function pageContent(page, size, opts) {
        const ops = [];
        const area = textArea(size);
        const y0 = size.height - MARGIN.top;
        const rev = opts.revision || null;

        /* Número de página no cabeçalho (a partir da 2ª) — na cor da revisão
         * quando a página é revisada, para achar as páginas novas no maço. */
        if (page.header) {
            const len = page.header.length;
            const x = area.left + TEXT_WIDTH_CHARS * CHAR_W - len * CHAR_W;
            drawText(ops, { runs: [{ text: page.header }] }, x, size.height - HEADER_FROM_TOP,
                     { size: FONT_SIZE, color: (page.revised && rev) ? rev.color : null });
        }

        let idx = 0;
        for (const line of page.lines) {
            const y = y0 - idx * LINE_H;
            idx++;
            if (line.type === 'blank') continue;

            if (line.type === 'dual') {
                for (const side of ['left', 'right']) {
                    const col = line[side];
                    if (!col) continue;
                    drawText(ops, { runs: col.runs }, area.left + col.indent * CHAR_W, y, {});
                }
                continue;
            }

            let x = lineX(line, area, line.size === 'title' ? 14 / FONT_SIZE : 1);

            /* Número de cena: nas DUAS margens (convenção de draft de produção). */
            if (line.sceneNumber !== undefined && line.sceneNumber !== null) {
                const t = String(line.sceneNumber);
                drawText(ops, { runs: [{ text: t }] }, MARGIN.left - (t.length + 1) * CHAR_W, y, {});
                drawText(ops, { runs: [{ text: t }] },
                         area.left + (TEXT_WIDTH_CHARS + 1) * CHAR_W, y, {});
            }

            drawText(ops, line, x, y, { size: line.size === 'title' ? 14 : FONT_SIZE });
        }
        revisionOps(ops, page, size, rev);          // asteriscos + barra colorida
        return ops.join('\n');
    }

    function titlePageContent(titlePage, size) {
        const ops = [];
        const area = textArea(size);
        const y0 = size.height - MARGIN.top;
        let idx = 3;                                  // respiro no topo
        for (const line of titlePage.top) {
            const y = y0 - idx * LINE_H * 2;
            idx++;
            const scale = line.size === 'title' ? 14 / FONT_SIZE : 1;
            drawText(ops, line, lineX(line, area, scale), y, { size: line.size === 'title' ? 14 : FONT_SIZE });
        }
        const bottom = titlePage.bottom;
        for (let k = 0; k < bottom.length; k++) {
            const line = bottom[k];
            const y = MARGIN.bottom + (bottom.length - 1 - k) * LINE_H;
            drawText(ops, line, lineX(line, area), y, { size: FONT_SIZE });
        }
        return ops.join('\n');
    }

    /* Monta o arquivo PDF. doc = resultado de Paginator.paginate().
     * Devolve Uint8Array (funciona no navegador e no node --test). */
    function build(doc, options) {
        const opts = options || {};
        const size = opts.pageSize || doc.pageSize || { width: 595, height: 842 };
        /* A cor da revisão pode vir do resultado do paginador ou do chamador. */
        const revision = opts.revision || doc.revision || null;
        const pageOpts = Object.assign({}, opts, { revision });

        const sheets = [];
        if (opts.titlePage === false) { /* sem folha de rosto a pedido */ }
        else if (doc.titlePage) sheets.push({ content: titlePageContent(doc.titlePage, size), header: null });
        for (const p of doc.pages) {
            sheets.push({ content: pageContent(p, size, pageOpts), header: p.header });
        }
        if (!sheets.length) sheets.push({ content: '', header: null });

        /* Numeração de objetos: 1 catálogo, 2 páginas, 3–6 fontes,
         * 7+ (par) página, (ímpar) content stream. */
        const fontStart = 3;
        const pageStart = fontStart + 4;
        const pageObjNum    = i => pageStart + i * 2;
        const contentObjNum = i => pageStart + i * 2 + 1;
        const maxObj        = pageStart + sheets.length * 2 - 1;

        const chunks = [];
        const offsets = {};
        let offset = 0;
        const write = (s) => { chunks.push(s); offset += s.length; };
        const obj = (n, body) => {
            offsets[n] = offset;
            write(n + ' 0 obj\n' + body + '\nendobj\n');
        };

        /* O comentário binário avisa que o arquivo não é texto puro. */
        write('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

        obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
        obj(2, '<< /Type /Pages /Kids [' +
               sheets.map((_, i) => pageObjNum(i) + ' 0 R').join(' ') +
               '] /Count ' + sheets.length + ' >>');
        for (const key of Object.keys(FONTS)) {
            const f = FONTS[key];
            obj(fontStart + { regular: 0, bold: 1, italic: 2, boldItalic: 3 }[key],
                '<< /Type /Font /Subtype /Type1 /BaseFont /' + f.base +
                ' /Encoding /WinAnsiEncoding >>');
        }
        sheets.forEach((sheet, i) => {
            obj(pageObjNum(i),
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + num(size.width) + ' ' + num(size.height) + '] ' +
                '/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> ' +
                '/Contents ' + contentObjNum(i) + ' 0 R >>');
            obj(contentObjNum(i),
                '<< /Length ' + sheet.content.length + ' >>\nstream\n' + sheet.content + '\nendstream');
        });

        const xrefOffset = offset;
        let xref = 'xref\n0 ' + (maxObj + 1) + '\n0000000000 65535 f \n';
        for (let n = 1; n <= maxObj; n++) xref += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
        write(xref);
        write('trailer\n<< /Size ' + (maxObj + 1) + ' /Root 1 0 R >>\n' +
              'startxref\n' + xrefOffset + '\n%%EOF\n');

        const str = chunks.join('');
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i) & 0xFF;
        return bytes;
    }

    /* Navegador: baixa o arquivo. (No node, use build().) */
    function save(filename, doc, options) {
        const bytes = build(doc, options);
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return { build, save, toWinAnsi, pdfString, lineX, textArea, runsLength, hexToRgb, colorOp,
             CHAR_W, LINE_H, FONT_SIZE, MARGIN, FONTS };
})();
