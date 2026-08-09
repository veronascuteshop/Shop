/* =============================================================================
   store.js — Capa de datos compartida por la tienda y el panel admin.
   Sin dependencias. Expone window.VCS.
   ============================================================================= */
(function () {
  "use strict";

  var K = {
    data: "vcs_data_v1",
    orders: "vcs_orders_v1",
    cart: "vcs_cart_v1",
    auth: "vcs_admin_ok"
  };

  /* ------------------------------------------------------------- utilidades */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function escHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function uid(prefix) {
    return (prefix || "id") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function orderCode() {
    var n = "";
    for (var i = 0; i < 4; i++) n += "0123456789".charAt(Math.floor(Math.random() * 10));
    return "VC-" + n;
  }

  function num(v, fallback) {
    var n = parseFloat(String(v).replace(",", "."));
    return isFinite(n) ? n : (fallback || 0);
  }

  /* --------------------------------------------------- lectura / escritura */
  function defaults() {
    return clone(window.__BRAND__ || {});
  }

  function read() {
    var base = defaults();
    var raw = null;
    try { raw = localStorage.getItem(K.data); } catch (e) { raw = null; }
    if (!raw) return base;
    try {
      var saved = JSON.parse(raw);
      // merge superficial por secciones: lo guardado manda
      ["settings", "categories", "products", "tees", "steps", "faqs"].forEach(function (k) {
        if (saved[k] == null) return;
        if (k === "settings" || k === "tees") {
          base[k] = Object.assign({}, base[k] || {}, saved[k]);
        } else {
          base[k] = saved[k];
        }
      });
      base.version = saved.version || base.version;
      return base;
    } catch (e) {
      console.warn("[store] datos locales corruptos, usando los de fábrica", e);
      return base;
    }
  }

  /* Canal para avisar a otras pestañas/ventanas abiertas del mismo navegador */
  var canal = null;
  try { canal = new BroadcastChannel("vcs-cambios"); } catch (e) { canal = null; }

  function avisar(tipo) {
    if (canal) { try { canal.postMessage({ tipo: tipo, cuando: Date.now() }); } catch (e) {} }
  }

  function alCambiar(fn) {
    if (canal) canal.addEventListener("message", function (e) { fn(e.data || {}); });
    // respaldo para navegadores sin BroadcastChannel
    window.addEventListener("storage", function (e) {
      if (e.key === K.data) fn({ tipo: "datos" });
    });
  }

  function write(data) {
    try {
      localStorage.setItem(K.data, JSON.stringify(data));
      avisar("datos");
      return { ok: true };
    } catch (e) {
      return { ok: false, error: quotaMessage(e) };
    }
  }

  function quotaMessage(e) {
    var s = String(e && e.name || e);
    if (s.indexOf("Quota") >= 0 || s.indexOf("QUOTA") >= 0 || s.indexOf("NS_ERROR_DOM_QUOTA") >= 0) {
      return "Se llenó el espacio del navegador. Elimina pedidos antiguos o usa fotos más livianas.";
    }
    return "No se pudo guardar: " + s;
  }

  function resetData() {
    try { localStorage.removeItem(K.data); } catch (e) {}
  }

  /* ------------------------------------------------------------- pedidos */
  function getOrders() {
    try { return JSON.parse(localStorage.getItem(K.orders) || "[]"); } catch (e) { return []; }
  }
  function setOrders(list) {
    try { localStorage.setItem(K.orders, JSON.stringify(list)); return { ok: true }; }
    catch (e) { return { ok: false, error: quotaMessage(e) }; }
  }
  function addOrder(order) {
    var list = getOrders();
    list.unshift(order);
    var res = setOrders(list);
    if (!res.ok) {
      // reintento sin imágenes de diseño para no perder el pedido
      order.items.forEach(function (it) { if (it.design) { it.design.preview = ""; } });
      list[0] = order;
      res = setOrders(list);
      if (res.ok) res.warning = "El pedido se guardó sin la imagen del diseño (espacio lleno).";
    }
    return res;
  }

  /* -------------------------------------------------------------- carrito */
  function getCart() {
    try { return JSON.parse(localStorage.getItem(K.cart) || "[]"); } catch (e) { return []; }
  }
  function setCart(list) {
    try { localStorage.setItem(K.cart, JSON.stringify(list)); return { ok: true }; }
    catch (e) { return { ok: false, error: quotaMessage(e) }; }
  }
  function clearCart() { setCart([]); }

  /* ---------------------------------------------------------------- dinero */
  function money(n, currency) {
    var c = currency || (read().settings || {}).currency || "$";
    var v = Math.round(num(n) * 100) / 100;
    var s = v.toFixed(2).replace(/\.00$/, "");
    return c + s;
  }

  /* -------------------------------------------------------------- imágenes */
  function mb(bytes) { return (bytes / 1048576).toFixed(1); }

  function esHeic(file) {
    return /hei[cf]/i.test(file.type || "") || /\.(heic|heif)$/i.test(file.name || "");
  }

  function mensajeFormato(file) {
    if (esHeic(file)) {
      return "Esa foto está en formato HEIC (el que usa el iPhone) y este navegador no lo entiende. " +
             "Solución rápida: en el iPhone entra en Ajustes → Cámara → Formatos → «Más compatible». " +
             "Las fotos que ya tienes puedes reenviártelas por WhatsApp y guardar esa copia: llega en JPG.";
    }
    var tipo = file.type || "desconocido";
    return "No se pudo abrir la imagen (tipo: " + tipo + ", " + mb(file.size) + " MB). " +
           "Prueba con una foto en JPG o PNG.";
  }

  /* Redimensiona y comprime una foto para que quepa en el navegador.
     Intenta primero createImageBitmap (rápido, aguanta fotos grandes y en
     iPhone entiende HEIC) y si falla, lo reintenta con el método clásico. */
  function readImage(file, maxSide, quality, cb) {
    if (!file) return cb("No hay archivo");

    var pareceImagen = /^image\//.test(file.type) ||
      /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(file.name || "");
    if (!pareceImagen) return cb("Ese archivo no parece una imagen");

    if (file.size > 30 * 1048576) {
      return cb("La foto pesa " + mb(file.size) + " MB y es demasiado grande. Usa una más liviana.");
    }

    var listo = false;
    function done(err, out) { if (!listo) { listo = true; cb(err, out); } }

    function procesar(fuente, w, h) {
      if (!w || !h) return done(mensajeFormato(file));
      var scale = Math.min(1, (maxSide || 1200) / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));
      var c = document.createElement("canvas");
      c.width = cw; c.height = ch;
      var ctx = c.getContext("2d");
      try {
        ctx.drawImage(fuente, 0, 0, cw, ch);
      } catch (e) { return done(mensajeFormato(file)); }

      /* WebP pesa como una cuarta parte y conserva la transparencia.
         Si el navegador no lo soporta, se usa el formato de siempre. */
      var conTransparencia = /png|webp|svg|avif/i.test(file.type || "");
      var out = "";
      try {
        out = c.toDataURL("image/webp", quality || 0.85);
        if (out.indexOf("data:image/webp") !== 0) out = "";
      } catch (e) { out = ""; }
      if (!out) {
        try {
          out = conTransparencia ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", quality || 0.85);
        } catch (e2) { return done("No se pudo procesar la imagen. Prueba con otra."); }
      }
      done(null, { dataUrl: out, width: cw, height: ch, ratio: cw / ch });
    }

    /* Plan B: <img> con un enlace temporal al archivo (sin cargarlo entero en memoria) */
    function viaEtiquetaImg() {
      var url;
      try { url = URL.createObjectURL(file); } catch (e) { return done("No se pudo leer el archivo"); }
      var img = new Image();
      img.onload = function () {
        procesar(img, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(url);
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        done(mensajeFormato(file));
      };
      img.src = url;
    }

    /* Plan A: decodificador nativo del navegador */
    if (typeof createImageBitmap === "function") {
      var intento;
      try { intento = createImageBitmap(file); } catch (e) { intento = null; }
      if (intento && intento.then) {
        intento.then(function (bmp) {
          procesar(bmp, bmp.width, bmp.height);
          if (bmp.close) bmp.close();
        }).catch(viaEtiquetaImg);
        return;
      }
    }
    viaEtiquetaImg();
  }

  /* ------------------------------------------------- quitar el fondo liso */
  /* Borra el fondo que rodea al dibujo (el blanco de alrededor), sin tocar
     los blancos de adentro —como la cinta del logo— porque sólo avanza
     desde los bordes hacia dentro mientras el color se parezca. */
  function quitarFondo(dataUrl, tolerancia, cb) {
    var img = new Image();
    img.onerror = function () { cb(null, dataUrl); };
    img.onload = function () {
      var w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h) return cb(null, dataUrl);
      var c = document.createElement("canvas");
      c.width = w; c.height = h;
      var ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);

      var d;
      try { d = ctx.getImageData(0, 0, w, h); } catch (e) { return cb(null, dataUrl); }
      var px = d.data;

      function color(i) { return [px[i], px[i + 1], px[i + 2]]; }
      function lejos(a, b) {
        return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
      }

      // referencia: las cuatro esquinas. Si no se parecen entre sí, no tocamos nada.
      var esquinas = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4].map(color);
      for (var e = 1; e < esquinas.length; e++) {
        if (lejos(esquinas[0], esquinas[e]) > 60) return cb(null, dataUrl);
      }
      var fondo = esquinas[0];
      var tol = tolerancia == null ? 90 : tolerancia;

      /* Recorrido desde los bordes. Se marca al ENCOLAR (no al sacar): así cada
         píxel entra una sola vez y la cola nunca se desborda, que si no el
         borrado se quedaba a medias en imágenes grandes. */
      var visto = new Uint8Array(w * h);
      var cola = new Int32Array(w * h);
      var fin = 0, ini = 0;
      function encolar(p) { if (!visto[p]) { visto[p] = 1; cola[fin++] = p; } }

      var y, x;
      for (x = 0; x < w; x++) { encolar(x); encolar((h - 1) * w + x); }
      for (y = 0; y < h; y++) { encolar(y * w); encolar(y * w + (w - 1)); }

      while (ini < fin) {
        var p = cola[ini++];
        var i = p * 4;
        if (lejos(color(i), fondo) > tol) continue;      // aquí empieza el dibujo
        px[i + 3] = 0;                                   // transparente
        var py = (p / w) | 0, pxx = p % w;
        if (pxx > 0) encolar(p - 1);
        if (pxx < w - 1) encolar(p + 1);
        if (py > 0) encolar(p - w);
        if (py < h - 1) encolar(p + w);
      }

      ctx.putImageData(d, 0, 0);
      var out;
      try { out = c.toDataURL("image/png"); } catch (er) { return cb(null, dataUrl); }
      cb(null, out);
    };
    img.src = dataUrl;
  }

  /* -------------------------------------------------------------- descarga */
  function download(filename, content, mime) {
    var blob = content instanceof Blob ? content : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  /* --------------------------------------------- exportar manifest.js nuevo */
  /* Sólo el contenido, sin fecha ni envoltura. Sirve para comparar versiones. */
  function contentJSON(data) {
    return JSON.stringify({
      version: (data.version || 1),
      settings: data.settings,
      categories: data.categories,
      products: data.products,
      tees: data.tees,
      steps: data.steps,
      faqs: data.faqs
    }, null, 2);
  }

  function buildManifest(data) {
    return "/* manifest.js generado desde el panel de administrador — " +
      new Date().toLocaleString("es-VE") + " */\n" +
      "(function () {\n  \"use strict\";\n\n  window.__BRAND__ = " +
      contentJSON(data).split("\n").join("\n  ") +
      ";\n})();\n";
  }

  /* ---------------------------------------------------------------- helpers */
  /* Una categoría se ve salvo que esté apagada desde el panel.
     Si un producto quedó con una categoría que ya no existe, se sigue viendo
     (mejor mostrarlo de más que esconder mercancía sin querer). */
  function catActiva(data, id) {
    var c = (data.categories || []).filter(function (x) { return x.id === id; })[0];
    if (!c) return true;
    return c.active !== false;
  }

  function findProduct(data, id) {
    return (data.products || []).filter(function (p) { return p.id === id; })[0] || null;
  }
  function findZone(data, id) {
    return ((data.tees || {}).zones || []).filter(function (z) { return z.id === id; })[0] || null;
  }
  function findSize(data, id) {
    return ((data.tees || {}).sizes || []).filter(function (s) { return s.id === id; })[0] || null;
  }

  function teePrice(data, design) {
    var t = data.tees || {};
    var total = num(t.basePrice);
    var size = findSize(data, design.size);
    if (size) total += num(size.extra);
    ["front", "back"].forEach(function (side) {
      var pl = design.placements && design.placements[side];
      if (pl && pl.img) {
        var z = findZone(data, pl.zone);
        if (z) total += num(z.extra);
      }
    });
    return Math.round(total * 100) / 100;
  }

  function cartTotal(list) {
    return Math.round(list.reduce(function (s, it) { return s + num(it.price) * num(it.qty, 1); }, 0) * 100) / 100;
  }

  /* ------------------------------------------------------------------ auth */
  function isAdmin() {
    try { return sessionStorage.getItem(K.auth) === "1"; } catch (e) { return false; }
  }
  function login(pin) {
    var data = read();
    var real = String((data.settings || {}).adminPin || "0000");
    if (String(pin) === real) {
      try { sessionStorage.setItem(K.auth, "1"); } catch (e) {}
      return true;
    }
    return false;
  }
  function logout() {
    try { sessionStorage.removeItem(K.auth); } catch (e) {}
  }

  window.VCS = {
    KEYS: K,
    clone: clone, escHTML: escHTML, uid: uid, orderCode: orderCode, num: num,
    read: read, write: write, resetData: resetData, defaults: defaults,
    avisar: avisar, alCambiar: alCambiar,
    getOrders: getOrders, setOrders: setOrders, addOrder: addOrder,
    getCart: getCart, setCart: setCart, clearCart: clearCart,
    money: money, readImage: readImage, quitarFondo: quitarFondo, download: download,
    buildManifest: buildManifest, contentJSON: contentJSON,
    findProduct: findProduct, findZone: findZone, findSize: findSize, catActiva: catActiva,
    teePrice: teePrice, cartTotal: cartTotal,
    isAdmin: isAdmin, login: login, logout: logout
  };
})();
