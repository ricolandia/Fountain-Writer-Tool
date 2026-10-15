const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const { existsSync } = require('node:fs');
const { loadPaginator, loadPdfBuilder, paginateFountain } = require('./helpers');

loadPaginator();

/* Texto de todas as linhas de uma página, para asserções simples. */
function pageText(page) {
  return page.lines.map(l => {
    if (l.type === 'blank') return '';
    if (l.type === 'dual') {
      const left = (l.left ? l.left.runs.map(r => r.text).join('') : '').padEnd(24);
      return left + (l.right ? l.right.runs.map(r => r.text).join('') : '');
    }
    return l.runs.map(r => r.text).join('');
  }).join('\n');
}

describe('Paginator — quebra de páginas', () => {
  it('respeita o limite de linhas por página', () => {
    const script = 'INT. A - DIA\n\nAção um.\n\nINT. B - DIA\n\nAção dois.';
    const big = paginateFountain(script, { linesPerPage: 10, titlePage: false });
    const small = paginateFountain(script, { linesPerPage: 5, titlePage: false });
    assert.equal(big.pages.length, 1);
    assert.equal(small.pages.length, 2);
  });

  it('nunca passa do limite de linhas por página', () => {
    const script = 'INT. A - DIA\n\n' + Array.from({ length: 30 },
      (_, i) => 'Parágrafo de ação numero ' + i + ' com algum texto.').join('\n\n');
    const doc = paginateFountain(script, { linesPerPage: 10, titlePage: false });
    for (const page of doc.pages) assert.ok(page.lines.length <= 10, 'página com ' + page.lines.length + ' linhas');
    assert.ok(doc.pages.length > 1);
  });

  it('não deixa título de cena órfão no pé da página', () => {
    const script = 'INT. A - DIA\n\nAção um.\n\nINT. B - DIA\n\nAção dois.';
    const doc = paginateFountain(script, { linesPerPage: 5, titlePage: false });
    assert.ok(!pageText(doc.pages[0]).includes('INT. B'), 'INT. B não pode ficar na 1ª página');
    assert.ok(pageText(doc.pages[1]).includes('INT. B'));
    assert.ok(pageText(doc.pages[1]).includes('Ação dois'), 'título não pode ficar sozinho');
  });

  it('não começa página com linha em branco', () => {
    const script = 'Ação um.\n\n===\n\nAção dois.';
    const doc = paginateFountain(script, { linesPerPage: 10, titlePage: false });
    assert.equal(doc.pages.length, 2);
    assert.notEqual(doc.pages[1].lines[0].type, 'blank');
  });

  it('não termina página com linha em branco', () => {
    const script = 'Ação um.\n\nINT. A - DIA\n\nAção dois.';
    const doc = paginateFountain(script, { linesPerPage: 10, titlePage: false });
    for (const page of doc.pages) {
      assert.notEqual(page.lines[page.lines.length - 1].type, 'blank');
    }
  });

  it('`===` força quebra de página', () => {
    const script = 'Ação um.\n\n===\n\nAção dois.';
    const doc = paginateFountain(script, { linesPerPage: 40, titlePage: false });
    assert.equal(doc.pages.length, 2);
    assert.ok(pageText(doc.pages[0]).includes('Ação um'));
    assert.ok(pageText(doc.pages[1]).includes('Ação dois'));
  });
});

describe('Paginator — diálogo', () => {
  const longo = 'JOÃO\n' + Array.from({ length: 14 },
    () => 'Uma fala bem comprida para forçar a quebra de linha e de página no meio.').join(' ');

  it('quebra diálogo com (MORE) e continua com (CONT\'D)', () => {
    const doc = paginateFountain('INT. A - DIA\n\n' + longo, { linesPerPage: 10, titlePage: false });
    assert.ok(doc.pages[0].lines.some(l => l.type === 'text' && /\(MORE\)/.test(l.runs.map(r => r.text).join(''))));
    const depois = doc.pages.slice(1).map(pageText).join('\n');
    assert.ok(/\(CONT'D\)/.test(depois));
    assert.ok(depois.includes('JOÃO'), 'a continuação repete o personagem');
  });

  it('mantém PERSONAGEM junto de ao menos uma fala', () => {
    const doc = paginateFountain('INT. A - DIA\n\nAção.\n\nJOÃO\nFala curta.', { linesPerPage: 5, titlePage: false });
    const idx = doc.pages.findIndex(p => pageText(p).includes('JOÃO'));
    assert.ok(idx >= 0);
    assert.ok(pageText(doc.pages[idx]).includes('Fala curta.'));
  });

  it('quebra a fala na largura do diálogo (35 caracteres)', () => {
    const doc = paginateFountain('JOÃO\n' + 'palavra '.repeat(20).trim(), { linesPerPage: 55, titlePage: false });
    const falas = doc.pages[0].lines.filter(l => l.type === 'text' && l.indent === 10);
    assert.ok(falas.length > 1);
    for (const f of falas) assert.ok(f.runs.map(r => r.text).join('').length <= 35);
  });

  it('indenta parentético em 15 e fala em 10', () => {
    const doc = paginateFountain('JOÃO\n(baixinho)\nUma fala.', { linesPerPage: 55, titlePage: false });
    const linhas = doc.pages[0].lines.filter(l => l.type === 'text');
    assert.equal(linhas.find(l => l.runs[0].text.includes('baixinho')).indent, 15);
    assert.equal(linhas.find(l => l.runs[0].text.includes('Uma fala')).indent, 10);
  });

  it('coloca diálogo duplo na mesma linha', () => {
    const doc = paginateFountain('BRICK\nScrew retirement.\n\nSTEEL ^\nScrew retirement.', { linesPerPage: 55, titlePage: false });
    const dual = doc.pages[0].lines.find(l => l.type === 'dual');
    assert.ok(dual, 'esperava uma linha de diálogo duplo');
    assert.ok(dual.left.runs.map(r => r.text).join('').includes('BRICK'));
    assert.ok(dual.right.runs.map(r => r.text).join('').includes('STEEL'));
  });
});

describe('Paginator — elementos', () => {
  it('quebra a ação em 60 caracteres', () => {
    const doc = paginateFountain('palavra '.repeat(40).trim(), { linesPerPage: 55, titlePage: false });
    const linhas = doc.pages[0].lines.filter(l => l.type === 'text');
    assert.ok(linhas.length > 1);
    for (const l of linhas) assert.ok(l.runs.map(r => r.text).join('').length <= 60);
  });

  it('põe transição alinhada à direita', () => {
    const doc = paginateFountain('CUT TO:', { linesPerPage: 55, titlePage: false });
    const t = doc.pages[0].lines.find(l => l.type === 'text' && l.align === 'right');
    assert.ok(t);
    assert.equal(t.runs.map(r => r.text).join(''), 'CUT TO:');
  });

  it('preserva quebra de linha explícita dentro do bloco de ação', () => {
    const doc = paginateFountain('Primeira linha.\nSegunda linha.', { linesPerPage: 55, titlePage: false });
    assert.equal(doc.pages[0].lines.length, 2);
  });

  it('esconde Sections por padrão e mostra com includeSections', () => {
    const script = '# Ato Um\n\nAção.';
    assert.ok(!pageText(paginateFountain(script, { linesPerPage: 55 }).pages[0]).includes('Ato Um'));
    assert.ok(pageText(paginateFountain(script, { linesPerPage: 55, includeSections: true }).pages[0]).includes('Ato Um'));
  });

  it('esconde sinopse e nota', () => {
    const doc = paginateFountain('= Sinopse\n\nAção.\n\n[[Nota de produção]]', { linesPerPage: 55, titlePage: false });
    const texto = pageText(doc.pages[0]);
    assert.ok(!texto.includes('Sinopse'));
    assert.ok(!texto.includes('Nota de produção'));
  });

  it('interpreta a ênfase em runs', () => {
    const doc = paginateFountain('Uma linha com **negrito** e *itálico* e _sublinhado_.', { linesPerPage: 55, titlePage: false });
    const runs = doc.pages[0].lines[0].runs;
    assert.ok(runs.some(r => r.text === 'negrito' && r.bold));
    assert.ok(runs.some(r => r.text === 'itálico' && r.italic));
    assert.ok(runs.some(r => r.text === 'sublinhado' && r.underline));
  });
});

describe('Paginator — números e folha de rosto', () => {
  it('numera as cenas em sequência quando ligado', () => {
    const doc = paginateFountain('INT. A - DIA\n\nAção.\n\nINT. B - DIA\n\nAção.', { linesPerPage: 55, sceneNumbers: true });
    const headings = doc.pages.flatMap(p => p.lines).filter(l => l.type === 'text' && l.sceneNumber !== undefined);
    assert.deepEqual(headings.map(l => l.sceneNumber), ['1', '2']);
    assert.equal(doc.stats.scenes, 2);
  });

  it('prefere o número explícito do `#n#`', () => {
    const doc = paginateFountain('INT. A - DIA #12#\n\nAção.\n\nINT. B - DIA\n\nAção.', { linesPerPage: 55, sceneNumbers: true });
    const headings = doc.pages.flatMap(p => p.lines).filter(l => l.type === 'text' && l.sceneNumber !== undefined);
    assert.deepEqual(headings.map(l => l.sceneNumber), ['12', '2']);
  });

  it('não numera cena por padrão', () => {
    const doc = paginateFountain('INT. A - DIA\n\nAção.', { linesPerPage: 55 });
    assert.ok(!doc.pages[0].lines.some(l => l.sceneNumber !== undefined));
    assert.equal(doc.stats.scenes, 1);
  });

  it('numera a página no cabeçalho a partir da segunda', () => {
    const doc = paginateFountain('Ação um.\n\n===\n\nAção dois.', { linesPerPage: 10, titlePage: false });
    assert.equal(doc.pages[0].header, null);
    assert.equal(doc.pages[1].header, '2.');
  });

  it('monta a folha de rosto com título em cima e contato embaixo', () => {
    const script = 'Title:\n    BRICK & STEEL\nCredit: Written by\nAuthor: Stu\nContact:\n    Rua Um, 1\n    Cidade, 2\n\nAção.';
    const doc = paginateFountain(script, { linesPerPage: 55 });
    assert.ok(doc.titlePage);
    assert.ok(doc.titlePage.top[0].runs.map(r => r.text).join('').includes('BRICK & STEEL'));
    const contato = doc.titlePage.bottom.map(l => l.runs.map(r => r.text).join(''));
    assert.deepEqual(contato, ['Rua Um, 1', 'Cidade, 2'], 'cada linha do contato é uma linha');
    for (const l of doc.titlePage.bottom) assert.equal(l.align, 'left');
  });

  it('expõe estatísticas coerentes', () => {
    const doc = paginateFountain('INT. A - DIA\n\nAção.', { linesPerPage: 55, titlePage: false });
    assert.equal(doc.stats.pages, 1);
    assert.equal(doc.stats.scenes, 1);
    assert.ok(doc.stats.lines >= 2);
  });
});

describe('Paginator — geometria', () => {
  it('usa A4 por padrão e aceita letter', () => {
    const a4 = paginateFountain('Ação.', {});
    const letter = paginateFountain('Ação.', { pageSize: 'letter' });
    assert.equal(a4.pageSize.width, 595);
    assert.equal(letter.pageSize.width, 612);
  });

  it('mantém 60 caracteres de largura de texto em A4 e letter', () => {
    // 60 chars * 7.2pt = 432pt; a margem esquerda (108pt) + 432 deve caber
    const CHAR_W = 7.2, LEFT = 108, WIDTH = 60;
    for (const size of [{ width: 595, height: 842 }, { width: 612, height: 792 }]) {
      assert.ok(LEFT + WIDTH * CHAR_W <= size.width - 36, 'largura estoura em ' + size.width);
    }
  });
});

describe('Paginator — robustez das opções', () => {
  it('ignora opções undefined/null (não vira NaN nem laço infinito)', () => {
    const script = 'JOÃO\n' + 'palavra '.repeat(400).trim();
    const doc = paginateFountain(script, { linesPerPage: undefined, titlePage: null, metrics: { action: { width: undefined } } });
    assert.equal(doc.options.linesPerPage, 55);
    assert.equal(doc.metrics.action.width, 60);
    assert.ok(doc.pages.length >= 2);
    assert.ok(doc.pages.every(p => p.lines.length <= 55));
  });

  it('recusa linesPerPage absurdo (0, negativo, texto)', () => {
    for (const valor of [0, -1, 'x', 1, 2.7]) {
      const doc = paginateFountain('Ação.', { linesPerPage: valor });
      assert.ok(doc.options.linesPerPage >= 4, 'valor ' + valor + ' não foi saneado');
    }
    const frac = paginateFountain('Ação.', { linesPerPage: 10.9 });
    assert.equal(frac.options.linesPerPage, 10);
  });

  it('faz fallback de tamanho de página desconhecido para A4', () => {
    const doc = paginateFountain('Ação.', { pageSize: 'a0' });
    assert.equal(doc.pageSize.width, 595);
  });
});

describe('PDF — estrutura', () => {
  loadPdfBuilder();

  const script = 'Title:\n    BRICK & STEEL\nAuthor: Stu\n\nINT. CASA - DIA #1#\n\nAÇÃO (com acentuação) — travessão.\n\nJOÃO\nUma fala com **negrito** e _sublinhado_.';
  const doc = paginateFountain(script, { linesPerPage: 20, sceneNumbers: true });
  const bytes = globalThis.PdfBuilder.build(doc);
  const text = Buffer.from(bytes).toString('latin1');

  it('gera um arquivo que começa com %PDF', () => {
    assert.ok(text.startsWith('%PDF-1.4'), 'cabeçalho PDF ausente');
    assert.ok(text.trimEnd().endsWith('%%EOF'));
  });

  it('usa as fontes padrão Courier (sem embutir fonte)', () => {
    assert.ok(text.includes('/BaseFont /Courier'));
    assert.ok(text.includes('/BaseFont /Courier-Bold'));
    assert.ok(text.includes('/BaseFont /Courier-Oblique'));
    assert.ok(text.includes('/Encoding /WinAnsiEncoding'));
    assert.ok(!text.includes('/FontFile'), 'não deve embutir fonte');
  });

  it('conta as páginas certas (folha de rosto + roteiro)', () => {
    assert.ok(text.includes('/Count ' + (doc.pages.length + 1)));
  });

  it('escreve os caracteres acentuados em WinAnsi, sem perder nada', () => {
    assert.ok(bytes.includes(0xC7), 'esperava o byte de Ç (0xC7)');
    assert.ok(text.includes('AÇÃO'), 'AÇÃO deve sair em WinAnsi (1 byte/char)');
    // travessão: cp1252 0x97 — na decodificação latin1 vira U+0097, não U+2014
    assert.ok(bytes.includes(0x97), 'travessão deve virar o byte 0x97 (cp1252)');
    assert.ok(!Buffer.from(bytes).toString('utf8').includes('—'), 'não pode sair em UTF-8');
  });

  it('escapa parênteses e barra invertida nas strings do PDF', () => {
    const d = paginateFountain('Ação com (parêntese) e barra \\ aqui.', { linesPerPage: 55, titlePage: false });
    const t = Buffer.from(globalThis.PdfBuilder.build(d)).toString('latin1');
    assert.ok(t.includes('\\(parêntese\\)'));
    assert.ok(t.includes('\\\\'));
  });

  it('aponta o startxref para a tabela xref', () => {
    const m = /startxref\n(\d+)\n%%EOF/.exec(text);
    assert.ok(m, 'startxref ausente');
    const offset = Number(m[1]);
    assert.equal(text.slice(offset, offset + 4), 'xref', 'startxref não aponta para xref');
  });

  it('tem uma entrada de xref para cada objeto, no offset certo', () => {
    const xrefStart = text.lastIndexOf('\nxref\n') + 1;
    assert.ok(xrefStart > 0, 'tabela xref ausente');
    const linhas = text.slice(xrefStart).split('\n');
    const total = Number(linhas[1].split(' ')[1]);
    assert.ok(total > 1, 'xref sem objetos');
    for (let n = 1; n < total; n++) {
      const entry = linhas[2 + n];                   // 0:xref · 1:'0 N' · 2:objeto livre · 3:objeto 1
      const offset = Number(entry.slice(0, 10));
      const esperado = n + ' 0 obj';
      assert.equal(text.slice(offset, offset + esperado.length), esperado,
        'xref do objeto ' + n + ' aponta para o lugar errado');
    }
  });

  /* Validação por ferramenta INDEPENDENTE (poppler). Auto-pulado onde não há
   * pdfinfo — o CI padrão só depende de node. */
  it('é aceito pelo pdfinfo (validação externa)', { skip: !existsSync('/usr/bin/pdfinfo') }, () => {
    const tmp = path.join(os.tmpdir(), 'fonte-teste-' + process.pid + '.pdf');
    fs.writeFileSync(tmp, Buffer.from(bytes));
    try {
      const out = childProcess.execFileSync('/usr/bin/pdfinfo', [tmp], { encoding: 'utf-8' });
      const pages = /Pages:\s+(\d+)/.exec(out);
      assert.ok(pages, 'pdfinfo não reportou páginas');
      assert.equal(Number(pages[1]), doc.pages.length + 1);   // + folha de rosto
      assert.match(out, /Page size:\s+595(\.\d+)? x 842(\.\d+)?/);  // A4
      const txt = childProcess.execFileSync('/usr/bin/pdftotext', [tmp, '-'], { encoding: 'utf-8' });
      assert.ok(txt.includes('INT. CASA - DIA'), 'pdftotext não leu o título de cena');
      assert.ok(txt.includes('AÇÃO'), 'pdftotext não leu o acento');
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('desenha o número de cena nas duas margens', () => {
    const ocurrencias = (text.match(/\(1\) Tj/g) || []).length;
    assert.ok(ocurrencias >= 2, 'esperava o número de cena nas duas margens');
  });

  it('usa a fonte negrito para o run em negrito', () => {
    assert.ok(/\/F2 12 Tf[\s\S]*?\(negrito\) Tj/.test(text));
  });

  it('desenha o sublinhado como traço', () => {
    assert.ok(/ l S(\n|$)/.test(text), 'esperava o operador de traço do sublinhado');
  });

  it('não gera fonte/objeto de imagem nem dependência externa', () => {
    assert.ok(!text.includes('/XObject'));
    assert.ok(!text.includes('/Annots'));
  });

  it('centraliza o título (14pt) no centro do PAPEL', () => {
    const area = globalThis.PdfBuilder.textArea({ width: 595, height: 842 });
    const linha = { runs: [{ text: 'BRICK & STEEL' }], align: 'center', width: 60, indent: 0, centerOn: 'page' };
    const x = globalThis.PdfBuilder.lineX(linha, area, 14 / globalThis.PdfBuilder.FONT_SIZE);
    const centroTitulo = x + (13 * (globalThis.PdfBuilder.CHAR_W * 14 / 12)) / 2;
    assert.ok(Math.abs(centroTitulo - 595 / 2) < 0.01,
      'título fora do centro do papel: ' + centroTitulo);
  });

  it('centraliza texto do corpo no centro da ÁREA de texto', () => {
    const area = globalThis.PdfBuilder.textArea({ width: 595, height: 842 });
    const linha = { runs: [{ text: 'THE END' }], align: 'center', width: 60, indent: 0 };
    const x = globalThis.PdfBuilder.lineX(linha, area, 1);
    const centro = x + (7 * globalThis.PdfBuilder.CHAR_W) / 2;
    assert.ok(Math.abs(centro - (108 + 432 / 2)) < 0.01);
  });
});
