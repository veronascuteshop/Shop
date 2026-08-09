/* =============================================================================
   sw.js — Service Worker de Verona's Cute Shop
   Hace que la web se pueda instalar como app y que funcione sin internet.

   Estrategia: PRIMERO INTERNET, y si no hay, lo guardado.
   Así los cambios que publiques se ven de inmediato y, sin señal, la app
   sigue abriendo con la última versión que el cliente vio.

   ⚠️ Si cambias archivos, sube también este archivo con el número CACHE
      aumentado (v2, v3…) para limpiar lo viejo.
   ============================================================================= */
"use strict";

var CACHE = "verona-v8-20260809";

var SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./styles.css",
  "./admin.css",
  "./main.js",
  "./admin.js",
  "./lib/manifest.js",
  "./lib/store.js",
  "./lib/tee.js",
  "./lib/pwa.js",
  "./lib/github.js",
  "./lib/gsap.min.js",
  "./lib/ScrollTrigger.min.js",
  "./manifest.webmanifest",
  "./admin.webmanifest",
  "./assets/favicon.svg",
  "./assets/logo.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/admin-icon-192.png",
  "./assets/admin-icon-512.png"
];

/* -------------------------------------------------------------- instalación */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // uno por uno: si algún archivo falla, la instalación no se rompe
      return Promise.all(SHELL.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

/* ---------------------------------------------------------------- activación */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* -------------------------------------------------------------------- fetch */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  var sameOrigin = url.origin === self.location.origin;

  /* Tipografías y recursos externos: primero lo guardado (casi nunca cambian) */
  if (!sameOrigin) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  /* Las páginas y el código se piden siempre frescos, saltando el caché del
     navegador. Así, apenas publicas un cambio, se ve enseguida y nadie tiene
     que hacer Ctrl+Shift+R. Las imágenes sí se siguen guardando (pesan y casi
     nunca cambian). */
  var siempreFresco = req.mode === "navigate" ||
    /\.(html|js|css|webmanifest|json)$/.test(url.pathname) ||
    url.pathname === "/" || /\/$/.test(url.pathname);

  var pedido = req;
  if (siempreFresco) {
    try {
      // las peticiones de navegación no se pueden clonar: se rehacen desde la URL
      pedido = (req.mode === "navigate")
        ? new Request(url.href, { cache: "reload", credentials: "same-origin", redirect: "follow" })
        : new Request(req, { cache: "reload" });
    } catch (e) { pedido = req; }
  }

  /* Propio: primero internet, si falla lo guardado */
  e.respondWith(
    fetch(pedido).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req).then(function (hit) {
        if (hit) return hit;
        if (req.mode === "navigate") {
          return caches.match("./index.html").then(function (idx) {
            return idx || new Response(
              "<h1 style='font-family:sans-serif;padding:2rem'>Sin conexión ✿</h1>" +
              "<p style='font-family:sans-serif;padding:0 2rem'>Vuelve a intentarlo cuando tengas internet.</p>",
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            );
          });
        }
        return new Response("", { status: 504, statusText: "Sin conexión" });
      });
    })
  );
});

/* Permite que la página pida activar una versión nueva al instante */
self.addEventListener("message", function (e) {
  if (e.data === "skip-waiting") self.skipWaiting();
});
