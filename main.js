/* =============================================================================
   main.js — Tienda Verona's Cute Shop
   Patrón IIFE. Sin módulos, sin dependencias obligatorias.
   ============================================================================= */
(function () {
  "use strict";

  var S = window.VCS;
  var TEE = window.VCS_TEE;
  if (!S) { console.error("[main] falta lib/store.js"); return; }

  /* ---------------------------------------------------------------- helpers */
  var $ = function (sel, sc) { return (sc || document).querySelector(sel); };
  var $$ = function (sel, sc) { return Array.prototype.slice.call((sc || document).querySelectorAll(sel)); };
  var esc = S.escHTML;
  var fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) { try { fn(); } catch (e) { console.warn("[" + name + "]", e); } }

  var data = S.read();
  var cart = S.getCart();

  /* Paleta suave determinista por producto (cuando no hay foto) */
  var PAIRS = [
    ["#ffe0ee", "#e7dcff"], ["#fff0d6", "#ffe0ee"], ["#d9f6ec", "#e7dcff"],
    ["#ffe4d6", "#ffd9ea"], ["#e3ecff", "#ffe0f0"], ["#f2e6ff", "#d9f6ec"]
  ];
  function pairFor(id) {
    var h = 0, s = String(id);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return PAIRS[h % PAIRS.length];
  }

  function toast(msg, kind) {
    var wrap = $("[data-toasts]");
    if (!wrap) return;
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.textContent = msg;
    wrap.appendChild(el);
    var dura = Math.min(14000, Math.max(3200, String(msg).length * 65));
    var cerrar = function () {
      el.style.transition = "opacity .4s, transform .4s";
      el.style.opacity = "0"; el.style.transform = "translateY(14px)";
      setTimeout(function () { el.remove(); }, 420);
    };
    el.addEventListener("click", cerrar);
    setTimeout(cerrar, dura);
  }

  function waLink(text) {
    var num = String((data.settings || {}).whatsapp || "").replace(/\D/g, "");
    var base = num ? "https://wa.me/" + num : "https://wa.me/";
    return base + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  /* =========================================================================
     1. Textos e identidad de marca
     ========================================================================= */
  function applyBrand() {
    var st = data.settings || {};
    var root = document.documentElement;
    if (st.accent) root.style.setProperty("--accent", st.accent);
    if (st.accent2) root.style.setProperty("--accent-2", st.accent2);

    var map = {
      "[data-brand-name]": st.name,
      "[data-brand-name2]": st.name2,
      "[data-brand-handle]": st.handle,
      "[data-brand-tagline]": st.tagline,
      "[data-brand-location]": st.location,
      "[data-brand-full]": (st.name || "") + " " + (st.name2 || ""),
      "[data-hero-title]": st.heroTitle,
      "[data-hero-title-em]": st.heroTitleEm,
      "[data-hero-sub]": st.heroSub,
      "[data-info-shipping]": st.shipping,
      "[data-info-payments]": st.payments,
      "[data-about-title]": st.aboutTitle,
      "[data-about-text]": st.aboutText,
      "[data-tee-title]": (data.tees || {}).title,
      "[data-tee-subtitle]": (data.tees || {}).subtitle,
      "[data-tee-desc]": (data.tees || {}).description,
      "[data-tee-guide-note]": (data.tees || {}).sizeGuideNote
    };
    Object.keys(map).forEach(function (sel) {
      if (map[sel] == null || map[sel] === "") return;
      $$(sel).forEach(function (el) { el.textContent = map[sel]; });
    });

    // logo propio: manda sobre el dibujo por defecto de la portada
    var heroLogo = $("[data-hero-logo]");
    if (heroLogo) {
      var hayLogo = !!st.logo;
      heroLogo.hidden = !hayLogo;
      if (hayLogo) {
        heroLogo.src = st.logo;
        heroLogo.alt = ((st.name || "") + " " + (st.name2 || "")).trim();
        var art = $(".hero-art");
        if (art) {
          art.classList.add("has-logo");     // esconde el orbe y los stickers
          art.setAttribute("aria-hidden", "false");
        }
      }
    }

    document.title = ((st.name || "") + " " + (st.name2 || "")).trim() + " · " + (st.tagline || "");
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    $$("[data-link-instagram]").forEach(function (a) { if (st.instagram) a.href = st.instagram; });
    $$("[data-link-whatsapp]").forEach(function (a) {
      a.href = waLink("¡Hola " + (st.name || "") + "! Vengo de la página web ✿");
      a.target = "_blank"; a.rel = "noopener";
    });

    // ticker
    var track = $("[data-ticker]");
    if (track && st.announcement) {
      var parts = String(st.announcement).split(/\s*[·✿|]\s*/).filter(Boolean);
      if (!parts.length) parts = [st.announcement];
      var html = parts.map(function (p) { return "<span>" + esc(p) + "</span>"; }).join("");
      track.innerHTML = html + html;
    }

    // pasos y faqs
    var steps = $("[data-steps]");
    if (steps && (data.steps || []).length) {
      steps.innerHTML = data.steps.map(function (s, i) {
        return '<article class="step reveal"><span class="step-n">' + ("0" + (i + 1)).slice(-2) + '</span>' +
          '<i>' + esc(s.emoji) + '</i><h3>' + esc(s.title) + '</h3><p>' + esc(s.text) + '</p></article>';
      }).join("");
    }
    var faqs = $("[data-faqs]");
    if (faqs && (data.faqs || []).length) {
      faqs.innerHTML = data.faqs.map(function (f, i) {
        return "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>";
      }).join("");
    }
  }

  /* =========================================================================
     2. Catálogo
     ========================================================================= */
  var activeCat = "all";

  function mountFilters() {
    var box = $("[data-filters]");
    if (!box) return;
    var visibles = (data.categories || []).filter(function (c) { return c.active !== false; });
    var cats = [{ id: "all", name: "Todo", emoji: "✿" }].concat(visibles);
    if (!visibles.some(function (c) { return c.id === activeCat; })) activeCat = "all";
    box.innerHTML = cats.map(function (c) {
      return '<button type="button" class="chip' + (c.id === activeCat ? " is-active" : "") +
        '" data-cat="' + esc(c.id) + '"><span>' + esc(c.emoji || "") + '</span>' + esc(c.name) + "</button>";
    }).join("");
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cat]");
      if (!b) return;
      activeCat = b.getAttribute("data-cat");
      $$(".chip", box).forEach(function (c) { c.classList.toggle("is-active", c === b); });
      mountProducts();
    });
  }

  function catName(id) {
    var c = (data.categories || []).filter(function (x) { return x.id === id; })[0];
    return c ? c.name : "";
  }

  function mediaHTML(p) {
    var pair = pairFor(p.id);
    if (p.photo) {
      return '<div class="card-media"><img src="' + esc(p.photo) + '" alt="' + esc(p.name) + '" loading="lazy" decoding="async" /></div>';
    }
    return '<div class="card-media" style="--c1:' + pair[0] + ';--c2:' + pair[1] + '">' +
      '<span class="card-emoji" role="img" aria-label="' + esc(p.name) + '">' + esc(p.emoji || "🎁") + "</span></div>";
  }

  function badgeHTML(p) {
    var out = [];
    if (!p.stock) out.push('<span class="pill pill-out">Agotado</span>');
    if (p.badge) {
      var cls = /oferta|descuento/i.test(p.badge) ? "pill-off" : (/nuevo/i.test(p.badge) ? "pill-new" : "pill-top");
      out.push('<span class="pill ' + cls + '">' + esc(p.badge) + "</span>");
    }
    if (p.compareAt && S.num(p.compareAt) > S.num(p.price) && !/oferta/i.test(p.badge || "")) {
      out.push('<span class="pill pill-off">-' + Math.round((1 - S.num(p.price) / S.num(p.compareAt)) * 100) + "%</span>");
    }
    return out.length ? '<div class="card-badges">' + out.join("") + "</div>" : "";
  }

  function priceHTML(p) {
    var html = S.money(p.price);
    if (p.compareAt && S.num(p.compareAt) > S.num(p.price)) html += "<s>" + S.money(p.compareAt) + "</s>";
    return html;
  }

  function mountProducts() {
    var box = $("[data-products]");
    if (!box) return;
    var list = (data.products || []).filter(function (p) {
      if (!S.catActiva(data, p.category)) return false;   // categoría apagada desde el panel
      return activeCat === "all" || p.category === activeCat;
    });
    if (!list.length) {
      box.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><b>Todavía no hay nada por aquí ✿</b>' +
        "Pronto subimos productos de esta categoría.</div>";
      return;
    }
    box.innerHTML = list.map(function (p) {
      return '<article class="card reveal' + (p.stock ? "" : " is-out") + '" data-product="' + esc(p.id) + '" data-tilt>' +
        mediaHTML(p) + badgeHTML(p) +
        '<button class="card-fav" type="button" aria-label="Ver detalle de ' + esc(p.name) + '">👀</button>' +
        '<div class="card-body">' +
          '<span class="card-cat">' + esc(catName(p.category)) + "</span>" +
          "<h3>" + esc(p.name) + "</h3>" +
          '<p class="card-desc">' + esc(p.description || "") + "</p>" +
          '<div class="card-foot"><span class="price">' + priceHTML(p) + "</span>" +
          '<button class="card-add" type="button" data-add="' + esc(p.id) + '" aria-label="Agregar ' + esc(p.name) + ' al carrito">+</button></div>' +
        "</div></article>";
    }).join("");

    revealScan(box);
    bindTilt(box);
    if (autoScroll) autoScroll.reset();
  }

  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      e.preventDefault();
      openProduct(add.getAttribute("data-add"));
      return;
    }
    var card = e.target.closest("[data-product]");
    if (card && !e.target.closest("a")) openProduct(card.getAttribute("data-product"));
  });

  /* ---------------------------------------------------- modal de producto */
  function openProduct(id) {
    var p = S.findProduct(data, id);
    if (!p) return;
    var card = $("[data-product-modal-card]");
    var opts = (p.options || []).filter(function (o) { return o.values && o.values.length; });

    card.innerHTML =
      '<div class="modal-head"><div><span class="kicker">' + esc(catName(p.category)) + "</span>" +
      "<h3>" + esc(p.name) + '</h3></div><button class="icon-btn" type="button" data-modal-close aria-label="Cerrar">✕</button></div>' +
      mediaHTML(p).replace('class="card-media"', 'class="card-media" style="border-radius:var(--r-lg);aspect-ratio:16/10;' +
        (p.photo ? "" : "--c1:" + pairFor(p.id)[0] + ";--c2:" + pairFor(p.id)[1]) + '"') +
      '<div style="display:grid;gap:.9rem;margin-top:1rem">' +
        '<p style="color:var(--ink-soft)">' + esc(p.description || "") + "</p>" +
        opts.map(function (o, i) {
          return '<div class="field"><label>' + esc(o.name) + "</label><select data-opt=\"" + esc(o.name) + '">' +
            o.values.map(function (v) { return "<option>" + esc(v) + "</option>"; }).join("") + "</select></div>";
        }).join("") +
        '<div class="field"><label>Cantidad</label>' +
          '<div class="qty" style="justify-self:start"><button type="button" data-q="-1">−</button>' +
          '<span data-qty>1</span><button type="button" data-q="1">+</button></div></div>' +
        '<div class="drawer-total"><span>Precio</span><span class="price">' + priceHTML(p) + "</span></div>" +
        (p.stock
          ? '<button class="btn btn-primary btn-block" type="button" data-confirm-add="' + esc(p.id) + '">Agregar al carrito 🛒</button>'
          : '<button class="btn btn-ghost btn-block" type="button" disabled>Agotado por ahora 😿</button>') +
      "</div>";

    openModal("[data-product-modal]");

    var qty = 1;
    card.addEventListener("click", function (e) {
      var q = e.target.closest("[data-q]");
      if (q) {
        qty = Math.max(1, Math.min(99, qty + parseInt(q.getAttribute("data-q"), 10)));
        $("[data-qty]", card).textContent = qty;
        return;
      }
      var conf = e.target.closest("[data-confirm-add]");
      if (conf) {
        var chosen = $$("[data-opt]", card).map(function (sel) {
          return sel.getAttribute("data-opt") + ": " + sel.value;
        });
        addToCart({
          id: S.uid("ci"), type: "product", ref: p.id,
          name: p.name, emoji: p.emoji || "🎁", photo: p.photo || "",
          price: S.num(p.price), qty: qty,
          meta: chosen.join(" · ")
        });
        closeModal("[data-product-modal]");
      }
    });
  }

  /* =========================================================================
     3. Carrito
     ========================================================================= */
  function persistCart() {
    var res = S.setCart(cart);
    if (!res.ok) toast(res.error, "err");
  }

  function addToCart(item) {
    if (item.type === "product") {
      var same = cart.filter(function (c) {
        return c.type === "product" && c.ref === item.ref && c.meta === item.meta;
      })[0];
      if (same) { same.qty += item.qty; }
      else cart.push(item);
    } else {
      cart.push(item);
    }
    persistCart();
    renderCart();
    toast("¡Agregado al carrito! ✿", "ok");
    bumpCart();
  }

  function bumpCart() {
    var btn = $("[data-cart-open]");
    if (!btn) return;
    btn.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.25) rotate(-10deg)" }, { transform: "scale(1)" }],
      { duration: 460, easing: "cubic-bezier(.34,1.56,.64,1)" }
    );
  }

  function renderCart() {
    var box = $("[data-cart-items]");
    var count = cart.reduce(function (s, i) { return s + S.num(i.qty, 1); }, 0);
    var badge = $("[data-cart-count]");
    if (badge) { badge.textContent = count; badge.classList.toggle("is-on", count > 0); }

    var total = S.cartTotal(cart);
    $$("[data-cart-total]").forEach(function (el) { el.textContent = S.money(total); });
    $$("[data-checkout-total]").forEach(function (el) { el.textContent = S.money(total); });

    if (!box) return;
    if (!cart.length) {
      box.innerHTML = '<div class="empty-state"><b>Tu carrito está vacío ✿</b>Agrega algo lindo desde el catálogo.</div>';
      return;
    }
    box.innerHTML = cart.map(function (it) {
      var thumb = it.design && it.design.preview
        ? '<img src="' + esc(it.design.preview) + '" alt="Diseño de la franela" />'
        : (it.photo ? '<img src="' + esc(it.photo) + '" alt="" />' : esc(it.emoji || "🎁"));
      return '<div class="cart-item">' +
        '<div class="cart-thumb">' + thumb + "</div>" +
        '<div class="cart-info"><b>' + esc(it.name) + "</b>" +
          (it.meta ? "<small>" + esc(it.meta) + "</small>" : "") +
          '<div class="qty" style="justify-self:start;margin-top:.25rem">' +
            '<button type="button" data-cq="-1" data-id="' + esc(it.id) + '">−</button>' +
            "<span>" + S.num(it.qty, 1) + "</span>" +
            '<button type="button" data-cq="1" data-id="' + esc(it.id) + '">+</button></div>' +
        "</div>" +
        '<div class="cart-right"><span class="price" style="font-size:1.05rem">' + S.money(S.num(it.price) * S.num(it.qty, 1)) + "</span>" +
        '<button class="cart-remove" type="button" data-cdel="' + esc(it.id) + '">quitar</button></div>' +
        "</div>";
    }).join("");
  }

  function bindCart() {
    var box = $("[data-cart-items]");
    if (box) {
      box.addEventListener("click", function (e) {
        var q = e.target.closest("[data-cq]");
        if (q) {
          var id = q.getAttribute("data-id");
          cart.forEach(function (it) {
            if (it.id === id) it.qty = Math.max(1, S.num(it.qty, 1) + parseInt(q.getAttribute("data-cq"), 10));
          });
          persistCart(); renderCart(); return;
        }
        var d = e.target.closest("[data-cdel]");
        if (d) {
          cart = cart.filter(function (it) { return it.id !== d.getAttribute("data-cdel"); });
          persistCart(); renderCart();
        }
      });
    }
    var open = $("[data-cart-open]"), close = $("[data-cart-close]"), ov = $("[data-overlay]");
    var drawer = $("[data-cart-drawer]");
    function setOpen(v) {
      if (!drawer) return;
      drawer.classList.toggle("is-open", v);
      drawer.setAttribute("aria-hidden", v ? "false" : "true");
      if (ov) ov.classList.toggle("is-open", v);
      document.body.style.overflow = v ? "hidden" : "";
    }
    if (open) open.addEventListener("click", function () { setOpen(true); });
    if (close) close.addEventListener("click", function () { setOpen(false); });
    if (ov) ov.addEventListener("click", function () { setOpen(false); closeModal("[data-product-modal]"); closeModal("[data-checkout-modal]"); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setOpen(false); closeModal("[data-product-modal]"); closeModal("[data-checkout-modal]"); }
    });
    window.__closeCart = function () { setOpen(false); };
  }

  /* ------------------------------------------------------------- modales */
  function openModal(sel) {
    var m = $(sel); if (!m) return;
    m.classList.add("is-open");
    var ov = $("[data-overlay]"); if (ov) ov.classList.add("is-open");
    document.body.style.overflow = "hidden";
  }
  function closeModal(sel) {
    var m = $(sel); if (!m) return;
    m.classList.remove("is-open");
    var anyOpen = $$(".modal.is-open").length || ($("[data-cart-drawer]") || {}).classList && $("[data-cart-drawer]").classList.contains("is-open");
    if (!anyOpen) {
      var ov = $("[data-overlay]"); if (ov) ov.classList.remove("is-open");
      document.body.style.overflow = "";
    }
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-modal-close]")) closeModal("[data-product-modal]");
    if (e.target.closest("[data-checkout-close]")) closeModal("[data-checkout-modal]");
  });

  /* =========================================================================
     4. Personalizador de franelas
     ========================================================================= */
  var design = null;

  function zonesFor(side) {
    return ((data.tees || {}).zones || []).filter(function (z) { return z.side === side; });
  }

  /* La sección de franelas se puede apagar desde el panel: se esconde la
     sección entera y todos los enlaces que llevan a ella. */
  function teeVisible() {
    return (data.tees || {}).active !== false;
  }

  function applyTeeVisibility() {
    var on = teeVisible();
    var sec = document.getElementById("franelas");
    if (sec) sec.hidden = !on;
    $$('a[href="#franelas"], a[href="#medidas"], [data-tee-only]').forEach(function (el) {
      var host = el.closest("li") || el;
      host.hidden = !on;
    });
    return on;
  }

  function initTee() {
    if (!teeVisible()) return;
    var svg = $("[data-tee-svg]");
    if (!svg || !TEE) return;
    var t = data.tees || {};
    var colors = t.colors || [{ name: "Blanco", hex: "#ffffff" }];
    var sizes = t.sizes || [];
    var midSize = sizes[Math.min(2, sizes.length - 1)] || sizes[0] || { id: "M" };

    design = {
      color: colors[0],
      size: midSize.id,
      side: "front",
      zone: { front: (zonesFor("front")[0] || {}).id || null, back: (zonesFor("back")[0] || {}).id || null },
      placements: { front: null, back: null },
      note: ""
    };

    mountColors(); mountSizes(); mountZones(); mountSizesTable();
    renderTee(); updatePrice();
    bindTeeEvents();
  }

  function mountColors() {
    var box = $("[data-tee-colors]"); if (!box) return;
    var colors = (data.tees || {}).colors || [];
    box.innerHTML = colors.map(function (c, i) {
      var dark = TEE.isDark(c.hex);
      return '<button type="button" class="swatch' + (i === 0 ? " is-active" : "") + '" data-color="' + i +
        '" style="background:' + esc(c.hex) + ";--check:" + (dark ? "#fff" : "#3a2233") + '" title="' + esc(c.name) +
        '" aria-label="Color ' + esc(c.name) + '"></button>';
    }).join("");
    var nm = $("[data-tee-color-name]"); if (nm && colors[0]) nm.textContent = "· " + colors[0].name;
  }

  function mountSizes() {
    var box = $("[data-tee-sizes]"); if (!box) return;
    box.innerHTML = ((data.tees || {}).sizes || []).map(function (s) {
      return '<button type="button" class="size-btn' + (s.id === design.size ? " is-active" : "") +
        '" data-size="' + esc(s.id) + '">' + esc(s.name || s.id) + "</button>";
    }).join("");
    updateSizeInfo();
  }

  function updateSizeInfo() {
    var el = $("[data-tee-size-info]"); if (!el) return;
    var s = S.findSize(data, design.size);
    el.textContent = s
      ? "Talla " + (s.name || s.id) + ": ancho " + s.chest + " cm · largo " + s.length + " cm · manga " + s.sleeve + " cm"
      : "";
  }

  function mountZones() {
    var box = $("[data-tee-zones]"); if (!box) return;
    var list = zonesFor(design.side);
    box.innerHTML = list.map(function (z) {
      return '<button type="button" class="zone-btn' + (z.id === design.zone[design.side] ? " is-active" : "") +
        '" data-zone="' + esc(z.id) + '"><span>' + esc(z.name) + "</span>" +
        "<small>" + (S.num(z.extra) > 0 ? "+" + S.money(z.extra) : "incluido") + "</small></button>";
    }).join("");
  }

  function currentZone() { return S.findZone(data, design.zone[design.side]); }

  function renderTee() {
    var svg = $("[data-tee-svg]"); if (!svg) return;
    var z = currentZone();
    var pl = design.placements[design.side];
    svg.innerHTML = TEE.svgMarkup({
      side: design.side,
      hex: (design.color || {}).hex || "#ffffff",
      area: z ? z.area : null,
      art: pl,
      showArea: !!z,
      uid: design.side
    });
    var hint = $("[data-tee-hint]");
    if (hint) hint.textContent = pl ? "Arrastra tu imagen para moverla ✿" : "Elige la zona y sube tu imagen ✿";
    var ctrls = $("[data-tee-controls]");
    if (ctrls) ctrls.hidden = !pl;
    if (pl) {
      var sc = $("[data-tee-scale]"), ro = $("[data-tee-rot]");
      if (sc) { sc.value = Math.round((pl.w / pl.baseW) * 100); $("[data-tee-scale-val]").textContent = sc.value + "%"; }
      if (ro) { ro.value = Math.round(pl.rot || 0); $("[data-tee-rot-val]").textContent = ro.value + "°"; }
    }
    updateUploadBox();
  }

  function updateArt() {
    var svg = $("[data-tee-svg]");
    var img = svg && svg.querySelector("[data-art-img]");
    var pl = design.placements[design.side];
    if (!img || !pl) return;
    img.setAttribute("x", pl.x - pl.w / 2);
    img.setAttribute("y", pl.y - pl.h / 2);
    img.setAttribute("width", pl.w);
    img.setAttribute("height", pl.h);
    img.setAttribute("transform", "rotate(" + (pl.rot || 0) + " " + pl.x + " " + pl.y + ")");
  }

  function updateUploadBox() {
    var box = $("[data-tee-upload]"); if (!box) return;
    var pl = design.placements[design.side];
    var has = !!(pl && pl.img);
    box.classList.toggle("has-img", has);
    var thumb = box.querySelector(".upload-thumb");
    if (has) {
      if (!thumb) {
        thumb = document.createElement("img");
        thumb.className = "upload-thumb"; thumb.alt = "Tu diseño";
        box.insertBefore(thumb, box.firstChild);
      }
      thumb.src = pl.img;
    } else if (thumb) { thumb.remove(); }
  }

  function updatePrice() {
    var el = $("[data-tee-price]"); if (!el) return;
    var p = S.teePrice(data, {
      size: design.size,
      placements: design.placements
    });
    el.innerHTML = S.money(p) + " <small>c/u</small>";
  }

  function placeImage(dataUrl, ratio) {
    var z = currentZone();
    if (!z) { toast("Elige primero dónde va el estampado", "err"); return; }
    var a = z.area;
    var maxW = a.w * 0.92, maxH = a.h * 0.92;
    var w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    design.placements[design.side] = {
      zone: z.id, img: dataUrl, ratio: ratio,
      x: a.x + a.w / 2, y: a.y + a.h / 2,
      w: w, h: h, baseW: w, rot: 0
    };
    renderTee(); updatePrice();
  }

  function bindTeeEvents() {
    // color
    var colorsBox = $("[data-tee-colors]");
    if (colorsBox) colorsBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-color]"); if (!b) return;
      var i = parseInt(b.getAttribute("data-color"), 10);
      design.color = ((data.tees || {}).colors || [])[i];
      $$(".swatch", colorsBox).forEach(function (s) { s.classList.toggle("is-active", s === b); });
      var nm = $("[data-tee-color-name]"); if (nm) nm.textContent = "· " + design.color.name;
      renderTee();
    });

    // talla
    var sizesBox = $("[data-tee-sizes]");
    if (sizesBox) sizesBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-size]"); if (!b) return;
      design.size = b.getAttribute("data-size");
      $$(".size-btn", sizesBox).forEach(function (s) { s.classList.toggle("is-active", s === b); });
      updateSizeInfo(); updatePrice();
    });

    // lado
    var sidesBox = $("[data-tee-sides]");
    if (sidesBox) sidesBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-side]"); if (!b) return;
      design.side = b.getAttribute("data-side");
      $$("button", sidesBox).forEach(function (s) { s.classList.toggle("is-active", s === b); });
      mountZones(); renderTee();
    });

    // zona
    var zonesBox = $("[data-tee-zones]");
    if (zonesBox) zonesBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-zone]"); if (!b) return;
      var id = b.getAttribute("data-zone");
      design.zone[design.side] = id;
      $$(".zone-btn", zonesBox).forEach(function (s) { s.classList.toggle("is-active", s === b); });
      var pl = design.placements[design.side];
      if (pl) { placeImage(pl.img, pl.ratio); } else { renderTee(); }
      updatePrice();
    });

    // subir imagen
    var file = $("[data-tee-file]");
    if (file) file.addEventListener("change", function () {
      var f = this.files && this.files[0];
      if (!f) return;
      S.readImage(f, 900, 0.86, function (err, out) {
        if (err) { toast(err, "err"); return; }
        placeImage(out.dataUrl, out.ratio);
        toast("¡Imagen lista! Ahora muévela y ajústala ✿", "ok");
      });
      this.value = "";
    });

    // arrastrar y soltar sobre el escenario
    var stage = $("[data-tee-stage]");
    if (stage) {
      ["dragenter", "dragover"].forEach(function (ev) {
        stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.add("is-drop"); });
      });
      ["dragleave", "drop"].forEach(function (ev) {
        stage.addEventListener(ev, function (e) { e.preventDefault(); stage.classList.remove("is-drop"); });
      });
      stage.addEventListener("drop", function (e) {
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!f) return;
        S.readImage(f, 900, 0.86, function (err, out) {
          if (err) { toast(err, "err"); return; }
          placeImage(out.dataUrl, out.ratio);
        });
      });
    }

    // sliders
    var sc = $("[data-tee-scale]");
    if (sc) sc.addEventListener("input", function () {
      var pl = design.placements[design.side]; if (!pl) return;
      var k = S.num(this.value, 100) / 100;
      pl.w = pl.baseW * k; pl.h = pl.w / pl.ratio;
      $("[data-tee-scale-val]").textContent = Math.round(k * 100) + "%";
      updateArt();
    });
    var ro = $("[data-tee-rot]");
    if (ro) ro.addEventListener("input", function () {
      var pl = design.placements[design.side]; if (!pl) return;
      pl.rot = S.num(this.value, 0);
      $("[data-tee-rot-val]").textContent = Math.round(pl.rot) + "°";
      updateArt();
    });

    var center = $("[data-tee-center]");
    if (center) center.addEventListener("click", function () {
      var pl = design.placements[design.side], z = currentZone(); if (!pl || !z) return;
      pl.x = z.area.x + z.area.w / 2; pl.y = z.area.y + z.area.h / 2;
      updateArt();
    });
    var reset = $("[data-tee-reset]");
    if (reset) reset.addEventListener("click", function () {
      var pl = design.placements[design.side]; if (!pl) return;
      placeImage(pl.img, pl.ratio);
    });
    var rm = $("[data-tee-remove]");
    if (rm) rm.addEventListener("click", function () {
      design.placements[design.side] = null;
      renderTee(); updatePrice();
    });

    var note = $("[data-tee-note]");
    if (note) note.addEventListener("input", function () { design.note = this.value; });

    bindTeeDrag();

    var addBtn = $("[data-tee-add]");
    if (addBtn) addBtn.addEventListener("click", addTeeToCart);
  }

  /* ------------------------------------------------ arrastrar el estampado */
  function bindTeeDrag() {
    var svg = $("[data-tee-svg]"); if (!svg) return;
    var dragging = false, startX = 0, startY = 0, origX = 0, origY = 0, k = 1;

    svg.addEventListener("pointerdown", function (e) {
      var img = e.target.closest("[data-art-img]");
      if (!img) return;
      var pl = design.placements[design.side]; if (!pl) return;
      dragging = true;
      var r = svg.getBoundingClientRect();
      k = TEE.VB.w / r.width;
      startX = e.clientX; startY = e.clientY;
      origX = pl.x; origY = pl.y;
      svg.classList.add("is-dragging");
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });

    svg.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var pl = design.placements[design.side], z = currentZone();
      if (!pl || !z) return;
      var nx = origX + (e.clientX - startX) * k;
      var ny = origY + (e.clientY - startY) * k;
      var a = z.area, m = 12;
      pl.x = Math.max(a.x - m, Math.min(a.x + a.w + m, nx));
      pl.y = Math.max(a.y - m, Math.min(a.y + a.h + m, ny));
      updateArt();
      e.preventDefault();
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(function (ev) {
      svg.addEventListener(ev, function (e) {
        if (!dragging) return;
        dragging = false;
        svg.classList.remove("is-dragging");
        try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
      });
    });
  }

  /* ------------------------------------------------- agregar tee al carrito */
  function addTeeToCart() {
    if (!design.placements.front && !design.placements.back) {
      toast("Sube al menos una imagen para tu franela ✿", "err");
      var f = $("[data-tee-file]"); if (f) f.focus();
      return;
    }
    var price = S.teePrice(data, { size: design.size, placements: design.placements });
    var zn = [];
    ["front", "back"].forEach(function (s) {
      var pl = design.placements[s];
      if (pl) { var z = S.findZone(data, pl.zone); if (z) zn.push(z.name); }
    });

    var snapshot = {
      color: design.color,
      size: design.size,
      note: design.note || "",
      placements: JSON.parse(JSON.stringify(design.placements)),
      preview: ""
    };

    TEE.renderMockup(snapshot, data, 0.62, function (canvas) {
      try { snapshot.preview = canvas.toDataURL("image/jpeg", 0.72); } catch (e) { snapshot.preview = ""; }
      addToCart({
        id: S.uid("tee"), type: "tee", ref: "tee",
        name: (data.tees || {}).productName || "Franela personalizada",
        emoji: "👕", photo: "",
        price: price, qty: 1,
        meta: [(design.color || {}).name, "Talla " + design.size].concat(zn).join(" · "),
        design: snapshot
      });
    });
  }

  /* ------------------------------------------------------ tabla de medidas */
  function mountSizesTable() {
    var tb = $("[data-sizes-table]"); if (!tb) return;
    tb.innerHTML = ((data.tees || {}).sizes || []).map(function (s) {
      return "<tr><td>" + esc(s.name || s.id) + "</td><td>" + esc(s.chest) + " cm</td><td>" +
        esc(s.length) + " cm</td><td>" + esc(s.sleeve) + " cm</td></tr>";
    }).join("");
  }

  /* =========================================================================
     5. Checkout
     ========================================================================= */
  function bindCheckout() {
    var open = $("[data-checkout-open]");
    if (open) open.addEventListener("click", function () {
      if (!cart.length) { toast("Tu carrito está vacío ✿", "err"); return; }
      if (window.__closeCart) window.__closeCart();
      renderCart();
      openModal("[data-checkout-modal]");
    });

    var form = $("[data-checkout-form]");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      if (!cart.length) { toast("Tu carrito está vacío ✿", "err"); return; }

      var fd = new FormData(form);
      var order = {
        code: S.orderCode(),
        createdAt: new Date().toISOString(),
        status: "nuevo",
        customer: {
          name: String(fd.get("name") || "").trim(),
          phone: String(fd.get("phone") || "").trim(),
          city: String(fd.get("city") || "").trim(),
          delivery: String(fd.get("delivery") || ""),
          pay: String(fd.get("pay") || ""),
          note: String(fd.get("note") || "").trim()
        },
        items: JSON.parse(JSON.stringify(cart)),
        total: S.cartTotal(cart)
      };

      // guardar localmente (visible en el panel admin de este dispositivo)
      var res = S.addOrder(order);
      if (!res.ok) toast(res.error, "err");
      else if (res.warning) toast(res.warning, "err");

      // descargar los diseños para adjuntar en WhatsApp
      var downloads = 0;
      order.items.forEach(function (it, idx) {
        if (it.type !== "tee" || !it.design) return;
        downloads++;
        if (it.design.preview) {
          S.download("diseno-" + order.code + "-" + (idx + 1) + ".jpg", dataUrlToBlob(it.design.preview));
        }
        ["front", "back"].forEach(function (side) {
          var pl = it.design.placements && it.design.placements[side];
          if (pl && pl.img) {
            S.download("imagen-" + order.code + "-" + (idx + 1) + "-" + (side === "front" ? "frente" : "espalda") + ".png",
              dataUrlToBlob(pl.img));
          }
        });
      });

      // abrir WhatsApp
      var url = waLink(orderText(order));
      window.open(url, "_blank", "noopener");

      // limpiar
      cart = []; S.clearCart(); renderCart();
      closeModal("[data-checkout-modal]");
      showSuccess(order, downloads > 0);
      form.reset();
    });
  }

  function dataUrlToBlob(durl) {
    var parts = String(durl).split(",");
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/png";
    var bin = atob(parts[1] || "");
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function orderText(o) {
    var st = data.settings || {};
    var L = [];
    L.push("¡Hola " + ((st.name || "") + " " + (st.name2 || "")).trim() + "! Quiero hacer este pedido ✿");
    L.push("");
    L.push("*Pedido " + o.code + "*");
    o.items.forEach(function (it) {
      L.push("• " + it.qty + "x " + it.name + (it.meta ? " (" + it.meta + ")" : "") + " — " + S.money(S.num(it.price) * S.num(it.qty, 1)));
      if (it.type === "tee" && it.design) {
        ["front", "back"].forEach(function (side) {
          var pl = it.design.placements && it.design.placements[side];
          if (!pl) return;
          var z = S.findZone(data, pl.zone);
          L.push("   ↳ " + (side === "front" ? "Frente" : "Espalda") + ": " + (z ? z.name : pl.zone) +
            " · tamaño " + Math.round((pl.w / pl.baseW) * 100) + "% · rotación " + Math.round(pl.rot || 0) + "°");
        });
        if (it.design.note) L.push("   ↳ Nota: " + it.design.note);
      }
    });
    L.push("");
    L.push("*Total: " + S.money(o.total) + "*");
    L.push("");
    L.push("Nombre: " + o.customer.name);
    L.push("Teléfono: " + o.customer.phone);
    L.push("Ciudad: " + o.customer.city);
    L.push("Entrega: " + o.customer.delivery);
    L.push("Pago: " + o.customer.pay);
    if (o.customer.note) L.push("Nota: " + o.customer.note);
    return L.join("\n");
  }

  function showSuccess(order, hasDesign) {
    var card = $("[data-product-modal-card]");
    if (!card) return;
    card.innerHTML =
      '<div style="display:grid;gap:1rem;text-align:center;justify-items:center;padding:.5rem 0">' +
      '<svg class="success-check" viewBox="0 0 80 80" fill="none" stroke="#1f9d76" stroke-width="5" stroke-linecap="round">' +
      '<circle cx="40" cy="40" r="34"/><path d="M24 42 l12 12 l22 -26"/></svg>' +
      "<h3>¡Pedido " + esc(order.code) + " listo!</h3>" +
      '<p style="color:var(--ink-soft)">Se abrió WhatsApp con tu pedido escrito. Solo tienes que enviarlo ✿</p>' +
      (hasDesign
        ? '<p style="color:var(--ink-soft);font-size:.92rem">Descargamos la imagen de tu diseño: <b>adjúntala en el chat</b> para que quede perfecta.</p>'
        : "") +
      '<a class="btn btn-primary" href="' + esc(waLink(orderText(order))) + '" target="_blank" rel="noopener">Abrir WhatsApp otra vez 💬</a>' +
      '<button class="btn btn-ghost" type="button" data-modal-close>Seguir comprando</button></div>';
    openModal("[data-product-modal]");
  }

  /* =========================================================================
     6. Navegación, revelados y micro-interacciones
     ========================================================================= */
  function initNav() {
    var nav = $("[data-nav]");
    var toggle = $("[data-nav-toggle]");
    var drawer = $("[data-nav-drawer]");
    if (toggle && drawer) {
      toggle.addEventListener("click", function () {
        var open = drawer.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.textContent = open ? "✕" : "☰";
      });
      drawer.addEventListener("click", function (e) {
        if (e.target.closest("a")) {
          drawer.classList.remove("is-open");
          toggle.textContent = "☰";
          toggle.setAttribute("aria-expanded", "false");
        }
      });
    }
    if (nav) {
      var onScroll = function () { nav.classList.toggle("is-stuck", window.scrollY > 24); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    // enlaces internos con offset
    document.addEventListener("click", function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 92,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
      });
    });
  }

  var io = null;
  function initReveals() {
    if (!("IntersectionObserver" in window)) {
      $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-visible");
        io.unobserve(en.target);
      });
    }, { threshold: 0.02, rootMargin: "0px 0px -3% 0px" });
    revealScan(document);

    // red de seguridad: a los 6 s se muestra todo lo visible en pantalla
    setTimeout(function () {
      $$(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.2) el.classList.add("is-visible");
      });
    }, 6000);
  }
  function revealScan(root) {
    if (!io) { $$(".reveal", root).forEach(function (el) { el.classList.add("is-visible"); }); return; }
    $$(".reveal", root).forEach(function (el, i) {
      if (el.dataset.revealBound) return;
      el.dataset.revealBound = "1";
      el.style.transitionDelay = Math.min(i * 45, 320) + "ms";
      io.observe(el);
    });
  }

  function bindTilt(root) {
    if (!fineHover) return;
    $$("[data-tilt]", root).forEach(function (card) {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = "1";
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(760px) rotateY(" + (px * 8).toFixed(2) +
          "deg) rotateX(" + (-py * 8).toFixed(2) + "deg) translateY(-6px)";
      });
      card.addEventListener("mouseout", function (e) {
        if (card.contains(e.relatedTarget)) return;
        card.style.transform = "";
      });
    });
  }

  function initMagnetic() {
    if (!fineHover) return;
    $$("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        btn.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + "px," +
          ((e.clientY - r.top - r.height / 2) * 0.28).toFixed(1) + "px) scale(1.04)";
      });
      btn.addEventListener("mouseout", function (e) {
        if (btn.contains(e.relatedTarget)) return;
        btn.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------------
     Carrusel automático del catálogo (sólo en móvil).
     Avanza lento hacia un lado y, al llegar al final, regresa hacia el otro.
     Se detiene mientras el cliente lo toca y cuando no está en pantalla.
     ------------------------------------------------------------------------ */
  var autoScroll = null;

  function initCatalogAuto() {
    var track = $("[data-products]");
    if (!track) return;

    var mq = matchMedia("(max-width: 719px)");
    var SPEED = 20;               // píxeles por segundo — bien lento
    var IDLE = 2600;              // ms sin tocar antes de volver a moverse

    autoScroll = {
      dir: 1, pos: 0, paused: false, last: 0, timer: null,
      reset: function () { this.pos = 0; this.dir = 1; track.scrollLeft = 0; }
    };

    function hold() {
      autoScroll.paused = true;
      clearTimeout(autoScroll.timer);
      autoScroll.timer = setTimeout(function () { autoScroll.paused = false; }, IDLE);
    }
    ["pointerdown", "touchstart", "wheel"].forEach(function (ev) {
      track.addEventListener(ev, hold, { passive: true });
    });
    track.addEventListener("pointerup", hold, { passive: true });

    mq.addEventListener ? mq.addEventListener("change", function () { autoScroll.reset(); })
                        : mq.addListener(function () { autoScroll.reset(); });

    function step(t) {
      requestAnimationFrame(step);
      if (!mq.matches) { autoScroll.last = 0; return; }

      var dt = autoScroll.last ? Math.min(64, t - autoScroll.last) : 16;
      autoScroll.last = t;
      if (autoScroll.paused) return;

      // sólo se mueve cuando el catálogo está en pantalla
      var r = track.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;

      var max = track.scrollWidth - track.clientWidth;
      if (max <= 4) return;

      // si el cliente movió el carrusel a mano, seguimos desde donde lo dejó
      if (Math.abs(autoScroll.pos - track.scrollLeft) > 2) autoScroll.pos = track.scrollLeft;

      autoScroll.pos += autoScroll.dir * SPEED * dt / 1000;
      if (autoScroll.pos >= max) { autoScroll.pos = max; autoScroll.dir = -1; }
      else if (autoScroll.pos <= 0) { autoScroll.pos = 0; autoScroll.dir = 1; }
      track.scrollLeft = autoScroll.pos;
    }
    requestAnimationFrame(step);
  }

  function initParallax() {
    if (!window.gsap || !window.ScrollTrigger) return;
    var orb = $(".hero-orb");
    if (orb) {
      gsap.to(orb, {
        yPercent: 16, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
      });
    }
  }

  /* =========================================================================
     7. Arranque
     ========================================================================= */
  function boot() {
    safe(applyBrand, "applyBrand");
    safe(mountFilters, "mountFilters");
    safe(mountProducts, "mountProducts");
    safe(applyTeeVisibility, "applyTeeVisibility");
    safe(initTee, "initTee");
    safe(bindCart, "bindCart");
    safe(renderCart, "renderCart");
    safe(bindCheckout, "bindCheckout");
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initMagnetic, "initMagnetic");
    safe(initCatalogAuto, "initCatalogAuto");
    if (window.gsap && window.ScrollTrigger) {
      try { gsap.registerPlugin(ScrollTrigger); } catch (_) {}
      safe(initParallax, "initParallax");
    }
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
