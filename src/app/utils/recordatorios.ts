/**
 * Recordatorios a clientes: frases, mi número de prueba y avisos programados.
 *
 * Se guardan en el dispositivo (localStorage), igual que la configuración de
 * notificaciones. Módulo plano, sin servicios, para que lo puedan leer tanto la
 * pantalla de recordatorios como NotificacionesService sin dependencias cruzadas.
 */

export interface Plantilla {
  id: string;
  titulo: string;
  texto: string;
  /** Las predefinidas no se pueden borrar */
  predefinida?: boolean;
}

/** Aviso para acordarme de enviar una frase en una fecha. */
export interface AvisoProgramado {
  id: string;
  /** YYYY-MM-DD */
  fecha: string;
  /** HH:mm */
  hora: string;
  titulo: string;
  texto: string;
}

/** Marcadores que se reemplazan al enviar. */
export const MARCADOR_NOMBRE = '{nombre}';
export const MARCADOR_MI_NOMBRE = '{mi_nombre}';

export const PLANTILLAS_PREDEFINIDAS: Plantilla[] = [
  {
    id: 'verano',
    titulo: 'Inicio de verano',
    predefinida: true,
    texto:
      '¡Hola {nombre}! ☀️ Ya estamos a inicios del verano y con el calor las piscinas se usan mucho más. ' +
      'Por eso las mantenciones serán más frecuentes, para que el agua se mantenga limpia y segura. ' +
      'Cualquier duda me avisas. ¡Saludos!',
  },
  {
    id: 'fin-temporada',
    titulo: 'Fin de temporada',
    predefinida: true,
    texto:
      '¡Hola {nombre}! 🍂 Se termina la temporada de verano. Te recomiendo seguir con mantenciones más ' +
      'espaciadas para que el agua no se eche a perder en los meses fríos. Coordinemos cuando te acomode.',
  },
  {
    id: 'lluvias',
    titulo: 'Después de lluvias',
    predefinida: true,
    texto:
      '¡Hola {nombre}! 🌧️ Después de las lluvias es normal que el agua se ponga turbia o verdosa. ' +
      'En la próxima visita haré un ajuste químico extra para dejarla impecable.',
  },
  {
    id: 'vacaciones',
    titulo: 'Aviso de vacaciones',
    predefinida: true,
    texto:
      '¡Hola {nombre}! Te aviso que entre el ___ y el ___ no habrá mantenciones porque estaré de vacaciones. ' +
      'Antes de irme dejaré la piscina con cloro para esos días. ¡Gracias por la comprensión!',
  },
  {
    id: 'precio',
    titulo: 'Cambio de precio',
    predefinida: true,
    texto:
      '¡Hola {nombre}! Te informo que a partir del ___ el valor de la mantención será de $___. ' +
      'Muchas gracias por seguir confiando en mi trabajo.',
  },
  {
    id: 'fiestas',
    titulo: 'Felices fiestas',
    predefinida: true,
    texto:
      '¡Hola {nombre}! 🎉 Te deseo muy felices fiestas y un excelente año nuevo. ' +
      'Gracias por confiar en mi trabajo este año.',
  },
];

const CLAVE_PLANTILLAS = 'recordatorios_plantillas';
const CLAVE_AVISOS = 'recordatorios_avisos';
const CLAVE_MI_NUMERO = 'recordatorios_mi_numero';

function leer<T>(clave: string, porDefecto: T): T {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? (JSON.parse(valor) as T) : porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave: string, valor: unknown) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

/** Frases propias guardadas (las predefinidas van aparte). */
export function leerPlantillasPropias(): Plantilla[] {
  return leer<Plantilla[]>(CLAVE_PLANTILLAS, []);
}

export function guardarPlantillasPropias(plantillas: Plantilla[]) {
  escribir(CLAVE_PLANTILLAS, plantillas);
}

export function leerAvisos(): AvisoProgramado[] {
  return leer<AvisoProgramado[]>(CLAVE_AVISOS, []);
}

export function guardarAvisos(avisos: AvisoProgramado[]) {
  escribir(CLAVE_AVISOS, avisos);
}

export function leerMiNumero(): string {
  return leer<string>(CLAVE_MI_NUMERO, '');
}

export function guardarMiNumero(numero: string) {
  escribir(CLAVE_MI_NUMERO, numero);
}

export function nuevoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Reemplaza los marcadores. Usa solo el primer nombre del cliente, que suena más cercano. */
export function armarMensaje(texto: string, nombreCliente: string, miNombre: string): string {
  const primerNombre = (nombreCliente || '').trim().split(/\s+/)[0] || '';
  return texto.split(MARCADOR_NOMBRE).join(primerNombre).split(MARCADOR_MI_NOMBRE).join(miNombre || '').trim();
}

/** Teléfono solo con dígitos, como lo pide wa.me (sin "+" ni espacios). */
export function telefonoParaWhatsApp(telefono: string): string {
  return (telefono || '').replace(/\D/g, '');
}

/** Un número chileno de celular válido: 56 + 9 dígitos. */
export function telefonoValido(telefono: string): boolean {
  return /^56\d{9}$/.test(telefonoParaWhatsApp(telefono));
}

export function urlWhatsApp(telefono: string, mensaje: string): string {
  return `https://wa.me/${telefonoParaWhatsApp(telefono)}?text=${encodeURIComponent(mensaje)}`;
}
