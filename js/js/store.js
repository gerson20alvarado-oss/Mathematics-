// =============================================================
// store.js — progreso del usuario persistido en LocalStorage.
// Estructura guardada bajo la llave CLAVE:
// {
//   "capitulo-1": {
//     "4": { "1": { respuesta: "<", correcta: true, revelada: false, completado: true }, ... },
//     "6": { ... }
//   }
// }
// =============================================================

const CLAVE = "ms:progreso:v1";
const CLAVE_TEMA = "ms:tema";

function leerTodo() {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("No se pudo leer el progreso guardado:", e);
    return {};
  }
}

function guardarTodo(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (e) {
    console.warn("No se pudo guardar el progreso (¿LocalStorage lleno o deshabilitado?):", e);
  }
}

export function obtenerEstadoItem(capituloSlug, numeroEjercicio, itemNumero) {
  const datos = leerTodo();
  return datos?.[capituloSlug]?.[numeroEjercicio]?.[itemNumero] || null;
}

export function guardarRespuesta(capituloSlug, numeroEjercicio, itemNumero, respuesta, correcta) {
  const datos = leerTodo();
  datos[capituloSlug] ??= {};
  datos[capituloSlug][numeroEjercicio] ??= {};
  const previo = datos[capituloSlug][numeroEjercicio][itemNumero] || { intentos: 0 };
  datos[capituloSlug][numeroEjercicio][itemNumero] = {
    respuesta,
    correcta,
    revelada: previo.revelada || false,
    completado: true,
    intentos: (previo.intentos || 0) + 1,
    actualizadoEn: new Date().toISOString(),
  };
  guardarTodo(datos);
}

export function marcarRevelada(capituloSlug, numeroEjercicio, itemNumero) {
  const datos = leerTodo();
  datos[capituloSlug] ??= {};
  datos[capituloSlug][numeroEjercicio] ??= {};
  const previo = datos[capituloSlug][numeroEjercicio][itemNumero] || {};
  datos[capituloSlug][numeroEjercicio][itemNumero] = {
    ...previo,
    revelada: true,
    completado: true,
    actualizadoEn: new Date().toISOString(),
  };
  guardarTodo(datos);
}

/** Cuenta cuántos reactivos completados tiene un capítulo. */
export function contarCompletadosCapitulo(capituloSlug) {
  const datos = leerTodo();
  const cap = datos[capituloSlug];
  if (!cap) return 0;
  let total = 0;
  for (const ejercicio of Object.values(cap)) {
    for (const item of Object.values(ejercicio)) {
      if (item.completado) total++;
    }
  }
  return total;
}

/** Progreso (0-100) de un capítulo dado su total de reactivos conocido por el manifiesto. */
export function progresoCapitulo(capituloSlug, totalReactivos) {
  if (!totalReactivos) return 0;
  return Math.round((100 * contarCompletadosCapitulo(capituloSlug)) / totalReactivos);
}

/** Progreso (0-100) de un conjunto de capítulos (usa su clave de progreso
 *  y su totalReactivos). Sirve tanto para una sola área como para el libro
 *  completo — quien llama decide qué subconjunto de capítulos le pasa. */
export function progresoConjunto(capitulos) {
  const total = capitulos.reduce((acc, c) => acc + (c.totalReactivos || 0), 0);
  if (!total) return 0;
  const completados = capitulos.reduce(
    (acc, c) => acc + contarCompletadosCapitulo(c.claveProgreso || c.slug), 0
  );
  return Math.round((100 * completados) / total);
}

/** Progreso (0-100) de todo el libro, a partir de la lista ya aplanada
 *  de capítulos (ver data.js -> aplanarCapitulos). */
export function progresoLibro(capitulosPlanos) {
  return progresoConjunto(capitulosPlanos);
}

/** Progreso (0-100) de una sola área, a partir de los capítulos de esa
 *  área (con claveProgreso ya calculada). */
export function progresoArea(capitulosDeArea) {
  return progresoConjunto(capitulosDeArea);
}

// ---------------- Tema (claro/oscuro) ----------------

export function obtenerTemaGuardado() {
  return localStorage.getItem(CLAVE_TEMA);
}

export function guardarTema(tema) {
  localStorage.setItem(CLAVE_TEMA, tema);
}
