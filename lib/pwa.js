/* =============================================================================
   pwa.js — Instalación como aplicación + service worker.
   Funciona igual en la tienda (index.html) y en el panel (admin.html).
   Sólo necesita que en la página haya:
     · <link rel="manifest" href="...">
     · uno o varios botones con  data-install
     · opcional: data-install-banner="tienda" para el aviso flotante
   ============================================================================= */
(function () {
  "use strict";

  var https = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
  var deferred = null;
  var DISMISS_KEY = "vcs_pwa_dismissed";
  var DAYS = 7;

  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(navigator.userAgent);

  function standalone() {
    return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) ||
      navigator.standalone === true;
  }

  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  /* ------------------------------------------------------------ service worker */
  function registerSW() {
    if (!("serviceWorker" in navigator) || !https) return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").then(function (reg) {
        // si hay una versión nueva esperando, la activamos enseguida
        if (reg.waiting) reg.waiting.postMessage("skip-waiting");
        reg.addEventListener("updatefound", function () {
          var nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", function () {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage("skip-waiting");
            }
          });
        });
      }).catch(function (e) { console.warn("[pwa] no se pudo registrar el service worker", e); });
    });
  }

  /* ------------------------------------------------------------------ botones */
  /* Los botones con data-install-always se ven siempre (abren las instrucciones
     si el navegador no ofrece instalación automática). El resto sólo aparecen
     cuando el navegador confirma que se puede instalar. */
  function showButtons(show) {
    $$("[data-install]").forEach(function (b) {
      b.hidden = b.hasAttribute("data-install-always") ? false : !show;
    });
  }
  function hideAll() {
    $$("[data-install]").forEach(function (b) { b.hidden = true; });
  }

  /* ----------------------------------------------------------- instrucciones */
  function instructions() {
    if (isIOS) {
      return {
        title: "Instalar en iPhone o iPad",
        steps: [
          "Abre esta página en <b>Safari</b> (no funciona desde Instagram ni Chrome).",
          "Toca el botón <b>Compartir</b> — el cuadrito con la flecha hacia arriba.",
          "Baja y elige <b>«Añadir a pantalla de inicio»</b>.",
          "Toca <b>Añadir</b>. ¡Listo! Queda como una app más."
        ]
      };
    }
    if (isAndroid) {
      return {
        title: "Instalar en Android",
        steps: [
          "Abre esta página en <b>Chrome</b>.",
          "Toca el menú <b>⋮</b> arriba a la derecha.",
          "Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.",
          "Confirma. ¡Listo! Queda con su iconito en el teléfono."
        ]
      };
    }
    return {
      title: "Instalar en la computadora",
      steps: [
        "Usa <b>Chrome</b>, <b>Edge</b> o <b>Brave</b>.",
        "Busca el icono de <b>instalar</b> (una pantallita con una flecha) al final de la barra de direcciones.",
        "También está en el menú <b>⋮</b>, opción <b>Instalar</b>.",
        "Confirma y se abre en su propia ventana."
      ]
    };
  }

  function openHelp() {
    var info = instructions();
    var back = document.createElement("div");
    back.className = "pwa-modal";
    back.innerHTML =
      '<div class="pwa-card" role="dialog" aria-modal="true" aria-label="' + info.title + '">' +
        '<button class="pwa-x" type="button" aria-label="Cerrar">✕</button>' +
        '<span class="pwa-ico" aria-hidden="true">📲</span>' +
        "<h3>" + info.title + "</h3>" +
        "<ol>" + info.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>" +
        '<button class="btn btn-primary btn-block pwa-ok" type="button">Entendido ✿</button>' +
      "</div>";
    document.body.appendChild(back);
    // rAF + temporizador: si el navegador está ahorrando energía, igual se abre
    requestAnimationFrame(function () { back.classList.add("is-open"); });
    setTimeout(function () { back.classList.add("is-open"); }, 60);
    function close() {
      back.classList.remove("is-open");
      setTimeout(function () { back.remove(); }, 300);
    }
    back.addEventListener("click", function (e) {
      if (e.target === back || e.target.closest(".pwa-x") || e.target.closest(".pwa-ok")) close();
    });
    document.addEventListener("keydown", function esc(e) {
      if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
    });
  }

  /* --------------------------------------------------------------- instalar */
  function install() {
    if (!deferred) { openHelp(); return; }
    deferred.prompt();
    deferred.userChoice.then(function (res) {
      if (res && res.outcome === "accepted") { hideAll(); hideBanner(); }
      deferred = null;
    }).catch(function () { deferred = null; });
  }

  /* ----------------------------------------------------------------- banner */
  var banner = null;

  function dismissedRecently() {
    try {
      var t = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
      return t && (Date.now() - t) < DAYS * 864e5;
    } catch (e) { return false; }
  }

  function hideBanner() {
    if (!banner) return;
    banner.classList.remove("is-on");
    setTimeout(function () { if (banner) { banner.remove(); banner = null; } }, 350);
  }

  function showBanner() {
    var host = document.querySelector("[data-install-banner]");
    if (!host || banner || standalone() || dismissedRecently()) return;
    if (!deferred && !isIOS) return;   // en navegadores que no permiten instalar, no molestamos

    var label = host.getAttribute("data-install-banner") || "esta página";
    banner = document.createElement("div");
    banner.className = "pwa-banner";
    banner.innerHTML =
      '<img src="' + (host.getAttribute("data-install-icon") || "assets/icon-192.png") + '" alt="" class="pwa-banner-ico" />' +
      '<div class="pwa-banner-txt"><b>Instala ' + label + '</b><small>Ábrela desde tu pantalla de inicio, sin buscar el link</small></div>' +
      '<button class="btn btn-primary btn-sm" type="button" data-pwa-go>Instalar</button>' +
      '<button class="pwa-banner-x" type="button" aria-label="Ahora no">✕</button>';
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add("is-on"); });
    setTimeout(function () { if (banner) banner.classList.add("is-on"); }, 60);

    banner.addEventListener("click", function (e) {
      if (e.target.closest("[data-pwa-go]")) { install(); return; }
      if (e.target.closest(".pwa-banner-x")) {
        try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch (_) {}
        hideBanner();
      }
    });
  }

  /* ------------------------------------------------------------------ inicio */
  function boot() {
    registerSW();

    if (standalone()) { hideAll(); return; }
    showButtons(isIOS);   // en iOS nunca hay evento: mostramos el botón igual

    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      deferred = e;
      showButtons(true);
      setTimeout(showBanner, 3500);
    });

    window.addEventListener("appinstalled", function () {
      deferred = null; hideAll(); hideBanner();
    });

    document.addEventListener("click", function (e) {
      if (e.target.closest("[data-install]")) { e.preventDefault(); install(); }
    });

    if (isIOS) setTimeout(showBanner, 3500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.VCS_PWA = { install: install, help: openHelp, standalone: standalone };
})();
