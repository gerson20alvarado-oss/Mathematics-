// =============================================================
// app.js — punto de entrada y router SPA (basado en hash, sin
// dependencias externas, sin recargar la página).
// Rutas (jerarquía Inicio -> Área -> Capítulo -> Ejercicio):
//   #/                                                  -> inicio (áreas)
//   #/area/<areaSlug>                                   -> capítulos de esa área
//   #/area/<areaSlug>/capitulo/<numero>                 -> capítulo
//   #/area/<areaSlug>/capitulo/<numero>/ejercicio/<n>   -> ejercicio
// =============================================================
import { renderHome, renderCategory, renderChapter, renderExercise } from "./views.js";
import * as store from "./store.js";
import { cargarManifiesto, aplanarCapitulos } from "./data.js";
import { actualizarProgresoTopbar } from "./app-shared.js";
import { SYNC_HABILITADO } from "./config.js";

const app = document.getElementById("app");

function aplicarTemaGuardado() {
  const guardado = store.obtenerTemaGuardado();
  const preferido = guardado || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro");
  if (preferido === "oscuro") document.documentElement.setAttribute("data-tema", "oscuro");
}

function configurarToggleTema() {
  const boton = document.getElementById("toggle-tema");
  boton.addEventListener("click", () => {
    const actual = document.documentElement.getAttribute("data-tema") === "oscuro" ? "oscuro" : "claro";
    const nuevo = actual === "oscuro" ? "claro" : "oscuro";
    if (nuevo === "oscuro") document.documentElement.setAttribute("data-tema", "oscuro");
    else document.documentElement.removeAttribute("data-tema");
    store.guardarTema(nuevo);
  });
}

async function enRuta() {
  const hash = location.hash || "#/";

  let m;
  if ((m = hash.match(/^#\/area\/([^/#]+)\/capitulo\/(\d+)\/ejercicio\/(\d+)/))) {
    await renderExercise(app, m[1], Number(m[2]), Number(m[3]));
  } else if ((m = hash.match(/^#\/area\/([^/#]+)\/capitulo\/(\d+)/))) {
    await renderChapter(app, m[1], Number(m[2]));
    const ancla = hash.split("#")[2];
    if (ancla) document.getElementById(ancla)?.scrollIntoView({ behavior: "smooth" });
  } else if ((m = hash.match(/^#\/area\/([^/#]+)/))) {
    await renderCategory(app, m[1]);
  } else {
    await renderHome(app);
  }

  if (!hash.includes("#ejercicios") && !hash.includes("#teoria") && !hash.includes("#ejemplos")) {
    window.scrollTo({ top: 0 });
  }
}

async function iniciar() {
  aplicarTemaGuardado();
  configurarToggleTema();
  await configurarCuenta();

  try {
    const manifiesto = await cargarManifiesto();
    actualizarProgresoTopbar(store.progresoLibro(aplanarCapitulos(manifiesto)));
  } catch (e) {
    console.error(e);
  }

  window.addEventListener("hashchange", enRuta);
  await enRuta();
}

// -------------------------------------------------------------
// Cuenta y sincronización (opcional). Si SYNC_HABILITADO es false
// (valor por defecto en config.js), esta función no toca el DOM ni
// la red en absoluto: la app queda idéntica a como estaba antes de
// que existiera esta capa.
// -------------------------------------------------------------
async function configurarCuenta() {
  if (!SYNC_HABILITADO) return;

  const [{ iniciarSesionConGitHub, cerrarSesion, alCambiarSesion }, sync] = await Promise.all([
    import("./auth.js"),
    import("./sync.js"),
  ]);

  const boton = document.getElementById("boton-cuenta");
  const indicador = document.getElementById("indicador-sync");
  if (!boton || !indicador) return;
  boton.hidden = false;

  const TEXTOS_ESTADO = {
    sincronizando: "Sincronizando…",
    sincronizado: "Sincronizado",
    "sin-conexion": "Sin conexión",
    conflicto: "Conflicto por resolver",
  };

  let sesionActual = null;

  boton.addEventListener("click", async () => {
    if (sesionActual) {
      const nombre = sesionActual.user_metadata?.user_name || sesionActual.email || "tu cuenta";
      const cerrar = window.confirm(
        `Sesión iniciada como ${nombre}.\n\n¿Cerrar sesión? Tu progreso guardado en este dispositivo NO se borra: seguirás viéndolo normalmente sin conexión.`
      );
      if (cerrar) await cerrarSesion();
    } else {
      await iniciarSesionConGitHub();
    }
  });

  alCambiarSesion((usuario) => {
    sesionActual = usuario;
    boton.classList.toggle("cuenta-activa", !!usuario);
    boton.setAttribute(
      "aria-label",
      usuario ? `Cuenta sincronizada (${usuario.user_metadata?.user_name || usuario.email})` : "Iniciar sesión con GitHub para sincronizar tu progreso"
    );
    boton.title = boton.getAttribute("aria-label");
  });

  sync.alCambiarEstadoSync((estado) => {
    indicador.hidden = !TEXTOS_ESTADO[estado];
    indicador.textContent = TEXTOS_ESTADO[estado] || "";
    indicador.className = `indicador-sync indicador-sync--${estado}`;
    if (estado === "sincronizado" || estado === "conflicto") {
      cargarManifiesto().then((m) => actualizarProgresoTopbar(store.progresoLibro(aplanarCapitulos(m))));
    }
  });

  sync.alDetectarConflicto((conflictos, fusionadoParcial) => {
    mostrarModalConflicto(conflictos, fusionadoParcial, sync);
  });

  sync.inicializar();
}

function mostrarModalConflicto(conflictos, fusionadoParcial, sync) {
  const overlay = document.createElement("div");
  overlay.className = "conflicto-overlay";
  overlay.innerHTML = `
    <div class="conflicto-caja cuaderno-card">
      <div class="cuaderno-card-margen"></div>
      <div class="cuaderno-card-cuerpo">
        <h3>Encontramos progreso distinto en otro dispositivo</h3>
        <p>${conflictos.length} reactivo(s) tienen una respuesta diferente guardada en este
        dispositivo y en la nube. Elige cómo resolverlo — no se sobrescribirá nada
        automáticamente hasta que decidas.</p>
        <div class="reactivo-acciones">
          <button type="button" class="btn btn-primario" data-eleccion="fusionar">Fusionar automáticamente</button>
          <button type="button" class="btn btn-secundario" data-eleccion="local">Conservar mi progreso local</button>
          <button type="button" class="btn btn-secundario" data-eleccion="remoto">Descargar el progreso de la nube</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.querySelectorAll("[data-eleccion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      sync.resolverConflictos(conflictos, fusionadoParcial, btn.dataset.eleccion);
      overlay.remove();
      enRuta(); // vuelve a pintar la vista actual con el progreso ya fusionado
    });
  });
}

iniciar();
