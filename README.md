# Matemáticas Simplificadas — SPA estática

Versión web **100% estática** (HTML + CSS + JavaScript, sin backend) del
libro **Matemáticas Simplificadas** (2.ª edición, CONAMAT / Pearson):
teoría, ejemplos, ejercicios interactivos y respuestas oficiales.

No usa Python, Flask ni Node.js en producción — el front-end es HTML/CSS/JS
estático y se publica en **GitHub Pages**, **Netlify** o **Vercel** sin
build. Requiere una cuenta gratuita de **Supabase** (base de datos +
autenticación): el acceso es obligatorio con GitHub, y el progreso
académico vive únicamente en Supabase, nunca en el navegador.

La navegación tiene 4 niveles, siguiendo las grandes áreas del libro:

```
Inicio  →  Área (Aritmética, Álgebra, …)  →  Capítulo  →  Ejercicio
```

> **Fase 1 de N.** Arquitectura completa por áreas + **Aritmética →
> Capítulo 1 — Números reales** cargado y funcional. Los siguientes
> capítulos se agregan como nuevos archivos JSON dentro de la carpeta de
> su área, sin tocar el resto del código.

---

## Regla permanente: fidelidad matemática al 100 %

**Ningún ejercicio del libro se omite por contener notación matemática especial.**
Fracciones, raíces, exponentes, sumatorias, integrales, notación algebraica, etc.
se representan con **KaTeX** (auto-hospedado en `vendor/katex/`, sin depender de
ningún CDN), no con imágenes recortadas del libro. El contenido matemático sigue
siendo texto real: seleccionable, accesible y con el mismo estilo claro/oscuro
del resto de la aplicación.

Prioridad de representación, en este orden:
1. Texto HTML normal, cuando sea suficiente (ej. `8/4`, `−372`).
2. **KaTeX** para cualquier expresión matemática (fracciones apiladas, raíces,
   exponentes, notación de conjuntos, etc.) — delimitada con `$…$` dentro del
   campo `enunciado` del JSON; se renderiza automáticamente al pintar la
   página (`renderizarMate()` en `app-shared.js`, llamada desde `views.js`).
3. SVG únicamente cuando KaTeX no pueda representar algún elemento específico.
4. Imagen recortada del libro sólo como último recurso, y nunca sin antes
   preguntar.

Si el PDF extrae mal una expresión (columnas mezcladas, símbolos perdidos), se
reconstruye visualmente contra la página del libro y/o se verifica contra la
respuesta oficial antes de publicarla — nunca se descarta un ejercicio sólo
porque la extracción automática de texto haya fallado.

**Ejemplo aplicado:** el Capítulo 1 originalmente omitía los ejercicios 1 y 7
por tener fracciones apiladas y dígitos resaltados dentro de un número. Ambos
ya están completos: el Ejercicio 1 usa KaTeX para las 16 expresiones con
propiedades de los números reales, y el Ejercicio 7 usa KaTeX para resaltar en
negritas el dígito indicado en cada número, con un nuevo tipo de reactivo
(`valor_posicional_doble`) que pide valor absoluto y valor relativo por
separado, tal como la tabla del libro.

Esta regla aplica a todos los capítulos, actuales y futuros.

---

## Arquitectura congelada (a partir de esta versión)

Esta versión es la **base oficial** del proyecto. Los capítulos futuros se
construyen *reutilizando* esta arquitectura, no rediseñándola. Estos
componentes están congelados y **no se modifican sin aprobación explícita
previa**, con una explicación del motivo antes de tocarlos:

- Estructura de datos (`manifest.json` anidado por áreas, `capituloN.json`
  por capítulo, forma de los objetos `teoria`/`ejemplos`/`ejercicios`).
- Router y jerarquía de navegación (`Inicio → Área → Capítulo → Ejercicio`).
- Diseño visual y CSS (`css/style.css`).
- Organización por áreas (Aritmética, Álgebra, Geometría y Trigonometría,
  Geometría Analítica, Cálculo Diferencial, Cálculo Integral).
- Flujo intercalado tema → ejemplos → ejercicios dentro de cada capítulo.
- Integración de KaTeX (`vendor/katex/`, `renderizarMate()`).
- Los tipos de reactivo existentes (`comparacion`, `texto`,
  `valor_posicional_doble`, `division_cociente_residuo`).
- **Autenticación obligatoria con GitHub y Supabase como única fuente de
  verdad del progreso académico** (`js/auth.js`, `js/supabase-client.js`,
  `js/progreso.js`, `sql/schema.sql`). No existe modo invitado ni modo sin
  conexión: sin sesión no se carga ningún libro; sin internet se muestra
  una pantalla dedicada pidiendo conexión. `js/store.js` quedó reducido
  únicamente a preferencias visuales (tema claro/oscuro) — nunca vuelve a
  guardar progreso académico.
- La pantalla de bienvenida (fondo animado en Canvas, transición de
  entrada a la biblioteca) y la pantalla de "necesitas conexión".

**Corrección vs. rediseño:** un ajuste que no cambia ninguna estructura,
contrato ni comportamiento visible — sólo hace que el código ya acordado
funcione como se diseñó — es un **bugfix** y no requiere romper este
congelamiento. Cambiar el esquema de `progreso_items`, la jerarquía de
navegación, o el modelo "Supabase como única fuente de verdad" sí requiere
explicar el motivo y esperar aprobación antes de tocarlo.

### Contrato de compatibilidad del progreso

El progreso del usuario es prioridad absoluta y vive **exclusivamente en
Supabase** (tabla `progreso_items`, ver `sql/schema.sql`):

- `js/progreso.js` es el único módulo que lee o escribe progreso. Al
  iniciar sesión, descarga todo el progreso del usuario una sola vez hacia
  una caché en memoria (se pierde al recargar la página, se reconstruye
  desde Supabase la próxima vez que haya sesión). No hay LocalStorage de
  respaldo ni fusión de ningún tipo — un usuario nuevo simplemente empieza
  con progreso vacío, sin ningún paso adicional.
- Cada respuesta se guarda **inmediatamente** al pulsar "Revisar" (no
  mientras se escribe). "Mostrar respuesta" es puramente visual: nunca
  llama a `progreso.js`, nunca cuenta como intento, nunca marca un
  reactivo como completado, y se pierde al recargar la página.
- Las filas de Supabase se identifican por
  `(user_id, capitulo_clave, ejercicio_numero, item_numero)` — el mismo
  identificador estable que usaba antes el árbol de progreso local.
  **Una vez publicados, el `slug` de un área y el `numero` de un capítulo
  o ejercicio no cambian nunca**; agregar contenido nuevo es siempre
  aditivo (nuevas filas de `manifest.json` / `capituloN.json`) y nunca
  afecta el progreso ya guardado de ningún usuario.
- Si en el futuro fuera indispensable cambiar la forma de las columnas de
  `progreso_items`, se hace con una migración explícita (columnas nuevas
  con `DEFAULT`, nunca reutilizar una columna con otro significado), nunca
  con un `DROP`/`ALTER` destructivo sobre datos en vivo.
- Antes de publicar cualquier cambio relacionado con el sistema de
  progreso, se evalúa primero si existe riesgo de pérdida de datos; si lo
  hay, se detiene la implementación y se explica el riesgo antes de
  continuar.

---

## Probarlo en tu computadora

Los navegadores bloquean `fetch()` sobre archivos abiertos directamente
con `file://`, así que para probarlo localmente basta un servidor
estático simple (no es un backend de la app, sólo sirve los archivos):

```bash
cd mathsimplificadas-static
python3 -m http.server 8080
# o: npx serve .
```

Abre `http://localhost:8080`.

## Publicarlo

**GitHub Pages**: sube esta carpeta a un repositorio y activa Pages
(rama `main`, carpeta raíz). No requiere ningún build ni configuración
adicional.

**Netlify / Vercel**: arrastra la carpeta o conéctala a un repositorio.
No hay comando de build; el "publish directory" es la raíz del proyecto.

---

## Estructura del proyecto

```
mathsimplificadas-static/
├── index.html              # shell de la SPA: bienvenida, sin-conexión y biblioteca
├── css/
│   └── style.css           # diseño "cuaderno / pizarrón" + pantalla de bienvenida
├── js/
│   ├── app.js                # control de acceso + router SPA (hash, 4 niveles)
│   ├── app-shared.js          # helper compartido (barra de progreso, KaTeX)
│   ├── auth.js                 # GitHub OAuth vía Supabase Auth
│   ├── supabase-client.js       # carga del SDK de Supabase bajo demanda
│   ├── progreso.js               # progreso académico — Supabase, única fuente de verdad
│   ├── fondo-estrellas.js          # canvas de estrellas de la pantalla de bienvenida
│   ├── views.js                     # renderizado: inicio/área/capítulo/ejercicio
│   ├── data.js                       # manifiesto anidado + carga de capítulos (lazy)
│   ├── store.js                       # SÓLO preferencias visuales (tema)
│   ├── grading.js                      # calificación, pistas y explicaciones
│   └── utils.js                         # normalización de texto y fracciones
├── data/
│   ├── manifest.json      # las 6 áreas, cada una con sus capítulos
│   └── aritmetica/
│       ├── capitulo1.json # Números reales (109 reactivos)
│       └── capitulo2.json # Números enteros (181 reactivos)
├── sql/
│   └── schema.sql          # tabla progreso_items + Row Level Security
├── vendor/
│   └── katex/              # KaTeX auto-hospedado (CSS, JS, fuentes, auto-render)
└── README.md
```

## Cómo funciona la navegación ahora

1. **Sin sesión** — pantalla de bienvenida (fondo animado + botón "Continuar
   con GitHub"). No se carga ningún libro ni capítulo.
2. **Inicio** (`#/`) — tras iniciar sesión, muestra las áreas del libro
   (Aritmética, Álgebra, Geometría y Trigonometría, Geometría Analítica,
   Cálculo Diferencial, Cálculo Integral), cada una con su progreso
   agregado (leído desde Supabase).
3. **Área** (`#/area/aritmetica`) — muestra únicamente los capítulos de
   esa materia (Capítulo 1, Capítulo 2, …), con su propio progreso.
4. **Capítulo** (`#/area/aritmetica/capitulo/1`) — teoría, ejemplos y
   lista de ejercicios, igual que antes.
5. **Ejercicio** (`#/area/aritmetica/capitulo/1/ejercicio/4`) — Revisar,
   Pista, Mostrar respuesta, Explicar. "Mostrar respuesta" es puramente
   visual y no afecta el progreso guardado (ver más abajo).

## Cómo se agrega el siguiente capítulo (fase 2 en adelante)

1. Extraer y curar el contenido del capítulo (teoría, ejemplos,
   ejercicios y respuestas oficiales) siguiendo exactamente la misma
   estructura que `data/aritmetica/capitulo1.json`.
2. Guardarlo como `data/<area>/capituloN.json` (por ejemplo,
   `data/aritmetica/capitulo2.json`, o `data/algebra/capitulo1.json` si
   es el primer capítulo de una materia nueva).
3. En `data/manifest.json`, dentro del área correspondiente, marcar ese
   capítulo con `"disponible": true`, su `"archivo"` y su
   `"totalReactivos"` (y si el área todavía tenía `"disponible": false` a
   nivel área, cambiarla también a `true`).
4. Listo — no hay que tocar HTML/CSS/JS ni reconstruir nada; el capítulo
   aparece solo en su área y se descarga bajo demanda.

## Alcance de datos de esta fase

De Aritmética → Capítulo 1 se incluyen **los 8 ejercicios completos del
capítulo (1 al 8), sin omitir ninguno** — 109 reactivos con respuesta
oficial verificada uno por uno contra la sección de soluciones del libro
(pág. 1442). Los ejercicios 1 (propiedades de los números reales) y 7
(valor absoluto y relativo con dígito indicado) usan KaTeX para la
notación con fracciones apiladas y dígitos resaltados, reconstruida y
verificada contra la clave de respuestas oficial (ver "Regla permanente:
fidelidad matemática al 100 %" más arriba).

Las otras 6 áreas están presentes en la navegación (tal como se pidió)
pero sin capítulos cargados todavía — se muestran como "Próximamente" sin
inventar números ni títulos de capítulo que no se hayan verificado contra
el libro.

## Compatibilidad

Probado sin errores de consola en Chromium (motor de Chrome/Edge) en
escritorio y en vista móvil (390×844), incluyendo navegación completa
Inicio → Área → Capítulo → Ejercicio, áreas/capítulos bloqueados, modo
oscuro persistente y progreso agregado correcto en los tres niveles tras
recargar la página. Usa únicamente APIs web estándar (`fetch`, ES
Modules, `localStorage`, `hashchange`) soportadas por todos los
navegadores modernos (Chrome, Edge, Firefox, Safari).

## Siguientes pasos posibles

- Convertirla en **PWA** (manifest.webmanifest + service worker) para
  poder "Agregar a pantalla de inicio" en Android/iOS y que las áreas ya
  visitadas funcionen sin conexión. La arquitectura actual (JSON
  estáticos + carga bajo demanda) ya está lista para eso; sólo falta
  añadir el service worker cuando se decida dar ese paso.

