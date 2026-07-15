// =============================================================
// sync.js — capa de sincronización opcional con Supabase.
//
// Principio de diseño: es el ÚNICO archivo que le habla a Supabase
// sobre progreso. Lee y escribe el progreso local exclusivamente a
// través de las dos funciones que store.js expone para esto
// (obtenerTodoElProgreso / reconciliarDesdeSync) — nunca duplica el
// formato de datos, y nunca reemplaza el árbol local por el remoto
// sin fusionar primero.
//
// Reglas de fusión aprobadas:
//   - revelada  = OR lógico (una vez revelada, nunca vuelve a false)
//   - intentos  = máximo entre local y remoto
//   - respuesta/correcta = timestamp del SERVIDOR más reciente gana,
//     salvo que ambos lados tengan una respuesta distinta y ambos
//     estén "completado" — eso es un conflicto genuino y se detiene
//     para preguntar al usuario (nunca se sobrescribe solo).
// =============================================================
import * as store from "./store.js";
import { obtenerClienteSupabasePromesa } from "./supabase-client.js";
import { usuarioActual, alCambiarSesion } from "./auth.js";

const TABLA = "progreso_items";
const CLAVE_ULTIMO_ESTADO_SERVIDOR = "ms:sync-servidor:v1"; // { "clave|ej|item": "iso-timestamp" }

let usuarioId = null;
let cancelarSuscripcionAuth = null;
let cancelarSuscripcionProgreso = null;
let debounceTimer = null;
let estadoActual = "deshabilitado";
const oyentesEstado = new Set();

function fijarEstado(nuevo) {
  estadoActual = nuevo;
  oyentesEstado.forEach((cb) => cb(estadoActual));
}

export function obtenerEstadoSync() {
  return estadoActual;
}

/** Suscribe la UI (topbar) al estado de sincronización. Devuelve función para cancelar. */
export function alCambiarEstadoSync(callback) {
  oyentesEstado.add(callback);
  callback(estadoActual);
  return () => oyentesEstado.delete(callback);
}

// ---------------- Marcas locales de "última vez confirmado por el servidor" ----------------
// Vive en una llave de LocalStorage separada de ms:progreso:v1 — nunca se
// mezcla con el progreso real, así que jamás puede corromperlo o perderlo.

function leerMarcasServidor() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_ULTIMO_ESTADO_SERVIDOR) || "{}");
  } catch {
    return {};
  }
}
function guardarMarcasServidor(marcas) {
  try {
    localStorage.setItem(CLAVE_ULTIMO_ESTADO_SERVIDOR, JSON.stringify(marcas));
  } catch { /* no crítico: en el peor caso se re-sincroniza un item de más */ }
}

function claveFila(claveCapitulo, numeroEjercicio, itemNumero) {
  return `${claveCapitulo}|${numeroEjercicio}|${itemNumero}`;
}

// ---------------- Conversión entre el árbol local y las filas remotas ----------------

function filaARegistroLocal(fila) {
  return {
    respuesta: fila.respuesta,
    correcta: fila.correcta,
    revelada: !!fila.revelada,
    completado: !!fila.completado,
    intentos: fila.intentos || 0,
    actualizadoEn: fila.updated_at,
  };
}

function fusionarSeguro(local, remotoLocal, remotoGana) {
  return {
    ...(remotoGana ? remotoLocal : local),
    revelada: !!(local?.revelada || remotoLocal?.revelada),
    intentos: Math.max(local?.intentos || 0, remotoLocal?.intentos || 0),
    completado: !!(local?.completado || remotoLocal?.completado),
  };
}

function mismaRespuesta(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

// ---------------- Fusión inicial (al iniciar sesión / reconectar) ----------------

/** Descarga el progreso remoto y lo fusiona con el local. Si encuentra
 *  conflictos genuinos (ambos lados respondieron distinto), NO los
 *  resuelve solo: los devuelve para que la UI le pregunte al usuario. */
async function fusionarConRemoto() {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente || !usuarioId) return;

  fijarEstado("sincronizando");
  const { data: filas, error } = await cliente.from(TABLA).select("*").eq("user_id", usuarioId);
  if (error) {
    fijarEstado("sin-conexion");
    return;
  }

  const local = store.obtenerTodoElProgreso();
  const fusionado = JSON.parse(JSON.stringify(local));
  const marcas = leerMarcasServidor();
  const conflictos = [];

  for (const fila of filas || []) {
    const { capitulo_clave: cc, ejercicio_numero: ej, item_numero: it } = fila;
    const localItem = local?.[cc]?.[ej]?.[it];
    const remotoLocal = filaARegistroLocal(fila);

    fusionado[cc] ??= {};
    fusionado[cc][ej] ??= {};

    if (!localItem) {
      fusionado[cc][ej][it] = remotoLocal;
      marcas[claveFila(cc, ej, it)] = fila.updated_at;
      continue;
    }
    if (mismaRespuesta(localItem.respuesta, fila.respuesta)) {
      fusionado[cc][ej][it] = fusionarSeguro(localItem, remotoLocal, false);
      marcas[claveFila(cc, ej, it)] = fila.updated_at;
      continue;
    }
    if (localItem.completado && fila.completado) {
      // Conflicto genuino: ambos dispositivos respondieron distinto.
      conflictos.push({ claveCapitulo: cc, numeroEjercicio: ej, itemNumero: it, local: localItem, remoto: remotoLocal, filaRemota: fila });
      continue;
    }
    // Uno de los dos no está realmente completo: gana quien tenga el
    // timestamp de servidor más reciente (nunca el reloj del dispositivo).
    const marcaLocal = marcas[claveFila(cc, ej, it)];
    const remotoEsMasNuevo = !marcaLocal || new Date(fila.updated_at) > new Date(marcaLocal);
    fusionado[cc][ej][it] = fusionarSeguro(localItem, remotoLocal, remotoEsMasNuevo);
    marcas[claveFila(cc, ej, it)] = fila.updated_at;
  }

  guardarMarcasServidor(marcas);

  if (conflictos.length > 0) {
    fijarEstado("conflicto");
    return { conflictos, fusionadoParcial: fusionado };
  }

  store.reconciliarDesdeSync(fusionado);
  fijarEstado("sincronizado");
  return null;
}

/** Resuelve los conflictos detectados según la elección del usuario:
 *  'local' | 'remoto' | 'fusionar' (fusionar = gana el timestamp de
 *  servidor más reciente, igual que el resto de los reactivos). */
export function resolverConflictos(conflictos, fusionadoParcial, eleccion) {
  const marcas = leerMarcasServidor();
  const fusionado = fusionadoParcial;
  for (const c of conflictos) {
    const { claveCapitulo: cc, numeroEjercicio: ej, itemNumero: it, local, remoto, filaRemota } = c;
    let remotoGana;
    if (eleccion === "local") remotoGana = false;
    else if (eleccion === "remoto") remotoGana = true;
    else remotoGana = new Date(filaRemota.updated_at) > new Date(local.actualizadoEn || 0);

    fusionado[cc] ??= {};
    fusionado[cc][ej] ??= {};
    fusionado[cc][ej][it] = fusionarSeguro(local, remoto, remotoGana);
    marcas[claveFila(cc, ej, it)] = filaRemota.updated_at;
  }
  guardarMarcasServidor(marcas);
  store.reconciliarDesdeSync(fusionado);
  fijarEstado("sincronizado");
}

// ---------------- Outbox: sube cambios locales a Supabase ----------------

async function subirCambiosPendientes() {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente || !usuarioId) return;

  const local = store.obtenerTodoElProgreso();
  const marcas = leerMarcasServidor();
  const filas = [];

  for (const [cc, ejercicios] of Object.entries(local)) {
    for (const [ej, items] of Object.entries(ejercicios)) {
      for (const [it, registro] of Object.entries(items)) {
        if (!registro.completado) continue;
        const marca = marcas[claveFila(cc, ej, it)];
        if (marca && new Date(registro.actualizadoEn || 0) <= new Date(marca)) continue; // ya sincronizado
        filas.push({
          user_id: usuarioId,
          capitulo_clave: cc,
          ejercicio_numero: Number(ej),
          item_numero: Number(it),
          respuesta: registro.respuesta,
          correcta: registro.correcta,
          revelada: registro.revelada,
          intentos: registro.intentos,
          completado: registro.completado,
        });
      }
    }
  }

  if (filas.length === 0) {
    fijarEstado("sincronizado");
    return;
  }

  fijarEstado("sincronizando");
  const { data, error } = await cliente
    .from(TABLA)
    .upsert(filas, { onConflict: "user_id,capitulo_clave,ejercicio_numero,item_numero" })
    .select();

  if (error) {
    fijarEstado("sin-conexion"); // se reintentará en el siguiente cambio o reconexión
    return;
  }

  for (const fila of data || []) {
    marcas[claveFila(fila.capitulo_clave, fila.ejercicio_numero, fila.item_numero)] = fila.updated_at;
  }
  guardarMarcasServidor(marcas);
  fijarEstado("sincronizado");
}

function programarSubida() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(subirCambiosPendientes, 2000);
}

// ---------------- Ciclo de vida ----------------

let onConflictoDetectado = null;

/** Registra el callback que la UI usa para mostrar el selector de
 *  conflictos (local / remoto / fusionar) cuando haga falta. */
export function alDetectarConflicto(callback) {
  onConflictoDetectado = callback;
}

async function manejarSesion(usuario) {
  usuarioId = usuario?.id || null;

  if (cancelarSuscripcionProgreso) {
    cancelarSuscripcionProgreso();
    cancelarSuscripcionProgreso = null;
  }

  if (!usuarioId) {
    fijarEstado("sin-sesion");
    return;
  }

  const resultado = await fusionarConRemoto();
  if (resultado?.conflictos?.length && onConflictoDetectado) {
    onConflictoDetectado(resultado.conflictos, resultado.fusionadoParcial);
  }

  cancelarSuscripcionProgreso = store.alCambiarProgreso(programarSubida);
  programarSubida(); // sube cualquier cambio hecho mientras no había sesión
}

/** Punto de entrada único, llamado desde app.js al iniciar la aplicación.
 *  Si la sincronización no está habilitada o configurada, no hace nada:
 *  la app sigue funcionando 100% con LocalStorage, sin tocar la red. */
export async function inicializar() {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) {
    fijarEstado("deshabilitado");
    return;
  }

  window.addEventListener("online", () => usuarioId && programarSubida());

  usuarioActual().then((usuario) => manejarSesion(usuario));
  cancelarSuscripcionAuth = alCambiarSesion((usuario) => manejarSesion(usuario));
}
