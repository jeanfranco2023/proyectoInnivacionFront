import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLoginApiService } from '../../../service/auth/auth-login.api.service';
import { LoginRequest } from '../../../models/auth/auth-login.types';
import { SessionService } from '../../../service/auth/session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
})
export class LoginComponent implements OnInit {
  @ViewChild('usernameInput') usernameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;

  form: LoginRequest = {
    username: '',
    password: '',
  };

  isLoading = false;
  isLoginTransitioning = false;
  errorMessage = '';
  showErrorModal = false;
  private returnUrl = '/chat';
  autofillLock = true;
  showPassword = false;
  fieldErrors: { username?: string; password?: string } = {};

  constructor(
    private readonly authLoginApiService: AuthLoginApiService,
    private readonly sessionService: SessionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/chat';
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'session_expired') {
      this.errorMessage = 'Tu sesión expiró. Inicia sesión nuevamente.';
      this.showErrorModal = true;
      this.cdr.detectChanges();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { reason: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }

    if (this.sessionService.isAuthenticated()) {
      void this.router.navigateByUrl(this.returnUrl);
    }
  }

  private isEmailLike(value: string): boolean {
    return value.includes('@');
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private validateForm(): boolean {
    this.fieldErrors = {};
    this.validateUsernameField();
    this.validatePasswordField();

    return !this.fieldErrors.username && !this.fieldErrors.password;
  }

  validateUsernameField() {
    const username = this.form.username.trim();
    if (!username) {
      this.fieldErrors.username = 'Ingresa tu usuario o correo.';
      return;
    }

    if (this.isEmailLike(username) && !this.isValidEmail(username)) {
      this.fieldErrors.username = 'El correo no tiene un formato valido.';
      return;
    }

    this.fieldErrors.username = undefined;
  }

  validatePasswordField() {
    const password = this.form.password;
    if (!password) {
      this.fieldErrors.password = 'Ingresa tu contraseña.';
      return;
    }

    if (password.length < 6) {
      this.fieldErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.fieldErrors.password = undefined;
  }

  onUsernameInput() {
    if (this.fieldErrors.username) this.fieldErrors.username = undefined;
    if (this.errorMessage && !this.showErrorModal) this.errorMessage = '';
  }

  onPasswordInput() {
    if (this.fieldErrors.password) this.fieldErrors.password = undefined;
    if (this.errorMessage && !this.showErrorModal) this.errorMessage = '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  private focusPasswordInput() {
    setTimeout(() => {
      this.passwordInput?.nativeElement?.focus();
    }, 0);
  }

  dismissError() {
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();
    this.focusPasswordInput();
  }

  login() {
    if (this.isLoading) return;
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    this.authLoginApiService
      .login(this.form)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
      next: (session) => {
        this.sessionService.setSession({
          accessToken: session.access_token,
          user: session.user,
          expiresAt: Date.now() + session.expires_in * 1000,
        });

        this.isLoginTransitioning = true;
        this.cdr.detectChanges();

        setTimeout(() => {
          void this.router.navigateByUrl(this.returnUrl);
        }, 900);
      },
      error: (error) => {
        const status = Number(error?.status ?? 0);
        const backendMessage = (error?.error?.error?.message || '').toString().toUpperCase();

        if (backendMessage === 'EMAIL_UNVERIFIED') {
          this.errorMessage = 'Tu correo no ha sido verificado. Redirigiendo a verificación...';
          const targetUsername = this.form.username;
          this.cdr.detectChanges();
          setTimeout(() => {
            void this.router.navigate(['/verify-email'], { queryParams: { username: targetUsername } });
          }, 1500);
          return;
        }

        const lowMessage = backendMessage.toLowerCase();
        if (status === 422) {
          if (lowMessage.includes('correo') || lowMessage.includes('usuario') || lowMessage.includes('email')) {
            this.fieldErrors.username = 'Verifica el usuario/correo ingresado.';
          }
          if (lowMessage.includes('contrase') || lowMessage.includes('password')) {
            this.fieldErrors.password = 'Verifica la contraseña ingresada.';
          }
        }

        this.errorMessage =
          status === 401 || status === 403
            ? 'Correo/usuario o contraseña incorrectos.'
            : error?.error?.error?.message || 'No se pudo iniciar sesión. Revisa tus credenciales.';
        this.showErrorModal = true;
        this.cdr.detectChanges();
      },
    });
  }

  unlockAutofill() {
    if (!this.autofillLock) return;
    this.autofillLock = false;
  }
}

