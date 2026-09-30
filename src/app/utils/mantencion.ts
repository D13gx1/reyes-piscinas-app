/**
 * Reglas de negocio de una mantención del historial.
 *
 * Estas tres preguntas se hacían en cada pantalla con predicados distintos, y las
 * divergencias producían montos equivocados: unas pantallas sumaban lo pagado y
 * otras lo daban por pendiente, y el historial de un cliente mostraba su precio
 * actual en vez del que se le cobró ese día. La respuesta canónica vive acá.
 */

/** Campos de `cliente.historial[]` que estos helpers leen. */
export interface MantencionPagoCampos {
  estadoCloro?: string;
  servicio?: string;
  precioCobrado?: number;
  pagado?: boolean | string;
  pago?: boolean | string;
  estadoPago?: string;
}

/**
 * Una mantención "saltada" (suspendida) no se concretó: no genera cobro ni
 * aparece en las estadísticas. Se reconoce de dos formas porque según cómo se
 * creó el registro queda en un campo u otro.
 */
export function esMantencionSaltada(m: MantencionPagoCampos | null | undefined): boolean {
  if (m == null) return false;
  return (
    m.estadoCloro === 'saltada' ||
    (typeof m.servicio === 'string' && m.servicio.toLowerCase().includes('saltada'))
  );
}

/**
 * Si la mantención está pagada.
 *
 * El historial se fue llenando a lo largo del tiempo con distintas formas de
 * marcar el pago, así que hay que reconocerlas todas. Con una simple truthiness
 * (`m.pagado`) un registro guardado como `estadoPago: 'pagado'` no contaba como
 * cobrado en las estadísticas pero sí aparecía pendiente en la lista y en el
 * resumen de deuda que se manda por WhatsApp.
 */
export function esMantencionPagada(m: MantencionPagoCampos | null | undefined): boolean {
  if (m == null) return false;
  if (m.pagado === true) return true;
  if (typeof m.pagado === 'string' && /^(si|sí|true)$/i.test(m.pagado)) return true;
  if (m.pago === true) return true;
  if (typeof m.pago === 'string' && /^(si|sí|true)$/i.test(m.pago)) return true;
  if (typeof m.estadoPago === 'string' && /^(pagado|completado)$/i.test(m.estadoPago)) return true;
  return false;
}

/**
 * Cuánto se le cobró efectivamente a un cliente en esa mantención.
 *
 * Siempre prima `precioCobrado`, que es lo que quedó guardado al momento de
 * registrar la mantención (incluye el precio especial de ese día). El precio
 * actual del cliente es solo el respaldo para los registros anteriores a que
 * existiera ese campo.
 *
 * Si no hay `precioCobrado`, una mantención saltada vale 0 porque no se cobró y
 * una normal cae al precio vigente del cliente. En la práctica las saltadas
 * nunca traen `precioCobrado` porque se registran sin él.
 *
 * Se usa `||` y no `??` a propósito: un `precioCobrado` en 0 significa que no
 * quedó registrado, y debe caer al precio del cliente.
 */
export function precioEfectivoMantencion(
  m: MantencionPagoCampos | null | undefined,
  precioActualCliente: number = 0
): number {
  if (m == null) return 0;
  if (esMantencionSaltada(m)) return m.precioCobrado || 0;
  return m.precioCobrado || precioActualCliente || 0;
}

/** Cómo se identifica un registro del historial desde las pantallas. */
export interface RegistroRef {
  /** `id` del registro. Los registros anteriores a este campo no lo tienen. */
  registroId?: string;
  fecha: string;
  hora?: string;
}

/** Id para un registro nuevo del historial. */
export function nuevoIdRegistro(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/**
 * Si un registro del historial es el que apunta `ref`.
 *
 * Con `registroId` se compara solo el id. Sin él (registros antiguos) se cae a
 * fecha + hora, normalizando la hora ausente a '00:00' porque así la mandan las
 * pantallas. Ese respaldo no distingue dos registros del mismo día y hora.
 */
export function esMismoRegistro(
  m: { id?: string; fecha: string; hora?: string },
  ref: RegistroRef
): boolean {
  if (ref.registroId) return m.id === ref.registroId;
  return m.fecha === ref.fecha && (m.hora || '00:00') === (ref.hora || '00:00');
}
