// =============================================================
// app.js — punto de entrada, control de acceso y router SPA.
//
// Flujo de acceso (autenticación obligatoria, sin modo invitado):
//   sin internet         -> pantalla "necesitas conexión"
//   con internet, sin sesión -> pantalla de bienvenida (login GitHub)
//   con sesión            -> carga progreso desde Supabase, transición
//                            suave, biblioteca (router de 4 niveles)
//
// Router (una vez autenticado):
//   #/                                                  -> inicio (áreas)
//   #/area/<areaSlug>                                   -> capítulos de esa área
//   #/area/<areaSlug>/capitulo/<numero>                 -> capítulo
//   #/area/<areaSlug>/capitulo/<numero>/ejercicio/<n>   -> ejercicio
// =============================================================
import { renderHome, renderCategory, renderChapter, renderExercise } from "./views.js";
import * as tema from "./store.js";
import * as auth from "./auth.js";
import * as progreso from "./progreso.js";
import { cargarManifiesto, aplanarCapitulos } from "./data.js";
import { actualizarProgresoTopbar } from "./app-shared.js";
import { obtenerClienteSupabasePromesa } from "./supabase-client.js";
import { iniciarFondoEstrellas } from "./fondo-estrellas.js";

const app = document.getElementById("app");
const shellApp = document.getElementById("shell-app");
const pantallaBienvenida = document.getElementById("pantalla-bienvenida");
const pantallaSinConexion = document.getElementById("pantalla-sin-conexion");
const botonGithub = document.getElementById("boton-github");
const botonReintentar = document.getElementById("boton-reintentar");
const botonCuenta = document.getElementById("boton-cuenta");
const menuCuenta = document.getElementById("menu-cuenta");
const menuCuentaNombre = document.getElementById("menu-cuenta-nombre");
const botonCerrarSesion = document.getElementById("boton-cerrar-sesion");

let sesionActual = null;

// ---------------- Tema (claro/oscuro) — igual que siempre ----------------

function aplicarTemaGuardado() {
  const guardado = tema.obtenerTemaGuardado();
  const preferido = guardado || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro");
  if (preferido === "oscuro") document.documentElement.setAttribute("data-tema", "oscuro");
}

function configurarToggleTema() {
  document.getElementById("toggle-tema").addEventListener("click", () => {
    const actual = document.documentElement.getAttribute("data-tema") === "oscuro" ? "oscuro" : "claro";
    const nuevo = actual === "oscuro" ? "claro" : "oscuro";
    if (nuevo === "oscuro") document.documentElement.setAttribute("data-tema", "oscuro");
    else document.documentElement.removeAttribute("data-tema");
    tema.guardarTema(nuevo);
  });
}

// ---------------- Pantallas ----------------

function mostrarBienvenida() {
  pantallaSinConexion.hidden = true;
  pantallaBienvenida.hidden = false;
  pantallaBienvenida.classList.remove("desvanecido");
  shellApp.classList.remove("visible");
}

function mostrarSinConexion() {
  pantallaBienvenida.hidden = true;
  shellApp.classList.remove("visible");
  pantallaSinConexion.hidden = false;
}

async function mostrarBiblioteca() {
  pantallaSinConexion.hidden = true;

  // Transición extremadamente suave: la bienvenida se desvanece y, casi
  // al mismo tiempo, aparece la biblioteca — sin cambios bruscos.
  pantallaBienvenida.classList.add("desvanecido");
  setTimeout(() => { pantallaBienvenida.hidden = true; }, 1200);
  requestAnimationFrame(() => shellApp.classList.add("visible"));

  try {
    const manifiesto = await cargarManifiesto();
    actualizarProgresoTopbar(progreso.progresoLibro(aplanarCapitulos(manifiesto)));
  } catch (e) {
    console.error(e);
  }

  await enRuta();
}

// ---------------- Sesión ----------------

async function entrarConSesion(usuario) {
  sesionActual = usuario;
  const nombre = usuario.user_metadata?.user_name || usuario.user_metadata?.full_name || usuario.email || "Cuenta";
  menuCuentaNombre.textContent = nombre;
  botonCuenta.title = nombre;
  botonCuenta.setAttribute("aria-label", `Cuenta: ${nombre}`);

  try {
    await progreso.cargarProgreso(usuario.id);
  } catch (e) {
    console.error(e);
    mostrarSinConexion();
    return;
  }

  await mostrarBiblioteca();
}

function salirDeSesion() {
  sesionActual = null;
  progreso.limpiarProgreso();
  menuCuenta.hidden = true;
  location.hash = "";
  mostrarBienvenida();
}

function configurarControlesDeSesion() {
  botonGithub.addEventListener("click", () => auth.iniciarSesionConGitHub());
  botonReintentar.addEventListener("click", () => location.reload());

  botonCuenta.addEventListener("click", (evento) => {
    evento.stopPropagation();
    menuCuenta.hidden = !menuCuenta.hidden;
  });
  document.addEventListener("click", () => { menuCuenta.hidden = true; });
  menuCuenta.addEventListener("click", (evento) => evento.stopPropagation());

  botonCerrarSesion.addEventListener("click", async () => {
    menuCuenta.hidden = true;
    await auth.cerrarSesion();
  });
}

// ---------------- Router (sólo se ejecuta autenticado) ----------------

async function enRuta() {
  if (!sesionActual) return;
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

// ---------------- Arranque ----------------

async function iniciar() {
  aplicarTemaGuardado();
  configurarToggleTema();
  configurarControlesDeSesion();
  iniciarFondoEstrellas(document.getElementById("fondo-estrellas"));

  if (!navigator.onLine) {
    mostrarSinConexion();
    window.addEventListener("online", () => location.reload(), { once: true });
    return;
  }

  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) {
    mostrarSinConexion();
    return;
  }

  await auth.alCambiarSesion((usuario) => {
    if (usuario) {
      if (!sesionActual) entrarConSesion(usuario);
    } else if (sesionActual) {
      salirDeSesion();
    }
  });

  window.addEventListener("hashchange", enRuta);
}

iniciar();
