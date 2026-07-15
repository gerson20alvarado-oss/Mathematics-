// =============================================================
// supabase-client.js — crea el cliente de Supabase.
//
// La autenticación es obligatoria en toda la plataforma, así que este
// módulo se invoca siempre al iniciar la app (ver app.js). El SDK se
// carga dinámicamente desde CDN (no se vendoriza como KaTeX, porque
// autenticar y sincronizar son, por naturaleza, funciones que
// requieren red). Si falla — sin conexión, CDN caído, configuración
// vacía — se devuelve `null` y app.js lo interpreta como "necesita
// conexión a internet" (ver pantalla de sin-conexión).
// =============================================================
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";

let clientePromesa = null;

function cargarSdk() {
  if (window.supabase && window.supabase.createClient) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar el SDK de Supabase (¿sin conexión?)."));
    document.head.appendChild(script);
  });
}

export function obtenerClienteSupabasePromesa() {
  if (clientePromesa) return clientePromesa;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("Supabase no está configurado (falta SUPABASE_URL o SUPABASE_ANON_KEY en config.js).");
    clientePromesa = Promise.resolve(null);
    return clientePromesa;
  }

  clientePromesa = cargarSdk()
    .then(() => {
      if (!window.supabase || !window.supabase.createClient) throw new Error("SDK de Supabase incompleto.");
      return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      });
    })
    .catch((e) => {
      console.warn("No se pudo inicializar Supabase:", e.message);
      clientePromesa = null; // permite reintentar en la siguiente llamada (ej. al reconectar)
      return null;
    });

  return clientePromesa;
}
