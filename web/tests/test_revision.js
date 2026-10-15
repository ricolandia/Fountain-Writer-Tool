const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadRevision, revisionDiff, loadPdfBuilder, paginateFountain } = require('./helpers');

loadRevision();

/* Roteiro de 3 cenas — a base dos testes. */
const BASE = [
  'INT. CASA - DIA',
  '',
  'João entra e olha o relógio.',
  '',
  'JOÃO',
  'Está tarde.',
  '',
  'EXT. RUA - NOITE',
  '',
  'A rua está vazia.',
  '',
  'MARIA',
  'Ninguém veio.',
  '',
  'INT. CARRO - NOITE',
  '',
  'Ela dirige em silêncio.',
].join('\n');

/* Texto dos blocos revisados, para a asserção dizer o QUE casou. */
function revisadosTexto(r) {
  return [...r.revised].map(i => Revision.describeBlock(r.blocks[i]));
}

describe('Revisões — diff por bloco', () => {
  it('roteiro igual não tem nada revisado', () => {
    const r = revisionDiff(BASE, BASE);
    assert.equal(r.revised.size, 0);
    assert.equal(r.stats.revised, 0);
    assert.equal(r.approximate, false);
  });

  it('marca só o bloco cujo texto mudou', () => {
    const depois = BASE.replace('Está tarde.', 'Já é quase noite.');
    const r = revisionDiff(BASE, depois);
    assert.equal(r.revised.size, 1);
    assert.deepEqual(revisadosTexto(r), ['Já é quase noite.']);
  });

  it('cena inserida no meio NÃO marca o que veio depois dela', () => {
    const depois = BASE.replace(
      'EXT. RUA - NOITE',
      'INT. ESCRITÓRIO - DIA\n\nPapéis por todo lado.\n\nEXT. RUA - NOITE'
    );
    const r = revisionDiff(BASE, depois);
    /* Só os dois blocos novos (título + ação). Se o diff fosse
     * prefixo/sufixo, tudo a partir da inserção apareceria como revisado. */
    assert.deepEqual(revisadosTexto(r), ['INT. ESCRITÓRIO - DIA', 'Papéis por todo lado.']);
  });

  it('remover um bloco não marca nada (a remoção não inventa texto)', () => {
    const depois = BASE.replace('\n\nA rua está vazia.', '');
    const r = revisionDiff(BASE, depois);
    assert.equal(r.revised.size, 0);
    assert.equal(r.stats.removed, 1);
  });

  it('mudar o TIPO do bloco conta como revisão (mesmo texto)', () => {
    const r = revisionDiff('FIM', '>FIM<');            // ação → centralizado
    assert.equal(r.revised.size, 1);
  });

  it('blocos trocados de lugar aparecem como revisados', () => {
    const depois = [
      'INT. CASA - DIA', '', 'João entra e olha o relógio.', '',
      'JOÃO', 'Está tarde.', '',
      'INT. CARRO - NOITE', '', 'Ela dirige em silêncio.', '',
      'EXT. RUA - NOITE', '', 'A rua está vazia.', '',
      'MARIA', 'Ninguém veio.',
    ].join('\n');
    const r = revisionDiff(BASE, depois);
    assert.ok(r.revised.size >= 2, 'esperava os blocos movidos');
  });

  it('revisão de texto inteiro marca tudo', () => {
    const r = revisionDiff(BASE, 'INT. OUTRA - DIA\n\nNada a ver com o anterior.');
    assert.equal(r.revised.size, r.blocks.length);
    assert.ok(r.stats.revised > 0);
  });

  it('roteiro vazio como base marca todo o roteiro novo', () => {
    const r = revisionDiff('', BASE);
    assert.equal(r.revised.size, r.blocks.length);
  });

  it('apagar tudo não marca blocos (não há o que marcar)', () => {
    const r = revisionDiff(BASE, '');
    assert.equal(r.revised.size, 0);
    assert.equal(r.blocks.length, 0);
  });

  it('cai no modo aproximado quando estoura o teto do diff', () => {
    const r = revisionDiff(BASE, BASE.replace('Está tarde.', 'Mudou.'), { cap: 1 });
    assert.equal(r.approximate, true);
  });

  it('guarda hashes estáveis (mesmo texto, mesmo hash)', () => {
    const a = Revision.blockHashes(Fountain.parseBlocks(BASE));
    const b = Revision.blockHashes(Fountain.parseBlocks(BASE));
    assert.deepEqual(a, b);
    assert.ok(a.every(h => Number.isInteger(h) && h >= 0));
  });

  it('hash da chave separa tipo de texto', () => {
    assert.notEqual(
      Revision.hashText(Revision.blockKey({ type: 'action', text: 'X' })),
      Revision.hashText(Revision.blockKey({ type: 'character', text: 'X' }))
    );
  });

  it('o resumo guardado é compacto (1 número por bloco)', () => {
    const hashes = Revision.blockHashes(Fountain.parseBlocks(BASE));
    const json = JSON.stringify(hashes);
    assert.equal(hashes.length, json.split(',').length);
    assert.ok(json.length < BASE.length * 2, 'resumo não deve ser maior que o roteiro');
  });
});

describe('Revisões — cores da rodada', () => {
  it('segue a sequência da indústria', () => {
    assert.deepEqual(Revision.COLORS.map(c => c.id).slice(0, 5),
                     ['branca', 'azul', 'rosa', 'amarela', 'verde']);
  });

  it('próxima cor avança e volta ao começo', () => {
    assert.equal(Revision.nextColor('branca'), 'azul');
    assert.equal(Revision.nextColor('azul'), 'rosa');
    assert.equal(Revision.nextColor('cereja'), 'branca');
  });

  it('cor desconhecida cai na primeira (branca)', () => {
    assert.equal(Revision.colorById('inexistente').id, 'branca');
    assert.equal(Revision.colorById('azul').hex, '#2f6fbd');
  });

  it('cada cor tem hex válido e nome nos dois idiomas', () => {
    for (const c of Revision.COLORS) {
      assert.match(c.hex, /^#[0-9a-f]{6}$/i);
      assert.ok(c.pt && c.en, 'faltou nome em ' + c.id);
    }
  });
});

describe('Revisões — marcação no PDF', () => {
  const { loadPdfBuilder } = require('./helpers');
  loadPdfBuilder();

  const depois = BASE.replace('A rua está vazia.', 'A rua está deserta.');
  const r = revisionDiff(BASE, depois);
  const doc = paginateFountain(depois, { revisedBlocks: new Set(r.revised), titlePage: false });
  const revision = { color: Revision.colorById('azul').hex, label: 'azul' };
  const bytes = globalThis.PdfBuilder.build(doc, { revision });
  const text = Buffer.from(bytes).toString('latin1');

  it('desenha o asterisco da revisão', () => {
    assert.ok(text.includes('(*) Tj'), 'esperava o asterisco na margem');
  });

  it('usa a cor da rodada (azul = 0.18 0.44 0.74)', () => {
    assert.ok(text.includes('0.18 0.44 0.74 rg'), 'esperava a cor da revisão no stream');
  });

  it('pinta a borda da página revisada', () => {
    assert.ok(/\d[\d.]* \d[\d.]* 8 \d[\d.]* re f/.test(text), 'esperava a barra colorida na borda');
  });

  it('numera a página revisada na cor da rodada (asterisco + número + barra)', () => {
    const depois2 = BASE.replace('Ela dirige em silêncio.', 'Ela dirige calada.');
    const r2 = revisionDiff(BASE, depois2);
    const doc2 = paginateFountain(depois2, {
      revisedBlocks: new Set(r2.revised), linesPerPage: 5, titlePage: false,
    });
    assert.ok(doc2.pages.length > 1, 'precisa de mais de uma página');
    assert.equal(doc2.pages[1].header, '2.');
    const t = Buffer.from(globalThis.PdfBuilder.build(doc2, { revision })).toString('latin1');
    assert.equal((t.match(/0\.18 0\.44 0\.74 rg/g) || []).length, 3,
      'esperava asterisco + número da página + barra na cor da rodada');
  });

  it('sem revisão, o PDF sai em preto (sem cor)', () => {
    const puro = Buffer.from(globalThis.PdfBuilder.build(
      paginateFountain(BASE, { titlePage: false }))).toString('latin1');
    assert.ok(!puro.includes('0.18 0.44 0.74 rg'));
    assert.ok(!/\d[\d.]* \d[\d.]* 8 \d[\d.]* re f/.test(puro));
  });

  it('todo texto sai com cor explícita (a cor da revisão não vaza)', () => {
    /* O estado gráfico do PDF persiste: sem reset explícito, o texto seguinte
     * ao asterisco herdaria azul. Cada Tj tem de vir precedido de um rg. */
    const tjs = (text.match(/ Tj/g) || []).length;
    const cores = (text.match(/(?:\d[\d.]* ){2}\d[\d.]* rg/g) || []).length;
    assert.ok(cores >= tjs, cores + ' cores para ' + tjs + ' textos');
    /* E a cor da rodada aparece SÓ nas marcas: 1 asterisco + 1 barra de página. */
    assert.equal((text.match(/0\.18 0\.44 0\.74 rg/g) || []).length, 2);
  });

  it('converte cor hex em componentes de PDF', () => {
    assert.deepEqual(globalThis.PdfBuilder.hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
    assert.deepEqual(globalThis.PdfBuilder.hexToRgb('#ffffff'), { r: 1, g: 1, b: 1 });
    assert.equal(globalThis.PdfBuilder.hexToRgb('roxo'), null);
  });
});

describe('Revisões — marcação na paginação', () => {

  const { paginateFountain } = require('./helpers');

  it('marca o começo do bloco revisado: fala marca o PERSONAGEM', () => {
    const depois = BASE.replace('Está tarde.', 'Já é quase noite.');
    const r = revisionDiff(BASE, depois);
    const doc = paginateFountain(depois, { revisedBlocks: new Set(r.revised), titlePage: false });
    const marcadas = doc.pages.flatMap(p => p.lines).filter(l => l.revised);
    assert.equal(marcadas.length, 1, 'uma linha marcada (o começo do bloco revisado)');
    assert.equal(marcadas[0].runs.map(x => x.text).join(''), 'JOÃO');
    assert.ok(doc.pages.some(p => p.revised), 'a página com conteúdo revisado é revisada');
  });

  it('marca o começo do bloco revisado: ação marca a própria ação', () => {
    const depois = BASE.replace('A rua está vazia.', 'A rua está deserta.');
    const r = revisionDiff(BASE, depois);
    const doc = paginateFountain(depois, { revisedBlocks: new Set(r.revised), titlePage: false });
    const marcadas = doc.pages.flatMap(p => p.lines).filter(l => l.revised);
    assert.equal(marcadas.length, 1);
    assert.equal(marcadas[0].runs.map(x => x.text).join(''), 'A rua está deserta.');
  });

  it('sem blocos revisados, nada é marcado', () => {
    const doc = paginateFountain(BASE, { revisedBlocks: new Set(), titlePage: false });
    assert.ok(!doc.pages.some(p => p.revised));
    assert.ok(!doc.pages.flatMap(p => p.lines).some(l => l.revised));
  });

  it('a página revisada é só a que contém o bloco revisado', () => {
    const depois = BASE.replace('Ela dirige em silêncio.', 'Ela dirige calada.');
    const r = revisionDiff(BASE, depois);
    const doc = paginateFountain(depois, { revisedBlocks: new Set(r.revised), linesPerPage: 5, titlePage: false });
    assert.ok(doc.pages.length > 1);
    assert.equal(doc.pages.filter(p => p.revised).length, 1);
  });
});
