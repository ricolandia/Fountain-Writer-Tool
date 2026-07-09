const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadGuessType } = require('./helpers');

loadGuessType();

describe('guessType', () => {
  it('detects blank lines', () => {
    assert.equal(guessType('', 'ACTION'), 'BLANK');
    assert.equal(guessType('   ', 'ACTION'), 'BLANK');
  });

  it('detects scene headings with dot prefix', () => {
    assert.equal(guessType('.CASA - DIA', 'ACTION'), 'SCENE');
    assert.equal(guessType('.PARQUE', 'ACTION'), 'SCENE');
    assert.equal(guessType('.CENA UM', 'ACTION'), 'SCENE');
  });

  it('detects character names (all caps)', () => {
    assert.equal(guessType('JOÃO', 'ACTION'), 'CHARACTER');
    assert.equal(guessType('MARIA SILVA', 'ACTION'), 'CHARACTER');
  });

  it('detects character with @ prefix', () => {
    assert.equal(guessType('@João Silva', 'ACTION'), 'CHARACTER');
  });

  it('detects dialogue after character', () => {
    assert.equal(guessType('Fala alguma coisa.', 'CHARACTER'), 'DIALOGUE');
    assert.equal(guessType('Outra fala.', 'DIALOGUE'), 'DIALOGUE');
  });

  it('detects parenthetical', () => {
    assert.equal(guessType('(sorrindo)', 'CHARACTER'), 'PARENTHETICAL');
  });

  it('detects transitions', () => {
    assert.equal(guessType('CUT TO:', 'ACTION'), 'TRANSITION');
    assert.equal(guessType('FADE OUT.', 'ACTION'), 'TRANSITION');
  });

  it('detects centered text', () => {
    assert.equal(guessType('> O FIM <', 'ACTION'), 'CENTER');
  });

  it('detects force action with !', () => {
    assert.equal(guessType('!Uma ação.', 'ACTION'), 'ACTION');
  });
});
