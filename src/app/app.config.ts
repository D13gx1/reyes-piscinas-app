import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth, browserLocalPersistence, indexedDBLocalPersistence, setPersistence } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    AuthService,
    
    // 🔥 Firebase App
    provideFirebaseApp(() => {
      console.log('🔥 Inicializando Firebase con configuración:', environment.firebaseConfig);
      return initializeApp(environment.firebaseConfig);
    }),
    
    // 🔐 Firebase Auth con PERSISTENCIA
    provideAuth(() => {
      const auth = getAuth();
      
      // ⭐ CONFIGURAR PERSISTENCIA LOCAL ⭐
      // Esto mantiene la sesión incluso después de cerrar el navegador
      setPersistence(auth, browserLocalPersistence)
        .then(() => {
          console.log('✅ Persistencia de Auth configurada: browserLocalPersistence');
        })
        .catch((error) => {
          console.error('❌ Error configurando persistencia:', error);
          // Fallback a indexedDB si browserLocal falla
          setPersistence(auth, indexedDBLocalPersistence)
            .then(() => {
              console.log('✅ Persistencia fallback: indexedDBLocalPersistence');
            })
            .catch((err) => {
              console.error('❌ Error en fallback de persistencia:', err);
            });
        });
      
      return auth;
    }),
    
    // 📁 Firestore
    provideFirestore(() => {
      console.log('📁 Inicializando Firestore');
      return getFirestore();
    }),
    
    // HTTP Client
    provideHttpClient(),
  ],
};