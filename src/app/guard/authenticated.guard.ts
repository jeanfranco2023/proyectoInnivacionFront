import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { SessionService } from '../service/auth/session.service';

export const authenticatedGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  return sessionService.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

