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

  try {
    const manifiesto = await cargarManifiesto();
    actualizarProgresoTopbar(store.progresoLibro(aplanarCapitulos(manifiesto)));
  } catch (e) {
    console.error(e);
  }

  window.addEventListener("hashchange", enRuta);
  await enRuta();
}

iniciar();
