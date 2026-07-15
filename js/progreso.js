// =============================================================
// progreso.js — progreso académico del usuario. Supabase es la
// ÚNICA fuente de verdad; no existe LocalStorage de respaldo ni
// fusión de ningún tipo. Este módulo mantiene una caché en memoria
// (se pierde al recargar la página) para que el resto de la app
// pueda leer el progreso de forma síncrona igual que antes — la
// caché se llena una sola vez, completa, al iniciar sesión.
//
// "Mostrar respuesta" NUNCA pasa por este módulo: es un estado
// puramente visual que vive en views.js y no toca Supabase ni la
// caché (ver conectarReactivo en views.js).
// =============================================================
import { obtenerClienteSupabasePromesa } from "./supabase-client.js";

const TABLA = "progreso_items";

let cache = null; // { claveCapitulo: { numeroEjercicio: { itemNumero: registro } } }
let usuarioIdActual = null;
let clienteCache = null;

function filaARegistro(fila) {
  return {
    respuesta: fila.respuesta,
    correcta: fila.correcta,
    completado: !!fila.completado,
    intentos: fila.intentos || 0,
    actualizadoEn: fila.updated_at,
  };
}

/** Descarga TODO el progreso del usuario desde Supabase hacia la caché en
 *  memoria. Se llama una sola vez, justo después de iniciar sesión. Si el
 *  usuario es nuevo, Supabase simplemente no tiene filas — la caché queda
 *  vacía y arranca "en blanco", sin ningún paso adicional. */
export async function cargarProgreso(usuarioId) {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) throw new Error("No se pudo conectar con Supabase.");
  clienteCache = cliente;
  usuarioIdActual = usuarioId;

  const { data, error } = await cliente.from(TABLA).select("*").eq("user_id", usuarioId);
  if (error) throw error;

  cache = {};
  for (const fila of data || []) {
    cache[fila.capitulo_clave] ??= {};
    cache[fila.capitulo_clave][fila.ejercicio_numero] ??= {};
    cache[fila.capitulo_clave][fila.ejercicio_numero][fila.item_numero] = filaARegistro(fila);
  }
}

/** Se llama al cerrar sesión: descarta la caché en memoria. No hay nada
 *  que "conservar" localmente — el progreso sigue intacto en Supabase
 *  para la próxima vez que se inicie sesión. */
export function limpiarProgreso() {
  cache = null;
  usuarioIdActual = null;
  clienteCache = null;
}

export function obtenerEstadoItem(claveCapitulo, numeroEjercicio, itemNumero) {
  return cache?.[claveCapitulo]?.[numeroEjercicio]?.[itemNumero] || null;
}

/** Guarda una respuesta: actualiza la caché en memoria de inmediato (para
 *  que la interfaz refleje el resultado sin esperar la red) y escribe a
 *  Supabase. Se invoca únicamente al pulsar "Revisar" — nunca mientras el
 *  usuario escribe. */
export async function guardarRespuesta(claveCapitulo, numeroEjercicio, itemNumero, respuesta, correcta) {
  if (!cache || !usuarioIdActual || !clienteCache) return;

  const previo = cache[claveCapitulo]?.[numeroEjercicio]?.[itemNumero];
  const registro = {
    respuesta,
    correcta,
    completado: true,
    intentos: (previo?.intentos || 0) + 1,
    actualizadoEn: new Date().toISOString(),
  };

  cache[claveCapitulo] ??= {};
  cache[claveCapitulo][numeroEjercicio] ??= {};
  cache[claveCapitulo][numeroEjercicio][itemNumero] = registro;

  const { error } = await clienteCache.from(TABLA).upsert(
    {
      user_id: usuarioIdActual,
      capitulo_clave: claveCapitulo,
      ejercicio_numero: Number(numeroEjercicio),
      item_numero: Number(itemNumero),
      respuesta: respuesta ?? null,
      correcta: correcta ?? null,
      revelada: false,
      intentos: registro.intentos,
      completado: true,
    },
    { onConflict: "user_id,capitulo_clave,ejercicio_numero,item_numero" }
  );

  if (error) {
    throw new Error("No se pudo guardar tu respuesta. Revisa tu conexión e inténtalo de nuevo.");
  }
}

/** Cuenta cuántos reactivos completados tiene un capítulo, según la caché. */
export function contarCompletadosCapitulo(claveCapitulo) {
  const cap = cache?.[claveCapitulo];
  if (!cap) return 0;
  let total = 0;
  for (const ejercicio of Object.values(cap)) {
    for (const item of Object.values(ejercicio)) {
      if (item.completado) total++;
    }
  }
  return total;
}

export function progresoCapitulo(claveCapitulo, totalReactivos) {
  if (!totalReactivos) return 0;
  return Math.round((100 * contarCompletadosCapitulo(claveCapitulo)) / totalReactivos);
}

export function progresoConjunto(capitulos) {
  const total = capitulos.reduce((acc, c) => acc + (c.totalReactivos || 0), 0);
  if (!total) return 0;
  const completados = capitulos.reduce(
    (acc, c) => acc + contarCompletadosCapitulo(c.claveProgreso || c.slug), 0
  );
  return Math.round((100 * completados) / total);
}

export function progresoLibro(capitulosPlanos) {
  return progresoConjunto(capitulosPlanos);
}

export function progresoArea(capitulosDeArea) {
  return progresoConjunto(capitulosDeArea);
}
