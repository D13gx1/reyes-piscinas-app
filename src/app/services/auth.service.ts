import { inject, Injectable } from "@angular/core";
import { Auth } from "@angular/fire/auth";
import { Router } from "@angular/router";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly auth = inject(Auth);
    private readonly router = inject(Router);

    private _loading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

    async googleLogin(): Promise<void> {
        try {
            this._loading.next(true)
            const provider = new GoogleAuthProvider();
            await signInWithPopup(this.auth, provider)
        } catch (error) {
            console.log(error);
            console.log('couldn\'t login')
            this.router.navigateByUrl('/login')
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