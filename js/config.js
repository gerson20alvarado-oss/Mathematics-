// =============================================================
// config.js — configuración de la capa de sincronización opcional.
//
// La aplicación funciona 100% sin esto: si SYNC_HABILITADO es false,
// o si SUPABASE_URL/SUPABASE_ANON_KEY quedan vacíos, ningún otro
// módulo intenta tocar la red. LocalStorage sigue siendo el sistema
// de almacenamiento por defecto en todos los casos.
//
// Para activar la sincronización con tu propio proyecto de Supabase:
//   1. Crea un proyecto en https://supabase.com
//   2. Ejecuta sql/schema.sql en el editor SQL de tu proyecto
//   3. Habilita el proveedor "GitHub" en Authentication → Providers
//      (necesitas registrar una OAuth App en GitHub y pegar aquí la
//      Client ID / Secret que te pida Supabase)
//   4. Copia la URL y la anon key de tu proyecto (Settings → API) y
//      pégalas abajo. La anon key es pública por diseño — la
//      seguridad real la da Row Level Security (ver sql/schema.sql).
//   5. Cambia SYNC_HABILITADO a true.
// =============================================================

export const SYNC_HABILITADO = true;

export const SUPABASE_URL = "https://wqjxdbibeeczbjxoolue.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_fVMn3WQq3yU_QlZMrHMVrg_lTFFyaU3";
