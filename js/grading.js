// =============================================================
// grading.js — calificación, pistas y explicaciones basadas
// exclusivamente en el método del libro (producto cruzado, recta
// numérica, principio posicional/aditivo). Puerto 1:1 de la
// lógica usada y verificada en la fase de servidor (Flask).
// =============================================================
import { normalizar, normalizarLaxo, parseValor, compararFracciones, separarEnunciado } from "./utils.js";

export function calificar(tipo, respuestaUsuario, respuestaOficial) {
  if (tipo === "valor_posicional_doble") {
    if (!respuestaUsuario || typeof respuestaUsuario !== "object") return false;
    const { absoluto, relativo } = respuestaUsuario;
    if (!absoluto || !absoluto.trim() || !relativo || !relativo.trim()) return false;
    const okAbsoluto = normalizar(absoluto) === normalizar(respuestaOficial.absoluto) ||
      normalizarLaxo(absoluto) === normalizarLaxo(respuestaOficial.absoluto);
    const okRelativo = normalizar(relativo) === normalizar(respuestaOficial.relativo) ||
      normalizarLaxo(relativo) === normalizarLaxo(respuestaOficial.relativo);
    return okAbsoluto && okRelativo;
  }
  if (!respuestaUsuario || respuestaUsuario.trim() === "") return false;
  if (tipo === "comparacion") {
    return respuestaUsuario.trim() === respuestaOficial.trim();
  }
  if (normalizar(respuestaUsuario) === normalizar(respuestaOficial)) return true;
  return normalizarLaxo(respuestaUsuario) === normalizarLaxo(respuestaOficial);
}

export function generarPista(item, temaTeoria) {
  const { tipo, enunciado } = item;

  if (tipo === "valor_posicional_doble") {
    return "Pista: el valor absoluto del dígito indicado es el número que representa por sí solo (sin importar su " +
      "posición). El valor relativo se obtiene multiplicando ese valor absoluto por el valor de la posición que " +
      "ocupa en el número (unidades = 1, decenas = 10, centenas = 100, millares = 1 000, …), tal como en el " +
      "ejemplo 72 435 = 70 000 + 2 000 + 400 + 30 + 5.";
  }

  if (tipo === "comparacion") {
    const esFraccion = enunciado.includes("/");
    const hayNegativos = /[−-]/.test(enunciado.replace(/_+/g, ""));
    if (esFraccion) {
      return "Pista: para comparar fracciones, el libro usa el producto cruzado. " +
        "Multiplica el numerador de la primera fracción por el denominador de la " +
        "segunda, y el denominador de la primera por el numerador de la segunda; " +
        "el signo entre esos dos productos es el mismo que hay entre las fracciones " +
        "originales (ver sección Orden, ejemplo de 7/8 y 5/6).";
    }
    if (hayNegativos) {
      return "Pista: ubica ambos números en la recta numérica. El número que está más " +
        "a la derecha es el mayor. Recuerda: cualquier número negativo es menor que " +
        "cero o que cualquier número positivo.";
    }
    return "Pista: compara los números como aparecen en la recta numérica: el que está " +
      "más a la derecha es mayor. Fíjate primero en cuántas cifras tiene cada número.";
  }

  if (temaTeoria === "Valor absoluto de un número") {
    return "Pista: el valor absoluto es la distancia de ese número hasta el cero en la " +
      "recta numérica. La distancia nunca es negativa: quita el signo y esa es tu " +
      "respuesta.";
  }
  if (temaTeoria === "Valor absoluto y relativo del sistema posicional decimal") {
    return "Pista: identifica el valor relativo de cada dígito según su posición " +
      "(unidades, decenas, centenas, millares, …) y súmalos, tal como en el ejemplo " +
      "72 435 = 70 000 + 2 000 + 400 + 30 + 5.";
  }
  if (temaTeoria === "Lectura y escritura") {
    return "Pista: ubica el número en la tabla de periodos y clases (unidades, millares, " +
      "millones, …) y aplica el principio aditivo, como en los ejemplos de la sección " +
      "'Lectura y escritura'.";
  }
  return "Pista: revisa la teoría de esta sección antes de intentar de nuevo.";
}

const NOMBRES_POSICION = {
  1: "unidades", 10: "decenas", 100: "centenas", 1000: "millares",
  10000: "decenas de millar", 100000: "centenas de millar", 1000000: "millones",
  10000000: "decenas de millón", 100000000: "centenas de millón",
};

function explicarValorPosicionalDigito(item) {
  const oficial = item.respuestaOficial || item.respuesta_oficial;
  const abs = Number(String(oficial.absoluto).replace(/\s/g, ""));
  const rel = Number(String(oficial.relativo).replace(/\s/g, ""));
  const pasos = [
    "El valor absoluto de un dígito es el número que representa, sin importar la posición que ocupe.",
    "El valor relativo depende de la posición que ocupa dentro del número: se multiplica el valor absoluto del " +
      "dígito por el valor de esa posición (unidades, decenas, centenas, millares, …), tal como en el ejemplo del " +
      "número 4 342 de la teoría del capítulo.",
  ];
  if (abs === 0) {
    pasos.push("En este caso el dígito indicado es 0: su valor absoluto es 0 y, sin importar la posición que " +
      "ocupe, su valor relativo también es 0.");
  } else {
    const factor = Math.round(rel / abs);
    const nombre = NOMBRES_POSICION[factor] || `posición con valor ${factor}`;
    pasos.push(`El dígito indicado ocupa la posición de las ${nombre}, por lo que su valor relativo es ` +
      `${oficial.absoluto} × ${factor} = ${oficial.relativo}.`);
  }
  pasos.push(`Respuesta oficial del libro — valor absoluto: ${oficial.absoluto} · valor relativo: ${oficial.relativo}`);
  return pasos;
}

function explicarComparacion(enunciado, respuestaOficial) {
  const [aTxt, bTxt] = separarEnunciado(enunciado);
  const pasos = [];
  let a, b;
  try {
    a = parseValor(aTxt);
    b = parseValor(bTxt);
  } catch (e) {
    return [`No fue posible interpretar automáticamente "${enunciado}". Revisa la sección ` +
      `'Orden' de la teoría del capítulo.`];
  }

  const aEsFraccion = aTxt.includes("/");
  const bEsFraccion = bTxt.includes("/");

  if (aEsFraccion || bEsFraccion) {
    const prod1 = a.num * b.den;
    const prod2 = a.den * b.num;
    pasos.push(`Se identifican los dos valores a comparar: ${aTxt} y ${bTxt}.`);
    pasos.push(`Se aplica el producto cruzado del libro: se multiplica el numerador de la ` +
      `primera (${a.num}) por el denominador de la segunda (${b.den}) → ${a.num} × ${b.den} = ${prod1}.`);
    pasos.push(`Se multiplica el denominador de la primera (${a.den}) por el numerador de la ` +
      `segunda (${b.num}) → ${a.den} × ${b.num} = ${prod2}.`);
    const signo = prod1 < prod2 ? "<" : (prod1 > prod2 ? ">" : "=");
    pasos.push(`Se comparan los productos: ${prod1} ${signo} ${prod2}.`);
    pasos.push(`El signo obtenido entre los productos es el mismo que existe entre las ` +
      `cantidades originales, por lo tanto: ${aTxt} ${signo} ${bTxt}.`);
  } else {
    pasos.push(`Se ubican ambos números en la recta numérica: ${aTxt} y ${bTxt}.`);
    const cmp = compararFracciones(a, b);
    const signo = cmp < 0 ? "<" : (cmp > 0 ? ">" : "=");
    if (signo !== "=") {
      const mayor = cmp > 0 ? aTxt : bTxt;
      const menor = cmp > 0 ? bTxt : aTxt;
      pasos.push(`En la recta numérica, ${mayor} se encuentra a la derecha de ${menor}, por lo ` +
        `tanto ${mayor} es el mayor de los dos.`);
      pasos.push("Recuerda el postulado del libro: cualquier número negativo es menor que " +
        "cero o que cualquier número positivo, y entre dos números el que está más a la " +
        "derecha en la recta es el mayor.");
    } else {
      pasos.push("Ambos números representan la misma cantidad, por lo tanto son iguales.");
    }
    pasos.push(`Conclusión: ${aTxt} ${signo} ${bTxt}.`);
  }

  pasos.push(`Respuesta oficial del libro: ${respuestaOficial}`);
  return pasos;
}

function explicarValorAbsoluto(enunciado, respuestaOficial) {
  return [
    "El valor absoluto de un número es la distancia que hay desde el cero hasta ese " +
      "número en la recta numérica, y la distancia siempre es positiva o cero.",
    `Para ${enunciado}, se ubica el número en la recta numérica y se cuenta la distancia ` +
      "hasta el cero, sin importar el signo.",
    "Por lo tanto, se elimina el signo del número dado.",
    `Respuesta oficial del libro: ${respuestaOficial}`,
  ];
}

function explicarFormaDesarrollada(enunciado, respuestaOficial) {
  const pasos = [
    `Se identifica el valor relativo de cada dígito del número ${enunciado} según la ` +
      "posición que ocupa (unidades, decenas, centenas, millares, …).",
  ];
  const numero = enunciado.replace(/\s+/g, "");
  if (/^\d+$/.test(numero)) {
    const digitos = numero.split("");
    const totalDigitos = digitos.length;
    const terminos = [];
    digitos.forEach((d, i) => {
      const valor = Number(d) * Math.pow(10, totalDigitos - i - 1);
      if (valor !== 0) terminos.push(String(valor));
    });
    pasos.push("El valor relativo de cada dígito distinto de cero es: " + terminos.join(", ") + ".");
    pasos.push("Por el principio aditivo del libro, la forma desarrollada es la suma de esos " +
      "valores relativos.");
  } else {
    pasos.push("Revisa la tabla de valor relativo en la teoría del capítulo.");
  }
  pasos.push(`Respuesta oficial del libro: ${respuestaOficial}`);
  return pasos;
}

function explicarLecturaEscritura(enunciado, respuestaOficial) {
  return [
    "Se ubica el número (o el texto) dentro de la tabla de periodos y clases del libro: " +
      "unidades, millares, millones, millares de millón y billones.",
    "Se aplica el principio aditivo: se suma el valor correspondiente a cada palabra o " +
      "cifra según el periodo al que pertenece, tal como en los ejemplos de la sección " +
      "'Lectura y escritura' (por ejemplo: cuatrocientos + ochenta + siete = 487).",
    `Se organiza el resultado siguiendo ese mismo procedimiento para: ${enunciado}.`,
    `Respuesta oficial del libro: ${respuestaOficial}`,
  ];
}

export function generarExplicacion(item) {
  const { tipo, tema, enunciado, respuestaOficial } = item;
  if (tipo === "valor_posicional_doble") return explicarValorPosicionalDigito(item);
  if (tipo === "comparacion") return explicarComparacion(enunciado, respuestaOficial);
  if (tema === "Valor absoluto de un número") return explicarValorAbsoluto(enunciado, respuestaOficial);
  if (tema === "Valor absoluto y relativo del sistema posicional decimal")
    return explicarFormaDesarrollada(enunciado, respuestaOficial);
  if (tema === "Lectura y escritura") return explicarLecturaEscritura(enunciado, respuestaOficial);
  return [`Respuesta oficial del libro: ${respuestaOficial}`];
}
