/* =============================================================================
   tee.js — Dibujo de la franela (SVG para la web, canvas para exportar la
   imagen del pedido). Sistema de coordenadas único: viewBox 0 0 600 700.
   ============================================================================= */
(function () {
  "use strict";

  var VB = { w: 600, h: 700 };

  /* Silueta de la franela. Mismo cuerpo, distinto cuello según el lado. */
  var BODY_FRONT =
    "M232 62 C205 70 175 82 150 96 C118 118 86 146 62 176 " +
    "C84 210 108 242 130 270 C145 258 158 246 172 236 " +
    "C172 372 172 508 172 644 C258 658 342 658 428 644 " +
    "C428 508 428 372 428 236 C442 246 455 258 470 270 " +
    "C492 242 516 210 538 176 C514 146 482 118 450 96 " +
    "C425 82 395 70 368 62 C356 106 322 126 300 126 " +
    "C278 126 244 106 232 62 Z";

  var BODY_BACK =
    "M232 62 C205 70 175 82 150 96 C118 118 86 146 62 176 " +
    "C84 210 108 242 130 270 C145 258 158 246 172 236 " +
    "C172 372 172 508 172 644 C258 658 342 658 428 644 " +
    "C428 508 428 372 428 236 C442 246 455 258 470 270 " +
    "C492 242 516 210 538 176 C514 146 482 118 450 96 " +
    "C425 82 395 70 368 62 C360 92 332 106 300 106 " +
    "C268 106 240 92 232 62 Z";

  var COLLAR_FRONT = "M239 72 C252 108 276 122 300 122 C324 122 348 108 361 72";
  var COLLAR_BACK = "M239 72 C248 96 272 100 300 100 C328 100 352 96 361 72";

  /* Costuras suaves que dan volumen */
  var SEAMS = [
    "M172 236 C172 372 172 508 172 644",
    "M428 236 C428 372 428 508 428 644",
    "M130 270 C145 258 158 246 172 236",
    "M470 270 C455 258 442 246 428 236",
    "M172 626 C258 640 342 640 428 626"
  ];

  function bodyPath(side) { return side === "back" ? BODY_BACK : BODY_FRONT; }
  function collarPath(side) { return side === "back" ? COLLAR_BACK : COLLAR_FRONT; }

  /* ¿El color es oscuro? Para decidir el color de las costuras y del contorno */
  function isDark(hex) {
    var h = String(hex || "#fff").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16) || 0,
        g = parseInt(h.slice(2, 4), 16) || 0,
        b = parseInt(h.slice(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
  }

  /* --------------------------------------------------------------- SVG web */
  /* Devuelve el markup SVG interno (sin la etiqueta <svg>) */
  function svgMarkup(opts) {
    var side = opts.side || "front";
    var hex = opts.hex || "#ffffff";
    var dark = isDark(hex);
    var line = dark ? "rgba(255,255,255,.18)" : "rgba(58,34,51,.16)";
    var edge = dark ? "rgba(255,255,255,.22)" : "rgba(58,34,51,.22)";
    var clipId = "teeclip-" + (opts.uid || "a");

    var seams = SEAMS.map(function (d) {
      return '<path d="' + d + '" fill="none" stroke="' + line + '" stroke-width="2.5" stroke-linecap="round"/>';
    }).join("");

    var area = opts.area;
    var art = "";
    if (area) {
      art += '<defs><clipPath id="' + clipId + '"><rect x="' + area.x + '" y="' + area.y +
             '" width="' + area.w + '" height="' + area.h + '" rx="6"/></clipPath></defs>';
      art += '<g clip-path="url(#' + clipId + ')" data-art-layer>';
      if (opts.art && opts.art.img) {
        var a = opts.art;
        art += '<image href="' + a.img + '" xlink:href="' + a.img + '" ' +
               'x="' + (a.x - a.w / 2) + '" y="' + (a.y - a.h / 2) + '" ' +
               'width="' + a.w + '" height="' + a.h + '" ' +
               'transform="rotate(' + (a.rot || 0) + ' ' + a.x + ' ' + a.y + ')" ' +
               'preserveAspectRatio="none" data-art-img style="cursor:grab"/>';
      }
      art += '</g>';
      if (opts.showArea) {
        art += '<rect class="tee-area" x="' + area.x + '" y="' + area.y + '" width="' + area.w +
               '" height="' + area.h + '" rx="6" fill="none" stroke="' + (dark ? "rgba(255,255,255,.5)" : "rgba(255,95,162,.75)") +
               '" stroke-width="2" stroke-dasharray="8 7"/>';
      }
    }

    return (
      '<path d="' + bodyPath(side) + '" fill="' + hex + '" stroke="' + edge + '" stroke-width="2"/>' +
      '<path d="' + collarPath(side) + '" fill="none" stroke="' + edge + '" stroke-width="7" stroke-linecap="round"/>' +
      seams +
      art
    );
  }

  /* ------------------------------------------------------------ canvas PNG */
  function drawSide(ctx, opts, scale) {
    var hex = opts.hex || "#ffffff";
    var dark = isDark(hex);
    ctx.save();
    ctx.scale(scale, scale);

    var body = new Path2D(bodyPath(opts.side));
    ctx.fillStyle = hex;
    ctx.fill(body);
    ctx.strokeStyle = dark ? "rgba(255,255,255,.22)" : "rgba(58,34,51,.22)";
    ctx.lineWidth = 2;
    ctx.stroke(body);

    ctx.strokeStyle = dark ? "rgba(255,255,255,.22)" : "rgba(58,34,51,.22)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.stroke(new Path2D(collarPath(opts.side)));

    ctx.strokeStyle = dark ? "rgba(255,255,255,.18)" : "rgba(58,34,51,.16)";
    ctx.lineWidth = 2.5;
    SEAMS.forEach(function (d) { ctx.stroke(new Path2D(d)); });

    if (opts.area && opts.art && opts.art.img && opts.artImage) {
      var a = opts.art, ar = opts.area;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ar.x, ar.y, ar.w, ar.h);
      ctx.clip();
      ctx.translate(a.x, a.y);
      ctx.rotate((a.rot || 0) * Math.PI / 180);
      ctx.drawImage(opts.artImage, -a.w / 2, -a.h / 2, a.w, a.h);
      ctx.restore();
    }
    ctx.restore();
  }

  /* Carga las imágenes de arte y devuelve un canvas con 1 o 2 lados */
  function renderMockup(design, ctxData, scale, cb) {
    scale = scale || 1.2;
    var sides = [];
    ["front", "back"].forEach(function (s) {
      var pl = design.placements && design.placements[s];
      if (pl && pl.img) sides.push({ side: s, pl: pl });
    });
    if (!sides.length) sides.push({ side: "front", pl: null });

    var canvas = document.createElement("canvas");
    canvas.width = Math.round(VB.w * scale) * sides.length;
    canvas.height = Math.round(VB.h * scale);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff7fb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var pending = sides.length;
    var results = [];

    sides.forEach(function (entry, i) {
      var zone = entry.pl ? findZoneIn(ctxData, entry.pl.zone) : null;
      var opts = {
        side: entry.side,
        hex: (design.color && design.color.hex) || "#ffffff",
        area: zone ? zone.area : null,
        art: entry.pl
      };
      if (entry.pl && entry.pl.img) {
        var im = new Image();
        im.onload = function () { opts.artImage = im; results[i] = opts; done(); };
        im.onerror = function () { results[i] = opts; done(); };
        im.src = entry.pl.img;
      } else {
        results[i] = opts;
        done();
      }
      function done() {
        pending--;
        if (pending > 0) return;
        results.forEach(function (o, idx) {
          ctx.save();
          ctx.translate(Math.round(VB.w * scale) * idx, 0);
          drawSide(ctx, o, scale);
          ctx.restore();
        });
        cb(canvas);
      }
    });
  }

  function findZoneIn(data, id) {
    return ((data.tees || {}).zones || []).filter(function (z) { return z.id === id; })[0] || null;
  }

  window.VCS_TEE = {
    VB: VB,
    svgMarkup: svgMarkup,
    renderMockup: renderMockup,
    isDark: isDark,
    bodyPath: bodyPath
  };
})();
