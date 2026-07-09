const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadI18n } = require('./helpers');

loadI18n();

describe('i18n', () => {
  it('returns key when translation exists', () => {
    const result = _('tb_new');
    assert.equal(result, 'Novo');
  });

  it('returns key as fallback when missing', () => {
    const result = _('chave_inexistente');
    assert.equal(result, 'chave_inexistente');
  });

  it('replaces {n} placeholder', () => {
    const result = _('stat_cenas', 5);
    assert.ok(result.includes('5'));
  });

  it('has matching PT and EN key counts', () => {
    const ptCount = Object.keys(i18n['pt-BR']).length;
    const enCount = Object.keys(i18n.en).length;
    assert.equal(ptCount, enCount, 'PT and EN must have same key count');
  });

  it('has all EN keys in PT', () => {
    const ptKeys = new Set(Object.keys(i18n['pt-BR']));
    const enKeys = Object.keys(i18n.en);
    const missing = enKeys.filter(k => !ptKeys.has(k));
    assert.equal(missing.length, 0, 'EN keys missing from PT: ' + missing.join(', '));
  });

  it('has all PT keys in EN', () => {
    const enKeys = new Set(Object.keys(i18n.en));
    const ptKeys = Object.keys(i18n['pt-BR']);
    const missing = ptKeys.filter(k => !enKeys.has(k));
    assert.equal(missing.length, 0, 'PT keys missing from EN: ' + missing.join(', '));
  });
});
