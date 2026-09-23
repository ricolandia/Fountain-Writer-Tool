const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadGuessType, loadAppMethod } = require('./helpers');

loadGuessType();
loadAppMethod('getSceneBlocks');
loadAppMethod('_remapAnchorsByLineMap');
loadAppMethod('moveScene');

/* Fake mínimo do objeto app: só o que moveScene toca. */
function makeApp(text) {
  return {
    editor: {
      value: text, scrollTop: 0, selectionStart: 0, selectionEnd: 0,
      focus() {}, setSelectionRange(a, b) { this.selectionStart = a; this.selectionEnd = b; },
    },
    beats: [],
    sceneColors: {},
    _lineMarks: {},
    _prevText: null,
    _removed: [],
    _guess: (text, prev) => globalThis.guessType(text, prev),
    getSceneBlocks: globalThis.getSceneBlocks,
    _remapAnchorsByLineMap: globalThis._remapAnchorsByLineMap,
    _findBeatForScene: () => null,
    getActs: () => ({}),
    saveActs() {},
    saveBeats() {},
    getLineMarks() { return this._lineMarks; },
    saveLineMarks(m) { this._lineMarks = m; },
    update() {},
    updateScenes() {},
    syncBeatsFromScenes() {},
    renderBeats() {},
    _setEditorValue(v) { this.editor.value = v; },
  };
}

const SCRIPT = [
  'FADE IN:',
  '',
  'INT. A - DIA',
  '',
  'Ação A.',
  '',
  'INT. B - DIA',
  '',
  'Ação B.',
  '',
  'INT. C - DIA',
  '',
  'Ação C.',
].join('\n');

describe('moveScene (drag reorder de cenas)', () => {
  it('move a última cena para o começo, preservando o preâmbulo', () => {
    const app = makeApp(SCRIPT);
    globalThis.moveScene.call(app, 10, 2);
    const out = app.editor.value;
    assert.ok(out.startsWith('FADE IN:\n\nINT. C - DIA'), 'preâmbulo preservado e C primeiro');
    assert.ok(out.indexOf('INT. C') < out.indexOf('INT. A'));
    assert.ok(out.indexOf('INT. A') < out.indexOf('INT. B'));
    assert.ok(!out.includes('\n\n\n'), 'não deve sobrar linha em branco extra');
  });

  it('move a primeira cena para o meio (antes da última)', () => {
    const app = makeApp(SCRIPT);
    globalThis.moveScene.call(app, 2, 10);
    const out = app.editor.value;
    assert.ok(out.indexOf('INT. B') < out.indexOf('INT. A'));
    assert.ok(out.indexOf('INT. A') < out.indexOf('INT. C'));
    assert.ok(out.startsWith('FADE IN:\n\nINT. B'), 'preâmbulo preservado');
  });

  it('não perde conteúdo de cena', () => {
    const app = makeApp(SCRIPT);
    globalThis.moveScene.call(app, 10, 2);
    for (const s of ['INT. A - DIA', 'Ação A.', 'INT. B - DIA', 'Ação B.', 'INT. C - DIA', 'Ação C.', 'FADE IN:']) {
      assert.ok(app.editor.value.includes(s), 'perdeu: ' + s);
    }
  });

  it('reaponta o scene_ref dos beats para a nova linha', () => {
    const app = makeApp(SCRIPT);
    app.beats = [{ title: 'INT. C - DIA', act: 'Ato 1', scene_ref: 'INT. C - DIA|L10', auto: true }];
    globalThis.moveScene.call(app, 10, 2);
    assert.equal(app.beats[0].scene_ref, 'INT. C - DIA|L2');
  });

  it('não faz nada com menos de 2 cenas', () => {
    const app = makeApp('FADE IN:\n\nINT. A - DIA\n\nAção.');
    const before = app.editor.value;
    globalThis.moveScene.call(app, 2, 2);
    assert.equal(app.editor.value, before);
  });
});
