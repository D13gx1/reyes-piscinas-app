import { formatearGramos, formatearKgValor, formatearUnidades } from './unidades';

/**
 * Tipos de servicio que se pueden registrar al completar una mantención y los
 * datos extra que guarda cada uno en el registro del historial.
 */

/** Los servicios usan el color de la marca; cada producto tiene el suyo para distinguirlos de un vistazo */
const MARCA = 'var(--ion-color-primary)';

export const COLOR_PRODUCTO = {
  cloroGranulado: '#ca8a04',
  cloroPastilla: '#0d9488',
  subePh: '#db2777',
  bajaPh: '#7c3aed',
  algicida: '#65a30d',
  cuarzo: '#78716c',
  bomba: '#475569',
};

export const SERVICIO_MANTENCION = 'Mantención de piscina';
export const SERVICIO_RECUPERACION = 'Recuperación de agua';
export const SERVICIO_CUARZO = 'Cambio de cuarzo';
export const SERVICIO_BOMBA = 'Reparación de bomba';

export interface OpcionServicio {
  valor: string;
  /** Texto corto para el botón */
  corto: string;
  icono: string;
  /** Color de la etiqueta del servicio en las listas (el de la marca: el ícono los distingue) */
  color: string;
}

export const SERVICIOS: OpcionServicio[] = [
  { valor: SERVICIO_MANTENCION, corto: 'Mantención', icono: 'water-outline', color: MARCA },
  { valor: SERVICIO_RECUPERACION, corto: 'Recuperación de agua', icono: 'leaf-outline', color: MARCA },
  { valor: SERVICIO_CUARZO, corto: 'Cambio de cuarzo', icono: 'layers-outline', color: MARCA },
  { valor: SERVICIO_BOMBA, corto: 'Reparación de bomba', icono: 'construct-outline', color: MARCA },
];

/** Datos para mostrar un servicio; los antiguos fuera de la lista salen con ícono genérico. */
export function infoServicio(servicio: string | null | undefined): OpcionServicio {
  const valor = (servicio || '').trim() || SERVICIO_MANTENCION;
  // Registros antiguos guardaban "Mantenimiento" o "Mantención"
  if (/^manten/i.test(valor)) return SERVICIOS[0];
  return SERVICIOS.find((s) => s.valor === valor) ?? { valor, corto: valor, icono: 'build-outline', color: MARCA };
}

export const TIPOS_CUARZO = [
  'Fino (0,4–0,8 mm)',
  'Grueso (1–2 mm)',
  'Mixto (fino + grueso)',
  'Vidrio filtrante',
  'Zeolita',
];

export const REPARACIONES_BOMBA = [
  'Sello mecánico',
  'Rodamientos',
  'Capacitor',
  'Motor',
  'Impulsor',
  'Fuga / O-rings',
  'Tapa / canastillo',
];

/** Datos del cambio de cuarzo. Montos en CLP. */
export interface DetalleCuarzo {
  tipo: string;
  kilos: number;
  precioCuarzo: number;
  manoObra: number;
}

/** Datos de la reparación de bomba. Montos en CLP. */
export interface DetalleBomba {
  marcaModelo?: string;
  reparaciones: string[];
  repuestos?: string;
  costoRepuestos: number;
  manoObra: number;
  quedoFuncionando: boolean;
}

/** Campos extra de un registro del historial según el servicio. */
export interface CamposServicio {
  /** Litros de algicida (recuperación de agua) */
  cantidadAlgicida?: number;
  cuarzo?: DetalleCuarzo;
  bomba?: DetalleBomba;
  /** Si al servicio especial se le sumó el precio de la mantención normal */
  incluyeMantencion?: boolean;
}

/** Servicios en los que se miden y registran los niveles del agua sí o sí. */
export function servicioRequiereNiveles(servicio: string): boolean {
  return servicio !== SERVICIO_CUARZO && servicio !== SERVICIO_BOMBA;
}

/** Un producto o material usado en una visita, listo para mostrar. */
export interface ProductoUsado {
  nombre: string;
  /** Cantidad, o el texto del material cuando no es un número (repuestos) */
  valor: string;
  unidad?: string;
  sub?: string;
  icono: string;
  color: string;
  /** El valor es texto largo, no una cifra */
  esTexto?: boolean;
}

/** Campos del registro que se leen para armar la lista. */
export interface RegistroConProductos extends CamposServicio {
  cantidadCloro?: number;
  cantidadSubePh?: number;
  cantidadBajaPh?: number;
  cantidadPastillas?: number;
}


/**
 * Lo que efectivamente se usó en una visita, en el orden de la grilla de
 * "Completar mantención" y seguido de lo propio de cada servicio (algicida,
 * cuarzo, repuestos). Los productos en 0 no aparecen.
 */
export function productosUsados(r: RegistroConProductos | null | undefined): ProductoUsado[] {
  if (!r) return [];
  const lista: ProductoUsado[] = [];
  const kg = (valor: number) => ({ valor: formatearKgValor(valor), unidad: 'kg', sub: formatearGramos(valor) });

  if (r.cantidadCloro) lista.push({ nombre: 'Cloro granulado', ...kg(r.cantidadCloro), icono: 'flask-outline', color: COLOR_PRODUCTO.cloroGranulado });
  if (r.cantidadSubePh) lista.push({ nombre: 'Sube pH', ...kg(r.cantidadSubePh), icono: 'arrow-up-circle-outline', color: COLOR_PRODUCTO.subePh });
  if (r.cantidadPastillas) {
    lista.push({ nombre: 'Cloro en pastilla', valor: formatearUnidades(r.cantidadPastillas), unidad: 'und.', sub: 'pastillas', icono: 'disc-outline', color: COLOR_PRODUCTO.cloroPastilla });
  }
  if (r.cantidadBajaPh) lista.push({ nombre: 'Baja pH', ...kg(r.cantidadBajaPh), icono: 'arrow-down-circle-outline', color: COLOR_PRODUCTO.bajaPh });
  if (r.cantidadAlgicida) {
    lista.push({ nombre: 'Algicida', valor: formatearUnidades(r.cantidadAlgicida), unidad: 'L', sub: 'litros', icono: 'leaf-outline', color: COLOR_PRODUCTO.algicida });
  }
  if (r.cuarzo && (r.cuarzo.kilos || r.cuarzo.tipo)) {
    lista.push({
      nombre: 'Cuarzo',
      valor: r.cuarzo.kilos ? formatearUnidades(r.cuarzo.kilos) : '—',
      unidad: r.cuarzo.kilos ? 'kg' : undefined,
      sub: r.cuarzo.tipo || undefined,
      icono: 'layers-outline',
      color: COLOR_PRODUCTO.cuarzo,
    });
  }
  if (r.bomba && (r.bomba.repuestos || r.bomba.reparaciones?.length)) {
    lista.push({
      nombre: r.bomba.marcaModelo ? `Repuestos · ${r.bomba.marcaModelo}` : 'Repuestos bomba',
      valor: r.bomba.repuestos || r.bomba.reparaciones.join(', '),
      sub: r.bomba.repuestos && r.bomba.reparaciones?.length ? r.bomba.reparaciones.join(', ') : undefined,
      icono: 'construct-outline',
      color: COLOR_PRODUCTO.bomba,
      esTexto: true,
    });
  }
  return lista;
}
