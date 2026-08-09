/* =============================================================================
   manifest.js — DATOS POR DEFECTO de la tienda.
   Este archivo es el "contenido de fábrica". Cuando editas desde el panel
   de administrador, los cambios se guardan en tu navegador y, al pulsar
   "Publicar cambios", se descarga una versión nueva de ESTE archivo que
   debes subir a tu hosting para que todos los clientes vean los cambios.
   ============================================================================= */
(function () {
  "use strict";

  window.__BRAND__ = {
    version: 1,

    /* ---------------------------------------------------------------- ajustes */
    settings: {
      name: "Verona's",
      name2: "Cute Shop",
      logo: "",
      handle: "@veronas_cuteshop",
      tagline: "Maquillaje, Sanrio & cositas lindas",
      heroTitle: "Todo lo cute,",
      heroTitleEm: "en un solo lugar",
      heroSub: "Tienda online juvenil. Maquillaje, accesorios, papelería y franelas que diseñas tú misma.",
      location: "San Carlos · Cojedes · Venezuela",
      currency: "$",
      whatsapp: "584120000000",
      instagram: "https://instagram.com/veronas_cuteshop",
      announcement: "envíos a toda venezuela ✿ pago móvil y efectivo ✿ personaliza tu franela ✿ nuevos ingresos cada semana",
      accent: "#ff5fa2",
      accent2: "#a98bff",
      shipping: "Envíos por MRW, Zoom y Tealca a toda Venezuela. Entrega personal en San Carlos sin costo.",
      payments: "Pago móvil · Efectivo · Transferencia · Zelle · Binance",
      adminPin: "0000",
      aboutTitle: "Hecho con cariño desde San Carlos",
      aboutText: "Empezamos en Instagram con una caja de accesorios y muchas ganas. Hoy somos una familia emprendedora que empaca cada pedido a mano, con su stickercito y su nota. Gracias por confiar en nosotros ♡"
    },

    /* ------------------------------------------------------------ categorías */
    categories: [
      { id: "maquillaje", name: "Maquillaje", emoji: "💄", active: true },
      { id: "sanrio", name: "Sanrio", emoji: "🎀", active: true },
      { id: "accesorios", name: "Accesorios", emoji: "🌸", active: true },
      { id: "papeleria", name: "Papelería", emoji: "✏️", active: true },
      { id: "peluches", name: "Peluches", emoji: "🧸", active: true }
    ],

    /* -------------------------------------------------------------- productos */
    products: [
      {
        id: "p-001", name: "Labial mate larga duración", price: 4.5, compareAt: 6,
        category: "maquillaje", emoji: "💄", photo: "", badge: "Top ventas",
        description: "Acabado mate aterciopelado, no reseca. Dura toda la jornada.",
        options: [{ name: "Tono", values: ["Rosa viejo", "Nude", "Cereza", "Coral"] }],
        stock: true, featured: true
      },
      {
        id: "p-002", name: "Paleta de sombras pastel 12 tonos", price: 9, compareAt: 0,
        category: "maquillaje", emoji: "🎨", photo: "", badge: "",
        description: "12 tonos mate y shimmer, alta pigmentación y espejo incluido.",
        options: [], stock: true, featured: true
      },
      {
        id: "p-003", name: "Set brochas rosadas x8", price: 11, compareAt: 14,
        category: "maquillaje", emoji: "🖌️", photo: "", badge: "Oferta",
        description: "Cerdas suaves sintéticas + estuche organizador.",
        options: [], stock: true, featured: false
      },
      {
        id: "p-004", name: "Espejo de bolsillo kitty", price: 3, compareAt: 0,
        category: "sanrio", emoji: "💖", photo: "", badge: "",
        description: "Espejo doble con aumento. Cabe en cualquier bolso.",
        options: [{ name: "Color", values: ["Rosa", "Blanco", "Lila"] }],
        stock: true, featured: true
      },
      {
        id: "p-005", name: "Cartuchera peluche cute", price: 7.5, compareAt: 0,
        category: "sanrio", emoji: "🎀", photo: "", badge: "Nuevo",
        description: "Suavecita, con cierre resistente y bolsillo interno.",
        options: [{ name: "Personaje", values: ["Kitty", "Kuromi", "Melody", "Cinnamoroll"] }],
        stock: true, featured: true
      },
      {
        id: "p-006", name: "Set de ganchos de perlas", price: 2.5, compareAt: 0,
        category: "accesorios", emoji: "🌸", photo: "", badge: "",
        description: "6 ganchitos surtidos con perlas y flores.",
        options: [], stock: true, featured: false
      },
      {
        id: "p-007", name: "Collar corazón acero dorado", price: 6, compareAt: 8,
        category: "accesorios", emoji: "💛", photo: "", badge: "",
        description: "Acero inoxidable, no se pone verde ni se oxida.",
        options: [{ name: "Color", values: ["Dorado", "Plateado"] }],
        stock: true, featured: false
      },
      {
        id: "p-008", name: "Cuaderno tapa dura aesthetic", price: 5, compareAt: 0,
        category: "papeleria", emoji: "📓", photo: "", badge: "",
        description: "80 hojas rayadas, tapa dura acolchada y cinta separadora.",
        options: [{ name: "Diseño", values: ["Nubes", "Fresas", "Estrellas"] }],
        stock: true, featured: true
      },
      {
        id: "p-009", name: "Pack 50 stickers surtidos", price: 2, compareAt: 0,
        category: "papeleria", emoji: "✨", photo: "", badge: "Top ventas",
        description: "Vinil resistente al agua, ideales para laptop y termo.",
        options: [], stock: true, featured: false
      },
      {
        id: "p-010", name: "Peluche abrazable 30 cm", price: 13, compareAt: 16,
        category: "peluches", emoji: "🧸", photo: "", badge: "",
        description: "Relleno hipoalergénico, súper suave y lavable.",
        options: [{ name: "Modelo", values: ["Oso", "Conejo", "Gatito"] }],
        stock: true, featured: true
      },
      {
        id: "p-011", name: "Llavero peluche mini", price: 3.5, compareAt: 0,
        category: "peluches", emoji: "🔑", photo: "", badge: "",
        description: "Mini peluche con mosquetón metálico.",
        options: [], stock: true, featured: false
      },
      {
        id: "p-012", name: "Brillo labial con glitter", price: 3, compareAt: 0,
        category: "maquillaje", emoji: "💗", photo: "", badge: "",
        description: "Hidratante, con destellos finos y aroma a fresa.",
        options: [{ name: "Tono", values: ["Fresa", "Uva", "Durazno"] }],
        stock: false, featured: false
      }
    ],

    /* --------------------------------------------------------------- franelas */
    tees: {
      active: true,
      title: "Diseña tu franela",
      productName: "Franela personalizada",
      subtitle: "Sube tu foto, muévela, agrándala y gírala. Así de simple.",
      basePrice: 12,
      description: "Franela 100% algodón peinado, estampado DTF de alta durabilidad. Lavable del revés en agua fría.",
      sizeGuideNote: "Medidas en centímetros tomadas sobre la prenda extendida. Tolerancia ±2 cm.",
      colors: [
        { name: "Blanco", hex: "#ffffff" },
        { name: "Negro", hex: "#232026" },
        { name: "Rosa bebé", hex: "#ffd3e4" },
        { name: "Lila", hex: "#dcccff" },
        { name: "Beige", hex: "#efe2cf" },
        { name: "Azul cielo", hex: "#cfe6ff" },
        { name: "Verde menta", hex: "#cdf3e4" },
        { name: "Rojo", hex: "#d8404f" }
      ],
      sizes: [
        { id: "XS", name: "XS", chest: 43, length: 63, sleeve: 17, extra: 0 },
        { id: "S", name: "S", chest: 46, length: 66, sleeve: 18, extra: 0 },
        { id: "M", name: "M", chest: 51, length: 70, sleeve: 20, extra: 0 },
        { id: "L", name: "L", chest: 56, length: 73, sleeve: 21, extra: 0 },
        { id: "XL", name: "XL", chest: 61, length: 76, sleeve: 22, extra: 1 },
        { id: "XXL", name: "XXL", chest: 66, length: 79, sleeve: 23, extra: 2 }
      ],
      zones: [
        { id: "frente-completo", name: "Frente completo", side: "front", extra: 0, area: { x: 180, y: 235, w: 240, h: 300 } },
        { id: "pecho-pequeno", name: "Pecho pequeño", side: "front", extra: 0, area: { x: 196, y: 240, w: 104, h: 104 } },
        { id: "espalda-completa", name: "Espalda completa", side: "back", extra: 3, area: { x: 180, y: 215, w: 240, h: 320 } },
        { id: "espalda-superior", name: "Espalda superior", side: "back", extra: 3, area: { x: 180, y: 205, w: 240, h: 120 } }
      ]
    },

    /* ----------------------------------------------------------- cómo comprar */
    steps: [
      { emoji: "🛍️", title: "Elige lo que amas", text: "Agrega al carrito todo lo que quieras. Sin mínimo de compra." },
      { emoji: "💬", title: "Envíanos el pedido", text: "Al confirmar se abre WhatsApp con tu pedido ya escrito." },
      { emoji: "📦", title: "Pagas y te llega", text: "Coordinamos pago y envío. Empacado a mano con su detallito." }
    ],

    faqs: [
      { q: "¿Hacen envíos a todo el país?", a: "Sí, enviamos por MRW, Zoom y Tealca. El envío lo cubre el cliente al recibir." },
      { q: "¿Cuánto tarda una franela personalizada?", a: "Entre 3 y 5 días hábiles desde que confirmas el diseño y el pago." },
      { q: "¿Puedo cambiar mi producto?", a: "Sí, tienes 3 días para cambios por talla o defecto de fábrica. Las franelas personalizadas no tienen cambio." },
      { q: "¿Qué formas de pago aceptan?", a: "Pago móvil, efectivo, transferencia, Zelle y Binance." }
    ]
  };
})();
