const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadI18n } = require('./helpers');
const fs = require('fs');
const path = require('path');

loadI18n();

describe('Structure options', () => {
  it('covers all 11 selects in HTML', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
    const estrutura = html.slice(html.indexOf('tab-estrutura'));
    const selects = estrutura.match(/<select id="(tp-[^"]+)"/g) || [];
    const selectIds = selects.map(s => s.match(/tp-[^"]+/)[0]);
    const mapped = new Set(Object.keys(structureOpts));
    const missing = selectIds.filter(id => !mapped.has(id));
    assert.equal(missing.length, 0, 'Missing in structureOpts: ' + missing.join(', '));
  });

  it('every option value has a translation', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
    const estrutura = html.slice(html.indexOf('tab-estrutura'));
    const blocks = estrutura.match(/<select id="(tp-[^"]+)">(.*?)<\/select>/g) || [];
    const errors = [];

    blocks.forEach(block => {
      const idMatch = block.match(/id="(tp-[^"]+)"/);
      if (!idMatch) return;
      const id = idMatch[1];
      const opts = structureOpts[id];
      if (!opts) { errors.push(id + ' not in structureOpts'); return; }
      const values = block.match(/value="([^"]+)"/g) || [];
      values.forEach(v => {
        const val = v.match(/"([^"]+)"/)[1];
        if (!val) return;
        const found = opts.find(p => p[0] === val);
        if (!found) errors.push(id + ': missing translation for "' + val + '"');
      });
    });

    assert.equal(errors.length, 0, errors.join('\n'));
  });

  it('all structureOpts entries are arrays of [pt, en] pairs', () => {
    Object.entries(structureOpts).forEach(([id, pairs]) => {
      assert.ok(Array.isArray(pairs), id + ' must be array');
      pairs.forEach((pair, i) => {
        assert.ok(Array.isArray(pair), id + '[' + i + '] must be array');
        assert.equal(pair.length, 2, id + '[' + i + '] must have [pt, en]');
        assert.ok(typeof pair[0] === 'string', id + '[' + i + '][0] must be string');
        assert.ok(typeof pair[1] === 'string', id + '[' + i + '][1] must be string');
      });
    });
  });

  it('all estrutura selects have value attributes', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
    const estrutura = html.slice(html.indexOf('tab-estrutura'));
    const blocks = estrutura.match(/<select id="(tp-[^"]+)">(.*?)<\/select>/g) || [];
    const errors = [];

    blocks.forEach(block => {
      const opts = block.match(/<option[^>]*>([^<]+)<\/option>/g) || [];
      opts.forEach(opt => {
        if (opt.includes('value=""') || opt.includes('value="—"')) return;
        if (!opt.includes('value=')) {
          const text = opt.match(/>([^<]+)</);
          errors.push('Option without value: "' + (text ? text[1] : '?') + '"');
        }
      });
    });

    assert.equal(errors.length, 0, errors.join('\n'));
  });
});
