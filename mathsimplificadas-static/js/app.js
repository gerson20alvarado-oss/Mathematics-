// =============================================================
// app.js — punto de entrada y router SPA (basado en hash, sin
// dependencias externas, sin recargar la página).
// Rutas:
//   #/                                     -> inicio
//   #/capitulo/<slug>                      -> capítulo
//   #/capitulo/<slug>/ejercicio/<numero>   -> ejercicio
// =============================================================
import { renderHome, renderChapter, renderExercise } from "./views.js";
import * as store from "./store.js";
import { cargarManifiesto } from "./data.js";
import { actualizarProgresoTopbar } from "./app-shared.js";

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
  if ((m = hash.match(/^#\/capitulo\/([^/#]+)\/ejercicio\/(\d+)/))) {
    await renderExercise(app, m[1], Number(m[2]));
  } else if ((m = hash.match(/^#\/capitulo\/([^/#]+)/))) {
    await renderChapter(app, m[1]);
    // permite anclar a #ejercicios / #teoria / #ejemplos dentro del capítulo
    const ancla = hash.split("#")[2];
    if (ancla) {
      document.getElementById(ancla)?.scrollIntoView({ behavior: "smooth" });
    }
  } else {
    await renderHome(app);
  }
  window.scrollTo({ top: hash.includes("ejercicio") || hash === "#/" ? 0 : window.scrollY });
}

async function iniciar() {
  aplicarTemaGuardado();
  configurarToggleTema();

  try {
    const manifiesto = await cargarManifiesto();
    actualizarProgresoTopbar(store.progresoLibro(manifiesto));
  } catch (e) {
    console.error(e);
  }

  window.addEventListener("hashchange", enRuta);
  await enRuta();
}

iniciar();
