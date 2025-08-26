import { inject, Injectable } from "@angular/core";
import { Auth, GoogleAuthProvider, signInWithPopup } from "@angular/fire/auth";
import { Router } from "@angular/router";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  private _loading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

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
    this._loading.next(false);
    this.router.navigateByUrl('/login')
  }
}
