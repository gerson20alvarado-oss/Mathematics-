// =============================================================
// views.js — renderizado de las pantallas de la SPA:
//   Inicio (áreas) -> Área (capítulos) -> Capítulo -> Ejercicio
// Reutiliza exactamente las mismas clases CSS que la versión por
// capítulos (capitulo-card, cuaderno-card, ejercicio-item, …) para
// no tocar el diseño visual.
// =============================================================
import { cargarManifiesto, obtenerArea, cargarCapitulo, obtenerEjercicio, aplanarCapitulos, claveCapitulo } from "./data.js";
import * as progreso from "./progreso.js";
import { calificar, generarPista, generarExplicacion } from "./grading.js";
import { actualizarProgresoTopbar, renderizarMate } from "./app-shared.js";

function escaparHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

async function refrescarProgresoTopbar() {
  const manifiesto = await cargarManifiesto();
  actualizarProgresoTopbar(progreso.progresoLibro(aplanarCapitulos(manifiesto)));
}

// -------------------------------------------------------------
// Pantalla de inicio: las 7 grandes áreas del libro
// -------------------------------------------------------------
export async function renderHome(app) {
  app.innerHTML = `<p class="cargando">Cargando índice…</p>`;
  const manifiesto = await cargarManifiesto();
  const capitulosPlanos = aplanarCapitulos(manifiesto);
  const progresoTotal = progreso.progresoLibro(capitulosPlanos);

  const tarjetas = manifiesto.map((area) => {
    const capitulosDeArea = capitulosPlanos.filter((c) => c.areaSlug === area.slug);
    const hayCapitulos = capitulosDeArea.some((c) => c.disponible);

    if (!area.disponible || !hayCapitulos) {
      return `
        <div class="capitulo-card capitulo-card--bloqueada">
          <div class="capitulo-card-margen"></div>
          <div class="capitulo-card-cuerpo">
            <span class="capitulo-card-area">Próximamente</span>
            <h3>${area.icono} ${escaparHtml(area.area)}</h3>
            <p>${escaparHtml(area.descripcion)}</p>
          </div>
        </div>`;
    }

    const pct = progreso.progresoArea(capitulosDeArea);
    return `
      <a href="#/area/${area.slug}" class="capitulo-card capitulo-card--disponible">
        <div class="capitulo-card-margen"></div>
        <div class="capitulo-card-cuerpo">
          <span class="capitulo-card-area">${capitulosDeArea.filter(c=>c.disponible).length} capítulo(s) disponible(s)</span>
          <h3>${area.icono} ${escaparHtml(area.area)}</h3>
          <p>${escaparHtml(area.descripcion)}</p>
          <div class="capitulo-card-progreso">
            <div class="capitulo-card-progreso-barra">
              <div class="capitulo-card-progreso-relleno" style="width:${pct}%"></div>
            </div>
            <span>${pct}%</span>
          </div>
        </div>
      </a>`;
  }).join("");

  app.innerHTML = `
    <section class="portada">
      <p class="portada-eyebrow">CONAMAT · Pearson · 2.ª edición</p>
      <h1 class="portada-titulo">Matemáticas <em>Simplificadas</em></h1>
      <p class="portada-sub">Aritmética · Álgebra · Geometría · Trigonometría · Geometría analítica · Cálculo diferencial · Cálculo integral</p>
      <div class="portada-progreso">
        <div class="portada-progreso-barra"><div class="portada-progreso-relleno" style="width:${progresoTotal}%"></div></div>
        <span>${progresoTotal}% del libro completado</span>
      </div>
    </section>
    <section class="indice">
      <h2 class="indice-titulo">Índice</h2>
      <div class="capitulos-grid">${tarjetas}</div>
    </section>
  `;

  actualizarProgresoTopbar(progresoTotal);
}

// -------------------------------------------------------------
// Pantalla de área: capítulos de una materia (ej. Aritmética)
// -------------------------------------------------------------
export async function renderCategory(app, areaSlug) {
  app.innerHTML = `<p class="cargando">Cargando materia…</p>`;
  const area = await obtenerArea(areaSlug);
  if (!area) {
    app.innerHTML = `<p class="error-carga">Materia no encontrada.</p><a class="volver" href="#/">← Índice</a>`;
    return;
  }

  const tarjetas = (area.capitulos || []).map((cap) => {
    if (!cap.disponible) {
      return `
        <div class="capitulo-card capitulo-card--bloqueada">
          <div class="capitulo-card-margen"></div>
          <div class="capitulo-card-cuerpo">
            <span class="capitulo-card-area">Próximamente</span>
            <h3>Capítulo ${cap.numero}</h3>
            <p>${escaparHtml(cap.titulo)}</p>
          </div>
        </div>`;
    }
    const clave = claveCapitulo(areaSlug, cap.numero);
    const pct = progreso.progresoCapitulo(clave, cap.totalReactivos);
    return `
      <a href="#/area/${areaSlug}/capitulo/${cap.numero}" class="capitulo-card capitulo-card--disponible">
        <div class="capitulo-card-margen"></div>
        <div class="capitulo-card-cuerpo">
          <span class="capitulo-card-area">${escaparHtml(area.area)}</span>
          <h3>Capítulo ${cap.numero}</h3>
          <p>${escaparHtml(cap.titulo)}</p>
          <div class="capitulo-card-progreso">
            <div class="capitulo-card-progreso-barra">
              <div class="capitulo-card-progreso-relleno" style="width:${pct}%"></div>
            </div>
            <span>${pct}%</span>
          </div>
        </div>
      </a>`;
  }).join("");

  const capitulosDeArea = aplanarCapitulos(await cargarManifiesto()).filter((c) => c.areaSlug === areaSlug);
  const progresoArea = progreso.progresoArea(capitulosDeArea);

  app.innerHTML = `
    <a class="volver" href="#/">← Índice</a>
    <section class="capitulo-header">
      <span class="capitulo-header-area">${area.icono} Materia</span>
      <h1>${area.icono} ${escaparHtml(area.area)}</h1>
      <p class="capitulo-header-paginas">${escaparHtml(area.descripcion)}</p>
      <div class="portada-progreso">
        <div class="portada-progreso-barra"><div class="portada-progreso-relleno" style="width:${progresoArea}%"></div></div>
        <span>${progresoArea}% de esta materia completado</span>
      </div>
    </section>
    <section class="indice">
      <h2 class="indice-titulo">Capítulos</h2>
      <div class="capitulos-grid">${tarjetas || "<p>Aún no hay capítulos cargados en esta materia. Próximamente.</p>"}</div>
    </section>
  `;

  actualizarProgresoTopbar(progreso.progresoLibro(aplanarCapitulos(await cargarManifiesto())));
}

// -------------------------------------------------------------
// Pantalla de capítulo (teoría, ejemplos, ejercicios)
// -------------------------------------------------------------
export async function renderChapter(app, areaSlug, numero) {
  app.innerHTML = `<p class="cargando">Cargando capítulo…</p>`;
  let cap;
  try {
    cap = await cargarCapitulo(areaSlug, numero);
  } catch (e) {
    app.innerHTML = `<p class="error-carga">${escaparHtml(e.message)}</p><a class="volver" href="#/area/${areaSlug}">← Índice</a>`;
    return;
  }

  const area = await obtenerArea(areaSlug);
  const clave = claveCapitulo(areaSlug, numero);
  const meta = area.capitulos.find((c) => c.numero === Number(numero));
  const progresoCap = progreso.progresoCapitulo(clave, meta.totalReactivos);

  const renderEjercicioItem = (ej) => {
    const total = ej.items.length;
    let completados = 0;
    ej.items.forEach((it) => {
      const st = progreso.obtenerEstadoItem(clave, ej.numero_ejercicio, it.item);
      if (st?.completado) completados++;
    });
    const pct = total ? Math.round((100 * completados) / total) : 0;
    return `
      <a class="ejercicio-item" href="#/area/${areaSlug}/capitulo/${numero}/ejercicio/${ej.numero_ejercicio}">
        <div class="ejercicio-item-numero">${ej.numero_ejercicio}</div>
        <div class="ejercicio-item-cuerpo">
          <h4>Ejercicio ${ej.numero_ejercicio} · ${escaparHtml(ej.titulo)}</h4>
          <p>${escaparHtml(ej.instrucciones)}</p>
          <div class="ejercicio-item-progreso">
            <div class="ejercicio-item-progreso-barra"><div class="ejercicio-item-progreso-relleno" style="width:${pct}%"></div></div>
            <span>${completados}/${total} reactivos</span>
          </div>
        </div>
        <div class="ejercicio-item-flecha">→</div>
      </a>`;
  };

  // Flujo de aprendizaje: por cada tema del libro, en su orden original,
  // se muestra su explicación, sus ejemplos y — inmediatamente después —
  // los ejercicios que evalúan ese tema (según la sección a la que
  // pertenecen en el libro), en vez de agrupar toda la teoría, todos los
  // ejemplos y todos los ejercicios por separado.
  const bloquesPorTema = cap.teoria.map((t) => {
    const teoriaHtml = `
      <article class="cuaderno-card">
        <div class="cuaderno-card-margen"></div>
        <div class="cuaderno-card-cuerpo">
          <h3>${escaparHtml(t.titulo)}</h3>
          ${t.contenido.split("\n\n").map((p) => `<p>${escaparHtml(p)}</p>`).join("")}
          ${t.tabla ? renderTablaTeoria(t.tabla) : ""}
        </div>
      </article>`;

    const ejemplosDelTema = cap.ejemplos.filter((e) => e.tema === t.titulo).map((e) => `
      <article class="cuaderno-card cuaderno-card--ejemplo">
        <div class="cuaderno-card-margen"></div>
        <div class="cuaderno-card-cuerpo">
          <h3>${escaparHtml(e.titulo)}</h3>
          ${e.contenido.split("\n\n").map((p) => `<p>${escaparHtml(p)}</p>`).join("")}
        </div>
      </article>`).join("");

    const ejerciciosDelTema = cap.ejercicios.filter((ej) => ej.tema === t.titulo);
    const ejerciciosHtml = ejerciciosDelTema.length
      ? `<div class="ejercicios-lista">${ejerciciosDelTema.map(renderEjercicioItem).join("")}</div>`
      : "";

    return `
      <section class="bloque">
        <h2 class="bloque-titulo">${escaparHtml(t.titulo)}</h2>
        ${teoriaHtml}
        ${ejemplosDelTema}
        ${ejerciciosHtml}
      </section>`;
  }).join("");

  app.innerHTML = `
    <a class="volver" href="#/area/${areaSlug}">← ${area.icono} ${escaparHtml(area.area)}</a>
    <section class="capitulo-header">
      <span class="capitulo-header-area">${escaparHtml(cap.area)}</span>
      <h1>Capítulo ${cap.numero} · ${escaparHtml(cap.titulo)}</h1>
      <p class="capitulo-header-paginas">Libro, páginas ${cap.pagina_inicio}–${cap.pagina_fin}</p>
      <div class="portada-progreso">
        <div class="portada-progreso-barra"><div class="portada-progreso-relleno" style="width:${progresoCap}%"></div></div>
        <span>${progresoCap}% del capítulo completado</span>
      </div>
      ${cap.nota_alcance ? `<p class="nota-alcance">ℹ ${escaparHtml(cap.nota_alcance)}</p>` : ""}
    </section>

    ${bloquesPorTema}
  `;

  await refrescarProgresoTopbar();
  renderizarMate(app);
}

function renderTablaTeoria(tabla) {
  return `
    <div class="tabla-scroll">
    <table class="tabla-teoria">
      <thead><tr>${tabla.columnas.map((c) => `<th>${escaparHtml(c)}</th>`).join("")}</tr></thead>
      <tbody>
        ${tabla.filas.map((f) => `<tr>${f.map((c) => `<td>${escaparHtml(c)}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
    </div>`;
}

// -------------------------------------------------------------
// Pantalla de ejercicio
// -------------------------------------------------------------
export async function renderExercise(app, areaSlug, numero, numeroEjercicio) {
  app.innerHTML = `<p class="cargando">Cargando ejercicio…</p>`;
  let cap;
  try {
    cap = await cargarCapitulo(areaSlug, numero);
  } catch (e) {
    app.innerHTML = `<p class="error-carga">${escaparHtml(e.message)}</p><a class="volver" href="#/area/${areaSlug}">← Índice</a>`;
    return;
  }
  const ej = obtenerEjercicio(cap, numeroEjercicio);
  if (!ej) {
    app.innerHTML = `<p class="error-carga">Ejercicio no encontrado.</p><a class="volver" href="#/area/${areaSlug}/capitulo/${numero}">← Capítulo</a>`;
    return;
  }

  const clave = claveCapitulo(areaSlug, numero);
  const reactivosHtml = ej.items.map((item) => renderReactivo(clave, ej, item)).join("");

  app.innerHTML = `
    <a class="volver" href="#/area/${areaSlug}/capitulo/${numero}">← Capítulo ${cap.numero}</a>
    <section class="ejercicio-header">
      <span class="capitulo-header-area">${escaparHtml(cap.area)} · Capítulo ${cap.numero}</span>
      <h1>Ejercicio ${ej.numero_ejercicio} · ${escaparHtml(ej.titulo)}</h1>
      <p class="ejercicio-instrucciones">${escaparHtml(ej.instrucciones)}</p>
      ${ej.pagina ? `<p class="ejercicio-pagina">Libro, página ${ej.pagina}</p>` : ""}
    </section>
    <section class="reactivos">${reactivosHtml}</section>
  `;

  ej.items.forEach((item) => conectarReactivo(app, clave, ej, item));
  await refrescarProgresoTopbar();
  renderizarMate(app);
}

function renderReactivo(clave, ej, item) {
  const estado = progreso.obtenerEstadoItem(clave, ej.numero_ejercicio, item.item);
  const chip = estado?.completado
    ? `<span class="reactivo-estado-chip ${estado.correcta ? "ok" : "fallo"}">
         ${estado.correcta ? "correcto" : "intentado"}
       </span>`
    : "";

  let controlHtml;
  if (ej.tipo === "comparacion") {
    controlHtml = `
      <div class="opciones-comparacion" role="group">
        ${["<", ">", "="].map((s) => `
          <button type="button" class="opcion-simbolo ${estado?.respuesta === s ? "seleccionada" : ""}" data-valor="${s}">${s}</button>
        `).join("")}
      </div>`;
  } else if (ej.tipo === "valor_posicional_doble") {
    const va = estado?.respuesta?.absoluto ? escaparHtml(estado.respuesta.absoluto) : "";
    const vr = estado?.respuesta?.relativo ? escaparHtml(estado.respuesta.relativo) : "";
    controlHtml = `
      <div class="opcion-texto-doble">
        <label class="campo-doble-label" for="va-${item.item}">Valor absoluto</label>
        <input id="va-${item.item}" type="text" class="entrada-texto entrada-absoluto" placeholder="Valor absoluto…" value="${va}">
        <label class="campo-doble-label" for="vr-${item.item}">Valor relativo</label>
        <input id="vr-${item.item}" type="text" class="entrada-texto entrada-relativo" placeholder="Valor relativo…" value="${vr}">
      </div>`;
  } else if (ej.tipo === "division_cociente_residuo") {
    const vc = estado?.respuesta?.cociente ? escaparHtml(estado.respuesta.cociente) : "";
    const vres = estado?.respuesta?.residuo ? escaparHtml(estado.respuesta.residuo) : "";
    controlHtml = `
      <div class="opcion-texto-doble">
        <label class="campo-doble-label" for="co-${item.item}">Cociente</label>
        <input id="co-${item.item}" type="text" class="entrada-texto entrada-cociente" placeholder="Cociente…" value="${vc}">
        <label class="campo-doble-label" for="re-${item.item}">Residuo</label>
        <input id="re-${item.item}" type="text" class="entrada-texto entrada-residuo" placeholder="Residuo…" value="${vres}">
      </div>`;
  } else {
    controlHtml = `
      <div class="opcion-texto">
        <input type="text" class="entrada-texto" placeholder="Escribe tu respuesta…" value="${estado?.respuesta ? escaparHtml(estado.respuesta) : ""}">
      </div>`;
  }

  return `
    <article class="reactivo cuaderno-card" data-item-numero="${item.item}">
      <div class="cuaderno-card-margen"></div>
      <div class="cuaderno-card-cuerpo">
        <div class="reactivo-encabezado">
          <span class="reactivo-numero">${item.item}</span>
          <span class="reactivo-enunciado">${escaparHtml(item.enunciado)}</span>
          ${chip}
        </div>
        ${controlHtml}
        <div class="reactivo-acciones">
          <button type="button" class="btn btn-primario btn-revisar">Revisar</button>
          <button type="button" class="btn btn-secundario btn-mostrar">Mostrar respuesta</button>
          <button type="button" class="btn btn-secundario btn-explicar">Explicar</button>
        </div>
        <div class="reactivo-feedback" aria-live="polite"></div>
      </div>
    </article>`;
}

function conectarReactivo(app, clave, ej, item) {
  const nodo = app.querySelector(`.reactivo[data-item-numero="${item.item}"]`);
  if (!nodo) return;
  const feedback = nodo.querySelector(".reactivo-feedback");
  const opciones = nodo.querySelectorAll(".opcion-simbolo");
  const btnRevisar = nodo.querySelector(".btn-revisar");
  const btnMostrar = nodo.querySelector(".btn-mostrar");
  const btnExplicar = nodo.querySelector(".btn-explicar");

  opciones.forEach((op) => {
    op.addEventListener("click", () => {
      opciones.forEach((o) => o.classList.remove("seleccionada"));
      op.classList.add("seleccionada");
    });
  });

  function obtenerRespuestaUsuario() {
    if (ej.tipo === "comparacion") {
      const sel = nodo.querySelector(".opcion-simbolo.seleccionada");
      return sel ? sel.dataset.valor : "";
    }
    if (ej.tipo === "valor_posicional_doble") {
      const va = nodo.querySelector(".entrada-absoluto");
      const vr = nodo.querySelector(".entrada-relativo");
      return { absoluto: va ? va.value.trim() : "", relativo: vr ? vr.value.trim() : "" };
    }
    if (ej.tipo === "division_cociente_residuo") {
      const co = nodo.querySelector(".entrada-cociente");
      const re = nodo.querySelector(".entrada-residuo");
      return { cociente: co ? co.value.trim() : "", residuo: re ? re.value.trim() : "" };
    }
    const input = nodo.querySelector(".entrada-texto");
    return input ? input.value.trim() : "";
  }

  function respuestaEstaVacia(respuesta) {
    if (ej.tipo === "valor_posicional_doble") {
      return !respuesta || !respuesta.absoluto || !respuesta.relativo;
    }
    if (ej.tipo === "division_cociente_residuo") {
      return !respuesta || !respuesta.cociente || !respuesta.residuo;
    }
    return !respuesta;
  }

  function cajaFeedback(tipo, sello, mensaje) {
    return `<div class="feedback-caja ${tipo}"><span class="feedback-sello">${sello}</span><span>${mensaje}</span></div>`;
  }

  btnRevisar.addEventListener("click", async () => {
    const respuesta = obtenerRespuestaUsuario();
    if (respuestaEstaVacia(respuesta)) {
      feedback.innerHTML = cajaFeedback("info", `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='width:1em;height:1em' aria-hidden='true'><path d='M12 20h9'/><path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z'/></svg>`, "Selecciona o escribe una respuesta antes de revisar.");
      return;
    }
    const itemCompleto = { ...item, tipo: ej.tipo, tema: ej.tema };
    const correcta = calificar(ej.tipo, respuesta, item.respuesta_oficial);

    btnRevisar.disabled = true;
    try {
      await progreso.guardarRespuesta(clave, ej.numero_ejercicio, item.item, respuesta, correcta);
    } catch (e) {
      feedback.innerHTML = cajaFeedback("info", `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='width:1em;height:1em' aria-hidden='true'><circle cx='12' cy='12' r='9'/><line x1='12' y1='8' x2='12' y2='13'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>`, e.message || "No se pudo guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
      btnRevisar.disabled = false;
      return;
    }
    btnRevisar.disabled = false;

    if (correcta) {
      feedback.innerHTML = cajaFeedback("ok", `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='width:1em;height:1em' aria-hidden='true'><polyline points='20 6 9 17 4 12'/></svg>`, "¡Correcto!");
    } else {
      const pista = generarPista(itemCompleto, ej.tema);
      feedback.innerHTML = cajaFeedback("fallo", `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='width:1em;height:1em' aria-hidden='true'><line x1='18' y1='6' x2='6' y2='18'/><line x1='6' y1='6' x2='18' y2='18'/></svg>`, pista);
    }
    refrescarProgresoTopbar();
  });

  btnMostrar.addEventListener("click", () => {
    // Puramente visual: NO guarda nada, no cuenta como intento, no marca
    // completado, no toca Supabase. Se pierde al recargar la página, tal
    // como se acordó ("Mostrar respuesta" no es una decisión académica).
    const textoRespuesta = (ej.tipo === "valor_posicional_doble")
      ? `Valor absoluto: <strong>${escaparHtml(item.respuesta_oficial.absoluto)}</strong> · Valor relativo: <strong>${escaparHtml(item.respuesta_oficial.relativo)}</strong>`
      : (ej.tipo === "division_cociente_residuo")
      ? `Cociente: <strong>${escaparHtml(item.respuesta_oficial.cociente)}</strong> · Residuo: <strong>${escaparHtml(item.respuesta_oficial.residuo)}</strong>`
      : `Respuesta oficial del libro: <strong>${escaparHtml(item.respuesta_oficial)}</strong>`;
    feedback.innerHTML = cajaFeedback("info", `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' style='width:1em;height:1em' aria-hidden='true'><path d='M6 3h9l5 5v13H6Z'/><path d='M15 3v5h5'/><line x1='9' y1='13' x2='15' y2='13'/><line x1='9' y1='17' x2='15' y2='17'/></svg>`, textoRespuesta);
  });

  btnExplicar.addEventListener("click", () => {
    const itemCompleto = { ...item, tipo: ej.tipo, tema: ej.tema, respuestaOficial: item.respuesta_oficial };
    const pasos = generarExplicacion(itemCompleto);
    const div = document.createElement("div");
    div.className = "explicacion-lista";
    const ol = document.createElement("ol");
    pasos.forEach((p) => {
      const li = document.createElement("li");
      li.textContent = p;
      ol.appendChild(li);
    });
    div.appendChild(ol);
    feedback.appendChild(div);
  });
}
