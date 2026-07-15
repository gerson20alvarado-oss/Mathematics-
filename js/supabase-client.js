// =============================================================
// supabase-client.js — crea el cliente de Supabase si (y sólo si)
// la sincronización está habilitada y configurada.
//
// El SDK se carga dinámicamente desde CDN SOLO cuando esta función
// se invoca por primera vez (lo que sólo ocurre si SYNC_HABILITADO
// es true, vía la cadena de imports dinámicos en app.js). Así, un
// usuario que nunca activa la sincronización jamás genera ni una
// sola petición de red hacia Supabase — cumple el requisito de que
// la app funcione completamente sin tocar la red sin iniciar sesión.
//
// A diferencia de KaTeX (vendorizado porque hace falta incluso sin
// conexión), sincronizar es por naturaleza una función que requiere
// red, así que cargarla bajo demanda desde CDN es la opción correcta.
// =============================================================
import { SYNC_HABILITADO, SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

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

  if (!SYNC_HABILITADO || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
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
      console.warn("Sincronización desactivada, la app sigue funcionando con LocalStorage:", e.message);
      return null;
    });

  return clientePromesa;
}
