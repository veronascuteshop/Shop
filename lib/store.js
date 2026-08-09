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

  function write(data) {
    try {
      localStorage.setItem(K.data, JSON.stringify(data));
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
  /* Redimensiona y comprime un File a dataURL para que quepa en el navegador */
  function readImage(file, maxSide, quality, cb) {
    if (!file) return cb("No hay archivo");
    if (!/^image\//.test(file.type)) return cb("Ese archivo no es una imagen");
    var reader = new FileReader();
    reader.onerror = function () { cb("No se pudo leer la imagen"); };
    reader.onload = function () {
      var img = new Image();
      img.onerror = function () { cb("Formato de imagen no soportado (¿HEIC de iPhone? conviértela a JPG)"); };
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, (maxSide || 1200) / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * scale));
        var ch = Math.max(1, Math.round(h * scale));
        var c = document.createElement("canvas");
        c.width = cw; c.height = ch;
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, cw, ch);
        var hasAlpha = /png|webp|svg/i.test(file.type);
        var out;
        try {
          out = hasAlpha ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", quality || 0.85);
        } catch (e) { return cb("No se pudo procesar la imagen"); }
        cb(null, { dataUrl: out, width: cw, height: ch, ratio: cw / ch });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
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
    getOrders: getOrders, setOrders: setOrders, addOrder: addOrder,
    getCart: getCart, setCart: setCart, clearCart: clearCart,
    money: money, readImage: readImage, download: download,
    buildManifest: buildManifest, contentJSON: contentJSON,
    findProduct: findProduct, findZone: findZone, findSize: findSize,
    teePrice: teePrice, cartTotal: cartTotal,
    isAdmin: isAdmin, login: login, logout: logout
  };
})();
