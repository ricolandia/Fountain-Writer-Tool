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

/* Extrai uma função nomeada do app.js por balanceamento de chaves (o regex
 * antigo parava no primeiro "}" de um bloco aninhado e quebrava ao refatorar
 * a função). */
function extractFunction(code, name) {
  const re = new RegExp('function ' + name + '\\s*\\(([^)]*)\\)\\s*\\{');
  const m = re.exec(code);
  if (!m) throw new Error('Could not extract ' + name);
  let depth = 0;
  const start = code.indexOf('{', m.index);
  for (let j = start; j < code.length; j++) {
    if (code[j] === '{') depth++;
    else if (code[j] === '}') {
      depth--;
      if (depth === 0) return code.slice(m.index, j + 1);
    }
  }
  throw new Error('Unbalanced braces extracting ' + name);
}

/* Carrega uma função global do app.js no escopo global (sem executar o
 * resto do arquivo, que depende do DOM). Dependências já devem ter sido
 * carregadas antes (Fountain, i18n, lang...). */
function loadAppFunction(name) {
  const appCode = fs.readFileSync(path.join(WEB_JS, 'app.js'), 'utf-8');
  const fn = extractFunction(appCode, name);
  const code = fn.replace('function ' + name, 'globalThis.' + name + ' = function ' + name);
  eval(code);
}

function loadGuessType() {
  loadFountainParser();
  if (typeof globalThis.guessType !== 'undefined' && typeof globalThis.Fountain?.regex !== 'undefined') return;
  loadAppFunction('guessType');
}

/* Extrai um MÉTODO do objeto app (ex.: "  moveScene(from, to) { ... }"). */
function extractMethod(code, name) {
  const re = new RegExp('\\n  ' + name + '\\s*\\(([^)]*)\\)\\s*\\{');
  const m = re.exec(code);
  if (!m) throw new Error('Could not extract method ' + name);
  let depth = 0;
  const start = code.indexOf('{', m.index);
  for (let j = start; j < code.length; j++) {
    if (code[j] === '{') depth++;
    else if (code[j] === '}') {
      depth--;
      if (depth === 0) return code.slice(m.index + 3, j + 1);
    }
  }
  throw new Error('Unbalanced braces extracting method ' + name);
}

function loadAppMethod(name) {
  const appCode = fs.readFileSync(path.join(WEB_JS, 'app.js'), 'utf-8');
  const fn = extractMethod(appCode, name);
  const code = fn.replace(/^(\w+)\s*\(([^)]*)\)\s*\{/, 'globalThis.$1 = function ($2) {');
  eval(code);
}

module.exports = { loadFountainParser, loadI18n, loadGuessType, loadAppFunction, loadAppMethod };
