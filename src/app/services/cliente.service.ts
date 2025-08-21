import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map, switchMap  } from 'rxjs/operators';
import { Firestore, collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';
import { environment } from '../../environments/environment';

export interface Cliente {
  id?: string; // Cambiado a string para Firestore
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

  constructor(
    private http: HttpClient,
    private firestore: Firestore
  ) {}

  getClientes(): Observable<Cliente[]> {
    const clientesRef = collection(this.firestore, this.collectionName);
    return from(getDocs(clientesRef)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => {
          const data = doc.data();
          // Asegurar que todos los campos estén correctamente inicializados
          return {
            id: doc.id,
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
        })
        
      )
    );
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
    console.log('🔍 Intentando agregar cliente:', cliente);
    const clientesRef = collection(this.firestore, this.collectionName);
    console.log('📁 Referencia a colección creada:', clientesRef);
    
    // Asegurar que todos los campos estén correctamente inicializados antes de guardar
    const clienteParaGuardar = {
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
    
    console.log('📋 Cliente preparado para guardar:', clienteParaGuardar);
    
    return from(addDoc(clientesRef, clienteParaGuardar)).pipe(
      map(docRef => {
        console.log('✅ Cliente creado exitosamente con ID:', docRef.id);
        const clienteCreado = { id: docRef.id, ...clienteParaGuardar };
        console.log('📋 Cliente final:', clienteCreado);
        return clienteCreado;
      })
    );
  }

  updateCliente(cliente: Cliente): Observable<Cliente> {
    console.log('🔍 Intentando actualizar cliente:', cliente);
    if (!cliente.id) {
      console.error('❌ Error: ID de cliente requerido para actualizar');
      throw new Error('ID de cliente requerido para actualizar');
    }
    const clienteRef = doc(this.firestore, this.collectionName, cliente.id);
    console.log('📁 Referencia a documento creada:', clienteRef);
    const { id, ...clienteData } = cliente;
    console.log('📋 Datos a actualizar:', clienteData);
    
    return from(updateDoc(clienteRef, clienteData)).pipe(
      map(() => {
        console.log('✅ Cliente actualizado exitosamente');
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
    return this.getClientes().pipe(
      map(clientes => 
        clientes.filter(cliente => 
          cliente.activo && 
          cliente.programacion && 
          cliente.programacion.diasSemana.includes(dia)
        )
      )
    );
  }

  // Método de prueba para verificar la conexión con Firebase
  testFirebaseConnection(): Observable<boolean> {
    console.log('🧪 Probando conexión con Firebase...');
    console.log('📁 Configuración de Firebase:', environment.firebaseConfig);
    
    const clientesRef = collection(this.firestore, this.collectionName);
    console.log('📂 Referencia a colección creada:', clientesRef);
    
    return from(getDocs(clientesRef)).pipe(
      map(snapshot => {
        console.log('✅ Conexión con Firebase exitosa');
        console.log('📊 Documentos encontrados:', snapshot.size);
        console.log('📋 IDs de documentos:', snapshot.docs.map(doc => doc.id));
        return true;
      })
    );
  }
}