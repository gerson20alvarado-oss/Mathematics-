// =============================================================
// data.js — acceso a los datos del libro (JSON estático).
// El manifiesto (metadatos livianos de las 7 áreas y sus capítulos)
// se carga una vez al iniciar. El contenido completo de un capítulo
// (teoría/ejemplos/ejercicios) sólo se descarga cuando el usuario lo
// abre, desde data/<area>/<archivo>, y se guarda en caché de memoria.
// =============================================================

let manifiestoCache = null;
const capitulosCache = new Map(); // clave: "<areaSlug>/<numero>"

// Ruta base relativa, para que funcione tanto en la raíz del dominio
// (GitHub Pages de usuario) como en un subdirectorio (GitHub Pages de
// proyecto, ej. usuario.github.io/mi-repo/).
const BASE = new URL(".", document.baseURI).pathname;

function rutaData(relativa) {
  return `${BASE}data/${relativa}`.replace(/\/{2,}/g, "/");
}

export async function cargarManifiesto() {
  if (manifiestoCache) return manifiestoCache;
  const res = await fetch(rutaData("manifest.json"));
  if (!res.ok) throw new Error("No se pudo cargar el manifiesto de áreas");
  manifiestoCache = await res.json();
  return manifiestoCache;
}

/** Aplana el manifiesto anidado (áreas -> capítulos) en una lista simple
 *  de capítulos, cada uno con una clave compuesta única (areaSlug-capituloSlug).
 *  Se usa para los cálculos de progreso agregados a nivel libro. */
export function aplanarCapitulos(manifiesto) {
  return manifiesto.flatMap((area) =>
    (area.capitulos || []).map((cap) => ({
      ...cap,
      areaSlug: area.slug,
      claveProgreso: claveCapitulo(area.slug, cap.numero),
    }))
  );
}

/** Clave única de un capítulo dentro de un área, usada como identificador
 *  de progreso en localStorage y como clave de caché en memoria. */
export function claveCapitulo(areaSlug, numero) {
  return `${areaSlug}-capitulo-${numero}`;
}

export async function obtenerArea(areaSlug) {
  const manifiesto = await cargarManifiesto();
  return manifiesto.find((a) => a.slug === areaSlug) || null;
}

export async function obtenerCapituloMeta(areaSlug, numero) {
  const area = await obtenerArea(areaSlug);
  if (!area) return null;
  return area.capitulos.find((c) => c.numero === Number(numero)) || null;
}

export async function cargarCapitulo(areaSlug, numero) {
  const claveCache = `${areaSlug}/${numero}`;
  if (capitulosCache.has(claveCache)) return capitulosCache.get(claveCache);

  const meta = await obtenerCapituloMeta(areaSlug, numero);
  if (!meta || !meta.disponible || !meta.archivo) {
    throw new Error("Este capítulo todavía no está disponible.");
  }
  const res = await fetch(rutaData(`${areaSlug}/${meta.archivo}`));
  if (!res.ok) throw new Error(`No se pudo cargar el contenido del capítulo (${meta.archivo})`);
  const datos = await res.json();
  capitulosCache.set(claveCache, datos);
  return datos;
}

export function obtenerEjercicio(capituloDatos, numeroEjercicio) {
  return capituloDatos.ejercicios.find((e) => e.numero_ejercicio === numeroEjercicio) || null;
}
