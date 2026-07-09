const fs = require('fs');
const path = require('path');

const WEB_JS = path.join(__dirname, '..', 'js');

function loadFileAndExport(file, replacements) {
  let code = fs.readFileSync(path.join(WEB_JS, file), 'utf-8');
  if (replacements) {
    for (const [from, to] of Object.entries(replacements)) {
      code = code.replace(new RegExp(from, 'm'), to);
    }
  }
  eval(code);
}

function loadFountainParser() {
  if (typeof globalThis.Fountain !== 'undefined') return;
  loadFileAndExport('fountain-parser.js', {
    '^const Fountain =': 'globalThis.Fountain =',
  });
}

function loadI18n() {
  if (typeof globalThis.i18n !== 'undefined') return;
  loadFileAndExport('i18n.js', {
    '^const i18n =': 'globalThis.i18n =',
    '^const structureOpts =': 'globalThis.structureOpts =',
    '^let lang =': 'globalThis.lang =',
    '^function _\\(': 'globalThis._ = function _(',
  });
}

function loadGuessType() {
  loadFountainParser();
  if (typeof globalThis.guessType !== 'undefined' && typeof globalThis.Fountain?.regex !== 'undefined') return;
  const appCode = fs.readFileSync(path.join(WEB_JS, 'app.js'), 'utf-8');
  // First load just the Fountain regex dependency
  loadFountainParser();
  // Extract and load guessType function + Fountain reference
  const guessCode = appCode.match(/function guessType\(text,\s*prev\)\s*\{[\s\S]*?\n\}/);
  if (guessCode) {
    const code = 'globalThis.Fountain = globalThis.Fountain;\n' + guessCode[0].replace('function guessType', 'globalThis.guessType = function guessType');
    eval(code);
  } else {
    throw new Error('Could not extract guessType');
  }
}

module.exports = { loadFountainParser, loadI18n, loadGuessType };
