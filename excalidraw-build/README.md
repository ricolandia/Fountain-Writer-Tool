# excalidraw-build — bundle do Quadro (Excalidraw)

Gera o bundle usado pelo Quadro de Planejamento: `web/lib/excalidraw-embed.js`.

> **A fonte da verdade é `src/index.js`.** Tudo que a produção precisa está
> nele: a prop `excalidrawAPI` (expõe `window.__exAPI`), o protocolo
> `GET_SCENE` / `GET_SCENE_META` / `LOAD_SCENE`, o carregamento de fontes com
> o "nudge" de `loadingdone` (sem ele os textos não aparecem) e a
> normalização dos elementos do `.fountain.json`.
>
> O bundle antigo era gerado aqui e **patchado à mão** (prop `__exAPI`,
> publicPath `./lib/`, ponte anexada) — um rebuild perdia as correções. Isso
> acabou: o build reproduz a produção.

## Rebuild

```bash
cd excalidraw-build
bun build.js          # ou: node build.js  (esbuild via npm install)
# gera dist/excalidraw-embed.js
cp dist/excalidraw-embed.js ../web/lib/excalidraw-embed.js
```

O caminho dos assets (`fontes`, `locales`, `vendor-*.js`) é definido em
`web/index.excalidraw.html`:

```html
<script>window.EXCALIDRAW_ASSET_PATH = './lib/';</script>
```

Os assets ficam em `web/lib/excalidraw-assets/` e vêm do pacote:
`node_modules/@excalidraw/excalidraw/dist/excalidraw-assets/`. Só precisam
ser recopiados se a versão do pacote mudar:

```bash
cp -r node_modules/@excalidraw/excalidraw/dist/excalidraw-assets/* ../web/lib/excalidraw-assets/
```

## Validar (obrigatório após um rebuild)

```bash
cd .. && python3 serve.py   # em outro terminal
google-chrome --headless=new --disable-gpu --no-sandbox \
  --virtual-time-budget=55000 --dump-dom \
  http://localhost:8000/web/tests/browser-smoke-board.html | grep -E "PASS|FAIL"
```

O smoke cobre: lazy load, `LOAD_SCENE`, seletor de modelos, **texto
renderizado no canvas** (regressão do cache de formas/fontes) e a captura da
cena. Todos os checks precisam passar.

## Versão do Excalidraw

`@excalidraw/excalidraw` **0.17.6** (fixado no `package.json`). Subir a versão
exige revisar a ponte: nesta versão a API é `updateScene`/`getSceneElements`
(`importScene`/`exportScene` não existem) e o app só redesenha textos no
evento `loadingdone`.
