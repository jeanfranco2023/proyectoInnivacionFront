import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { SessionService } from '../service/auth/session.service';

export const adminGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (!sessionService.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  const user = sessionService.getUser();
  if (user && user.roles && user.roles.includes('admin')) {
    return true;
  }

  return router.createUrlTree(['/chat']);
};
