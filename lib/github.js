/* =============================================================================
   github.js — Publica los cambios del panel directamente en GitHub.
   Así "Publicar" es un solo botón: sube lib/manifest.js al repositorio y
   GitHub actualiza la web sola en menos de un minuto.

   La clave de acceso (token) se guarda ÚNICAMENTE en el navegador de quien
   administra, en una gaveta aparte de los datos de la tienda. Nunca se
   incluye en el archivo que se publica ni en los respaldos.
   ============================================================================= */
(function () {
  "use strict";

  var KEY = "vcs_gh_v1";
  var API = "https://api.github.com";

  function cfg() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; }
  }

  function saveCfg(c) {
    try { localStorage.setItem(KEY, JSON.stringify(c)); return true; } catch (e) { return false; }
  }

  function forget() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function isReady() {
    var c = cfg();
    return !!(c.owner && c.repo && c.path && c.token);
  }

  /* Base64 que soporta acentos y emojis */
  function b64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function headers(c) {
    return {
      "Authorization": "Bearer " + c.token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json"
    };
  }

  function explain(status, body) {
    if (status === 401) return "La clave de acceso no es válida o ya venció. Genera una nueva en GitHub.";
    if (status === 403) return "La clave no tiene permiso para escribir en el repositorio. Revisa que le diste «Contents: Read and write».";
    if (status === 404) return "No se encontró el repositorio o la ruta. Revisa el usuario, el nombre del repositorio y la rama.";
    if (status === 409) return "Choque de versiones al guardar.";
    if (status === 422) return "GitHub rechazó el cambio: " + ((body && body.message) || "revisa la rama");
    return "Error de GitHub (" + status + "): " + ((body && body.message) || "sin detalle");
  }

  /* ------------------------------------------------------- probar conexión */
  function test(cb) {
    var c = cfg();
    if (!c.owner || !c.repo || !c.token) return cb("Faltan datos de conexión");
    fetch(API + "/repos/" + c.owner + "/" + c.repo, { headers: headers(c) })
      .then(function (r) {
        return r.json().then(function (body) {
          if (!r.ok) return cb(explain(r.status, body));
          if (body.permissions && !body.permissions.push) {
            return cb("La clave puede leer pero no escribir en el repositorio.");
          }
          cb(null, {
            repo: body.full_name,
            branch: c.branch || body.default_branch,
            privado: body.private
          });
        });
      })
      .catch(function () { cb("No hay conexión con GitHub. Revisa tu internet."); });
  }

  /* ---------------------------------------------------------- publicar */
  /* Sube el contenido al archivo indicado, reemplazando lo que haya.

     Para escribir, GitHub exige decirle cuál es la versión que estás
     reemplazando. Si esa consulta llega de la caché, la versión viene
     caducada y GitHub rechaza el envío. Por eso aquí se pide SIEMPRE
     fresca y, si aun así choca, se reintenta solo con la versión buena:
     pulsar «Publicar» tiene que publicar, sin excusas. */
  function publish(content, message, cb) {
    subirArchivo(cfg().path, b64(content), message || "Actualiza el contenido de la tienda", cb);
  }

  var MAX_INTENTOS = 5;

  function subirArchivo(ruta, base64, mensaje, cb, intento) {
    intento = intento || 0;
    var c = cfg();
    if (!isReady()) return cb("Todavía no has conectado el panel con GitHub");
    if (!ruta) return cb("Falta indicar el archivo que se actualiza");

    var branch = c.branch || "main";
    var url = API + "/repos/" + c.owner + "/" + c.repo + "/contents/" + ruta;

    // 1) versión actual, pedida sin caché para que nunca venga caducada
    fetch(url + "?ref=" + encodeURIComponent(branch) + "&t=" + Date.now(), {
      headers: headers(c),
      cache: "no-store"
    })
      .then(function (r) {
        if (r.status === 404) return null;            // el archivo aún no existe
        if (!r.ok) return r.json().then(function (b) { throw { msg: explain(r.status, b) }; });
        return r.json();
      })
      .then(function (actual) {
        var payload = { message: mensaje, content: base64, branch: branch };
        if (actual && actual.sha) payload.sha = actual.sha;

        return fetch(url, { method: "PUT", headers: headers(c), body: JSON.stringify(payload) })
          .then(function (r) {
            return r.json().then(function (body) {
              if (r.status === 409 || r.status === 422) {
                throw { choque: true, msg: explain(r.status, body) };
              }
              if (!r.ok) throw { msg: explain(r.status, body) };
              return body;
            });
          });
      })
      .then(function (body) {
        cb(null, {
          commit: body.commit && body.commit.sha ? body.commit.sha.slice(0, 7) : "",
          url: body.commit && body.commit.html_url,
          ruta: ruta
        });
      })
      .catch(function (e) {
        // choque de versiones: se vuelve a intentar solo, con espera creciente
        if (e && e.choque && intento < MAX_INTENTOS) {
          return setTimeout(function () {
            subirArchivo(ruta, base64, mensaje, cb, intento + 1);
          }, 600 + intento * 700);
        }
        var msg = (e && e.msg) || (typeof e === "string" ? e : "No se pudo publicar. Revisa tu internet.");
        if (e && e.choque) {
          msg = "GitHub está tardando en confirmar el cambio anterior. Espera unos segundos y vuelve a pulsar Publicar.";
        }
        cb(msg);
      });
  }

  /* ----------------------------------------------- subir una imagen suelta */
  /* Las fotos se guardan como archivos en el repositorio en vez de ir dentro
     del contenido: así lo que se descarga en cada visita pesa poco y las
     imágenes se quedan guardadas en el teléfono. */
  function subirImagen(ruta, dataUrl, cb) {
    var base64 = String(dataUrl).split(",")[1];
    if (!base64) return cb("Imagen no válida");
    subirArchivo(ruta, base64, "Sube una imagen de la tienda", function (err) {
      if (err) return cb(err);
      cb(null, ruta);
    });
  }

  /* --------------------------------------- huella para saber si hay cambios */
  function fingerprint(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(36) + "-" + str.length;
  }

  window.VCS_GH = {
    cfg: cfg, saveCfg: saveCfg, forget: forget, isReady: isReady,
    test: test, publish: publish, subirImagen: subirImagen, fingerprint: fingerprint
  };
})();
