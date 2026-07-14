// =============================================================
// views.js — renderizado de las tres pantallas de la SPA.
// Cada función recibe el elemento contenedor (#app) y pinta su
// contenido; los "views" de ejercicio también atan los listeners
// de interactividad (Revisar / Pista / Mostrar respuesta / Explicar).
// =============================================================
import { cargarManifiesto, cargarCapitulo, obtenerEjercicio } from "./data.js";
import * as store from "./store.js";
import { calificar, generarPista, generarExplicacion } from "./grading.js";
import { actualizarProgresoTopbar } from "./app-shared.js";

function escaparHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

// -------------------------------------------------------------
// Pantalla de inicio
// -------------------------------------------------------------
export async function renderHome(app) {
  app.innerHTML = `<p class="cargando">Cargando índice…</p>`;
  const manifiesto = await cargarManifiesto();
  const progresoTotal = store.progresoLibro(manifiesto);

  const tarjetas = manifiesto.map((cap) => {
    if (!cap.disponible) {
      return `
        <div class="capitulo-card capitulo-card--bloqueada">
          <div class="capitulo-card-margen"></div>
          <div class="capitulo-card-cuerpo">
            <span class="capitulo-card-area">Próximamente</span>
            <h3>Capítulo ${cap.numero}</h3>
            <p>Se agregará en una fase siguiente</p>
          </div>
        </div>`;
    }
    const pct = store.progresoCapitulo(cap.slug, cap.totalReactivos);
    return `
      <a href="#/capitulo/${cap.slug}" class="capitulo-card capitulo-card--disponible">
        <div class="capitulo-card-margen"></div>
        <div class="capitulo-card-cuerpo">
          <span class="capitulo-card-area">${escaparHtml(cap.area)}</span>
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
// Pantalla de capítulo
// -------------------------------------------------------------
export async function renderChapter(app, slug) {
  app.innerHTML = `<p class="cargando">Cargando capítulo…</p>`;
  let cap;
  try {
    cap = await cargarCapitulo(slug);
  } catch (e) {
    app.innerHTML = `<p class="error-carga">${escaparHtml(e.message)}</p><a class="volver" href="#/">← Índice</a>`;
    return;
  }

  const manifiesto = await cargarManifiesto();
  const meta = manifiesto.find((c) => c.slug === slug);
  const progresoCap = store.progresoCapitulo(slug, meta.totalReactivos);

  const teoriaHtml = cap.teoria.map((t) => `
    <article class="cuaderno-card">
      <div class="cuaderno-card-margen"></div>
      <div class="cuaderno-card-cuerpo">
        <h3>${escaparHtml(t.titulo)}</h3>
        ${t.contenido.split("\n\n").map((p) => `<p>${escaparHtml(p)}</p>`).join("")}
        ${t.tabla ? renderTablaTeoria(t.tabla) : ""}
      </div>
    </article>`).join("");

  const ejemplosHtml = cap.ejemplos.map((e) => `
    <article class="cuaderno-card cuaderno-card--ejemplo">
      <div class="cuaderno-card-margen"></div>
      <div class="cuaderno-card-cuerpo">
        <h3>${escaparHtml(e.titulo)}</h3>
        ${e.contenido.split("\n\n").map((p) => `<p>${escaparHtml(p)}</p>`).join("")}
      </div>
    </article>`).join("");

  const ejerciciosHtml = cap.ejercicios.map((ej) => {
    const total = ej.items.length;
    let completados = 0;
    ej.items.forEach((it) => {
      const st = store.obtenerEstadoItem(slug, ej.numero_ejercicio, it.item);
      if (st?.completado) completados++;
    });
    const pct = total ? Math.round((100 * completados) / total) : 0;
    return `
      <a class="ejercicio-item" href="#/capitulo/${slug}/ejercicio/${ej.numero_ejercicio}">
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
  }).join("");

  app.innerHTML = `
    <a class="volver" href="#/">← Índice</a>
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

    <nav class="capitulo-tabs">
      <a href="#teoria" class="tab-link">Teoría</a>
      <a href="#ejemplos" class="tab-link">Ejemplos</a>
      <a href="#ejercicios" class="tab-link">Ejercicios</a>
    </nav>

    <section id="teoria" class="bloque">
      <h2 class="bloque-titulo">Teoría</h2>
      ${teoriaHtml}
    </section>
    <section id="ejemplos" class="bloque">
      <h2 class="bloque-titulo">Ejemplos</h2>
      ${ejemplosHtml}
    </section>
    <section id="ejercicios" class="bloque">
      <h2 class="bloque-titulo">Ejercicios</h2>
      <div class="ejercicios-lista">${ejerciciosHtml}</div>
    </section>
  `;

  actualizarProgresoTopbar(store.progresoLibro(manifiesto));
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
export async function renderExercise(app, slug, numeroEjercicio) {
  app.innerHTML = `<p class="cargando">Cargando ejercicio…</p>`;
  let cap;
  try {
    cap = await cargarCapitulo(slug);
  } catch (e) {
    app.innerHTML = `<p class="error-carga">${escaparHtml(e.message)}</p><a class="volver" href="#/">← Índice</a>`;
    return;
  }
  const ej = obtenerEjercicio(cap, numeroEjercicio);
  if (!ej) {
    app.innerHTML = `<p class="error-carga">Ejercicio no encontrado.</p><a class="volver" href="#/capitulo/${slug}">← Capítulo</a>`;
    return;
  }

  const reactivosHtml = ej.items.map((item) => renderReactivo(ej, item)).join("");

  app.innerHTML = `
    <a class="volver" href="#/capitulo/${slug}#ejercicios">← Capítulo ${cap.numero}</a>
    <section class="ejercicio-header">
      <span class="capitulo-header-area">${escaparHtml(cap.area)} · Capítulo ${cap.numero}</span>
      <h1>Ejercicio ${ej.numero_ejercicio} · ${escaparHtml(ej.titulo)}</h1>
      <p class="ejercicio-instrucciones">${escaparHtml(ej.instrucciones)}</p>
      ${ej.pagina ? `<p class="ejercicio-pagina">Libro, página ${ej.pagina}</p>` : ""}
    </section>
    <section class="reactivos">${reactivosHtml}</section>
  `;

  ej.items.forEach((item) => conectarReactivo(app, slug, ej, item));
  actualizarProgresoTopbarDesdeManifiesto();
}

function renderReactivo(ej, item) {
  const estado = store.obtenerEstadoItem(slugActual(), ej.numero_ejercicio, item.item);
  const chip = estado?.completado
    ? `<span class="reactivo-estado-chip ${estado.revelada ? "revelado" : (estado.correcta ? "ok" : "fallo")}">
         ${estado.revelada ? "👁 vista" : (estado.correcta ? "✔ correcto" : "intentado")}
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
          <button type="button" class="btn btn-secundario btn-explicar">🤖 Explicar</button>
        </div>
        <div class="reactivo-feedback" aria-live="polite"></div>
      </div>
    </article>`;
}

function conectarReactivo(app, slug, ej, item) {
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
    const input = nodo.querySelector(".entrada-texto");
    return input ? input.value.trim() : "";
  }

  function cajaFeedback(tipo, sello, mensaje) {
    return `<div class="feedback-caja ${tipo}"><span class="feedback-sello">${sello}</span><span>${mensaje}</span></div>`;
  }

  function refrescarProgreso() {
    actualizarProgresoTopbarDesdeManifiesto();
  }

  btnRevisar.addEventListener("click", () => {
    const respuesta = obtenerRespuestaUsuario();
    if (!respuesta) {
      feedback.innerHTML = cajaFeedback("info", "✏", "Selecciona o escribe una respuesta antes de revisar.");
      return;
    }
    const itemCompleto = { ...item, tipo: ej.tipo, tema: ej.tema };
    const correcta = calificar(ej.tipo, respuesta, item.respuesta_oficial);
    store.guardarRespuesta(slug, ej.numero_ejercicio, item.item, respuesta, correcta);

    if (correcta) {
      feedback.innerHTML = cajaFeedback("ok", "✔", "¡Correcto!");
    } else {
      const pista = generarPista(itemCompleto, ej.tema);
      feedback.innerHTML = cajaFeedback("fallo", "✗", pista);
    }
    refrescarProgreso();
  });

  btnMostrar.addEventListener("click", () => {
    store.marcarRevelada(slug, ej.numero_ejercicio, item.item);
    feedback.innerHTML = cajaFeedback("info", "📖", `Respuesta oficial del libro: <strong>${escaparHtml(item.respuesta_oficial)}</strong>`);
    refrescarProgreso();
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

// pequeño helper para leer el slug actual desde el hash (usado sólo
// para recuperar el estado guardado al pintar cada reactivo)
function slugActual() {
  const m = location.hash.match(/#\/capitulo\/([^/#]+)/);
  return m ? m[1] : "";
}

async function actualizarProgresoTopbarDesdeManifiesto() {
  const manifiesto = await cargarManifiesto();
  actualizarProgresoTopbar(store.progresoLibro(manifiesto));
}
