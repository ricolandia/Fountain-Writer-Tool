const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TPL_DIR = path.join(__dirname, '..', 'templates');
const INDEX = path.join(__dirname, '..', 'index.html');

// templates.js é um script de navegador (window.FONTE_TEMPLATES)
globalThis.window = globalThis;
eval(fs.readFileSync(path.join(TPL_DIR, 'templates.js'), 'utf-8'));

describe('templates.js (modelos embutidos)', () => {
  const files = fs.readdirSync(TPL_DIR).filter(f => f.endsWith('.excalidraw')).sort();

  it('contém todos os .excalidraw do diretório (sem drift)', () => {
    assert.deepEqual(Object.keys(window.FONTE_TEMPLATES).sort(), files);
  });

  it('cada modelo tem elements não-vazio', () => {
    for (const [name, tpl] of Object.entries(window.FONTE_TEMPLATES)) {
      assert.ok(Array.isArray(tpl.elements) && tpl.elements.length > 0,
        name + ' sem elements');
    }
  });

  it('todo modelo do seletor no index.html existe no bundle', () => {
    const html = fs.readFileSync(INDEX, 'utf-8');
    const select = html.match(/<select id="excalidraw-template"[\s\S]*?<\/select>/);
    assert.ok(select, 'seletor de modelos não encontrado no index.html');
    const options = [...select[0].matchAll(/<option value="([^"]+\.excalidraw)"/g)].map(m => m[1]);
    assert.ok(options.length > 0, 'nenhum modelo no seletor');
    for (const opt of options) {
      assert.ok(window.FONTE_TEMPLATES[opt], 'seletor aponta para modelo ausente no bundle: ' + opt);
    }
  });
});
