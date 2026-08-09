/* =============================================================================
   admin.js — Panel de administración de Verona's Cute Shop
   ============================================================================= */
(function () {
  "use strict";

  var S = window.VCS;
  var TEE = window.VCS_TEE;
  if (!S) { console.error("[admin] falta lib/store.js"); return; }

  var $ = function (s, sc) { return (sc || document).querySelector(s); };
  var $$ = function (s, sc) { return Array.prototype.slice.call((sc || document).querySelectorAll(s)); };
  var esc = S.escHTML;
  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  var data = S.read();
  var orders = S.getOrders();

  /* ---------------------------------------------------------------- avisos */
  function toast(msg, kind) {
    var wrap = $("[data-toasts]"); if (!wrap) return;
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    wrap.appendChild(el);
    // los mensajes largos se quedan más tiempo para poder leerlos
    var dura = Math.min(14000, Math.max(2800, String(msg).length * 65));
    var cerrar = function () {
      el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 400);
    };
    el.addEventListener("click", cerrar);
    setTimeout(cerrar, dura);
  }

  var savedTimer = null;
  function flashSaved() {
    var el = $("[data-saved]"); if (!el) return;
    el.classList.add("is-on");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { el.classList.remove("is-on"); }, 1400);
  }

  var saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    var run = function () {
      var res = S.write(data);
      if (!res.ok) toast(res.error, "err"); else flashSaved();
      try { pintarEstadoPublicacion(); } catch (e) {}
    };
    if (now) run(); else saveTimer = setTimeout(run, 350);
  }

  function saveOrders() {
    var res = S.setOrders(orders);
    if (!res.ok) toast(res.error, "err"); else flashSaved();
  }

  /* ================================================================= acceso */
  function initLogin() {
    var wrap = $("[data-login]"), shell = $("[data-shell]");
    function enter() {
      wrap.hidden = true; wrap.style.display = "none";
      shell.hidden = false;
      boot();
    }
    if (S.isAdmin()) { enter(); return; }

    var form = $("[data-login-form]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = $("[data-pin]").value;
      if (S.login(pin)) { $("[data-login-error]").hidden = true; enter(); }
      else {
        $("[data-login-error]").hidden = false;
        $("[data-pin]").value = "";
        $("[data-pin]").focus();
      }
    });
    setTimeout(function () { var p = $("[data-pin]"); if (p) p.focus(); }, 250);

    var out = $("[data-logout]");
    if (out) out.addEventListener("click", function () { S.logout(); location.reload(); });
  }

  /* ================================================================== tabs */
  function initTabs() {
    var nav = $("[data-tabs]");
    if (!nav) return;
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      var id = b.getAttribute("data-tab");
      $$("[data-tab]", nav).forEach(function (x) { x.classList.toggle("is-active", x === b); });
      $$("[data-panel]").forEach(function (p) { p.classList.toggle("is-active", p.getAttribute("data-panel") === id); });
      window.scrollTo({ top: 0, behavior: "smooth" });
      try { pintarEstadoPublicacion(); } catch (e) {}
    });
    var out = $("[data-logout]");
    if (out) out.addEventListener("click", function () { S.logout(); location.reload(); });
  }

  /* =============================================================== modales */
  function openEdit(html, onMount) {
    var card = $("[data-edit-card]");
    card.innerHTML = html;
    $("[data-edit-modal]").classList.add("is-open");
    $("[data-overlay]").classList.add("is-open");
    document.body.style.overflow = "hidden";
    if (onMount) onMount(card);
  }
  function closeEdit() {
    $("[data-edit-modal]").classList.remove("is-open");
    $("[data-overlay]").classList.remove("is-open");
    document.body.style.overflow = "";
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-edit-close]") || e.target.matches("[data-overlay]")) closeEdit();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeEdit(); });

  /* ================================================================ PEDIDOS */
  var STATUSES = ["nuevo", "proceso", "enviado", "entregado", "cancelado"];
  var STATUS_LABEL = {
    nuevo: "Nuevo", proceso: "En proceso", enviado: "Enviado",
    entregado: "Entregado", cancelado: "Cancelado"
  };

  function renderOrders() {
    var box = $("[data-orders-list]");
    var stats = $("[data-order-stats]");
    if (!box) return;

    var pend = orders.filter(function (o) { return o.status === "nuevo"; }).length;
    var badge = $("[data-orders-badge]");
    if (badge) { badge.hidden = pend === 0; badge.textContent = pend; }

    if (stats) {
      var total = orders.reduce(function (s, o) { return s + S.num(o.total); }, 0);
      var done = orders.filter(function (o) { return o.status === "entregado"; }).length;
      stats.innerHTML =
        '<div class="stat"><b>' + orders.length + "</b><span>Pedidos</span></div>" +
        '<div class="stat"><b>' + pend + "</b><span>Nuevos</span></div>" +
        '<div class="stat"><b>' + done + "</b><span>Entregados</span></div>" +
        '<div class="stat"><b>' + S.money(total) + "</b><span>Total</span></div>";
    }

    if (!orders.length) {
      box.innerHTML = '<div class="empty-state"><b>Aún no hay pedidos guardados</b>' +
        "Cuando alguien haga un pedido desde este navegador aparecerá aquí. " +
        "También puedes importar el archivo .json que te envíe un cliente.</div>";
      return;
    }

    box.innerHTML = orders.map(function (o, i) {
      var d = new Date(o.createdAt);
      var when = isNaN(d) ? "" : d.toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" });
      return '<article class="order-card">' +
        '<div class="order-top">' +
          "<div><span class=\"order-code\">" + esc(o.code) + "</span>" +
          '<div class="order-meta">' + esc(when) + " · " + esc(o.customer.name || "") + " · " + esc(o.customer.city || "") + "</div></div>" +
          '<div style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap">' +
            '<select class="status-sel st-' + esc(o.status) + '" data-order-status="' + i + '">' +
              STATUSES.map(function (s) {
                return '<option value="' + s + '"' + (o.status === s ? " selected" : "") + ">" + STATUS_LABEL[s] + "</option>";
              }).join("") +
            "</select>" +
            '<span class="price">' + S.money(o.total) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="order-items">' +
          o.items.map(function (it) {
            return '<div class="order-line">' +
              (it.design && it.design.preview ? '<img class="mini-img" src="' + esc(it.design.preview) + '" alt="Diseño" />' : "") +
              "<div><b>" + it.qty + "× " + esc(it.name) + "</b>" +
              (it.meta ? '<div class="order-meta">' + esc(it.meta) + "</div>" : "") +
              (it.design && it.design.note ? '<div class="order-meta">Nota: ' + esc(it.design.note) + "</div>" : "") +
              (it.design ? teeDetail(it.design) : "") +
              "</div></div>";
          }).join("") +
        "</div>" +
        '<div class="order-meta">📞 ' + esc(o.customer.phone || "") + " · 🚚 " + esc(o.customer.delivery || "") +
          " · 💳 " + esc(o.customer.pay || "") + (o.customer.note ? " · 📝 " + esc(o.customer.note) : "") + "</div>" +
        '<div class="list-actions" style="justify-content:flex-start">' +
          '<a class="tiny-btn solid" href="' + esc(waOrder(o)) + '" target="_blank" rel="noopener">Escribir por WhatsApp</a>' +
          '<button class="tiny-btn" type="button" data-order-copy="' + i + '">Copiar resumen</button>' +
          (hasDesign(o) ? '<button class="tiny-btn" type="button" data-order-img="' + i + '">Ver diseño grande</button>' : "") +
          '<button class="tiny-btn" type="button" data-order-json="' + i + '">Descargar .json</button>' +
          '<button class="tiny-btn danger" type="button" data-order-del="' + i + '">Eliminar</button>' +
        "</div>" +
      "</article>";
    }).join("");
  }

  function teeDetail(design) {
    var out = [];
    ["front", "back"].forEach(function (side) {
      var pl = design.placements && design.placements[side];
      if (!pl) return;
      var z = S.findZone(data, pl.zone);
      out.push((side === "front" ? "Frente" : "Espalda") + ": " + (z ? z.name : pl.zone) +
        " · tamaño " + Math.round((pl.w / pl.baseW) * 100) + "% · rotación " + Math.round(pl.rot || 0) + "°");
    });
    return out.length ? '<div class="order-meta">🎨 ' + esc(out.join(" | ")) + "</div>" : "";
  }

  function hasDesign(o) {
    return o.items.some(function (it) { return it.design && it.design.preview; });
  }

  function orderSummary(o) {
    var L = ["Pedido " + o.code, ""];
    o.items.forEach(function (it) {
      L.push("• " + it.qty + "x " + it.name + (it.meta ? " (" + it.meta + ")" : "") + " — " + S.money(S.num(it.price) * S.num(it.qty, 1)));
    });
    L.push("", "Total: " + S.money(o.total), "");
    L.push("Cliente: " + o.customer.name + " · " + o.customer.phone);
    L.push("Ciudad: " + o.customer.city + " · " + o.customer.delivery);
    L.push("Pago: " + o.customer.pay);
    if (o.customer.note) L.push("Nota: " + o.customer.note);
    return L.join("\n");
  }

  function waOrder(o) {
    var phone = String(o.customer.phone || "").replace(/\D/g, "");
    if (phone.length && phone[0] === "0") phone = "58" + phone.slice(1);
    var text = "¡Hola " + (o.customer.name || "") + "! Sobre tu pedido " + o.code + " ✿";
    return (phone ? "https://wa.me/" + phone : "https://wa.me/") + "?text=" + encodeURIComponent(text);
  }

  function bindOrders() {
    var box = $("[data-orders-list]");
    if (box) {
      box.addEventListener("change", function (e) {
        var sel = e.target.closest("[data-order-status]");
        if (!sel) return;
        var i = parseInt(sel.getAttribute("data-order-status"), 10);
        orders[i].status = sel.value;
        saveOrders(); renderOrders();
      });
      box.addEventListener("click", function (e) {
        var t;
        if ((t = e.target.closest("[data-order-del]"))) {
          var i = parseInt(t.getAttribute("data-order-del"), 10);
          if (!confirm("¿Eliminar el pedido " + orders[i].code + "? No se puede deshacer.")) return;
          orders.splice(i, 1); saveOrders(); renderOrders(); return;
        }
        if ((t = e.target.closest("[data-order-copy]"))) {
          var o = orders[parseInt(t.getAttribute("data-order-copy"), 10)];
          var txt = orderSummary(o);
          if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast("Resumen copiado ✓", "ok"); });
          else { prompt("Copia el resumen:", txt); }
          return;
        }
        if ((t = e.target.closest("[data-order-json]"))) {
          var oj = orders[parseInt(t.getAttribute("data-order-json"), 10)];
          S.download("pedido-" + oj.code + ".json", JSON.stringify(oj, null, 2), "application/json");
          return;
        }
        if ((t = e.target.closest("[data-order-img]"))) {
          var oi = orders[parseInt(t.getAttribute("data-order-img"), 10)];
          var imgs = [];
          oi.items.forEach(function (it) { if (it.design && it.design.preview) imgs.push(it.design.preview); });
          openEdit(
            '<div class="modal-head"><h3>Diseño de ' + esc(oi.code) + '</h3>' +
            '<button class="icon-btn" type="button" data-edit-close aria-label="Cerrar">✕</button></div>' +
            imgs.map(function (src) {
              return '<img src="' + esc(src) + '" alt="Diseño del pedido" style="width:100%;border-radius:20px;margin-bottom:.8rem" />';
            }).join("") +
            '<p class="sub">La imagen original en alta calidad te la envía el cliente por WhatsApp.</p>'
          );
        }
      });
    }

    var exp = $("[data-orders-export]");
    if (exp) exp.addEventListener("click", function () {
      if (!orders.length) { toast("No hay pedidos que exportar", "err"); return; }
      S.download("pedidos-" + new Date().toISOString().slice(0, 10) + ".json",
        JSON.stringify(orders, null, 2), "application/json");
    });

    var imp = $("[data-order-import]");
    if (imp) imp.addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var parsed = JSON.parse(r.result);
          var list = Array.isArray(parsed) ? parsed : [parsed];
          list.forEach(function (o) {
            if (!o || !o.code) throw new Error("formato");
            if (!orders.some(function (x) { return x.code === o.code; })) orders.unshift(o);
          });
          saveOrders(); renderOrders();
          toast("Importado: " + list.length + " pedido(s) ✓", "ok");
        } catch (err) { toast("Ese archivo no es un pedido válido", "err"); }
      };
      r.readAsText(f);
      this.value = "";
    });
  }

  /* ============================================================== PRODUCTOS */
  function renderProducts() {
    var box = $("[data-products-list]"); if (!box) return;
    var list = data.products || [];
    if (!list.length) {
      box.innerHTML = '<div class="empty-state"><b>Sin productos todavía</b>Pulsa «Nuevo producto» para empezar.</div>';
      return;
    }
    box.innerHTML = list.map(function (p, i) {
      var thumb = p.photo
        ? '<img src="' + esc(p.photo) + '" alt="" />'
        : esc(p.emoji || "🎁");
      var cat = (data.categories || []).filter(function (c) { return c.id === p.category; })[0];
      return '<div class="list-item">' +
        '<div class="list-thumb">' + thumb + "</div>" +
        '<div class="list-info"><b>' + esc(p.name) + "</b>" +
          "<small>" + S.money(p.price) + (p.compareAt ? " · antes " + S.money(p.compareAt) : "") +
          " · " + esc(cat ? cat.name : "sin categoría") + (p.stock ? "" : " · AGOTADO") + "</small></div>" +
        '<div class="list-actions">' +
          '<button class="tiny-btn" type="button" data-pmove="' + i + '" data-dir="-1" ' + (i === 0 ? "disabled" : "") + '>↑</button>' +
          '<button class="tiny-btn" type="button" data-pmove="' + i + '" data-dir="1" ' + (i === list.length - 1 ? "disabled" : "") + '>↓</button>' +
          '<button class="tiny-btn solid" type="button" data-pedit="' + i + '">Editar</button>' +
          '<button class="tiny-btn" type="button" data-pdup="' + i + '">Duplicar</button>' +
          '<button class="tiny-btn danger" type="button" data-pdel="' + i + '">Borrar</button>' +
        "</div></div>";
    }).join("");
  }

  function productForm(p, index) {
    var cats = data.categories || [];
    var optText = (p.options || []).map(function (o) { return o.name + ": " + (o.values || []).join(", "); }).join("\n");
    return '<div class="modal-head"><div><span class="kicker">Producto</span><h3>' +
      (index == null ? "Nuevo producto" : "Editar producto") + "</h3></div>" +
      '<button class="icon-btn" type="button" data-edit-close aria-label="Cerrar">✕</button></div>' +
      '<div class="rows">' +
        '<div class="field"><label>Nombre *</label><input data-f="name" value="' + esc(p.name) + '" /></div>' +
        '<div class="cols-2">' +
          '<div class="field"><label>Precio *</label><input data-f="price" type="number" step="0.5" min="0" value="' + esc(p.price) + '" /></div>' +
          '<div class="field"><label>Precio anterior (para mostrar oferta)</label><input data-f="compareAt" type="number" step="0.5" min="0" value="' + esc(p.compareAt || "") + '" /></div>' +
        "</div>" +
        '<div class="cols-2">' +
          '<div class="field"><label>Categoría</label><select data-f="category">' +
            cats.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === p.category ? " selected" : "") + ">" + esc(c.emoji + " " + c.name) + "</option>"; }).join("") +
          "</select></div>" +
          '<div class="field"><label>Etiqueta (Nuevo, Oferta, Top ventas…)</label><input data-f="badge" value="' + esc(p.badge || "") + '" /></div>' +
        "</div>" +
        '<div class="field"><label>Descripción</label><textarea data-f="description" rows="3">' + esc(p.description || "") + "</textarea></div>" +
        '<div class="cols-2">' +
          '<div class="field"><label>Emoji (si no subes foto)</label><input data-f="emoji" value="' + esc(p.emoji || "") + '" maxlength="4" /></div>' +
          '<div class="field"><label>Disponibilidad</label><select data-f="stock">' +
            '<option value="1"' + (p.stock ? " selected" : "") + ">Disponible</option>" +
            '<option value="0"' + (!p.stock ? " selected" : "") + ">Agotado</option></select></div>" +
        "</div>" +
        '<div class="field"><label>Opciones (una por línea → <i>Nombre: valor1, valor2</i>)</label>' +
          '<textarea data-f="options" rows="3" placeholder="Color: Rosa, Lila&#10;Talla: S, M, L">' + esc(optText) + "</textarea></div>" +
        '<div class="field"><label>Foto del producto</label>' +
          '<div class="drop-zone" data-photo-zone>' +
            (p.photo ? '<img src="' + esc(p.photo) + '" alt="" style="max-height:150px;margin:0 auto .6rem;border-radius:14px" />' : "🖼️ Sube una foto cuadrada (se comprime sola)") +
            '<div style="margin-top:.6rem;display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap">' +
              '<label class="tiny-btn solid">Elegir foto<input type="file" accept="image/*" hidden data-photo-file /></label>' +
              (p.photo ? '<button class="tiny-btn danger" type="button" data-photo-clear>Quitar foto</button>' : "") +
            "</div></div></div>" +
        '<div style="display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap">' +
          '<button class="btn btn-ghost btn-sm" type="button" data-edit-close>Cancelar</button>' +
          '<button class="btn btn-primary btn-sm" type="button" data-psave>Guardar producto</button>' +
        "</div>" +
      "</div>";
  }

  function openProductEditor(index) {
    var isNew = index == null;
    var p = isNew
      ? { id: S.uid("p"), name: "", price: 0, compareAt: 0, category: (data.categories[0] || {}).id || "", emoji: "🎁", photo: "", badge: "", description: "", options: [], stock: true, featured: false }
      : S.clone(data.products[index]);

    openEdit(productForm(p, index), function (card) {
      var photo = p.photo;

      /* La zona de foto se vuelve a pintar cada vez que cambia, así que los
         listeners se enganchan por delegación sobre la zona (idempotente). */
      var zone = $("[data-photo-zone]", card);

      function paintZone() {
        zone.innerHTML =
          (photo
            ? '<img src="' + photo + '" alt="" style="max-height:150px;margin:0 auto .6rem;border-radius:14px" />'
            : "🖼️ Sube una foto cuadrada (se comprime sola)") +
          '<div style="margin-top:.6rem;display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap">' +
            '<label class="tiny-btn solid">' + (photo ? "Cambiar foto" : "Elegir foto") +
            '<input type="file" accept="image/*" hidden data-photo-file /></label>' +
            (photo ? '<button class="tiny-btn danger" type="button" data-photo-clear>Quitar foto</button>' : "") +
          "</div>";
      }
      paintZone();

      zone.addEventListener("change", function (e) {
        var input = e.target.closest("[data-photo-file]");
        if (!input) return;
        var f = input.files && input.files[0];
        input.value = "";
        if (!f) return;
        S.readImage(f, 900, 0.82, function (err, out) {
          if (err) { toast(err, "err"); return; }
          photo = out.dataUrl;
          paintZone();
        });
      });

      zone.addEventListener("click", function (e) {
        if (!e.target.closest("[data-photo-clear]")) return;
        photo = "";
        paintZone();
      });

      $("[data-psave]", card).addEventListener("click", function () {
        var get = function (k) { var el = $('[data-f="' + k + '"]', card); return el ? el.value : ""; };
        var name = get("name").trim();
        if (!name) { toast("Ponle un nombre al producto", "err"); return; }
        p.name = name;
        p.price = S.num(get("price"));
        p.compareAt = S.num(get("compareAt"));
        p.category = get("category");
        p.badge = get("badge").trim();
        p.description = get("description").trim();
        p.emoji = get("emoji").trim() || "🎁";
        p.stock = get("stock") === "1";
        p.photo = photo;
        p.options = get("options").split("\n").map(function (line) {
          var i = line.indexOf(":");
          if (i < 0) return null;
          var nm = line.slice(0, i).trim();
          var vals = line.slice(i + 1).split(",").map(function (v) { return v.trim(); }).filter(Boolean);
          return nm && vals.length ? { name: nm, values: vals } : null;
        }).filter(Boolean);

        if (index == null) data.products.push(p); else data.products[index] = p;
        save(true); renderProducts(); closeEdit();
        toast("Producto guardado ✓", "ok");
      });
    });
  }

  function bindProducts() {
    var box = $("[data-products-list]");
    if (box) box.addEventListener("click", function (e) {
      var t;
      if ((t = e.target.closest("[data-pedit]"))) return openProductEditor(parseInt(t.getAttribute("data-pedit"), 10));
      if ((t = e.target.closest("[data-pdel]"))) {
        var i = parseInt(t.getAttribute("data-pdel"), 10);
        if (!confirm("¿Borrar «" + data.products[i].name + "»?")) return;
        data.products.splice(i, 1); save(true); renderProducts(); return;
      }
      if ((t = e.target.closest("[data-pdup]"))) {
        var j = parseInt(t.getAttribute("data-pdup"), 10);
        var copy = S.clone(data.products[j]);
        copy.id = S.uid("p"); copy.name = copy.name + " (copia)";
        data.products.splice(j + 1, 0, copy); save(true); renderProducts(); return;
      }
      if ((t = e.target.closest("[data-pmove]"))) {
        var k = parseInt(t.getAttribute("data-pmove"), 10);
        var dir = parseInt(t.getAttribute("data-dir"), 10);
        var to = k + dir;
        if (to < 0 || to >= data.products.length) return;
        var tmp = data.products[k]; data.products[k] = data.products[to]; data.products[to] = tmp;
        save(true); renderProducts();
      }
    });
    var nw = $("[data-product-new]");
    if (nw) nw.addEventListener("click", function () { openProductEditor(null); });
  }

  /* ============================================================ CATEGORÍAS */
  function renderCats() {
    var box = $("[data-cats-list]"); if (!box) return;
    var list = data.categories || [];
    box.innerHTML = list.map(function (c, i) {
      return '<div class="list-item">' +
        '<div class="list-thumb" style="font-size:1.6rem">' +
          '<input value="' + esc(c.emoji || "") + '" data-cemoji="' + i + '" maxlength="4" style="width:100%;height:100%;text-align:center;border:0;background:transparent;font-size:1.5rem" aria-label="Emoji" />' +
        "</div>" +
        '<div class="list-info"><input value="' + esc(c.name) + '" data-cname="' + i + '" style="padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px;font-weight:700" aria-label="Nombre de la categoría" />' +
        "<small>" + (data.products || []).filter(function (p) { return p.category === c.id; }).length + " producto(s)</small></div>" +
        '<div class="list-actions">' +
          '<button class="tiny-btn" type="button" data-cmove="' + i + '" data-dir="-1" ' + (i === 0 ? "disabled" : "") + '>↑</button>' +
          '<button class="tiny-btn" type="button" data-cmove="' + i + '" data-dir="1" ' + (i === list.length - 1 ? "disabled" : "") + '>↓</button>' +
          '<button class="tiny-btn danger" type="button" data-cdel="' + i + '">Borrar</button>' +
        "</div></div>";
    }).join("");
  }

  function bindCats() {
    var box = $("[data-cats-list]");
    if (box) {
      box.addEventListener("input", function (e) {
        var t;
        if ((t = e.target.closest("[data-cname]"))) {
          data.categories[parseInt(t.getAttribute("data-cname"), 10)].name = t.value; save();
        }
        if ((t = e.target.closest("[data-cemoji]"))) {
          data.categories[parseInt(t.getAttribute("data-cemoji"), 10)].emoji = t.value; save();
        }
      });
      box.addEventListener("click", function (e) {
        var t;
        if ((t = e.target.closest("[data-cdel]"))) {
          var i = parseInt(t.getAttribute("data-cdel"), 10);
          var used = (data.products || []).filter(function (p) { return p.category === data.categories[i].id; }).length;
          if (used && !confirm("Hay " + used + " producto(s) en esta categoría. ¿Borrarla igual? Quedarán sin categoría.")) return;
          data.categories.splice(i, 1); save(true); renderCats(); return;
        }
        if ((t = e.target.closest("[data-cmove]"))) {
          var k = parseInt(t.getAttribute("data-cmove"), 10), dir = parseInt(t.getAttribute("data-dir"), 10);
          var to = k + dir; if (to < 0 || to >= data.categories.length) return;
          var tmp = data.categories[k]; data.categories[k] = data.categories[to]; data.categories[to] = tmp;
          save(true); renderCats();
        }
      });
    }
    var nw = $("[data-cat-new]");
    if (nw) nw.addEventListener("click", function () {
      var name = prompt("Nombre de la categoría:", "Nueva categoría");
      if (!name) return;
      data.categories.push({ id: slug(name) + "-" + Math.random().toString(36).slice(2, 5), name: name, emoji: "✿" });
      save(true); renderCats();
    });
  }

  function slug(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20) || "cat";
  }

  /* =============================================================== FRANELAS */
  function bindTeeFields() {
    $$("[data-tee]").forEach(function (el) {
      var key = el.getAttribute("data-tee");
      el.value = (data.tees || {})[key] != null ? (data.tees || {})[key] : "";
      el.addEventListener("input", function () {
        data.tees[key] = el.type === "number" ? S.num(el.value) : el.value;
        save();
      });
    });
  }

  function renderColors() {
    var box = $("[data-colors-list]"); if (!box) return;
    box.innerHTML = (data.tees.colors || []).map(function (c, i) {
      return '<div class="color-row">' +
        '<input type="color" value="' + esc(c.hex) + '" data-colhex="' + i + '" aria-label="Color" />' +
        '<input value="' + esc(c.name) + '" data-colname="' + i + '" style="padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px;font-weight:700" aria-label="Nombre del color" />' +
        '<input value="' + esc(c.hex) + '" data-colhextext="' + i + '" style="padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px;font-family:monospace" aria-label="Código del color" />' +
        '<button class="tiny-btn danger" type="button" data-coldel="' + i + '">✕</button></div>';
    }).join("");
  }

  function renderSizes() {
    var box = $("[data-sizes-list]"); if (!box) return;
    box.innerHTML = (data.tees.sizes || []).map(function (s, i) {
      return '<div class="size-row">' +
        '<input value="' + esc(s.name || s.id) + '" data-sz="name" data-i="' + i + '" aria-label="Talla" />' +
        '<input type="number" value="' + esc(s.chest) + '" data-sz="chest" data-i="' + i + '" aria-label="Ancho" />' +
        '<input type="number" value="' + esc(s.length) + '" data-sz="length" data-i="' + i + '" aria-label="Largo" />' +
        '<input type="number" value="' + esc(s.sleeve) + '" data-sz="sleeve" data-i="' + i + '" aria-label="Manga" />' +
        '<input type="number" step="0.5" value="' + esc(s.extra || 0) + '" data-sz="extra" data-i="' + i + '" aria-label="Recargo" />' +
        '<button class="tiny-btn danger" type="button" data-szdel="' + i + '">✕</button></div>';
    }).join("");
  }

  function renderZones() {
    var box = $("[data-zones-list]"); if (!box) return;
    box.innerHTML = (data.tees.zones || []).map(function (z, i) {
      return '<div class="zone-row">' +
        '<div style="display:flex;gap:.4rem;align-items:center">' +
          '<input value="' + esc(z.name) + '" data-zn="name" data-i="' + i + '" style="flex:1;padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px;font-weight:700" aria-label="Nombre de la zona" />' +
          '<select data-zn="side" data-i="' + i + '" style="padding:.5rem;border:2px solid var(--line);border-radius:12px;font-weight:700">' +
            '<option value="front"' + (z.side === "front" ? " selected" : "") + ">Frente</option>" +
            '<option value="back"' + (z.side === "back" ? " selected" : "") + ">Espalda</option>" +
          "</select>" +
          '<button class="tiny-btn danger" type="button" data-zndel="' + i + '">✕</button>' +
        "</div>" +
        '<div class="grid5">' +
          numField("X", z.area.x, "x", i) + numField("Y", z.area.y, "y", i) +
          numField("Ancho", z.area.w, "w", i) + numField("Alto", z.area.h, "h", i) +
          '<div class="field"><label style="font-size:.75rem">Recargo</label>' +
            '<input type="number" step="0.5" value="' + esc(z.extra || 0) + '" data-zn="extra" data-i="' + i + '" /></div>' +
        "</div></div>";
    }).join("");
    renderZonePreview();
  }

  function numField(label, val, key, i) {
    return '<div class="field"><label style="font-size:.75rem">' + label + "</label>" +
      '<input type="number" value="' + esc(val) + '" data-zn="area." data-akey="' + key + '" data-i="' + i + '" /></div>';
  }

  var previewSide = "front";
  function renderZonePreview() {
    var svg = $("[data-zone-preview]"); if (!svg || !TEE) return;
    var zones = (data.tees.zones || []).filter(function (z) { return z.side === previewSide; });
    var body = TEE.svgMarkup({ side: previewSide, hex: "#ffffff", area: null, uid: "adm" });
    var rects = zones.map(function (z, i) {
      var col = ["#ff5fa2", "#a98bff", "#1f9d76", "#e8a11c"][i % 4];
      return '<rect x="' + z.area.x + '" y="' + z.area.y + '" width="' + z.area.w + '" height="' + z.area.h +
        '" rx="6" fill="' + col + '22" stroke="' + col + '" stroke-width="2.5" stroke-dasharray="8 6"/>' +
        '<text x="' + (z.area.x + 6) + '" y="' + (z.area.y + 22 + i * 26) + '" font-size="17" font-family="Quicksand, sans-serif" font-weight="700" fill="' + col + '">' + esc(z.name) + "</text>";
    }).join("");
    svg.innerHTML = body + rects;
    var lbl = $("[data-zone-preview-side]");
    if (lbl) lbl.textContent = previewSide === "front" ? "frente" : "espalda";
  }

  function bindTees() {
    var colors = $("[data-colors-list]");
    if (colors) {
      colors.addEventListener("input", function (e) {
        var t;
        if ((t = e.target.closest("[data-colhex]"))) {
          var i = +t.getAttribute("data-colhex");
          data.tees.colors[i].hex = t.value;
          var txt = colors.querySelector('[data-colhextext="' + i + '"]'); if (txt) txt.value = t.value;
          save();
        }
        if ((t = e.target.closest("[data-colhextext]"))) {
          var j = +t.getAttribute("data-colhextext");
          if (/^#[0-9a-f]{6}$/i.test(t.value)) {
            data.tees.colors[j].hex = t.value;
            var pk = colors.querySelector('[data-colhex="' + j + '"]'); if (pk) pk.value = t.value;
            save();
          }
        }
        if ((t = e.target.closest("[data-colname]"))) {
          data.tees.colors[+t.getAttribute("data-colname")].name = t.value; save();
        }
      });
      colors.addEventListener("click", function (e) {
        var t = e.target.closest("[data-coldel]"); if (!t) return;
        if ((data.tees.colors || []).length <= 1) { toast("Debe quedar al menos un color", "err"); return; }
        data.tees.colors.splice(+t.getAttribute("data-coldel"), 1); save(true); renderColors();
      });
    }
    var cn = $("[data-color-new]");
    if (cn) cn.addEventListener("click", function () {
      data.tees.colors.push({ name: "Nuevo color", hex: "#ffc0d9" }); save(true); renderColors();
    });

    var sizes = $("[data-sizes-list]");
    if (sizes) {
      sizes.addEventListener("input", function (e) {
        var t = e.target.closest("[data-sz]"); if (!t) return;
        var i = +t.getAttribute("data-i"), k = t.getAttribute("data-sz");
        if (k === "name") { data.tees.sizes[i].name = t.value; data.tees.sizes[i].id = t.value; }
        else data.tees.sizes[i][k] = S.num(t.value);
        save();
      });
      sizes.addEventListener("click", function (e) {
        var t = e.target.closest("[data-szdel]"); if (!t) return;
        if ((data.tees.sizes || []).length <= 1) { toast("Debe quedar al menos una talla", "err"); return; }
        data.tees.sizes.splice(+t.getAttribute("data-szdel"), 1); save(true); renderSizes();
      });
    }
    var sn = $("[data-size-new]");
    if (sn) sn.addEventListener("click", function () {
      data.tees.sizes.push({ id: "Nueva", name: "Nueva", chest: 50, length: 70, sleeve: 20, extra: 0 });
      save(true); renderSizes();
    });

    var zones = $("[data-zones-list]");
    if (zones) {
      zones.addEventListener("input", function (e) {
        var t = e.target.closest("[data-zn]"); if (!t) return;
        var i = +t.getAttribute("data-i"), k = t.getAttribute("data-zn");
        var z = data.tees.zones[i];
        if (k === "area.") z.area[t.getAttribute("data-akey")] = S.num(t.value);
        else if (k === "extra") z.extra = S.num(t.value);
        else if (k === "name") { z.name = t.value; }
        save(); renderZonePreview();
      });
      zones.addEventListener("change", function (e) {
        var t = e.target.closest('[data-zn="side"]'); if (!t) return;
        var i = +t.getAttribute("data-i");
        data.tees.zones[i].side = t.value;
        previewSide = t.value;
        save(true); renderZones();
      });
      zones.addEventListener("focusin", function (e) {
        var row = e.target.closest(".zone-row"); if (!row) return;
        var idx = Array.prototype.indexOf.call(zones.children, row);
        var z = data.tees.zones[idx];
        if (z && z.side !== previewSide) { previewSide = z.side; renderZonePreview(); }
      });
      zones.addEventListener("click", function (e) {
        var t = e.target.closest("[data-zndel]"); if (!t) return;
        if ((data.tees.zones || []).length <= 1) { toast("Debe quedar al menos una zona", "err"); return; }
        data.tees.zones.splice(+t.getAttribute("data-zndel"), 1); save(true); renderZones();
      });
    }
    var zn = $("[data-zone-new]");
    if (zn) zn.addEventListener("click", function () {
      data.tees.zones.push({
        id: "zona-" + Math.random().toString(36).slice(2, 6), name: "Nueva zona",
        side: previewSide, extra: 0, area: { x: 200, y: 250, w: 200, h: 200 }
      });
      save(true); renderZones();
    });
  }

  /* =============================================================== CONTENIDO */
  function bindSettings() {
    $$("[data-set]").forEach(function (el) {
      var key = el.getAttribute("data-set");
      var val = (data.settings || {})[key];
      el.value = val != null ? val : "";
      el.addEventListener("input", function () {
        data.settings[key] = el.value;
        save();
        if (key === "accent") document.documentElement.style.setProperty("--accent", el.value);
        if (key === "accent2") document.documentElement.style.setProperty("--accent-2", el.value);
      });
    });
    var full = $("[data-brand-full]");
    if (full) full.textContent = ((data.settings.name || "") + " " + (data.settings.name2 || "")).trim();
  }

  function renderSteps() {
    var box = $("[data-steps-list]"); if (!box) return;
    box.innerHTML = (data.steps || []).map(function (s, i) {
      return '<div class="zone-row"><div style="display:flex;gap:.4rem">' +
        '<input value="' + esc(s.emoji) + '" data-st="emoji" data-i="' + i + '" maxlength="4" style="width:56px;text-align:center;padding:.5rem;border:2px solid var(--line);border-radius:12px;font-size:1.2rem" aria-label="Emoji" />' +
        '<input value="' + esc(s.title) + '" data-st="title" data-i="' + i + '" style="flex:1;padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px;font-weight:700" aria-label="Título" />' +
        '<button class="tiny-btn danger" type="button" data-stdel="' + i + '">✕</button></div>' +
        '<textarea data-st="text" data-i="' + i + '" rows="2" style="padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px">' + esc(s.text) + "</textarea></div>";
    }).join("");
  }

  function renderFaqs() {
    var box = $("[data-faqs-list]"); if (!box) return;
    box.innerHTML = (data.faqs || []).map(function (f, i) {
      return '<div class="zone-row"><div style="display:flex;gap:.4rem">' +
        '<input value="' + esc(f.q) + '" data-fq="q" data-i="' + i + '" style="flex:1;padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px;font-weight:700" aria-label="Pregunta" />' +
        '<button class="tiny-btn danger" type="button" data-fqdel="' + i + '">✕</button></div>' +
        '<textarea data-fq="a" data-i="' + i + '" rows="2" style="padding:.5rem .7rem;border:2px solid var(--line);border-radius:12px">' + esc(f.a) + "</textarea></div>";
    }).join("");
  }

  function bindContentLists() {
    var steps = $("[data-steps-list]");
    if (steps) {
      steps.addEventListener("input", function (e) {
        var t = e.target.closest("[data-st]"); if (!t) return;
        data.steps[+t.getAttribute("data-i")][t.getAttribute("data-st")] = t.value; save();
      });
      steps.addEventListener("click", function (e) {
        var t = e.target.closest("[data-stdel]"); if (!t) return;
        data.steps.splice(+t.getAttribute("data-stdel"), 1); save(true); renderSteps();
      });
    }
    var sn = $("[data-step-new]");
    if (sn) sn.addEventListener("click", function () {
      (data.steps = data.steps || []).push({ emoji: "✿", title: "Nuevo paso", text: "Describe el paso." });
      save(true); renderSteps();
    });

    var faqs = $("[data-faqs-list]");
    if (faqs) {
      faqs.addEventListener("input", function (e) {
        var t = e.target.closest("[data-fq]"); if (!t) return;
        data.faqs[+t.getAttribute("data-i")][t.getAttribute("data-fq")] = t.value; save();
      });
      faqs.addEventListener("click", function (e) {
        var t = e.target.closest("[data-fqdel]"); if (!t) return;
        data.faqs.splice(+t.getAttribute("data-fqdel"), 1); save(true); renderFaqs();
      });
    }
    var fn = $("[data-faq-new]");
    if (fn) fn.addEventListener("click", function () {
      (data.faqs = data.faqs || []).push({ q: "Nueva pregunta", a: "Respuesta." });
      save(true); renderFaqs();
    });
  }

  /* ================================================================ PUBLICAR */

  /* Recuerda qué versión del contenido fue la última publicada, para poder
     avisar "hay cambios sin publicar" sin tener que preguntarle a GitHub. */
  var PUB_KEY = "vcs_pub_v1";
  function pubState() {
    try { return JSON.parse(localStorage.getItem(PUB_KEY) || "{}"); } catch (e) { return {}; }
  }
  function setPubState(s) {
    try { localStorage.setItem(PUB_KEY, JSON.stringify(s)); } catch (e) {}
  }
  /* Se compara sólo el contenido: el archivo lleva fecha dentro y esa cambia siempre */
  function huellaActual() {
    return window.VCS_GH ? VCS_GH.fingerprint(S.contentJSON(data)) : "";
  }
  function hayCambiosSinPublicar() {
    return pubState().huella !== huellaActual();
  }

  function cuando(iso) {
    if (!iso) return "";
    var d = new Date(iso), min = Math.round((Date.now() - d.getTime()) / 60000);
    if (isNaN(d)) return "";
    if (min < 1) return "hace un momento";
    if (min < 60) return "hace " + min + " min";
    if (min < 1440) return "hace " + Math.round(min / 60) + " h";
    return "el " + d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
  }

  function pintarEstadoPublicacion() {
    var st = pubState();
    var conectado = window.VCS_GH && VCS_GH.isReady();
    var pendiente = hayCambiosSinPublicar();

    var texto, clase, corto;
    if (!conectado) {
      clase = "off";
      texto = "Sin conectar con GitHub — por ahora hay que subir el archivo a mano.";
      corto = "Sin conectar";
    } else if (pendiente) {
      clase = "pending";
      texto = "Tienes cambios sin publicar." + (st.fecha ? " Última publicación " + cuando(st.fecha) + "." : "");
      corto = "Cambios sin publicar";
    } else {
      clase = "ok";
      texto = "Todo publicado ✓" + (st.fecha ? " · " + cuando(st.fecha) : "");
      corto = "Todo publicado ✓";
    }

    var box = $("[data-pub-state]");
    if (box) {
      box.className = "pub-state " + clase;
      $("[data-pub-text]").textContent = texto;
    }
    var side = $("[data-side-pub-state]");
    if (side) { side.textContent = corto; side.className = "side-publish-state " + clase; }

    $$("[data-publish-now]").forEach(function (b) { b.classList.toggle("is-pending", pendiente && conectado); });
  }

  /* Un solo botón: arma el archivo y lo sube al repositorio */
  var publicando = false;
  function publicarAhora(btn) {
    if (publicando) return;

    if (!window.VCS_GH || !VCS_GH.isReady()) {
      irAPublicar();
      var box = $("[data-gh-box]");
      if (box) box.hidden = false;
      toast("Primero conecta el panel con GitHub (es una sola vez)", "err");
      var first = $('[data-gh="owner"]');
      if (first) first.focus();
      return;
    }

    publicando = true;
    var labels = $$("[data-publish-now]");
    labels.forEach(function (b) { b.disabled = true; });
    var side = $("[data-side-publish-label]");
    var antes = side ? side.textContent : "";
    if (side) side.textContent = "Publicando…";

    var contenido = S.buildManifest(data);
    var huella = huellaActual();

    VCS_GH.publish(contenido, "Actualiza el contenido de la tienda desde el panel", function (err, res) {
      publicando = false;
      labels.forEach(function (b) { b.disabled = false; });
      if (side) side.textContent = antes || "Publicar en la web";

      if (err) { toast(err, "err"); pintarEstadoPublicacion(); return; }

      setPubState({ huella: huella, fecha: new Date().toISOString(), commit: res.commit });
      pintarEstadoPublicacion();
      toast("¡Publicado! La web se actualiza en menos de un minuto ✿", "ok");
    });
  }

  function irAPublicar() {
    var tab = $('[data-tab="publicar"]');
    if (tab) tab.click();
  }

  function bindGitHub() {
    var box = $("[data-gh-box]");
    var toggle = $("[data-gh-toggle]");
    if (toggle && box) toggle.addEventListener("click", function () { box.hidden = !box.hidden; });

    if (!window.VCS_GH) return;

    // valores por defecto según dónde esté publicada la página
    var c = VCS_GH.cfg();
    if (!c.owner && /github\.io$/.test(location.hostname)) {
      c.owner = location.hostname.replace(".github.io", "");
      var seg = location.pathname.split("/").filter(Boolean);
      if (seg.length) c.repo = seg[0];
    }
    if (!c.owner) c.owner = "veronascuteshop";
    if (!c.repo) c.repo = "Shop";
    if (!c.branch) c.branch = "main";
    if (!c.path) c.path = "lib/manifest.js";

    $$("[data-gh]").forEach(function (el) {
      var k = el.getAttribute("data-gh");
      el.value = c[k] || "";
      el.addEventListener("input", function () {
        var cur = VCS_GH.cfg();
        cur[k] = el.value.trim();
        VCS_GH.saveCfg(cur);
        pintarEstadoPublicacion();
      });
    });
    VCS_GH.saveCfg(Object.assign({}, VCS_GH.cfg(), {
      owner: c.owner || "", repo: c.repo || "", branch: c.branch, path: c.path
    }));

    var res = $("[data-gh-result]");
    function decir(msg, ok) {
      if (!res) return;
      res.hidden = false;
      res.textContent = msg;
      res.className = "gh-result " + (ok ? "ok" : "err");
    }

    var test = $("[data-gh-test]");
    if (test) test.addEventListener("click", function () {
      decir("Probando…", true);
      VCS_GH.test(function (err, info) {
        if (err) { decir(err, false); return; }
        decir("Conectado con " + info.repo + " (rama " + info.branch + ") ✓", true);
        pintarEstadoPublicacion();
      });
    });

    var forget = $("[data-gh-forget]");
    if (forget) forget.addEventListener("click", function () {
      if (!confirm("¿Borrar la clave de acceso de este navegador?")) return;
      var cur = VCS_GH.cfg();
      delete cur.token;
      VCS_GH.saveCfg(cur);
      var t = $('[data-gh="token"]'); if (t) t.value = "";
      decir("Clave borrada de este navegador.", true);
      pintarEstadoPublicacion();
    });

    $$("[data-publish-now]").forEach(function (b) {
      b.addEventListener("click", function () { publicarAhora(b); });
    });
  }

  function bindPublish() {
    var exp = $("[data-export-manifest]");
    if (exp) exp.addEventListener("click", function () {
      S.download("manifest.js", S.buildManifest(data), "application/javascript");
      toast("manifest.js descargado — súbelo a la carpeta lib/ ✓", "ok");
    });

    var prev = $("[data-preview-manifest]");
    if (prev) prev.addEventListener("click", function () {
      var pre = $("[data-manifest-preview]");
      pre.hidden = !pre.hidden;
      if (!pre.hidden) pre.textContent = S.buildManifest(data);
    });

    var bk = $("[data-backup]");
    if (bk) bk.addEventListener("click", function () {
      S.download("respaldo-verona-" + new Date().toISOString().slice(0, 10) + ".json",
        JSON.stringify({ data: data, orders: orders }, null, 2), "application/json");
      toast("Respaldo descargado ✓", "ok");
    });

    var rs = $("[data-restore]");
    if (rs) rs.addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        try {
          var parsed = JSON.parse(r.result);
          if (!parsed || !parsed.data) throw new Error("formato");
          if (!confirm("Esto reemplazará el contenido actual. ¿Continuar?")) return;
          data = parsed.data;
          if (parsed.orders) { orders = parsed.orders; saveOrders(); }
          save(true);
          toast("Respaldo restaurado ✓", "ok");
          setTimeout(function () { location.reload(); }, 700);
        } catch (err) { toast("Ese archivo no es un respaldo válido", "err"); }
      };
      r.readAsText(f);
      this.value = "";
    });

    var rst = $("[data-reset]");
    if (rst) rst.addEventListener("click", function () {
      if (!confirm("¿Borrar todos los cambios guardados en este navegador y volver al contenido original?")) return;
      S.resetData();
      toast("Contenido restablecido", "ok");
      setTimeout(function () { location.reload(); }, 600);
    });
  }

  /* ================================================================= arranque */
  function boot() {
    safe(initTabs, "initTabs");
    safe(renderOrders, "renderOrders");
    safe(bindOrders, "bindOrders");
    safe(renderProducts, "renderProducts");
    safe(bindProducts, "bindProducts");
    safe(renderCats, "renderCats");
    safe(bindCats, "bindCats");
    safe(bindTeeFields, "bindTeeFields");
    safe(renderColors, "renderColors");
    safe(renderSizes, "renderSizes");
    safe(renderZones, "renderZones");
    safe(bindTees, "bindTees");
    safe(bindSettings, "bindSettings");
    safe(renderSteps, "renderSteps");
    safe(renderFaqs, "renderFaqs");
    safe(bindContentLists, "bindContentLists");
    safe(bindPublish, "bindPublish");
    safe(bindGitHub, "bindGitHub");
    safe(pintarEstadoPublicacion, "pintarEstadoPublicacion");
    if (data.settings) {
      if (data.settings.accent) document.documentElement.style.setProperty("--accent", data.settings.accent);
      if (data.settings.accent2) document.documentElement.style.setProperty("--accent-2", data.settings.accent2);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initLogin);
  else initLogin();
})();
