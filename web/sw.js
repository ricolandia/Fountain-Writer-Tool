/* Fonte — service worker
 *
 * Estratégia:
 * 1) PRECACHE: lista pequena e conhecida (o "app shell" do Fonte em si).
 *    Baixada e guardada inteira já na instalação, então funciona offline
 *    mesmo no primeiro uso sem internet (exceto a primeiríssima visita, que
 *    precisa estar online pelo menos uma vez para instalar o service worker).
 * 2) NETWORK-FIRST: toda requisição tenta a rede primeiro e atualiza o cache
 *    runtime. Isso propaga deploys na primeira visita (sem depender de bump
 *    manual de versão) e mantém o app utilizável offline.
 * 3) RUNTIME CACHE: qualquer outro arquivo do mesmo domínio (cobre
 *    index.excalidraw.html e tudo que ele carregar — JS, fontes, ícones —
 *    sem precisar listar esses arquivos aqui).
 *
 * Ao mudar o app de forma que precise invalidar cache antigo, suba o número
 * da versão abaixo — isso força os clientes a buscarem tudo de novo.
 */
const VERSION = 'v5';
const CACHE_NAME = 'fountain-writer-' + VERSION;

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/app.css',
  './js/app.js',
  './js/fountain-parser.js',
  './js/i18n.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './index.excalidraw.html',
  './lib/excalidraw-embed.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names
          .filter(name => name.startsWith('fountain-writer-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Network-first: tenta a rede primeiro (propaga deploys na hora) e só cai
  // no cache se offline. Arquivos OK são gravados no cache runtime.
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req).then(cached => {
        if (cached) return cached;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      })
    )
  );
});
