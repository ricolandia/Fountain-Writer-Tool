const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadFountainParser, loadI18n, loadAppFunction } = require('./helpers');

loadFountainParser();
loadI18n();
loadAppFunction('migrateProject');
loadAppFunction('actLabel');

describe('migrateProject', () => {
  it('aceita projeto legado sem version (trata como v1)', () => {
    const legacy = { draft: 'INT. CASA', beats: [] };
    assert.equal(migrateProject(legacy), legacy);
    assert.equal(migrateProject(legacy).draft, 'INT. CASA');
  });

  it('aceita projeto v1 e devolve o mesmo objeto', () => {
    const v1 = { version: 1, draft: 'x' };
    assert.equal(migrateProject(v1), v1);
  });

  it('não quebra com entrada inválida', () => {
    assert.equal(migrateProject(null), null);
    assert.equal(migrateProject('texto'), 'texto');
  });
});

describe('actLabel', () => {
  it('mantém "Ato N" em pt-BR', () => {
    globalThis.lang = 'pt-BR';
    assert.equal(actLabel('Ato 2'), 'Ato 2');
  });

  it('exibe "Act N" em inglês', () => {
    globalThis.lang = 'en';
    assert.equal(actLabel('Ato 2'), 'Act 2');
    assert.equal(actLabel('Ato 10'), 'Act 10');
  });

  it('não altera outros textos', () => {
    globalThis.lang = 'en';
    assert.equal(actLabel('Principal'), 'Principal');
  });
});

describe('scene number (segurança)', () => {
  it('escapa scene number antes de virar atributo id', () => {
    const result = Fountain.parse('INT. CASA - DIA #x" onmouseover="alert(1)#');
    const html = result.html.script;
    assert.ok(!/onmouseover="alert/.test(html), 'não deve injetar atributo');
    assert.ok(html.includes('&quot;'), 'aspas devem ser escapadas');
  });

  it('mantém scene number normal', () => {
    const result = Fountain.parse('INT. CASA - DIA #1A#');
    assert.ok(result.html.script.includes('id="1A"'));
  });
});
