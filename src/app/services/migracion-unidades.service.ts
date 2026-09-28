import { Injectable, inject } from '@angular/core';
import { Observable, from, of, forkJoin } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import {
  Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where
} from '@angular/fire/firestore';
import { gramosAKilos, CAMPO_UNIDAD_MASA, UNIDAD_MASA } from '../utils/unidades';

/**
 * Campos del historial que guardan MASA y por lo tanto se convierten de gramos a kilos.
 * `cantidadPastillas` NO se toca: son unidades, no masa.
 */
const CAMPOS_MASA = ['cantidadCloro', 'cantidadBajaPh', 'cantidadSubePh', 'cantidadPh'];

export const MIGRATION_ID = 'unidades_kilos_v1';

export interface ResultadoMigracion {
  /** false si ya se había ejecutado antes o no había nada que hacer */
  ejecutada: boolean;
  documentosRevisados: number;
  registrosConvertidos: number;
  camposConvertidos: number;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class MigracionUnidadesService {
  private firestore = inject(Firestore);
  private readonly collectionClientes = 'clientes';
  private readonly collectionMigraciones = 'migraciones';

  private docMarcador(uid: string) {
    return doc(this.firestore, this.collectionMigraciones, `${MIGRATION_ID}_${uid}`);
  }

  /** ¿Ya se migró la data de este usuario a kilos? */
  yaMigrado(uid: string): Observable<boolean> {
    return from(getDoc(this.docMarcador(uid))).pipe(
      map(snap => snap.exists()),
      catchError(() => of(false))
    );
  }

  /**
   * Convierte a kilos todas las cantidades químicas ya registradas (que estaban en gramos).
   *
   * La idempotencia NO depende de adivinar el valor: cada registro del historial
   * queda marcado con `unidadCantidades: 'kg'`, y solo se convierten los que no
   * tienen la marca. Por eso todos los registros antiguos se migran (incluidos
   * los de 500 g) y, si una escritura falla a mitad de camino, el reintento
   * convierte lo que falta sin volver a dividir lo ya convertido.
   */
  ejecutarMigracion(uid: string, forzar: boolean = false): Observable<ResultadoMigracion> {
    if (!uid) {
      return of({
        ejecutada: false,
        documentosRevisados: 0,
        registrosConvertidos: 0,
        camposConvertidos: 0,
        mensaje: 'No hay usuario autenticado'
      });
    }

    if (forzar) {
      return this.convertirHistoriales(uid);
    }

    return this.yaMigrado(uid).pipe(
      mergeMap(yaHecho => {
        if (yaHecho) {
          return of({
            ejecutada: false,
            documentosRevisados: 0,
            registrosConvertidos: 0,
            camposConvertidos: 0,
            mensaje: 'Las unidades ya estaban en kilos'
          });
        }
        return this.convertirHistoriales(uid);
      })
    );
  }

  private convertirHistoriales(uid: string): Observable<ResultadoMigracion> {
    const clientesRef = collection(this.firestore, this.collectionClientes);
    const q = query(clientesRef, where('userId', '==', uid));

    return from(getDocs(q)).pipe(
      mergeMap(snapshot => {
        const documentosRevisados = snapshot.docs.length;
        let registrosConvertidos = 0;
        let camposConvertidos = 0;

        const escrituras: Array<Observable<unknown>> = [];

        snapshot.docs.forEach(clienteDoc => {
          const historial = clienteDoc.data()['historial'];
          if (!Array.isArray(historial) || historial.length === 0) return;

          let documentoModificado = false;
          let documentoRegistros = 0;
          let documentoCampos = 0;

          const historialMigrado = historial.map((registro: any) => {
            if (!registro || typeof registro !== 'object') return registro;

            // Ya está en kilos: no se toca (evita dividir dos veces al reintentar).
            if (registro[CAMPO_UNIDAD_MASA] === UNIDAD_MASA) return registro;

            const registroMigrado = { ...registro };
            let registroModificado = false;

            CAMPOS_MASA.forEach(campo => {
              const valor = Number(registro[campo]);
              if (isNaN(valor) || registro[campo] === null || registro[campo] === undefined) return;

              registroMigrado[campo] = gramosAKilos(valor);
              registroModificado = true;
              documentoCampos++;
            });

            if (registroModificado) {
              registroMigrado[CAMPO_UNIDAD_MASA] = UNIDAD_MASA;
              documentoRegistros++;
              documentoModificado = true;
            }

            return registroMigrado;
          });

          if (documentoModificado) {
            escrituras.push(from(updateDoc(clienteDoc.ref, { historial: historialMigrado })));
            camposConvertidos += documentoCampos;
            registrosConvertidos += documentoRegistros;
          }
        });

        if (escrituras.length === 0) {
          return this.marcarMigracion(uid, {
            documentosRevisados,
            registrosConvertidos: 0,
            camposConvertidos: 0,
            mensaje: 'No había cantidades en gramos pendientes de convertir'
          });
        }

        return forkJoin(escrituras).pipe(
          mergeMap(() =>
            this.marcarMigracion(uid, {
              documentosRevisados,
              registrosConvertidos,
              camposConvertidos,
              mensaje: `${registrosConvertidos} mantenciones actualizadas (${camposConvertidos} cantidades) en ${documentosRevisados} clientes`
            })
          ),
          catchError(error => {
            console.error('❌ Error escribiendo la migración de unidades:', error);
            return of({
              ejecutada: false,
              documentosRevisados,
              registrosConvertidos: 0,
              camposConvertidos: 0,
              mensaje: 'Error al guardar la migración. Vuelve a intentarlo.'
            });
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error en la migración de unidades a kilos:', error);
        return of({
          ejecutada: false,
          documentosRevisados: 0,
          registrosConvertidos: 0,
          camposConvertidos: 0,
          mensaje: 'Error al migrar los datos'
        });
      })
    );
  }

  private marcarMigracion(
    uid: string,
    resumen: Omit<ResultadoMigracion, 'ejecutada'> & { mensaje: string }
  ): Observable<ResultadoMigracion> {
    return from(
      setDoc(this.docMarcador(uid), {
        userId: uid,
        migracion: MIGRATION_ID,
        fecha: new Date().toISOString(),
        documentosRevisados: resumen.documentosRevisados,
        registrosConvertidos: resumen.registrosConvertidos,
        camposConvertidos: resumen.camposConvertidos
      })
    ).pipe(
      map(() => ({ ...resumen, ejecutada: true })),
      catchError(() => of({ ...resumen, ejecutada: false }))
    );
  }
}
