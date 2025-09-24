import { inject, Injectable } from "@angular/core";
import { Auth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, User, user } from "@angular/fire/auth";
import { Router } from "@angular/router";
import { BehaviorSubject, Observable, map } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

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
      this._loading.next(true)
      const provider = new GoogleAuthProvider();

      // Detectar si estamos en un dispositivo móvil
      const isMobile = this.isMobileDevice();

      if (isMobile) {
        // Usar redirect para móviles (mejor compatibilidad)
        console.log('📱 Usando autenticación con redirect (móvil)');
        await signInWithRedirect(this.auth, provider);
        // La navegación se hará en el método handleRedirectResult
      } else {
        // Usar popup para desktop (más rápido)
        console.log('💻 Usando autenticación con popup (PC)');
        await signInWithPopup(this.auth, provider);
        this.router.navigateByUrl('/tabs/home');
      }
    } catch (error) {
      console.error('❌ Error en autenticación Google:', error);
      return error as Error;
    } finally {
      this._loading.next(false);
    }
  }

  // Método para manejar el resultado de la redirección (para móviles)
  async handleRedirectResult(): Promise<void> {
    try {
      const result = await getRedirectResult(this.auth);
      if (result) {
        console.log('✅ Autenticación exitosa desde redirect');
        this.router.navigateByUrl('/tabs/home');
      }
    } catch (error) {
      console.error('❌ Error en redirect result:', error);
    }
  }

  // Detectar si estamos en un dispositivo móvil
  private isMobileDevice(): boolean {
    // Verificar user agent
    const userAgent = navigator.userAgent.toLowerCase();

    // Verificar si es un dispositivo móvil
    const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    const isMobileByUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

    // Verificar tamaño de pantalla (tablets grandes pueden ser consideradas desktop)
    const isSmallScreen = window.innerWidth < 768;

    // Verificar si soporta touch
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // Considerar móvil si cumple al menos 2 de las 3 condiciones
    const mobileIndicators = [isMobileByUA, isSmallScreen, hasTouch].filter(Boolean).length;

    const isMobile = mobileIndicators >= 2;

    console.log('📱 Detección de dispositivo:', {
      userAgent: isMobileByUA,
      screenSize: isSmallScreen,
      touchSupport: hasTouch,
      isMobile: isMobile
    });

    return isMobile;
  }

  async logout(): Promise<void> {
    this._loading.next(true);
    await this.auth.signOut();
    this._currentUser.next(null);
    this._loading.next(false);
    this.router.navigateByUrl('/login');
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
