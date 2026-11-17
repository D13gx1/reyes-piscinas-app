import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { switchMap, take } from 'rxjs/operators';
import { esCorreoDelEquipo } from '../config/equipo';

/**
 * Deja pasar solo a usuarios con sesión y cuyo correo esté en la colección `equipo`.
 * Usa la sesión del SDK web de Firebase (en web y en Android), que es la misma
 * con la que Firestore valida las reglas.
 */
export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap(async usuario => {
      if (usuario && usuario.emailVerified && await esCorreoDelEquipo(firestore, usuario.email)) {
        return true;
      }
      if (usuario) {
        // Sesión de una cuenta ajena al equipo: se cierra
        await auth.signOut();
      }
      return router.createUrlTree(['/login']);
    })
  );
};
