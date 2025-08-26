import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateChildFn, Router } from '@angular/router';

export const authGuard: CanActivateChildFn = async (childRoute, state) => {
  const router = inject(Router)
  const auth = inject(Auth)

  await auth.authStateReady();

  if (!auth.currentUser) {
    console.log('not logged in')
    router.navigateByUrl('/login')
    return false
  }

  return true
};
