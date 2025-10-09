import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
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
  getCountFromServer
} from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { environment } from '../../environments/environment';

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
    fecha: string;
    servicio: string;
    cloro: number;
    ph: number;
    cantidadCloro?: number; // Cantidad de cloro utilizada en gramos
    cantidadBajaPh?: number; // Cantidad de baja pH utilizada en gramos
    cantidadSubePh?: number; // Cantidad de sube pH utilizada en gramos
    estadoCloro?: string; // Nuevo campo para estado del cloro
    estadoPh?: string; // Nuevo campo para estado del pH
    hora?: string; // Nuevo campo para la hora del mantenimiento
  }[];
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

  getClientes(): Observable<Cliente[]> {
    console.log('🔍 Iniciando getClientes()');
    
    return new Observable<Cliente[]>(subscriber => {
      const authSubscription = user(this.auth).subscribe({
        next: (user) => {
          if (!user) {
            console.warn('⚠️ No hay usuario autenticado');
            subscriber.next([]);
            subscriber.complete();
            return;
          }

          console.log('✅ Usuario autenticado con ID:', user.uid);
          const clientesRef = collection(this.firestore, this.collectionName);
          const q = query(clientesRef, where('userId', '==', user.uid));
          
          console.log('🔎 Ejecutando consulta Firestore...');
          from(getDocs(q)).subscribe({
            next: (snapshot) => {
              const clientes = snapshot.docs.map(doc => {
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
              });
              
              console.log(`📊 Se encontraron ${clientes.length} clientes`);
              subscriber.next(clientes);
              subscriber.complete();
            },
            error: (error) => {
              console.error('❌ Error al cargar clientes:', error);
              subscriber.error(error);
            }
          });
        },
        error: (error) => {
          console.error('❌ Error en la autenticación:', error);
          subscriber.error(error);
        },
        complete: () => {
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        }
      });
    });
  }

  getClienteById(id: string): Observable<Cliente> {
    const clienteRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(clienteRef)).pipe(
      map(doc => {
        if (doc.exists()) {
          const data = doc.data();
          // Asegurar que todos los campos estén correctamente inicializados
          return {
            id: doc.id,
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
            activo: data['activo'] !== undefined ? data['activo'] : true,
          } as Cliente;
        } else {
          throw new Error('Cliente no encontrado');
        }
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
      activo: cliente.activo !== undefined ? cliente.activo : true,
    };
    
    console.log(' Cliente preparado para guardar:', clienteParaGuardar);
    
    return from(addDoc(clientesRef, clienteParaGuardar)).pipe(
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
    const clienteRef = doc(this.firestore, this.collectionName, cliente.id);
    console.log(' Referencia a documento creada:', clienteRef);
    const { id, ...clienteData } = cliente;
    console.log(' Datos a actualizar:', clienteData);
    
    return from(updateDoc(clienteRef, clienteData)).pipe(
      map(() => {
        console.log(' Cliente actualizado exitosamente');
        return cliente;
      })
    );
  }

  // Método para borrar un registro específico del historial de un cliente
  borrarRegistroHistorial(clienteId: string, fecha: string, hora: string): Observable<void> {
    return this.getClienteById(clienteId).pipe(
      switchMap(cliente => {
        if (cliente && cliente.historial) {
          // Filtrar el historial para eliminar el registro específico
          cliente.historial = cliente.historial.filter(registro => 
            !(registro.fecha === fecha && registro.hora === hora)
          );
          
          // Actualizar el cliente con el historial modificado
          return this.updateCliente(cliente).pipe(
            map(() => void 0) // devolvemos void para que coincida con la firma
          );
        }
        throw new Error('Cliente no encontrado o sin historial');
      })
    );
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