// =============================================================
// app-shared.js — helpers compartidos entre app.js y views.js
// =============================================================

export function actualizarProgresoTopbar(porcentaje) {
  const barra = document.getElementById("progreso-libro-barra");
  const texto = document.getElementById("progreso-libro-texto");
  if (barra) barra.style.width = `${porcentaje}%`;
  if (texto) texto.textContent = `${porcentaje}%`;
}

/** Renderiza cualquier notación matemática (delimitada con $...$ o $$...$$)
 *  dentro de un contenedor usando KaTeX. Se usa en vez de imágenes recortadas
 *  del libro para que el contenido matemático siga siendo texto real:
 *  seleccionable, accesible y con el mismo estilo (claro/oscuro) del resto
 *  de la aplicación. Si KaTeX todavía no ha terminado de cargar (script
 *  `defer`), reintenta brevemente. */
export function renderizarMate(contenedor) {
  if (!contenedor) return;
  const intentar = () => {
    if (window.renderMathInElement) {
      window.renderMathInElement(contenedor, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
        ],
        throwOnError: false,
      });
      return true;
    }
    return false;
  };
  if (!intentar()) {
    setTimeout(intentar, 150);
  }
}
