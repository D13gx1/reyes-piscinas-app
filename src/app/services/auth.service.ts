import { inject, Injectable, isDevMode } from "@angular/core";
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
import { Firestore } from "@angular/fire/firestore";
import { esCorreoDelEquipo, limpiarAccesoEquipo, MENSAJE_SIN_ACCESO } from "../config/equipo";

/** Logs solo en desarrollo: en producción no se imprimen datos del usuario */
const log = (...args: unknown[]) => { if (isDevMode()) console.log(...args); };

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
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

      if (this.platform.is('capacitor')) {
        // Android/iOS: autenticación nativa
        await this.nativeGoogleLogin();
      } else {
        const provider = new GoogleAuthProvider();

        if (this.isMobileDevice()) {
          // Navegador móvil: redirección; el resultado se procesa en handleRedirectResult()
          await signInWithRedirect(this.auth, provider);
        } else {
          const credencial = await signInWithPopup(this.auth, provider);
          await this.verificarAccesoYEntrar(credencial.user);
        }
      }
    } catch (error: any) {
      console.error('Error en autenticación Google:', error?.code ?? error?.message);
      return error as Error;
    } finally {
      this._loading.next(false);
    }
  }

  // Autenticación nativa para iOS/Android
  private async nativeGoogleLogin(): Promise<void> {
    try {
      // 1. Iniciar sesión con el plugin nativo
      const result = await FirebaseAuthentication.signInWithGoogle();

      if (!result?.credential?.idToken) {
        throw new Error('No se obtuvo el idToken del usuario');
      }

      // 2. Iniciar sesión en el SDK web con esa credencial (es la que usa Firestore)
      const credential = GoogleAuthProvider.credential(result.credential.idToken);
      const userCredential = await signInWithCredential(this.auth, credential);

      // 3. Comprobar que el correo sea del equipo y entrar
      await this.verificarAccesoYEntrar(userCredential.user);

    } catch (error: any) {
      if (error.code === '12501' || error.message?.includes('12501')) {
        throw new Error('Inicio de sesión cancelado por el usuario');
      }

      if (error.code === '10' || error.message?.includes('Developer Error')) {
        console.error('ERROR 10: Verifica el SHA-1/256 en Firebase Console');
        throw new Error('Error de configuración. Contacta al desarrollador.');
      }

      throw error;
    }
  }

  /**
   * Si el correo está en la colección `equipo` de Firestore, entra a la app.
   * Si no, cierra la sesión y lanza un error con el mensaje para el usuario.
   */
  private async verificarAccesoYEntrar(usuario: User): Promise<void> {
    if (!usuario.emailVerified || !(await esCorreoDelEquipo(this.firestore, usuario.email))) {
      await this.cerrarSesionSinNavegar();
      throw new Error(MENSAJE_SIN_ACCESO);
    }

    log('Usuario autenticado');
    this._currentUser.next(usuario);
    await this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
  }

  /** Procesa el resultado del login por redirección (solo web en móvil). Devuelve el error si lo hubo. */
  async handleRedirectResult(): Promise<void | Error> {
    if (this.platform.is('capacitor')) {
      return;
    }

    try {
      const result = await getRedirectResult(this.auth);
      if (result) {
        await this.verificarAccesoYEntrar(result.user);
      }
    } catch (error: any) {
      console.error('Error en redirect result:', error?.code ?? error?.message);
      return error as Error;
    }
  }

  // Detectar si estamos en un dispositivo móvil (solo para web)
  private isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    return mobileKeywords.some(keyword => userAgent.includes(keyword));
  }

  private async cerrarSesionSinNavegar(): Promise<void> {
    if (this.platform.is('capacitor')) {
      await FirebaseAuthentication.signOut().catch(() => undefined);
    }
    await this.auth.signOut();
    limpiarAccesoEquipo();
    this._currentUser.next(null);
  }

  async logout(): Promise<void> {
    try {
      this._loading.next(true);
      await this.cerrarSesionSinNavegar();
      await this.router.navigateByUrl('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
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
