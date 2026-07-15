// =============================================================
// auth.js — envoltorio delgado de Supabase Auth.
// Método de inicio de sesión: GitHub OAuth (sin contraseña propia
// que gestionar). Si Supabase no está disponible, todas las
// funciones son no-ops seguros.
// =============================================================
import { obtenerClienteSupabasePromesa } from "./supabase-client.js";

export async function iniciarSesionConGitHub() {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) return { error: "Sincronización no disponible." };
  return cliente.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

/** Cierra la sesión de Supabase. El progreso académico nunca se toca aquí
 *  (vive en Supabase, no en este dispositivo) — quien llama (app.js) es
 *  responsable de limpiar la caché en memoria de progreso.js y volver a
 *  mostrar la pantalla de bienvenida. */
export async function cerrarSesion() {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) return;
  await cliente.auth.signOut();
}

export async function usuarioActual() {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) return null;
  const { data } = await cliente.auth.getSession();
  return data?.session?.user || null;
}

/** Suscribe un callback a cambios de sesión (login/logout/refresh).
 *  Devuelve una función para cancelar la suscripción. */
export async function alCambiarSesion(callback) {
  const cliente = await obtenerClienteSupabasePromesa();
  if (!cliente) return () => {};
  const { data } = cliente.auth.onAuthStateChange((_evento, sesion) => {
    callback(sesion?.user || null);
  });
  return () => data?.subscription?.unsubscribe();
}
