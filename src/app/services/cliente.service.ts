import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
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
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Cliente))
      )
    );
  }

  getClienteById(id: string): Observable<Cliente> {
    const clienteRef = doc(this.firestore, this.collectionName, id);
    return from(getDoc(clienteRef)).pipe(
      map(doc => {
        if (doc.exists()) {
          return { id: doc.id, ...doc.data() } as Cliente;
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
    
    return from(addDoc(clientesRef, cliente)).pipe(
      map(docRef => {
        console.log('✅ Cliente creado exitosamente con ID:', docRef.id);
        const clienteCreado = { id: docRef.id, ...cliente };
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