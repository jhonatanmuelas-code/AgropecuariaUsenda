/*
 * Guarda los archivos de la app en el celular para que abra sin internet.
 * Cuando hay señal, baja la versión nueva por detrás: se ve la próxima vez que se abra.
 * Si cambia la lista de archivos, suba el número de VERSION.
 */
var VERSION = 'usenda-1';
var ARCHIVOS = ['./', './index.html', './config.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

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
  // Solo los archivos de la app. Lo que va a la hoja (Apps Script) y las fuentes pasan directo.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (guardado) {
        var dePagina = req.mode === 'navigate';
        var red = fetch(req).then(function (resp) {
          if (resp && resp.ok) cache.put(dePagina ? './index.html' : req, resp.clone());
          return resp;
        }).catch(function () {
          return guardado || (dePagina ? cache.match('./index.html') : undefined);
        });
        if (guardado) { e.waitUntil(red.catch(function () {})); return guardado; }
        if (dePagina) {
          return cache.match('./index.html').then(function (idx) {
            if (idx) { e.waitUntil(red.catch(function () {})); return idx; }
            return red;
          });
        }
        return red;
      });
    })
  );
});
