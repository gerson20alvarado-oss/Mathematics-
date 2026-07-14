// =============================================================
// data.js — acceso a los datos del libro (JSON estático).
// El manifiesto (metadatos livianos) se carga una vez al iniciar.
// El contenido completo de un capítulo (teoría/ejemplos/ejercicios)
// sólo se descarga cuando el usuario abre ese capítulo, y se
// guarda en caché de memoria para no volver a pedirlo.
// =============================================================

let manifiestoCache = null;
const capitulosCache = new Map();

// Ruta base relativa, para que funcione tanto en la raíz del dominio
// (GitHub Pages de usuario) como en un subdirectorio (GitHub Pages de
// proyecto, ej. usuario.github.io/mi-repo/).
const BASE = new URL(".", document.baseURI).pathname;

function rutaData(archivo) {
  return `${BASE}data/${archivo}`.replace(/\/{2,}/g, "/");
}

export async function cargarManifiesto() {
  if (manifiestoCache) return manifiestoCache;
  const res = await fetch(rutaData("manifest.json"));
  if (!res.ok) throw new Error("No se pudo cargar el manifiesto de capítulos");
  manifiestoCache = await res.json();
  return manifiestoCache;
}

export async function obtenerCapituloManifiesto(slug) {
  const manifiesto = await cargarManifiesto();
  return manifiesto.find((c) => c.slug === slug) || null;
}

export async function cargarCapitulo(slug) {
  if (capitulosCache.has(slug)) return capitulosCache.get(slug);

  const meta = await obtenerCapituloManifiesto(slug);
  if (!meta || !meta.disponible || !meta.archivo) {
    throw new Error("Este capítulo todavía no está disponible.");
  }
  const res = await fetch(rutaData(meta.archivo));
  if (!res.ok) throw new Error(`No se pudo cargar el contenido del capítulo (${meta.archivo})`);
  const datos = await res.json();
  capitulosCache.set(slug, datos);
  return datos;
}

export function obtenerEjercicio(capituloDatos, numeroEjercicio) {
  return capituloDatos.ejercicios.find((e) => e.numero_ejercicio === numeroEjercicio) || null;
}
