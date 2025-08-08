import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Firestore, collection, getDocs, addDoc } from '@angular/fire/firestore';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseTestService {
  constructor(private firestore: Firestore) {}

  testConnection(): Observable<{ success: boolean; message: string; details?: any }> {
    console.log('🧪 Iniciando prueba de conexión con Firebase...');
    console.log('📁 Configuración:', environment.firebaseConfig);
    
    const testCollection = collection(this.firestore, 'test');
    
    return from(getDocs(testCollection)).pipe(
      map(snapshot => {
        console.log('✅ Conexión exitosa');
        return {
          success: true,
          message: 'Conexión con Firebase establecida correctamente',
          details: {
            documentsCount: snapshot.size,
            projectId: environment.firebaseConfig.projectId
          }
        };
      }),
      catchError(error => {
        console.error('❌ Error de conexión:', error);
        return from(Promise.resolve({
          success: false,
          message: `Error de conexión: ${error.message}`,
          details: {
            error: error,
            config: environment.firebaseConfig
          }
        }));
      })
    );
  }

  testClientesCollection(): Observable<{ success: boolean; message: string; details?: any }> {
    console.log('🧪 Probando colección de clientes...');
    
    const clientesRef = collection(this.firestore, 'clientes');
    
    return from(getDocs(clientesRef)).pipe(
      map(snapshot => {
        console.log('✅ Colección clientes accesible');
        return {
          success: true,
          message: 'Colección de clientes accesible',
          details: {
            documentsCount: snapshot.size,
            documentIds: snapshot.docs.map(doc => doc.id)
          }
        };
      }),
      catchError(error => {
        console.error('❌ Error accediendo a clientes:', error);
        return from(Promise.resolve({
          success: false,
          message: `Error accediendo a clientes: ${error.message}`,
          details: { error }
        }));
      })
    );
  }

  createTestDocument(): Observable<{ success: boolean; message: string; details?: any }> {
    console.log('🧪 Creando documento de prueba...');
    
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Documento de prueba creado automáticamente'
    };
    
    const testRef = collection(this.firestore, 'test');
    
    return from(addDoc(testRef, testData)).pipe(
      map(docRef => {
        console.log('✅ Documento de prueba creado con ID:', docRef.id);
        return {
          success: true,
          message: 'Documento de prueba creado exitosamente',
          details: {
            documentId: docRef.id,
            data: testData
          }
        };
      }),
      catchError(error => {
        console.error('❌ Error creando documento de prueba:', error);
        return from(Promise.resolve({
          success: false,
          message: `Error creando documento de prueba: ${error.message}`,
          details: { error }
        }));
      })
    );
  }

  testClientesWrite(): Observable<{ success: boolean; message: string; details?: any }> {
    console.log('🧪 Probando escritura en colección clientes...');
    
    const testCliente = {
      nombre: 'Cliente de Prueba',
      direccion: 'Dirección de Prueba',
      telefono: '+56 9 1234 5678',
      email: 'test@test.com',
      medidas: {
        largo: 10,
        ancho: 5,
        profundidad: 2
      },
      precio: 50000,
      programacion: {
        frecuencia: 'semanal',
        cantidadPorPeriodo: 1,
        diasSemana: ['lunes'],
        horaPreferida: '09:00',
        notas: 'Cliente de prueba para verificar permisos'
      },
      historial: [],
      activo: true,
      test: true,
      timestamp: new Date().toISOString()
    };
    
    const clientesRef = collection(this.firestore, 'clientes');
    
    return from(addDoc(clientesRef, testCliente)).pipe(
      map(docRef => {
        console.log('✅ Cliente de prueba creado con ID:', docRef.id);
        return {
          success: true,
          message: 'Cliente de prueba creado exitosamente',
          details: {
            documentId: docRef.id,
            data: testCliente
          }
        };
      }),
      catchError(error => {
        console.error('❌ Error creando cliente de prueba:', error);
        console.error('❌ Código de error:', error.code);
        console.error('❌ Mensaje de error:', error.message);
        return from(Promise.resolve({
          success: false,
          message: `Error creando cliente de prueba: ${error.message}`,
          details: { 
            error,
            code: error.code,
            message: error.message
          }
        }));
      })
    );
  }

  diagnosePermissions(): Observable<{ success: boolean; message: string; details?: any }> {
    console.log('🔍 Diagnóstico completo de permisos...');
    
    return new Observable(observer => {
      // Paso 1: Verificar configuración
      console.log('📁 Configuración de Firebase:', environment.firebaseConfig);
      
      // Paso 2: Probar lectura
      const clientesRef = collection(this.firestore, 'clientes');
      from(getDocs(clientesRef)).subscribe({
        next: (snapshot) => {
          console.log('✅ Lectura exitosa, documentos encontrados:', snapshot.size);
          
          // Paso 3: Probar escritura
          const testData = { test: true, timestamp: new Date().toISOString() };
          from(addDoc(clientesRef, testData)).subscribe({
            next: (docRef) => {
              console.log('✅ Escritura exitosa, documento creado:', docRef.id);
              observer.next({
                success: true,
                message: 'Permisos verificados correctamente',
                details: {
                  readSuccess: true,
                  writeSuccess: true,
                  documentId: docRef.id
                }
              });
              observer.complete();
            },
            error: (writeError) => {
              console.error('❌ Error de escritura:', writeError);
              observer.next({
                success: false,
                message: `Error de escritura: ${writeError.message}`,
                details: {
                  readSuccess: true,
                  writeSuccess: false,
                  writeError: writeError
                }
              });
              observer.complete();
            }
          });
        },
        error: (readError) => {
          console.error('❌ Error de lectura:', readError);
          observer.next({
            success: false,
            message: `Error de lectura: ${readError.message}`,
            details: {
              readSuccess: false,
              writeSuccess: false,
              readError: readError
            }
          });
          observer.complete();
        }
      });
    });
  }
} 