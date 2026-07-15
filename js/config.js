// =============================================================
// config.js — configuración de Supabase.
//
// A partir de esta versión, la autenticación es OBLIGATORIA: toda la
// plataforma requiere sesión iniciada con GitHub, y Supabase es la
// única fuente de verdad del progreso académico (no hay modo local
// de respaldo ni modo invitado).
//
// Para configurar tu propio proyecto de Supabase:
//   1. Crea un proyecto en https://supabase.com
//   2. Ejecuta sql/schema.sql y luego sql/autorizacion.sql en el editor
//      SQL de tu proyecto (el segundo agrega la tabla de usuarios y
//      aprobación de cuentas; el primer usuario que inicia sesión queda
//      como administrador automáticamente — ver README).
//   3. Habilita el proveedor "GitHub" en Authentication → Providers
//      (necesitas registrar una OAuth App en GitHub y pegar aquí la
//      Client ID / Secret que te pida Supabase)
//   4. Copia la URL y la anon/publishable key de tu proyecto
//      (Settings → API) y pégalas abajo. Esta llave es pública por
//      diseño — la seguridad real la da Row Level Security (ver
//      sql/schema.sql).
// =============================================================

export const SUPABASE_URL = "https://wqjxdbibeeczbjxoolue.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_fVMn3WQq3yU_QlZMrHMVrg_lTFFyaU3";
