/* Fonte — service worker
 *
 * Estratégia:
 * 1) PRECACHE: lista pequena e conhecida (o "app shell" do Fonte em si),
 *    baixada e guardada inteira já na instalação — funciona offline mesmo
 *    no primeiro uso sem internet (exceto a primeiríssima visita, que
 *    precisa estar online pelo menos uma vez para instalar o service worker).
 *    O bundle do Excalidraw (5,5 MB) NÃO entra aqui: o Quadro é lazy e o
 *    bundle só vai para o cache runtime quando o usuário abre o Quadro.
 * 2) NETWORK-FIRST para documentos e app shell (propaga deploys na primeira
 *    visita, sem depender de bump manual de versão) e mantém offline.
 * 3) STALE-WHILE-REVALIDATE para os assets pesados (lib/ e templates/):
 *    resposta instantânea do cache com atualização em segundo plano — antes
 *    o network-first re-baixava os 5,5 MB do Quadro a cada carga.
 * 4) CACHE RUNTIME com chave normalizada: o cache-buster ?_=... usado ao
 *    recarregar o iframe do Quadro é removido, para não criar uma entrada
 *    de cache nova a cada abertura (e para o fallback offline casar).
 *
 * Ao mudar o app de forma que precise invalidar cache antigo, suba o número
 * da versão abaixo — isso força os clientes a buscarem tudo de novo.
 */
const VERSION = 'v6';
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
];

/* Normaliza a chave de cache removendo o parâmetro cache-buster (?_=...). */
function cacheKeyFor(req) {
  const url = new URL(req.url);
  if (url.searchParams.has('_')) {
    url.searchParams.delete('_');
    return url.href;
  }
  return req;
}

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

function storeInCache(key, res) {
  if (res && res.status === 200) {
    const copy = res.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(key, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  const key = cacheKeyFor(req);
  const path = new URL(req.url).pathname;
  const isDocument = req.mode === 'navigate' || req.destination === 'document';
  const isHeavyAsset = path.includes('/lib/') || path.includes('/templates/');

  // Assets pesados (bundle do Excalidraw, fontes, templates): cache primeiro,
  // rede em segundo plano. O `ignoreSearch` faz o iframe recarregado com
  // ?_=... casar com a entrada existente em vez de cair no fallback errado.
  if (!isDocument && isHeavyAsset) {
    event.respondWith(
      caches.match(key, { ignoreSearch: true }).then(cached => {
        const network = fetch(req)
          .then(res => storeInCache(key, res))
          .catch(() => cached || Response.error());
        return cached || network;
      })
    );
    return;
  }

  // Documentos e app shell: network-first (deploy vale na primeira visita);
  // offline cai no cache. O fallback de navegação só devolve o index.html
  // para a própria página do app — nunca para o iframe do Quadro (que tem
  // seu próprio index.excalidraw.html precacheado).
  event.respondWith(
    fetch(req).then(res => storeInCache(key, res)).catch(() =>
      caches.match(key, { ignoreSearch: true }).then(cached => {
        if (cached) return cached;
        if (isDocument && !path.includes('excalidraw')) return caches.match('./index.html');
        return Response.error();
      })
    )
  );
});
