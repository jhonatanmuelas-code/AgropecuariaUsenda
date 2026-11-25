/*
 * Guarda los archivos de la app de ventas en el celular para que abra sin internet.
 * Cuando hay señal, baja la versión nueva por detrás: se ve la próxima vez que se abra.
 * Solo toca los archivos de la app de ventas; la página de pedidos (pedido.html) pasa directo.
 * Si cambia la lista de archivos, suba el número de VERSION.
 */
var VERSION = 'usenda-2';
var ARCHIVOS = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
var RUTAS = ARCHIVOS.map(function (a) { return new URL(a, self.location.href).pathname; });

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  var url = new URL(req.url);
  // Lo que va a la hoja (Apps Script), las fuentes y cualquier otra página pasan directo.
  if (req.method !== 'GET' || url.origin !== self.location.origin || RUTAS.indexOf(url.pathname) < 0) return;
  var esIndex = url.pathname === RUTAS[0] || url.pathname === RUTAS[1];
  var clave = esIndex ? './index.html' : req;
  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(clave, { ignoreSearch: true }).then(function (guardado) {
        var red = fetch(req).then(function (resp) {
          if (resp && resp.ok) cache.put(clave, resp.clone());
          return resp;
        });
        if (guardado) { e.waitUntil(red.catch(function () {})); return guardado; }
        return red;
      });
    })
  );
});
