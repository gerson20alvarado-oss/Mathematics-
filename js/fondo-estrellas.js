// =============================================================
// fondo-estrellas.js — fondo cósmico sutil para la pantalla de
// bienvenida. Canvas + JS puro (sin video, sin dependencias): un
// campo de estrellas que se desplaza con lentitud, evocando una
// nebulosa tranquila sin robarle protagonismo a la interfaz.
//
// Degradación elegante:
//  - `prefers-reduced-motion: reduce` -> se dibuja un único cuadro
//    estático (mismo aspecto visual, sin animación).
//  - Cualquier error de Canvas -> no rompe nada; el fondo CSS
//    estático (gradiente oscuro ya definido en la hoja de estilos)
//    queda como base incluso si este script no llega a ejecutarse.
// =============================================================

export function iniciarFondoEstrellas(canvas) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const prefiereMovimientoReducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let ancho, alto, dpr;
  let estrellas = [];

  function dimensionar() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    ancho = canvas.clientWidth;
    alto = canvas.clientHeight;
    canvas.width = ancho * dpr;
    canvas.height = alto * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    generarEstrellas();
  }

  function generarEstrellas() {
    const cantidad = Math.min(180, Math.floor((ancho * alto) / 6000));
    estrellas = Array.from({ length: cantidad }, () => ({
      x: Math.random() * ancho,
      y: Math.random() * alto,
      r: Math.random() * 1.2 + 0.3,
      brillo: Math.random() * 0.6 + 0.3,
      fase: Math.random() * Math.PI * 2,
      velocidad: Math.random() * 0.015 + 0.004,
      derivaX: (Math.random() - 0.5) * 0.04,
    }));
  }

  function dibujar(tiempo) {
    ctx.clearRect(0, 0, ancho, alto);
    for (const e of estrellas) {
      const parpadeo = prefiereMovimientoReducido ? 1 : 0.55 + 0.45 * Math.sin(tiempo * e.velocidad + e.fase);
      ctx.globalAlpha = e.brillo * parpadeo;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paso(tiempo) {
    if (!prefiereMovimientoReducido) {
      for (const e of estrellas) {
        e.y += e.velocidad * 6;
        e.x += e.derivaX;
        if (e.y > alto) { e.y = -2; e.x = Math.random() * ancho; }
        if (e.x > ancho) e.x = 0;
        if (e.x < 0) e.x = ancho;
      }
    }
    dibujar(tiempo);
    if (!prefiereMovimientoReducido) requestAnimationFrame(paso);
  }

  try {
    dimensionar();
    window.addEventListener("resize", dimensionar);
    if (prefiereMovimientoReducido) {
      dibujar(0); // un solo cuadro estático, sin bucle de animación
    } else {
      requestAnimationFrame(paso);
    }
  } catch (e) {
    console.warn("No se pudo iniciar el fondo animado; se mantiene el fondo estático.", e);
  }
}
