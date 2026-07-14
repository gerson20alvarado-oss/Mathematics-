# Matemáticas Simplificadas — SPA estática

Versión web **100% estática** (HTML + CSS + JavaScript, sin backend) del
libro **Matemáticas Simplificadas** (2.ª edición, CONAMAT / Pearson):
teoría, ejemplos, ejercicios interactivos y respuestas oficiales.

No usa Python, Flask, Node.js ni base de datos. El progreso se guarda en
el `localStorage` del navegador. Se puede publicar tal cual en **GitHub
Pages**, **Netlify** o **Vercel**.

> **Fase 1 de N.** Estructura completa de la plataforma + **Capítulo 1 —
> Números reales** cargado y funcional. Los siguientes capítulos se
> agregan como nuevos archivos JSON, sin tocar el resto del código.

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
│   └── style.css         # diseño "cuaderno / pizarrón", modo oscuro
├── js/
│   ├── app.js             # router SPA (hash) + arranque
│   ├── app-shared.js       # helper compartido (barra de progreso)
│   ├── views.js            # renderizado de inicio/capítulo/ejercicio
│   ├── data.js              # carga del manifiesto y de cada capítulo (lazy)
│   ├── store.js              # progreso en localStorage
│   ├── grading.js             # calificación, pistas y explicaciones
│   └── utils.js                # normalización de texto y fracciones exactas
├── data/
│   ├── manifest.json      # metadatos livianos de todos los capítulos
│   └── capitulo1.json     # contenido completo del capítulo 1 (lazy-load)
├── assets/                # (iconos/recursos futuros)
└── README.md
```

### Por qué esta arquitectura

- **Nada se carga de más**: `index.html` sólo trae `manifest.json` al
  iniciar (unos cuantos KB con nombre/progreso de cada capítulo). El
  contenido completo de un capítulo (`data/capituloN.json`) se descarga
  únicamente cuando el usuario lo abre, y queda en caché de memoria
  mientras la pestaña siga abierta.
- **Router 100% en el cliente**: `js/app.js` escucha `hashchange` y
  reemplaza el contenido de `<main id="app">`, sin recargar la página
  (rutas `#/`, `#/capitulo/<slug>`, `#/capitulo/<slug>/ejercicio/<n>`).
  Esto funciona igual en GitHub Pages, Netlify o abriendo el `index.html`
  detrás de cualquier servidor estático, sin configurar reescritura de
  rutas en el servidor.
- **Progreso sin servidor**: `js/store.js` guarda cada respuesta,
  intento y revelación en `localStorage`, namespaced bajo
  `ms:progreso:v1`. Se recalculan los porcentajes por ejercicio,
  capítulo y libro completo a partir de esos datos y del `totalReactivos`
  declarado en el manifiesto (así el porcentaje global no exige
  descargar capítulos que el usuario nunca abrió).

## Cómo funciona el ciclo de estudio

1. **Teoría y ejemplos** — texto literal del libro, capítulo por capítulo.
2. **Ejercicios** — cada reactivo se responde en la propia pantalla
   (botones `<` `>` `=` para comparaciones, campo de texto para el resto).
3. **Revisar** — compara contra la respuesta oficial (páginas 1441–1602
   del libro, ya incorporadas a cada `capituloN.json`). Muestra ✔ o ✗,
   nunca la respuesta correcta directamente.
4. **Pista** — si la respuesta es incorrecta, aparece una pista basada
   sólo en la teoría de ese capítulo.
5. **Mostrar respuesta** — sólo al pulsar este botón aparece la
   respuesta oficial.
6. **🤖 Explicar** — genera la explicación paso a paso con el método
   exacto del libro (producto cruzado para fracciones, recta numérica
   para enteros/decimales, principio posicional/aditivo para valor
   absoluto y forma desarrollada). Se calcula en el navegador a partir
   del enunciado — sin IA externa ni conocimiento fuera del libro.
7. **Progreso** — se guarda solo, en `localStorage`, por reactivo, por
   capítulo y para el libro completo.

## Alcance de datos de esta fase

Del Capítulo 1 se incluyen los ejercicios 2, 3, 4, 5, 6 y 8 (escritura de
números, comparación de enteros/decimales, comparación de fracciones,
valor absoluto y forma desarrollada) — 81 reactivos con respuesta oficial
verificada uno por uno contra la sección de soluciones del libro (pág.
1442).

Los ejercicios 1 y 7 usan notación apilada (fracciones dentro de
igualdades de propiedades, dígitos resaltados dentro de un número) que
el PDF no permite extraer con fidelidad como texto plano; se integrarán
en un refinamiento posterior recortando la imagen original de la página
en vez de transcribir texto, para no arriesgar ninguna respuesta.

## Cómo se agrega el siguiente capítulo (fase 2 en adelante)

1. Extraer y curar el contenido del capítulo (teoría, ejemplos,
   ejercicios y respuestas oficiales) siguiendo exactamente la misma
   estructura que `data/capitulo1.json`.
2. Guardarlo como `data/capitulo2.json`.
3. Agregar su entrada en `data/manifest.json` (`disponible: true`,
   `archivo: "capitulo2.json"`, `totalReactivos: <n>`).
4. Listo — no hay que tocar HTML/CSS/JS ni reconstruir nada; el capítulo
   aparece solo en el índice y se descarga bajo demanda.

## Compatibilidad

Probado sin errores de consola en Chromium (motor de Chrome/Edge) en
escritorio y en vista móvil (390×844). Usa únicamente APIs web estándar
(`fetch`, ES Modules, `localStorage`, `hashchange`) soportadas por todos
los navegadores modernos (Chrome, Edge, Firefox, Safari).

## Siguientes pasos posibles

- Convertirla en **PWA** (manifest.webmanifest + service worker) para
  poder "Agregar a pantalla de inicio" en Android/iOS y que los
  capítulos ya visitados funcionen sin conexión. La arquitectura actual
  (JSON estáticos + carga bajo demanda) ya está lista para eso; sólo
  falta añadir el service worker cuando se decida dar ese paso.
