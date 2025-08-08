import { ApplicationConfig } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(), // <-- Habilita HttpClient en modo standalone
    
    // 🔥 Firebase Providers
    provideFirebaseApp(() => {
      console.log('🔥 Inicializando Firebase con configuración:', environment.firebaseConfig);
      return initializeApp(environment.firebaseConfig);
    }),
    provideAuth(() => getAuth()),
    provideFirestore(() => {
      console.log('📁 Inicializando Firestore');
      return getFirestore();
    }),
  ],
};
