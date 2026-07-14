// =============================================================
// app-shared.js — helpers compartidos entre app.js y views.js
// =============================================================

export function actualizarProgresoTopbar(porcentaje) {
  const barra = document.getElementById("progreso-libro-barra");
  const texto = document.getElementById("progreso-libro-texto");
  if (barra) barra.style.width = `${porcentaje}%`;
  if (texto) texto.textContent = `${porcentaje}%`;
}
