import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Platform } from '@ionic/angular';
import { map, take } from 'rxjs/operators';
import { from } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const platform = inject(Platform);

  // Si estamos en web, usar el observable de Firebase Auth
  if (!platform.is('capacitor')) {
    return user(auth).pipe(
      take(1),
      map(user => {
        if (user) {
          console.log('✅ Usuario web autenticado');
          return true;
        } else {
          console.log('❌ No hay usuario web, redirigiendo');
          router.navigateByUrl('/login');
          return false;
        }
      })
    );
  }

  // Si estamos en móvil, verificar con el plugin
  return from(
    FirebaseAuthentication.getCurrentUser().then(result => {
      if (result && result.user) {
        console.log('✅ Usuario móvil autenticado');
        return true;
      } else {
        console.log('❌ No hay usuario móvil, redirigiendo');
        router.navigateByUrl('/login');
        return false;
      }
    }).catch(error => {
      console.error('❌ Error verificando usuario:', error);
      router.navigateByUrl('/login');
      return false;
    })
  );

};