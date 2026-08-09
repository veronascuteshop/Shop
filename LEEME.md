# Verona's Cute Shop — tu tienda web ✿

Web estática (HTML + CSS + JavaScript). **No necesita servidor, ni base de datos, ni programas.**
Se sube tal cual a Hostinger, Netlify, GitHub Pages o cualquier hosting.

---

## 1. Cómo verla en tu computadora

Haz doble clic en **`index.html`**. Se abre en tu navegador y funciona todo.

Para el panel de administrador, abre **`admin.html`** (o baja al final de la tienda y pulsa
«Acceso administrador»).

**Clave por defecto: `0000`** — puedes cambiarla en *Contenido → Seguridad*.

---

## 2. Lo primero que debes configurar

Entra al panel → pestaña **Contenido**:

1. **WhatsApp**: pon tu número con código de país y **solo números**.
   Ejemplo Venezuela: `0412-1234567` → se escribe **`584121234567`**.
   Sin esto, el botón «Hacer pedido» no sabe a quién escribirle.
2. **Instagram**: el enlace completo de tu perfil.
3. **Nombre, textos, colores y moneda**: todo se cambia ahí mismo.

---

## 2.5 Poner tu logo

Panel → **Contenido** → **Identidad** → **Logo de la tienda** → *Elegir logo*.

Se ve **grande en la portada** de la tienda, en lugar del dibujo por defecto.

- La casilla **«Quitar el fondo blanco»** viene marcada: borra el fondo liso que rodea al
  dibujo para que se integre con el rosado de la página. Solo borra desde los bordes hacia
  dentro, así que los blancos internos (como la cinta de *CUTE SHOP*) **no se tocan**.
  Si el resultado no te gusta, desmarca la casilla y vuelve a subirlo.
- Se achica solo a 700 píxeles, no te preocupes por el peso de la foto.
- El gatito pequeño de la barra de arriba **se queda como está**: tu logo completo lleva el
  nombre y la cinta, y a 42 píxeles no se leería nada. El dibujito está hecho a partir de tu
  logo, así que combinan.

Para quitarlo y volver al dibujo: *Quitar logo*.

---

## 3. Cómo funciona el panel

| Pestaña | Para qué sirve |
|---|---|
| **Pedidos** | Ver los pedidos, cambiar su estado, ver el diseño de las franelas, exportarlos. |
| **Productos** | Agregar, editar, duplicar, reordenar y borrar productos. Sube fotos (se comprimen solas). |
| **Categorías** | Los filtros que ve el cliente arriba del catálogo. Cada una tiene un **interruptor** para mostrarla u ocultarla sin borrar nada. |
| **Franelas** | Precio base, colores, tallas con sus medidas y zonas de estampado. Tiene un **interruptor** arriba para mostrar u ocultar toda la sección. |
| **Contenido** | Nombre, portada, contacto, envíos, pagos, "nosotros", preguntas y clave. |
| **Publicar** | Descargar el archivo para que los cambios se vean en internet + respaldos. |

---

## 4. ⚠️ Lo más importante: publicar los cambios

Cuando editas algo en el panel **se guarda solo** en tu navegador y lo ves al instante. Pero tus
clientes siguen viendo la versión anterior hasta que **publiques**.

### Con un botón (recomendado)

En la barra izquierda del panel, abajo, tienes el botón **«Publicar en la web»**, y justo debajo
un aviso que te dice cómo está todo:

| Aviso | Qué significa |
|---|---|
| **Todo publicado ✓** | No hay nada pendiente. |
| **Cambios sin publicar** | Editaste algo. Pulsa el botón (se pone resaltado). |
| **Sin conectar** | Falta conectar el panel con GitHub una sola vez (abajo te explico). |

Pulsas el botón y listo: en menos de un minuto la web ya muestra los cambios. No hay que
descargar ni subir nada.

### Conectarlo (una sola vez, 2 minutos)

Panel → **Publicar** → **Conexión con GitHub**. Los datos vienen casi todos puestos; solo falta
la clave de acceso:

1. En **github.com** → tu foto → **Settings** → abajo del todo **Developer settings**.
2. **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
3. Nombre: *panel tienda*. En **Expiration** ponle la duración más larga que te deje.
4. **Repository access** → **Only select repositories** → marca **Shop**.
5. **Permissions → Repository permissions** → busca **Contents** → **Read and write**.
   No le des ningún otro permiso.
6. **Generate token**, cópialo y pégalo en el panel. Pulsa **Probar conexión**.

**Sobre esa clave:** solo sirve para editar archivos de ese repositorio. No da acceso a tu cuenta
de GitHub, no puede borrarla ni tocar tus otros proyectos. Se guarda únicamente en el navegador
donde la pegaste — no viaja a la web ni queda dentro de los respaldos. Si algún día quieres
anularla, en esa misma pantalla de GitHub pulsas **Revoke** y ya.

Si administras desde el teléfono y también desde la computadora, tendrás que pegarla en cada uno
(o generar una para cada dispositivo, que es más ordenado).

### A mano (si no quieres conectar nada)

Panel → **Publicar** → **Descargar el archivo** → súbelo a la carpeta `lib/` de tu hosting o de
GitHub, reemplazando el `manifest.js` que está.

---

### Ocultar una categoría sin borrarla

En **Categorías**, cada fila tiene un interruptor rosado a la derecha:

- **Encendido** → se ve en la tienda.
- **Apagado** → desaparece del catálogo: ni el filtro ni sus productos, tampoco en «Todo».
  La fila queda atenuada y marcada como *oculta*.

Sirve para cuando se te acaba el inventario de algo, o para preparar una categoría nueva con
calma antes de mostrarla. Nada se borra: al volver a encenderla reaparece todo tal cual estaba.

### Ocultar la sección de franelas

En la pestaña **Franelas**, arriba a la derecha, hay otro interruptor igual. Al apagarlo
desaparece de la tienda **toda la sección**: el diseñador, la guía de tallas, el botón
«Diseñar mi franela» de la portada y los enlaces del menú y del pie. Útil si te quedas sin
material o si prefieres no ofrecerlas por un tiempo.

Dos textos que quedan a tu cargo, porque son tuyos y se editan en **Contenido**:
la frase de bienvenida (menciona las franelas) y la cinta de anuncios de arriba.

Acuérdate de pulsar **Publicar en la web** para que el cambio les llegue a tus clientes.

---

## 5. Cómo llegan los pedidos

Cuando un cliente pulsa **«Enviar pedido por WhatsApp»**:

1. Se le abre WhatsApp con **el pedido ya escrito** (productos, tallas, colores, total y sus datos)
   y un código tipo **VC-1234**.
2. Si diseñó una franela, **se le descargan las imágenes** del diseño para que te las adjunte.
3. El pedido queda guardado en el panel **de ese navegador**.

Como la página no tiene servidor, **los pedidos de tus clientes no aparecen solos en tu panel**:
el canal real es WhatsApp. Si quieres tenerlos registrados en el panel, pídele al cliente el
archivo `pedido-VC-1234.json` (se lo descarga la página) y úsalo en *Pedidos → Importar pedido*.

Si más adelante quieres que los pedidos lleguen solos a un panel central, hace falta añadir un
servicio externo (Firebase, Supabase o un formulario tipo Formspree). Se puede agregar después
sin rehacer la web.

---

## 5.5 Se instala como app 📲

La web funciona como **dos aplicaciones instalables** (PWA), con su propio iconito en el
teléfono o en el escritorio, sin pasar por ninguna tienda de apps:

| App | Icono | Para quién | Se instala desde |
|---|---|---|---|
| **Verona's Cute Shop** | gatita rosada | tus clientes | `index.html` |
| **Verona Admin** | gatita sobre morado oscuro | tú | `admin.html` |

Se instalan por separado, así que puedes tener las dos en el mismo teléfono sin que se pisen.

**Cómo la instala un cliente:**
- *Android (Chrome)*: le sale solo un aviso abajo «Instala Verona's Cute Shop». También en el
  menú **⋮ → Instalar aplicación**.
- *iPhone (Safari)*: botón **Compartir** → **Añadir a pantalla de inicio**.
- *Computadora (Chrome/Edge)*: icono de instalar al final de la barra de direcciones.

En la web hay un botón **📲 Instalar la app** en el pie de página (y otro en el panel:
**📲 Instalar el panel**) que explica los pasos según el teléfono que use la persona.

**Dos condiciones para que funcione la instalación:**

1. **Tiene que estar subida a internet con HTTPS** (el candadito). Hostinger da el certificado
   SSL gratis: actívalo desde el panel de Hostinger. Abriendo el archivo con doble clic desde
   la computadora **no** se puede instalar, pero la web sí se ve igual.
2. En iPhone hay que abrirla en **Safari**. Si la abren desde el navegador interno de Instagram,
   no aparece la opción: por eso conviene decir «abre el link en Safari/Chrome».

**Bonus:** una vez instalada, la app **abre sin internet** mostrando la última versión que la
persona vio. Los pedidos igual necesitan señal para enviarse por WhatsApp.

> Si cambias archivos y los subes, edita también `sw.js` y cámbiale el número de versión
> (`verona-v1-20260808` → `verona-v2-…`). Eso hace que las apps instaladas se actualicen solas.

---

## 5.7 Publicarla gratis con GitHub Pages

El código ya está en **https://github.com/veronascuteshop/Shop**. GitHub puede servirte la
web gratis y **con HTTPS** (que es justo lo que hace falta para que se pueda instalar como app):

1. Entra al repositorio → pestaña **Settings** (arriba a la derecha).
2. En el menú de la izquierda, **Pages**.
3. En *Source* elige **Deploy from a branch**.
4. En *Branch* elige **main** y la carpeta **/ (root)**. Pulsa **Save**.
5. Espera 1–2 minutos y refresca. Te dará la dirección:

   **https://veronascuteshop.github.io/Shop/**

   El panel queda en **https://veronascuteshop.github.io/Shop/admin.html**

Con eso ya tienes la tienda en línea, con candadito, y las dos apps se pueden instalar.
Si más adelante compras un dominio propio, se puede conectar desde esa misma pantalla.

### Publicar cambios cuando usas GitHub

Pulsa **«Publicar en la web»** en el panel. Eso sube el archivo a GitHub por ti y la web se
actualiza sola. Ver la sección 4 para conectarlo la primera vez.

> El repositorio es **público**: cualquiera puede leer el código, incluida la clave del panel.
> Cámbiala por una tuya en *Contenido → Seguridad* y recuerda que no es seguridad real.
> Si prefieres que nadie vea el código, en *Settings → General → Danger Zone* puedes ponerlo
> privado — pero entonces GitHub Pages deja de funcionar en cuentas gratuitas.

---

## 6. Subirla a internet (Hostinger)

1. Entra al **Administrador de archivos** de Hostinger.
2. Abre la carpeta `public_html`.
3. Arrastra **todo el contenido** de la carpeta `verona-cute-shop` (no la carpeta, su contenido):
   `index.html`, `admin.html`, `styles.css`, `admin.css`, `main.js`, `admin.js`, `sw.js`,
   `manifest.webmanifest`, `admin.webmanifest`, `.htaccess`, y las carpetas `lib/` y `assets/`.
4. Entra a tu dominio. Ya está en línea.

La carpeta `tools/` es solo para pruebas locales: **no hace falta subirla**.

**Cada vez que subas archivos nuevos**, cambia el número `?v=20260809` por la fecha del día
en `index.html` y en `admin.html` (búscalo con Ctrl+F, aparece unas 8 veces). Eso obliga al
navegador de tus clientes a cargar la versión nueva en vez de la guardada en caché.

> Esto solo hace falta si cambias los archivos del programa. Lo que editas desde el panel
> (productos, precios, textos) se ve enseguida sin tocar nada.

---

## 6.5 Si una foto no se deja subir

El navegador tiene que poder **abrir** la foto para poder achicarla. Si sale un aviso al subirla:

- **«Esa foto está en formato HEIC»** → es el formato con el que graba el iPhone y solo Apple
  lo entiende. Dos soluciones:
  - **Para las fotos nuevas:** iPhone → *Ajustes* → *Cámara* → *Formatos* → **Más compatible**.
    Desde ahí graba en JPG y no vuelve a pasar.
  - **Para las que ya tienes:** reenvíatelas por WhatsApp a ti misma y guarda esa copia — WhatsApp
    las convierte a JPG. También sirve abrirlas y usar *Editar → Guardar copia*.
- **«No se pudo abrir la imagen»** → el archivo está dañado o es un formato raro. Ábrelo, hazle
  una captura de pantalla y sube la captura.
- **«La foto pesa X MB»** → es demasiado pesada. Una captura de pantalla o una foto normal del
  teléfono sirve perfecto; no hace falta calidad de cámara profesional.

Las fotos se achican solas a 900 píxeles antes de guardarse, así que no te preocupes por el peso
mientras el navegador pueda abrirlas.

---

## 7. Cosas que conviene saber

- **La clave `0000` no es seguridad real.** Protege el panel de un curioso, pero cualquiera con
  conocimientos técnicos puede ver el código de la página. No guardes datos sensibles ahí.
- **Las fotos se guardan dentro del navegador.** El espacio es limitado (unos 5 MB), por eso la
  página comprime cada foto automáticamente. Si aparece un aviso de espacio lleno, borra pedidos
  antiguos desde el panel.
- **Haz respaldos.** Panel → Publicar → «Descargar respaldo». Guarda ese archivo: si cambias de
  computadora o se borra el navegador, lo restauras desde ahí.

---

## 8. Archivos del proyecto

```
verona-cute-shop/
├── index.html          la tienda
├── admin.html          el panel de administrador
├── styles.css          estilos de la tienda
├── admin.css           estilos del panel
├── main.js             lógica de la tienda (catálogo, franelas, carrito, pedidos)
├── admin.js            lógica del panel
├── .htaccess           evita que el hosting muestre versiones viejas
├── sw.js               hace que las apps funcionen sin internet
├── manifest.webmanifest        ficha de la app «tienda»
├── admin.webmanifest           ficha de la app «panel»
├── lib/
│   ├── manifest.js     ← TU CONTENIDO (el que descargas al publicar)
│   ├── store.js        guardado de datos
│   ├── tee.js          dibujo de la franela
│   ├── pwa.js          instalación como app
│   ├── gsap.min.js     animaciones
│   └── ScrollTrigger.min.js
├── assets/
│   ├── favicon.svg     iconito de la pestaña
│   └── icon-*.png      iconos de las dos apps
└── tools/
    └── serve.js        servidor local de prueba (no subir)
```
