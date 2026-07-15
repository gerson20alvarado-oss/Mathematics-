// =============================================================
// store.js — preferencias visuales en LocalStorage ÚNICAMENTE.
//
// El progreso académico ya NO vive aquí ni en ningún LocalStorage:
// Supabase es la única fuente de verdad (ver js/progreso.js). Este
// archivo sólo guarda configuración de interfaz que no tiene ningún
// valor académico (por ahora, el tema claro/oscuro), consistente con
// "LocalStorage únicamente podrá almacenar preferencias visuales".
// =============================================================

const CLAVE_TEMA = "ms:tema";

export function obtenerTemaGuardado() {
  return localStorage.getItem(CLAVE_TEMA);
}

export function guardarTema(tema) {
  localStorage.setItem(CLAVE_TEMA, tema);
}
