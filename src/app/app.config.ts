import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { AuthService } from './services/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(), // <-- Habilita HttpClient en modo standalone
    AuthService, // Add AuthService to providers
    
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
