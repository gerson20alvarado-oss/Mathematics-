# Matemáticas Simplificadas — SPA estática

Versión web **100% estática** (HTML + CSS + JavaScript, sin backend) del
libro **Matemáticas Simplificadas** (2.ª edición, CONAMAT / Pearson):
teoría, ejemplos, ejercicios interactivos y respuestas oficiales.

No usa Python, Flask, Node.js ni base de datos. El progreso se guarda en
el `localStorage` del navegador. Se puede publicar tal cual en **GitHub
Pages**, **Netlify** o **Vercel**.

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
- Sistema de progreso y su esquema en `localStorage` (ver abajo).
- Integración de KaTeX (`vendor/katex/`, `renderizarMate()`).
- Los tipos de reactivo existentes (`comparacion`, `texto`,
  `valor_posicional_doble`).
- **Sincronización con Supabase** (`js/sync.js`, `js/auth.js`,
  `js/supabase-client.js`, `sql/schema.sql`) y **GitHub Auth como método de
  inicio de sesión**. Desde esta versión forman parte del núcleo oficial de
  la plataforma, no de una capa experimental — LocalStorage sigue siendo el
  almacenamiento por defecto y la app sigue funcionando 100 % sin sesión
  iniciada; la sincronización es la capa adicional ya adoptada.
- Las reglas de fusión de progreso (`revelada` = OR, `intentos` = máximo,
  resto = timestamp del servidor más reciente, conflicto genuino = pregunta
  al usuario) y el esquema de `progreso_items` en Supabase.

**Corrección vs. rediseño:** una corrección como la de `sync.js` (ajustar la
serialización de una fila antes del `POST` para no violar una columna
`NOT NULL`) es un **bugfix** — no requiere romper este congelamiento ni pedir
aprobación de arquitectura, porque no cambia ninguna estructura, contrato ni
comportamiento visible; sólo hace que el código ya acordado funcione como se
diseñó. Un cambio de arquitectura sería, por ejemplo, alterar el esquema de
`progreso_items`, el formato de `ms:progreso:v1`, o el flujo de fusión — eso
sí requiere explicar el motivo y esperar aprobación antes de tocarlo.

### Contrato de compatibilidad del progreso

El progreso del usuario es prioridad absoluta y **nunca se pierde entre
actualizaciones**:

- Todo el progreso vive bajo una única llave versionada de `localStorage`:
  `ms:progreso:v1` (ver `js/store.js`), indexada como
  `areaSlug-capitulo-numero → numero_ejercicio → item_numero`.
- Agregar áreas, capítulos, temas o ejercicios nuevos es **siempre aditivo**:
  sólo se agregan entradas a `manifest.json` y nuevos `capituloN.json`. El
  código nunca borra ni reescribe la llave de progreso al cargar.
- Las búsquedas de área y capítulo son por **identificador** (`slug`,
  `numero`), no por posición en el arreglo — se pueden agregar capítulos en
  cualquier lugar del manifiesto sin afectar el progreso existente.
- Por lo mismo, **una vez publicados, el `slug` de un área y el `numero` de
  un capítulo o ejercicio no cambian nunca**; son el identificador estable
  que ata el progreso guardado a su contenido.
- Si en el futuro fuera indispensable cambiar la forma de los datos
  guardados, se hace mediante una migración explícita (`ms:progreso:v1` →
  `v2`) que lee el formato viejo y lo convierte, nunca borrando el original
  hasta confirmar que la migración fue exitosa.
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
├── index.html            # única página HTML (shell de la SPA)
├── css/
│   └── style.css         # diseño "cuaderno / pizarrón", modo oscuro (sin cambios)
├── js/
│   ├── app.js             # router SPA (hash, 4 niveles) + arranque
│   ├── app-shared.js       # helper compartido (barra de progreso)
│   ├── views.js            # renderizado: inicio/área/capítulo/ejercicio
│   ├── data.js               # manifiesto anidado + carga de capítulos (lazy)
│   ├── store.js               # progreso en localStorage (sin cambios en su lógica interna)
│   ├── grading.js              # calificación, pistas y explicaciones (sin cambios)
│   └── utils.js                 # normalización de texto y fracciones (sin cambios)
├── data/
│   ├── manifest.json      # las 7 áreas, cada una con sus capítulos
│   ├── aritmetica/
│   │   └── capitulo1.json # contenido completo del capítulo 1 (lazy-load)
│   ├── algebra/                  # (vacío por ahora)
│   ├── geometria/                # (vacío por ahora)
│   ├── trigonometria/            # (vacío por ahora)
│   ├── geometria-analitica/      # (vacío por ahora)
│   ├── calculo-diferencial/      # (vacío por ahora)
│   └── calculo-integral/         # (vacío por ahora)
├── assets/                # (iconos/recursos futuros)
├── vendor/
│   └── katex/              # KaTeX auto-hospedado (CSS, JS, fuentes, auto-render)
└── README.md
```

### Qué cambió respecto a la versión anterior (y qué no)

**Cambió únicamente lo necesario para soportar la jerarquía de áreas:**
- `data/manifest.json`: ahora es una lista de 7 áreas, cada una con un
  arreglo `capitulos` (antes era una lista plana de capítulos).
- `data/capitulo1.json` → `data/aritmetica/capitulo1.json` (mismo
  contenido, exportado desde la misma fuente verificada; sólo cambió su
  ubicación).
- `js/data.js`: nuevas funciones `obtenerArea`, `obtenerCapituloMeta`,
  `aplanarCapitulos` y `claveCapitulo` para leer el manifiesto anidado y
  construir la ruta `data/<area>/<archivo>`.
- `js/views.js`: se agregó `renderCategory` (pantalla de área) y se
  adaptaron `renderChapter`/`renderExercise` para recibir `areaSlug` +
  `numero` en vez de un slug plano de capítulo.
- `js/app.js`: nuevas expresiones de ruta para los 4 niveles
  (`#/area/<areaSlug>`, `#/area/<areaSlug>/capitulo/<numero>`,
  `#/area/<areaSlug>/capitulo/<numero>/ejercicio/<n>`).
- `js/store.js`: **sólo** se adaptó `progresoLibro` (ahora recibe la
  lista ya aplanada de capítulos en vez del manifiesto plano de antes) y
  se agregaron `progresoConjunto`/`progresoArea` como envoltorios del
  mismo cálculo, para poder mostrar el progreso agregado también a nivel
  área. Las funciones que leen/escriben `localStorage`
  (`guardarRespuesta`, `marcarRevelada`, `obtenerEstadoItem`,
  `contarCompletadosCapitulo`, `progresoCapitulo`) son **exactamente las
  mismas**, sólo reciben ahora una clave compuesta
  (`"<área>-capitulo-<número>"`, ej. `"aritmetica-capitulo-1"`) en lugar
  de `"capitulo-1"`, para que un mismo número de capítulo en distintas
  áreas no comparta progreso por accidente.

**No cambió:**
- `css/style.css` — cero ediciones (verificado byte a byte).
- `index.html` — cero ediciones.
- `js/grading.js` y `js/utils.js` — cero ediciones. Calificación, pistas
  y explicaciones funcionan exactamente igual que antes.
- El comportamiento de los ejercicios (Revisar, Pista, Mostrar
  respuesta, 🤖 Explicar) es idéntico al de la versión anterior.

## Cómo funciona la navegación ahora

1. **Inicio** (`#/`) — muestra únicamente las 7 grandes áreas del libro
   (🔢 Aritmética, ➕ Álgebra, 📐 Geometría, 📐 Trigonometría, 📊 Geometría
   Analítica, ∂ Cálculo Diferencial, ∫ Cálculo Integral), cada una con su
   nombre, descripción breve, barra de progreso y porcentaje agregado de
   todos sus capítulos.
2. **Área** (`#/area/aritmetica`) — muestra únicamente los capítulos de
   esa materia (Capítulo 1, Capítulo 2, …), con su propio progreso.
3. **Capítulo** (`#/area/aritmetica/capitulo/1`) — teoría, ejemplos y
   lista de ejercicios, igual que antes.
4. **Ejercicio** (`#/area/aritmetica/capitulo/1/ejercicio/4`) — Revisar,
   Pista, Mostrar respuesta, 🤖 Explicar; sin cambios de comportamiento.

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

