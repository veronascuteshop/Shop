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
    if (status === 409) return "Alguien más cambió el archivo hace un momento. Vuelve a intentarlo.";
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
  /* Sube el contenido al archivo indicado. Si ya existe, lo reemplaza. */
  function publish(content, message, cb) {
    var c = cfg();
    if (!isReady()) return cb("Todavía no has conectado el panel con GitHub");

    var branch = c.branch || "main";
    var url = API + "/repos/" + c.owner + "/" + c.repo + "/contents/" + c.path;

    // 1. buscamos la versión actual para poder reemplazarla
    fetch(url + "?ref=" + encodeURIComponent(branch), { headers: headers(c) })
      .then(function (r) {
        if (r.status === 404) return null;            // el archivo aún no existe
        if (!r.ok) return r.json().then(function (b) { throw explain(r.status, b); });
        return r.json();
      })
      .then(function (actual) {
        var payload = {
          message: message || "Actualiza el contenido de la tienda",
          content: b64(content),
          branch: branch
        };
        if (actual && actual.sha) payload.sha = actual.sha;

        return fetch(url, {
          method: "PUT",
          headers: headers(c),
          body: JSON.stringify(payload)
        }).then(function (r) {
          return r.json().then(function (body) {
            if (!r.ok) throw explain(r.status, body);
            return body;
          });
        });
      })
      .then(function (body) {
        cb(null, {
          commit: body.commit && body.commit.sha ? body.commit.sha.slice(0, 7) : "",
          url: body.commit && body.commit.html_url,
          sinCambios: false
        });
      })
      .catch(function (e) {
        cb(typeof e === "string" ? e : "No se pudo publicar. Revisa tu internet.");
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
    test: test, publish: publish, fingerprint: fingerprint
  };
})();
