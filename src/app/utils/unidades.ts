/**
 * Helpers de formato de unidades químicas.
 *
 * Las cantidades de cloro granulado, baja pH y sube pH se almacenan en KILOS
 * en `cliente.historial[].cantidadCloro / cantidadBajaPh / cantidadSubePh`.
 * Las pastillas de cloro se almacenan como cantidad de unidades (no tiene
 * conversión a masa porque el peso de cada pastilla varía según el fabricante).
 */

const GRAMOS_POR_KILO = 1000;

/**
 * Campo que se agrega a cada registro del historial para dejar explícito en qué
 * unidad están sus cantidades de masa. La migración de gramos a kilos solo toca
 * los registros que NO tienen esta marca, así que se puede reintentar sin riesgo
 * de dividir dos veces.
 */
export const UNIDAD_MASA = 'kg';
export const CAMPO_UNIDAD_MASA = 'unidadCantidades';

/** Redondea a 3 decimales evitando el ruido de punto flotante. */
export function redondear(valor: number, decimales: number = 3): number {
  const factor = Math.pow(10, decimales);
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/** Convierte gramos a kilos redondeando a 3 decimales. */
export function gramosAKilos(gramos: number): number {
  return redondear(gramos / GRAMOS_POR_KILO);
}

/** Convierte kilos a gramos. */
export function kilosAGramos(kilos: number): number {
  return redondear(kilos * GRAMOS_POR_KILO, 0);
}

function aNumero(valor: number | null | undefined): number {
  const n = Number(valor);
  return isNaN(n) ? 0 : n;
}

/**
 * Cantidad de decimales según magnitud: los kilos chicos necesitan precisión
 * (0.25 kg) y los grandes se leen mejor redondos (3.4 kg).
 */
function decimalesParaKilos(kilos: number): number {
  if (kilos === 0) return 0;
  return kilos < 1 ? 2 : 1;
}

/**
 * Formatea kilos para mostrar como valor principal.
 *   0      -> "0 kg"
 *   0.45   -> "0.45 kg"
 *   3.4    -> "3.4 kg"
 *   12.55  -> "12.6 kg"
 */
export function formatearKg(valor: number | null | undefined): string {
  const kilos = aNumero(valor);
  return `${redondear(kilos, decimalesParaKilos(kilos)).toFixed(decimalesParaKilos(kilos))} kg`;
}

/** Igual que `formatearKg` pero sin la unidad, útil cuando el sufijo va aparte en el HTML. */
export function formatearKgValor(valor: number | null | undefined): string {
  const kilos = aNumero(valor);
  return redondear(kilos, decimalesParaKilos(kilos)).toFixed(decimalesParaKilos(kilos));
}

/**
 * Formatea el equivalente en gramos para el subtítulo.
 *   0     -> "0 g"
 *   0.45  -> "450 g"
 *   3.4   -> "3 400 g"
 *   12.55 -> "12 550 g"
 */
export function formatearGramos(valor: number | null | undefined): string {
  const kilos = aNumero(valor);
  const gramos = kilosAGramos(kilos);
  return `${gramos.toLocaleString('es-CL', { maximumFractionDigits: 0 })} g`;
}

/** Formatea una cantidad de pastillas / unidades. */
export function formatearUnidades(valor: number | null | undefined): string {
  const n = aNumero(valor);
  return n.toLocaleString('es-CL', { maximumFractionDigits: 2 });
}

/**
 * Versión de texto plano para WhatsApp: "0.5 kg (500 g)".
 * Si el valor es 0 devuelve "0" para no ensuciar el mensaje.
 */
export function formatearKgParaTexto(valor: number | null | undefined): string | null {
  const kilos = aNumero(valor);
  if (kilos === 0) return null;
  return `${formatearKg(kilos)} (${formatearGramos(kilos)})`;
}
