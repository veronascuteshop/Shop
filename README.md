# Verona's Cute Shop 🎀

Tienda online juvenil de **[@veronas_cuteshop](https://instagram.com/veronas_cuteshop)** —
maquillaje, Sanrio, accesorios, papelería y **franelas personalizadas**.
San Carlos, Cojedes · Venezuela.

Web estática: **sin servidor, sin base de datos, sin build**. Se sube tal cual a cualquier hosting.

## Qué incluye

- **Catálogo** con filtros por categoría, carrito y pedido por WhatsApp.
- **Personalizador de franelas**: color, talla, zona del estampado y subida de imagen
  con mover / escalar / rotar. Genera la imagen del diseño para el pedido.
- **Guía de tallas** con diagrama y medidas.
- **Panel de administración** (`admin.html`) para editar productos, categorías, franelas,
  textos y ver pedidos. Todo se guarda en el navegador y se publica exportando `lib/manifest.js`.
- **Instalable como app** (PWA): dos apps separadas, la tienda y el panel. Funciona sin conexión.

## Cómo se usa

Todo está explicado paso a paso en **[LEEME.md](LEEME.md)**: cómo entrar al panel,
cómo publicar los cambios, cómo llegan los pedidos y cómo subirla a un hosting.

Para verla en local sin instalar nada:

```bash
node tools/serve.js
```

## Tecnología

HTML + CSS + JavaScript puro (patrón IIFE, sin módulos ni frameworks).
GSAP + ScrollTrigger para animaciones. Datos en `localStorage`.
