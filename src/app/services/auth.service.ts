import { inject, Injectable } from "@angular/core";
import { Auth, GoogleAuthProvider, signInWithPopup, User, user } from "@angular/fire/auth";
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
      // will use popup for now, but redirect login will be needed for mobile
      await signInWithPopup(this.auth, provider)
      this.router.navigateByUrl('/tabs/home')
    } catch (error) {
      return error as Error
    } finally {
      this._loading.next(false)
    }
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
}
