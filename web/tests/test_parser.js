const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadFountainParser } = require('./helpers');

loadFountainParser();

describe('Fountain parser', () => {
  it('parses scene heading', () => {
    const result = Fountain.parse('INT. CASA - DIA');
    assert.ok(result.html.script.includes('CASA'));
  });

  it('parses character and dialogue', () => {
    const input = 'INT. CASA - DIA\n\nJOÃO\nOlá, mundo!';
    const result = Fountain.parse(input);
    assert.ok(result.html.script.includes('JOÃO'));
    assert.ok(result.html.script.includes('Olá'));
  });

  it('parses transition', () => {
    const result = Fountain.parse('CUT TO:');
    assert.ok(result.html.script.length > 0);
  });

  it('parses parenthetical', () => {
    const result = Fountain.parse('INT. CASA\n\nJOÃO\n(chateado)\nQue pena.');
    assert.ok(result.html.script.includes('chateado'));
  });

  it('parses dual dialogue', () => {
    const input = 'INT. CASA\n\nJOÃO ^\nFala um.\n\nMARIA ^\nFala dois.';
    const result = Fountain.parse(input);
    assert.ok(result.html.script.includes('dual-dialogue') || result.html.script.includes('MARIA'));
  });

  it('parses force character with @', () => {
    const result = Fountain.parse('INT. CASA\n\n@JOÃO SILVA\nFala.');
    assert.ok(result.html.script.includes('JOÃO'));
  });

  it('parses force action with !', () => {
    const result = Fountain.parse('!Barulho alto.');
    assert.ok(result.html.script.includes('Barulho'));
  });

  it('ignores boneyard comments', () => {
    const result = Fountain.parse('INT. CASA - DIA\n/* ignorado */\n\nJOÃO\nFala.');
    assert.ok(!result.html.script.includes('ignorado'));
  });

  it('handles synopsis', () => {
    const result = Fountain.parse('INT. CASA - DIA\n= resumo\n\nJOÃO\nFala.');
    assert.ok(result.html.script.includes('Fala'));
  });

  it('handles page breaks', () => {
    const result = Fountain.parse('INT. CASA - DIA\n===\nINT. QUARTO - DIA');
    assert.ok(result.html.script.length > 0);
  });
});
