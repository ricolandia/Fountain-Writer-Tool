/* Fonte — service worker
 *
 * Estratégia em duas camadas:
 * 1) PRECACHE: lista pequena e conhecida (o "app shell" do Fonte em si).
 *    Baixada e guardada inteira já na instalação, então funciona offline mesmo
 *    no primeiro uso sem internet (exceto a primeiríssima visita, que precisa
 *    estar online pelo menos uma vez para instalar o service worker).
 * 2) RUNTIME CACHE: qualquer outro arquivo do mesmo domínio (isso cobre
 *    index.excalidraw.html e tudo que ele carregar — JS, fontes, ícones —
 *    sem precisar listar esses arquivos aqui, já que não são conhecidos de
 *    antemão e podem mudar se o Excalidraw vendorizado for atualizado).
 *    Só fica disponível offline DEPOIS de ter sido aberto ao menos uma vez
 *    com internet — é o preço de não precisar manter uma lista manual.
 *
 * Ao mudar o app de forma que precise invalidar cache antigo, suba o número
 * da versão abaixo — isso força os clientes a buscarem tudo de novo.
 */
const VERSION = 'v1';
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

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);

      return cached || network;
    })
  );
});
