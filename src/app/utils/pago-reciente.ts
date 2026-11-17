/**
 * Pagos marcados en "Mantención exitosa" que el inicio todavía no celebró.
 * Estado en memoria (no hace falta persistirlo): la pantalla de éxito lo
 * suma o resta y el inicio lo toma al volver para mostrar lo cobrado hoy.
 */
let montoPendiente = 0;

export function registrarPago(monto: number) {
  montoPendiente += monto || 0;
}

/** Al deshacer el pago antes de volver, se descuenta */
export function quitarPago(monto: number) {
  montoPendiente = Math.max(0, montoPendiente - (monto || 0));
}

/** Devuelve el monto pendiente de celebrar (o 0) y lo deja en cero */
export function tomarPagoPendiente(): number {
  const monto = montoPendiente;
  montoPendiente = 0;
  return monto;
}
