import { Firestore, doc, getDoc } from '@angular/fire/firestore';

/**
 * Acceso a la app.
 *
 * La lista del equipo NO está en el código: vive en Firestore, en la colección
 * `equipo`, con un documento por persona cuyo ID es su correo en minúsculas
 * (por ejemplo `equipo/nombre@gmail.com`). Se administra desde la consola de
 * Firebase, sin tocar el código ni volver a desplegar.
 *
 * Esta comprobación solo decide qué ve la app. La que de verdad protege los
 * datos es la de `firestore.rules` (función `esDelEquipo`), que revisa la misma
 * colección. Las reglas solo dejan a cada persona leer su propio documento, así
 * que nadie puede descargar la lista completa.
 */
export const COLECCION_EQUIPO = 'equipo';

/** Correos ya confirmados en esta sesión, para no leer Firestore en cada navegación. */
const confirmados = new Set<string>();

export async function esCorreoDelEquipo(
  firestore: Firestore,
  email: string | null | undefined
): Promise<boolean> {
  const correo = (email || '').trim().toLowerCase();
  if (!correo) return false;
  if (confirmados.has(correo)) return true;
  try {
    const snap = await getDoc(doc(firestore, COLECCION_EQUIPO, correo));
    if (snap.exists()) confirmados.add(correo);
    return snap.exists();
  } catch {
    // Sin permiso (no es del equipo) o sin conexión: no se deja entrar
    return false;
  }
}

/** Olvida los correos confirmados, para volver a consultar tras cerrar sesión. */
export function limpiarAccesoEquipo(): void {
  confirmados.clear();
}

export const MENSAJE_SIN_ACCESO =
  'Esta cuenta no tiene acceso a la app. Pídele al administrador que agregue tu correo.';
