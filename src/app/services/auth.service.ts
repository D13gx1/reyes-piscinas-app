import { inject, Injectable } from "@angular/core";
import { 
  Auth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signInWithCredential,  
  getRedirectResult, 
  User, 
  user 
} from "@angular/fire/auth";
import { Router } from "@angular/router";
import { Platform } from "@ionic/angular";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { BehaviorSubject, Observable, map } from "rxjs";


@Injectable({
  providedIn: 'root'
})

export class AuthService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly platform = inject(Platform);

  private _loading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private _currentUser = new BehaviorSubject<User | null>(null);

  constructor() {
    // Suscribirse a cambios en la autenticación
    user(this.auth).subscribe(user => {
      this._currentUser.next(user);
    });
  }

  async googleLogin(): Promise<void | Error> {
    try {
      this._loading.next(true);

      console.log('🔍 Platform checks:', {
        isCapacitor: this.platform.is('capacitor'),
        isAndroid: this.platform.is('android'),
        isIOS: this.platform.is('ios'),
        platforms: this.platform.platforms()
      });

      // En dispositivos nativos (Android/iOS) usar autenticación nativa
      if (this.platform.is('capacitor')) {
        console.log('📱 Usando autenticación nativa con Capacitor Firebase');
        await this.nativeGoogleLogin();
      } else {
        // En web usar popup o redirect
        console.log('🌐 Usando autenticación web');
        const provider = new GoogleAuthProvider();
        
        if (this.isMobileDevice()) {
          await signInWithRedirect(this.auth, provider);
        } else {
          await signInWithPopup(this.auth, provider);
          this.router.navigateByUrl('/tabs/home');
        }
      }
    } catch (error: any) {
      console.error('❌ Error en autenticación Google:', error);
      
      // Mostrar mensaje de error más específico
      if (error.message?.includes('cancelado')) {
        console.log('Usuario canceló el inicio de sesión');
      }
      
      return error as Error;
    } finally {
      this._loading.next(false);
    }
  }

// Autenticación nativa para iOS/Android
private async nativeGoogleLogin(): Promise<void> {
  try {
    console.log('🚀 Iniciando autenticación nativa');

    if (!FirebaseAuthentication) {
      throw new Error('Plugin FirebaseAuthentication no disponible');
    }

    // Autenticar con el plugin
    const result = await FirebaseAuthentication.signInWithGoogle();

    console.log('✅ Resultado del plugin:', {
      email: result.user?.email,
      displayName: result.user?.displayName,
      uid: result.user?.uid
    });

    // ⭐ OBTENER EL ID TOKEN Y SINCRONIZAR CON FIREBASE AUTH ⭐
    console.log('🔑 Obteniendo ID token...');
    const tokenResult = await FirebaseAuthentication.getIdToken();
    
    if (!tokenResult || !tokenResult.token) {
      throw new Error('No se pudo obtener el ID token');
    }

    console.log('✅ ID token obtenido');

    // Crear credencial de Google y autenticar en Firebase Auth
    const credential = GoogleAuthProvider.credential(tokenResult.token);
    
    console.log('🔐 Autenticando en Firebase Auth...');
    await signInWithCredential(this.auth, credential);

    console.log('✅ Usuario autenticado en Firebase Auth');

    // Esperar un momento para asegurar la sincronización
    await new Promise(resolve => setTimeout(resolve, 300));

    // Verificar que el usuario esté disponible
    const currentUser = this.auth.currentUser;
    console.log('👤 Usuario actual:', {
      email: currentUser?.email,
      uid: currentUser?.uid
    });

    if (!currentUser) {
      throw new Error('Usuario no disponible después de autenticar');
    }

    // Navegar al home
    console.log('🚀 Navegando a /tabs/home');
    await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
    
  } catch (error: any) {
    console.error('❌ Error en autenticación nativa:', error);

    if (error.code === '12501' || error.message?.includes('12501')) {
      throw new Error('Inicio de sesión cancelado por el usuario');
    }
    
    if (error.code === '10' || error.message?.includes('Developer Error')) {
      console.error('⚠️ ERROR 10: Verifica que el SHA-1 esté configurado en Firebase Console');
      throw new Error('Error de configuración. Contacta al desarrollador.');
    }

    throw error;
  }
}

  // Método para manejar el resultado de la redirección (solo web)
  async handleRedirectResult(): Promise<void> {
    try {
      // Solo para web
      if (this.platform.is('capacitor')) {
        return;
      }

      console.log('🌐 Verificando resultado de redirect web');
      const result = await getRedirectResult(this.auth);
      
      if (result) {
        console.log('✅ Autenticación exitosa desde redirect');
        await this.router.navigateByUrl('/tabs/home');
      }
    } catch (error) {
      console.error('❌ Error en redirect result:', error);
    }
  }

  // Detectar si estamos en un dispositivo móvil (solo para web)
  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    return mobileKeywords.some(keyword => userAgent.includes(keyword));
  }

  async logout(): Promise<void> {
    try {
      this._loading.next(true);
      
      // Cerrar sesión
      if (this.platform.is('capacitor')) {   
        await FirebaseAuthentication.signOut();
      }
      
      await this.auth.signOut();
      this._currentUser.next(null);
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
    } finally {
      this._loading.next(false);
    }
  }

  // Obtener el usuario actual
  getCurrentUser(): Observable<User | null> {
    return this._currentUser.asObservable();
  }

  // Obtener el nombre del usuario
  getUserName(): Observable<string> {
    return this._currentUser.pipe(
      map(user => user?.displayName || user?.email?.split('@')[0] || 'Usuario')
    );
  }

  // Obtener el estado de carga
  getLoadingState(): Observable<boolean> {
    return this._loading.asObservable();
  }
}