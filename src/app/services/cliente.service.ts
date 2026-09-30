import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, take, shareReplay } from 'rxjs/operators';
import { 
  Firestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  getCountFromServer,
  runTransaction,
  onSnapshot,
  DocumentData
} from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { environment } from '../../environments/environment';
import { RegistroRef, esMismoRegistro } from '../utils/mantencion';

export interface Cliente {
  id?: string; // string para Firestore
  userId: string; // ID del usuario propietario
  nombre: string;
  direccion: string;
  telefono: string;
  email: string;
  medidas: {
    largo: number;
    ancho: number;
    profundidad: number;
  };
  precio: number;
  programacion: {
    frecuencia: string; // 'semanal', 'quincenal', 'mensual'
    cantidadPorPeriodo: number; // cuántos servicios por período
    diasSemana: string[]; // ['lunes', 'miercoles', 'viernes']
    horaPreferida: string; // formato HH:mm
    notas: string; // instrucciones adicionales
  };
  historial: {
    id?: string; // Solo en registros creados desde que existe el campo
    fecha: string;
    servicio: string;
    cloro: number;
    ph: number;
    cantidadCloro?: number; // Cantidad de cloro granulado utilizada en kilos
    cantidadBajaPh?: number; // Cantidad de baja P H utilizada en kilos
    cantidadSubePh?: number; // Cantidad de sube pH utilizada en kilos
    cantidadPastillas?: number; // Cantidad de pastillas de cloro utilizadas (unidades)
    estadoCloro?: string; // Nuevo campo para estado del cloro
    estadoPh?: string; // Nuevo campo para estado del pH
    hora?: string; // Nuevo campo para la hora del mantenimiento
    precioCobrado?: number; // Precio que se cobró en ese momento
    // Campos de pago
    pagado?: boolean | string;
    pago?: boolean | string;
    estadoPago?: string;
    fechaPago?: string;
  }[];
  skippedDates?: string[]; // Fechas marcadas como "saltadas" (YYYY-MM-DD)
  preciosEspeciales?: { [fecha: string]: number }; // Precios de una sola vez por fecha (YYYY-MM-DD)
  serviciosExtra?: { fecha: string; servicio: string }[]; // Servicios agregados manualmente para una fecha
  fechaCreacion?: string; // ISO; solo en clientes creados desde que existe el campo
  activo: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  private collectionName = 'clientes';

  private auth: Auth = inject(Auth);
  private currentUserId: string | null = null;

  constructor(
    private http: HttpClient,
    private firestore: Firestore
  ) {
    console.log('🔄 Inicializando ClienteService...');
    
    // Suscribirse a cambios en la autenticación
    user(this.auth).subscribe(user => {
      console.log('👤 Cambio en estado de autenticación:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
      this.currentUserId = user?.uid || null;
      console.log('🆔 ID de usuario actualizado:', this.currentUserId);
    });
  }

  private sanitizarDatosFirestore<T>(data: T): T {
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizarDatosFirestore(item)) as unknown as T;
    }
    if (data && typeof data === 'object') {
      const limpio: Record<string, any> = {};
      for (const key of Object.keys(data)) {
        const valor = (data as Record<string, any>)[key];
        limpio[key] = valor === undefined ? null : this.sanitizarDatosFirestore(valor);
      }
      return limpio as unknown as T;
    }
    return data;
  }

  private ensureUserId(): string {
    console.log('🔐 Verificando autenticación...');
    console.log('ID de usuario actual:', this.currentUserId);
    console.log('Estado de autenticación:', this.auth.currentUser);
    
    if (!this.currentUserId) {
      console.error('❌ Error: Usuario no autenticado');
      throw new Error('Usuario no autenticado');
    }
    return this.currentUserId;
  }

  /**
   * Clientes del usuario en tiempo real, compartidos por toda la app.
   *
   * Hay un solo listener de Firestore: las pantallas leen de este caché en vez
   * de descargar la colección cada vez que se entra a ellas, y cualquier
   * escritura (de este u otro dispositivo) llega sola, sin recargar.
   */
  readonly clientes$: Observable<Cliente[]> = user(this.auth).pipe(
    switchMap(u => (u ? this.escucharClientes(u.uid) : of([] as Cliente[]))),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  private escucharClientes(uid: string): Observable<Cliente[]> {
    const q = query(collection(this.firestore, this.collectionName), where('userId', '==', uid));
    return new Observable<Cliente[]>(subscriber =>
      onSnapshot(
        q,
        snapshot => subscriber.next(snapshot.docs.map(d => this.mapearCliente(d.id, d.data()))),
        error => {
          console.error('❌ Error escuchando clientes:', error);
          subscriber.error(error);
        }
      )
    );
  }

  private mapearCliente(id: string, data: DocumentData): Cliente {
    return {
      id,
      userId: data['userId'] || '',
      nombre: data['nombre'] || '',
      direccion: data['direccion'] || '',
      telefono: data['telefono'] || '',
      email: data['email'] || '',
      medidas: {
        largo: data['medidas']?.['largo'] || 0,
        ancho: data['medidas']?.['ancho'] || 0,
        profundidad: data['medidas']?.['profundidad'] || 0,
      },
      precio: data['precio'] || 0,
      programacion: {
        frecuencia: data['programacion']?.['frecuencia'] || '',
        cantidadPorPeriodo: data['programacion']?.['cantidadPorPeriodo'] || 1,
        diasSemana: data['programacion']?.['diasSemana'] || [],
        horaPreferida: data['programacion']?.['horaPreferida'] || '',
        notas: data['programacion']?.['notas'] || ''
      },
      historial: data['historial'] || [],
      skippedDates: data['skippedDates'] || [],
      preciosEspeciales: data['preciosEspeciales'] || {},
      serviciosExtra: data['serviciosExtra'] || [],
      fechaCreacion: data['fechaCreacion'] || undefined,
      activo: data['activo'] !== undefined ? data['activo'] : true,
    };
  }

  /**
   * Foto actual de los clientes (sale del caché: instantáneo tras la primera carga).
   * Se entrega una copia porque las pantallas modifican el objeto antes de guardarlo.
   */
  getClientes(): Observable<Cliente[]> {
    return this.clientes$.pipe(take(1), map(clientes => structuredClone(clientes)));
  }

  getClienteById(id: string): Observable<Cliente> {
    return this.clientes$.pipe(
      take(1),
      switchMap(clientes => {
        const enCache = clientes.find(c => c.id === id);
        if (enCache) {
          return of(structuredClone(enCache));
        }
        // Respaldo: un cliente que aún no llegó al listener
        const clienteRef = doc(this.firestore, this.collectionName, id);
        return from(getDoc(clienteRef)).pipe(
          map(snap => {
            if (!snap.exists()) {
              throw new Error('Cliente no encontrado');
            }
            return this.mapearCliente(snap.id, snap.data());
          })
        );
      })
    );
  }

  addCliente(cliente: Cliente): Observable<Cliente> {
    const userId = this.ensureUserId();
    console.log(' Intentando agregar cliente:', cliente);
    const clientesRef = collection(this.firestore, this.collectionName);
    console.log(' Referencia a colección creada:', clientesRef);
    
    // Asegurar que todos los campos estén correctamente inicializados antes de guardar
    const clienteParaGuardar = {
      userId, // Añadir el ID del usuario actual
      nombre: cliente.nombre || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      medidas: {
        largo: cliente.medidas?.largo || 0,
        ancho: cliente.medidas?.ancho || 0,
        profundidad: cliente.medidas?.profundidad || 0,
      },
      precio: cliente.precio || 0,
      programacion: {
        frecuencia: cliente.programacion?.frecuencia || '',
        cantidadPorPeriodo: cliente.programacion?.cantidadPorPeriodo || 1,
        diasSemana: cliente.programacion?.diasSemana || [],
        horaPreferida: cliente.programacion?.horaPreferida || '',
        notas: cliente.programacion?.notas || ''
      },
      historial: cliente.historial || [],
      skippedDates: cliente['skippedDates'] || [],
      preciosEspeciales: cliente['preciosEspeciales'] || {},
      serviciosExtra: cliente['serviciosExtra'] || [],
      fechaCreacion: new Date().toISOString(),
      activo: cliente.activo !== undefined ? cliente.activo : true,
    };
    
    console.log(' Cliente preparado para guardar:', clienteParaGuardar);
    
    return from(addDoc(clientesRef, this.sanitizarDatosFirestore(clienteParaGuardar))).pipe(
      map(docRef => {
        console.log(' Cliente creado exitosamente con ID:', docRef.id);
        const clienteCreado = { id: docRef.id, ...clienteParaGuardar };
        console.log(' Cliente final:', clienteCreado);
        return clienteCreado;
      })
    );
  }

  updateCliente(cliente: Cliente): Observable<Cliente> {
    console.log(' Intentando actualizar cliente:', cliente);
    if (!cliente.id) {
      console.error(' Error: ID de cliente requerido para actualizar');
      throw new Error('ID de cliente requerido para actualizar');
    }
    
    // Obtener el cliente actual para preservar el historial
    return this.getClienteById(cliente.id).pipe(
      switchMap(clienteActual => {
        if (!clienteActual) {
          throw new Error('Cliente no encontrado');
        }
        
        const clienteRef = doc(this.firestore, this.collectionName, cliente.id!);
        console.log(' Referencia a documento creada:', clienteRef);
        
        // Preservar el historial existente y solo actualizar campos permitidos.
        // `??` y no `||`: un string vacío (p. ej. borrar el email) debe guardarse tal cual.
        const clienteData = {
          userId: cliente.userId || clienteActual.userId,
          nombre: cliente.nombre ?? clienteActual.nombre,
          direccion: cliente.direccion ?? clienteActual.direccion,
          telefono: cliente.telefono ?? clienteActual.telefono,
          email: cliente.email ?? clienteActual.email,
          medidas: cliente.medidas ?? clienteActual.medidas,
          precio: cliente.precio !== undefined ? cliente.precio : clienteActual.precio,
          programacion: cliente.programacion ?? clienteActual.programacion,
          historial: cliente.historial ?? clienteActual.historial,
          skippedDates: cliente.skippedDates ?? clienteActual.skippedDates,
          preciosEspeciales: cliente.preciosEspeciales ?? clienteActual.preciosEspeciales ?? {},
          serviciosExtra: cliente.serviciosExtra ?? clienteActual.serviciosExtra ?? [],
          activo: cliente.activo !== undefined ? cliente.activo : clienteActual.activo
        };
        
        console.log(' Datos a actualizar (historial preservado):', clienteData);
        
        return from(updateDoc(clienteRef, this.sanitizarDatosFirestore(clienteData))).pipe(
          map(() => {
            console.log(' Cliente actualizado exitosamente (historial preservado)');
            return { ...cliente, historial: clienteActual.historial };
          })
        );
      })
    );
  }

  /**
   * Reescribe el historial de un cliente dentro de una transacción: si otro
   * dispositivo (o un segundo toque) lo modificó entre la lectura y la escritura,
   * Firestore reintenta con los datos frescos en vez de pisar el cambio.
   */
  private modificarHistorial(
    clienteId: string,
    modificar: (historial: Cliente['historial']) => Cliente['historial']
  ): Observable<void> {
    const clienteRef = doc(this.firestore, this.collectionName, clienteId);
    return from(runTransaction(this.firestore, async tx => {
      const snap = await tx.get(clienteRef);
      if (!snap.exists()) {
        throw new Error('Cliente no encontrado');
      }
      const historial = (snap.data()['historial'] || []) as Cliente['historial'];
      tx.update(clienteRef, { historial: this.sanitizarDatosFirestore(modificar(historial)) });
    }));
  }

  // Borra un registro específico del historial de un cliente
  borrarRegistroHistorial(clienteId: string, ref: RegistroRef): Observable<void> {
    return this.modificarHistorial(clienteId, historial => {
      const restantes = historial.filter(registro => !esMismoRegistro(registro, ref));
      if (restantes.length === historial.length) {
        throw new Error('Registro de historial no encontrado para borrar');
      }
      return restantes;
    });
  }

  // Marcar un registro del historial como pagado
  marcarPagoHistorial(clienteId: string, ref: RegistroRef): Observable<void> {
    return this.modificarHistorial(clienteId, historial => {
      let encontrado = false;
      const actualizado = historial.map(registro => {
        if (!esMismoRegistro(registro, ref)) return registro;
        encontrado = true;
        return { ...registro, pagado: true, fechaPago: new Date().toISOString() };
      });
      if (!encontrado) {
        throw new Error('Registro de historial no encontrado para marcar pago');
      }
      return actualizado;
    });
  }

  // Deshacer (quitar) el marcado de pago en un registro del historial
  deshacerPagoHistorial(clienteId: string, ref: RegistroRef): Observable<void> {
    return this.modificarHistorial(clienteId, historial => {
      let encontrado = false;
      const actualizado = historial.map(registro => {
        if (!esMismoRegistro(registro, ref)) return registro;
        encontrado = true;
        const { pagado, fechaPago, pago, estadoPago, ...rest } = registro;
        return rest;
      });
      if (!encontrado) {
        throw new Error('Registro de historial no encontrado para deshacer pago');
      }
      return actualizado;
    });
  }

  deleteCliente(id: string): Observable<void> {
    const clienteRef = doc(this.firestore, this.collectionName, id);
    return from(deleteDoc(clienteRef));
  }

  // Método auxiliar para obtener clientes por día de la semana
  getClientesPorDia(dia: string): Observable<Cliente[]> {
    return new Observable<Cliente[]>(subscriber => {
      // Subscribe to auth state changes to ensure we have the latest user
      const authSubscription = user(this.auth).subscribe({
        next: (user) => {
          if (user) {
            const clientesRef = collection(this.firestore, this.collectionName);
            const q = query(
              clientesRef, 
              where('userId', '==', user.uid),
              where('activo', '==', true)
            );
            
            from(getDocs(q)).subscribe({
              next: (snapshot) => {
                const clientes = snapshot.docs
                  .map(doc => {
                    const data = doc.data();
                    return {
                      id: doc.id,
                      userId: data['userId'] || '',
                      nombre: data['nombre'] || '',
                      direccion: data['direccion'] || '',
                      telefono: data['telefono'] || '',
                      email: data['email'] || '',
                      precio: data['precio'] || 0,
                      medidas: {
                        largo: data['medidas']?.['largo'] || 0,
                        ancho: data['medidas']?.['ancho'] || 0,
                        profundidad: data['medidas']?.['profundidad'] || 0,
                      },
                      programacion: data['programacion'] || {
                        frecuencia: '',
                        cantidadPorPeriodo: 1,
                        diasSemana: [],
                        horaPreferida: '',
                        notas: ''
                      },
                      historial: data['historial'] || [],
                      activo: data['activo'] !== undefined ? data['activo'] : true
                    };
                  })
                  .filter(cliente => 
                    cliente.programacion?.diasSemana?.includes(dia)
                  );
                subscriber.next(clientes);
                subscriber.complete();
              },
              error: (err) => {
                console.error('Error al cargar clientes:', err);
                subscriber.error(err);
              }
            });
          } else {
            console.warn('No hay usuario autenticado');
            subscriber.next([]);
            subscriber.complete();
          }
        },
        error: (err) => {
          console.error('Error en la autenticación:', err);
          subscriber.error(err);
        },
        complete: () => {
          // Clean up subscription when done
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        }
      });
    });
  }

  // Método de prueba para verificar la conexión con Firebase
  testFirebaseConnection(): Observable<boolean> {
    const userId = this.ensureUserId();
    console.log(' Probando conexión con Firebase...');
    console.log(' Configuración de Firebase:', environment.firebaseConfig);
    console.log(' Usuario actual:', userId);
    
    const clientesRef = collection(this.firestore, this.collectionName);
    const q = query(clientesRef, where('userId', '==', userId));
    
    console.log(' Referencia a consulta creada:', q);
    
    return from(getDocs(q)).pipe(
      map(snapshot => {
        console.log(' Conexión con Firebase exitosa');
        console.log(' Documentos del usuario:', snapshot.size);
        console.log(' IDs de documentos:', snapshot.docs.map(doc => doc.id));
        return true;
      })
    );
  }
}