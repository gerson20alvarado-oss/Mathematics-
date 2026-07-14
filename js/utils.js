// =============================================================
// utils.js — utilidades puras (normalización de texto, fracciones)
// =============================================================

/** Quita acentos de un texto (á→a, é→e, …) */
export function quitarAcentos(txt) {
  return txt.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/** Normaliza una respuesta de texto libre: minúsculas, sin acentos,
 *  colapsa espacios usados como separador de miles ("16 000" -> "16000"). */
export function normalizar(txt) {
  if (txt === null || txt === undefined) return "";
  let t = String(txt).trim().toLowerCase();
  t = quitarAcentos(t);
  t = t.replace(/(?<=\d)\s+(?=\d)/g, "");
  t = t.replace(/\s+/g, " ").trim();
  return t;
}

/** Normalización más permisiva: sin espacios ni comas. */
export function normalizarLaxo(txt) {
  return normalizar(txt).replace(/\s+/g, "").replace(/,/g, "");
}

/** Máximo común divisor (para reducir fracciones). */
function mcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Convierte un texto como "-7/3", "844.5", "1 000 000" en una fracción
 *  exacta {num, den} (den siempre positivo), evitando errores de punto flotante. */
export function parseValor(token) {
  let t = token.trim().replace(/\s+/g, "");
  t = t.replace(/−/g, "-"); // signo menos tipográfico del libro

  if (t.includes("/")) {
    const [n, d] = t.split("/").map(Number);
    return reducir(n, d);
  }
  if (t.includes(".")) {
    const negativo = t.startsWith("-");
    if (negativo) t = t.slice(1);
    const [entero, decimales] = t.split(".");
    const den = Math.pow(10, decimales.length);
    let num = Number(entero) * den + Number(decimales);
    if (negativo) num = -num;
    return reducir(num, den);
  }
  return reducir(Number(t), 1);
}

function reducir(num, den) {
  if (den < 0) { num = -num; den = -den; }
  const g = mcd(num, den);
  return { num: num / g, den: den / g };
}

/** Compara dos fracciones {num,den}: -1, 0, 1 */
export function compararFracciones(a, b) {
  const izq = a.num * b.den;
  const der = b.num * a.den;
  if (izq < der) return -1;
  if (izq > der) return 1;
  return 0;
}

export function fmtFraccion(f) {
  return f.den === 1 ? String(f.num) : `${f.num}/${f.den}`;
}

/** Separa un enunciado "A ___ B" en sus dos partes. */
export function separarEnunciado(enunciado) {
  const partes = enunciado.split(/_+/);
  if (partes.length !== 2) return [null, null];
  return [partes[0].trim(), partes[1].trim()];
}
