import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { enviroment } from '../../environments/enviroment';
import { SessionService } from '../service/auth/session.service';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);
  const loginPath = enviroment.endpoints.authLogin;

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const normalizedUrl = req.url.split('?')[0].replace(/\/$/, '');
        const normalizedLoginPath = loginPath.replace(/\/$/, '');
        const isLoginRequest = normalizedUrl.endsWith(normalizedLoginPath);
        const isAlreadyInLoginRoute = router.url.startsWith('/login');

        if (isLoginRequest || isAlreadyInLoginRoute) {
          // El 401 de login lo maneja LoginComponent para mostrar mensaje al usuario.
          return throwError(() => error);
        }

        sessionService.clearSession();
        void router
          .navigate(['/login'], { queryParams: { reason: 'session_expired' }, replaceUrl: true })
          .catch(() => {
            globalThis.location?.assign('/login?reason=session_expired');
          });
      }
      return throwError(() => error);
    }),
  );
};

