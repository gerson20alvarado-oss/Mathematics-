// =============================================================
// autorizacion.js — capa de autorización de usuarios.
//
// Después de iniciar sesión con GitHub, este módulo llama a la
// función SECURITY DEFINER `registrar_o_actualizar_usuario_actual`
// (ver sql/autorizacion.sql), que crea el registro en `usuarios` si
// no existe (rol='alumno', activo=false, salvo el primer usuario de
// la instalación) o simplemente refresca nombre/avatar si ya existe.
//
// El cliente NUNCA escribe `activo` ni `rol` directamente — no hay
// ninguna función aquí para eso a propósito. Sólo lee lo que el
// servidor decidió.
// =============================================================
import { obtenerClienteSupabasePromesa } from "./supabase-client.js";

/** Registra (si es la primera vez) o refresca el perfil del usuario
 *  actual, y devuelve su estado de autorización tal como lo decidió
 *  el servidor: { activo, rol, nombreVisible, avatarUrl }. */
export async function autorizarUsuarioActual(usuarioAuth) {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) throw new Error("No se pudo conectar con Supabase.");

  const metadatos = usuarioAuth.user_metadata || {};
  const nombreVisible = metadatos.full_name || metadatos.name || metadatos.user_name || usuarioAuth.email || "Estudiante";
  const usuarioGithub = metadatos.user_name || null;
  const avatarUrl = metadatos.avatar_url || null;

  const { data, error } = await cliente.rpc("registrar_o_actualizar_usuario_actual", {
    p_nombre_visible: nombreVisible,
    p_usuario_github: usuarioGithub,
    p_avatar_url: avatarUrl,
  });

  if (error) throw error;
  // El RPC devuelve un solo registro (Supabase lo entrega como arreglo de 1).
  const fila = Array.isArray(data) ? data[0] : data;
  if (!fila) throw new Error("El servidor no devolvió información de autorización.");

  return {
    activo: !!fila.activo,
    rol: fila.rol,
    nombreVisible: fila.nombre_visible,
    avatarUrl: fila.avatar_url,
  };
}
