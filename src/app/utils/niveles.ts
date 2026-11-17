/**
 * Colores de los rangos de cloro y pH guardados en `estadoCloro` / `estadoPh`.
 * Ámbar = bajo, familia verde = ideal, rojo = alto (igual que al completar la
 * mantención).
 */
export const COLOR_NIVEL: Record<string, string> = {
  'alto': '#dc2626',
  'ideal alto': '#16a34a',
  'ideal': '#15803d',
  'ideal bajo': '#4ade80',
  'bajo': '#d97706',
};

/** Color del estado, o null si no es un estado conocido (registros antiguos). */
export function colorNivel(estado: string | null | undefined): string | null {
  return COLOR_NIVEL[(estado || '').trim().toLowerCase()] ?? null;
}

/** "ideal alto" -> "Ideal alto" */
export function etiquetaNivel(estado: string | null | undefined): string {
  const texto = (estado || '').trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '—';
}

/**
 * Color con que se ve el agua en el comparador para cada estado (el mismo
 * "tubo" que se elige al completar la mantención): amarillos para cloro,
 * rojos/naranjos para pH.
 */
export const MUESTRA_CLORO: Record<string, string> = {
  'alto': '#e39a17',
  'ideal alto': '#f0bd34',
  'ideal': '#f6d65e',
  'ideal bajo': '#f9e797',
  'bajo': '#fcf6d2',
};

export const MUESTRA_PH: Record<string, string> = {
  'alto': '#b01f62',
  'ideal alto': '#d3365c',
  'ideal': '#e5564f',
  'ideal bajo': '#ef844a',
  'bajo': '#f4b443',
};

/**
 * Estado del cloro: el guardado, o deducido del valor en registros antiguos
 * (mismos rangos que "Completar mantención").
 */
export function estadoCloroDe(valor: number, estado?: string | null): string | null {
  const guardado = (estado || '').trim().toLowerCase();
  if (MUESTRA_CLORO[guardado]) return guardado;
  if (!valor) return null;
  if (valor > 3.0) return 'alto';
  if (valor >= 2.1) return 'ideal alto';
  if (valor >= 1.5) return 'ideal';
  if (valor >= 1.0) return 'ideal bajo';
  return 'bajo';
}

/** Estado del pH: el guardado, o deducido del valor en registros antiguos. */
export function estadoPhDe(valor: number, estado?: string | null): string | null {
  const guardado = (estado || '').trim().toLowerCase();
  if (MUESTRA_PH[guardado]) return guardado;
  if (!valor) return null;
  if (valor > 7.8) return 'alto';
  if (valor >= 7.7) return 'ideal alto';
  if (valor >= 7.4) return 'ideal';
  if (valor >= 7.2) return 'ideal bajo';
  return 'bajo';
}
