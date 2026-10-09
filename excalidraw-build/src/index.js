import React from 'react';
import { createRoot } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';

/* Fonte ↔ Excalidraw — fonte da verdade do bundle (web/lib/excalidraw-embed.js).
 *
 * IMPORTANTE: tudo que a produção precisa está AQUI. O bundle antigo era
 * gerado por este build e depois PATCHADO à mão (prop __exAPI + ponte com a
 * API correta) — um rebuild perdia as correções. Agora o build reproduz a
 * produção: use a prop `excalidrawAPI` (a API real da versão 0.17.6 usa
 * updateScene/getSceneElements; importScene/exportScene não existem) e
 * defina window.EXCALIDRAW_ASSET_PATH no index.excalidraw.html (em vez de
 * patch no publicPath do webpack).
 *
 * Rebuild:  bun build.js   (ou node build.js)  →  copie dist/excalidraw-embed.js
 * para web/lib/ e valide com os smoke tests (web/tests/browser-smoke-board.html).
 */

const FONT_FAMILIES = { 1: 'Virgil', 2: 'Helvetica', 3: 'Cascadia', 4: 'Assistant' };

function capture(api) {
  return {
    elements: api.getSceneElementsIncludingDeleted
      ? api.getSceneElementsIncludingDeleted()
      : api.getSceneElements(),
    appState: api.getAppState(),
    files: api.getFiles(),
  };
}

/* Hash barato da cena (comprimento + somas de versões) para o app saber se
 * algo mudou sem receber a cena inteira a cada polling. */
function sceneHash(api) {
  const els = api.getSceneElementsIncludingDeleted
    ? api.getSceneElementsIncludingDeleted()
    : api.getSceneElements();
  let versions = 0;
  let updated = 0;
  for (let i = 0; i < els.length; i++) {
    versions += (els[i].version || 0) + (els[i].versionNonce || 0);
    updated += (els[i].updated || 0) % 100000;
  }
  return els.length + ':' + versions + ':' + updated;
}

/* Excalidraw 0.17.6 só desenha texto depois que a fonte está carregada
 * (checa document.fonts.check e espera o evento 'loadingdone'). Numa cena
 * inserida via updateScene nada dispara o load das fontes, então os textos
 * ficam invisíveis até o usuário mexer em algo (ex.: trocar o tamanho da
 * fonte). Aqui forçamos o load das famílias usadas e disparamos o evento
 * 'loadingdone' sintético, que faz o app invalidar o cache de formas e
 * re-renderizar os textos. */
function loadFontsAndRefresh(elements) {
  try {
    if (!document.fonts || !document.fonts.load) return;
    const used = {};
    (elements || []).forEach((el) => {
      if (el && el.type === 'text' && el.fontFamily) used[el.fontFamily] = true;
    });
    const loads = Object.keys(used).map((f) => {
      const name = FONT_FAMILIES[f] || 'Virgil';
      try { return document.fonts.load('16px "' + name + '"'); } catch (err) { return Promise.resolve(); }
    });
    try { loads.push(document.fonts.load('16px "Virgil"')); } catch (err) { /* segue */ }
    const refresh = () => { try { if (window.__exAPI) window.__exAPI.refresh(); } catch (err) { /* segue */ } };
    Promise.all(loads).then(refresh).catch(refresh);

    let nudgeSeq = 0;
    const nudge = () => {
      try {
        // família única a cada disparo: o app ignora o evento se a face já
        // estiver no set de fontes carregadas (early-return), e o primeiro
        // disparo pode chegar antes das formas serem cacheadas.
        const dummy = { family: 'FonteRefresh' + (++nudgeSeq) + Date.now(), style: 'normal', weight: '400' };
        const ev = document.createEvent('Event');
        ev.initEvent('loadingdone', false, false);
        ev.fontfaces = [dummy];
        document.fonts.dispatchEvent(ev);
      } catch (err) { /* silencioso */ }
    };
    setTimeout(nudge, 120);
    setTimeout(nudge, 500);
    setTimeout(nudge, 1000);
    setTimeout(refresh, 1400);
    setTimeout(nudge, 1800);
    setTimeout(nudge, 3000);
  } catch (err) { /* silencioso */ }
}

/* Normaliza os elementos do .fountain.json (sem id/seed/version do Excalidraw),
 * aplica o appState salvo com sanitização e re-renderiza os textos. */
function loadScene(api, scene) {
  const rawElements = (scene && scene.elements) || [];
  const elements = rawElements.map((el, i) => {
    const c = Object.assign({}, el);
    if (!c.id) c.id = 'el-' + i + '-' + Math.random().toString(36).slice(2, 7);
    if (c.seed === undefined) c.seed = Math.floor(Math.random() * 100000);
    if (c.version === undefined) c.version = 1;
    if (c.versionNonce === undefined) c.versionNonce = 1;
    if (c.isDeleted === undefined) c.isDeleted = false;
    if (c.groupIds === undefined) c.groupIds = [];
    if (c.updated === undefined) c.updated = Date.now();
    return c;
  });
  const savedAppState = (scene && scene.appState) || {};
  // Sanitiza: remove campos do appState salvo que quebram o Excalidraw
  // (collaborators deve ser array; outras chaves de versão antiga).
  delete savedAppState.collaborators;
  delete savedAppState.collaboratorsMap;
  const mergedState = Object.assign({}, api.getAppState(), savedAppState);
  if (!Array.isArray(mergedState.collaborators)) {
    mergedState.collaborators = [];
  }
  api.updateScene({ elements, appState: mergedState, commitToHistory: true });
  loadFontsAndRefresh(elements);
}

function App() {
  const [theme, setTheme] = React.useState('light');
  const apiRef = React.useRef(null);

  React.useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');

    const handleMessage = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      const api = window.__exAPI || apiRef.current;
      if (!api) return;
      try {
        if (e.data.type === 'GET_SCENE') {
          window.parent.postMessage({ type: 'SCENE_DATA', scene: capture(api), hash: sceneHash(api) }, '*');
        } else if (e.data.type === 'GET_SCENE_META') {
          window.parent.postMessage({ type: 'SCENE_META', hash: sceneHash(api) }, '*');
        } else if (e.data.type === 'LOAD_SCENE') {
          loadScene(api, e.data.scene);
          window.parent.postMessage({ type: 'SCENE_DATA', scene: capture(api), hash: sceneHash(api) }, '*');
        } else if (e.data.type === 'SET_THEME') {
          setTheme(e.data.theme);
        }
      } catch (err) { /* silencioso */ }
    };

    window.addEventListener('message', handleMessage);
    window.parent.postMessage({ type: 'EXCALIDRAW_READY' }, '*');
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return React.createElement(Excalidraw, {
    theme,
    excalidrawAPI: (api) => { window.__exAPI = api; apiRef.current = api; },
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const root = createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
});
