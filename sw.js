/* =============================================================================
   sw.js — Service Worker de Verona's Cute Shop

   ⚠️ NO GUARDA NADA. A propósito.

   Antes este archivo guardaba una copia de la web para que funcionara sin
   internet. El problema: cuando algo fallaba al pedir la versión nueva
   (señal débil, un tropiezo de red, un tirón del sistema), servía la copia
   guardada… y algunos teléfonos se quedaban semanas mostrando un catálogo
   viejo sin que nadie se enterara.

   Para una tienda eso es inaceptable: es peor mostrar precios y productos
   equivocados que no mostrar nada. Así que este service worker sólo existe
   para que la web se pueda instalar como app: deja pasar cada petición a
   internet tal cual y borra cualquier copia que hubiera guardado antes.
   ============================================================================= */
"use strict";

var VERSION = "verona-v16-sin-cache";

/* Al instalarse, toma el control de inmediato */
self.addEventListener("install", function (e) {
  self.skipWaiting();
});

/* Al activarse, borra TODO lo que versiones anteriores hubieran guardado */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (nombres) {
        return Promise.all(nombres.map(function (n) { return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* Deja pasar todo a internet. Sin copias, sin sorpresas.
   El navegador de la persona sigue haciendo su propio caché normal, que
   respeta las cabeceras del servidor; eso es suficiente y es predecible. */
self.addEventListener("fetch", function (e) {
  // Sin respondWith: el navegador se encarga, exactamente como si no
  // existiera este archivo. Se mantiene el manejador porque los navegadores
  // lo exigen para permitir instalar la web como aplicación.
});

self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});
