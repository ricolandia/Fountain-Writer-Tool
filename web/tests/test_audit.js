const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadI18n, loadAppFunction, loadAppMethod } = require('./helpers');

loadI18n();
loadAppFunction('mergeBackups');
loadAppMethod('_sceneListSignature');

describe('mergeBackups', () => {
  it('mescla local + importado e mantém os 5 mais recentes', () => {
    const local = [1, 2, 3, 4, 5].map(t => ({ time: t, text: 'l' + t, name: 'r' }));
    const imported = [{ time: 5, text: 'l5', name: 'r' }, { time: 6, text: 'i6', name: 'r' }];
    const m = mergeBackups(local, imported, 5);
    assert.equal(m.length, 5);
    assert.deepEqual(m.map(b => b.time), [2, 3, 4, 5, 6]);
  });

  it('não duplica o mesmo backup (time + nome)', () => {
    const a = [{ time: 10, name: 'roteiro' }];
    const m = mergeBackups(a, [{ time: 10, name: 'roteiro' }], 5);
    assert.equal(m.length, 1);
  });

  it('ignora entradas inválidas e aceita listas vazias', () => {
    assert.equal(mergeBackups([{ time: 1 }], [null, {}, { time: 'x' }], 5).length, 1);
    assert.equal(mergeBackups(null, null, 5).length, 0);
    assert.equal(mergeBackups([], [], 5).length, 0);
  });
});

describe('_sceneListSignature (B4)', () => {
  function makeApp() {
    return {
      sceneView: 'list', sceneColors: {}, _sceneActMap: {}, beats: [],
      getLineMarks: () => ({}),
      getActs: () => ({ 'Ato 1': [], 'Ato 2': [] }),
      _findBeatForScene: () => null,
    };
  }
  const sig = (app, scenes) => globalThis._sceneListSignature.call(app, scenes);

  it('muda quando a cena (linha/rótulo) muda', () => {
    const app = makeApp();
    assert.notEqual(sig(app, [{ line: 0, label: 'INT. A' }]), sig(app, [{ line: 0, label: 'INT. B' }]));
    assert.notEqual(sig(app, [{ line: 0, label: 'INT. A' }]), sig(app, [{ line: 4, label: 'INT. A' }]));
  });

  it('muda quando cor, marca, ato ou trama mudam', () => {
    const app = makeApp();
    const scenes = [{ line: 0, label: 'INT. A' }];
    const base = sig(app, scenes);
    app.sceneColors = { 0: '#fff' };
    assert.notEqual(base, sig(app, scenes));
    app.sceneColors = {};
    app._sceneActMap = { 0: 'Ato 2' };
    assert.notEqual(base, sig(app, scenes));
    app._sceneActMap = {};
    app.getLineMarks = () => ({ 0: '!' });
    assert.notEqual(base, sig(app, scenes));
    app.getLineMarks = () => ({});
    app._findBeatForScene = () => ({ plotline: 'B', desc: 'x' });
    assert.notEqual(base, sig(app, scenes));
  });

  it('muda ao alternar lista/corkboard e ao mudar os atos', () => {
    const app = makeApp();
    const scenes = [{ line: 0, label: 'INT. A' }];
    const base = sig(app, scenes);
    app.sceneView = 'corkboard';
    assert.notEqual(base, sig(app, scenes));
    app.sceneView = 'list';
    app.getActs = () => ({ 'Ato 1': [], 'Ato 2': [], 'Ato 3': [] });
    assert.notEqual(base, sig(app, scenes));
  });

  it('é estável quando nada muda', () => {
    const app = makeApp();
    const scenes = [{ line: 0, label: 'INT. A' }, { line: 3, label: 'EXT. B' }];
    assert.equal(sig(app, scenes), sig(app, scenes));
  });
});
