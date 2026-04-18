import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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
  form: LoginRequest = {
    username: '',
    password: '',
  };

  isLoading = false;
  errorMessage = '';
  private returnUrl = '/chat';
  autofillLock = true;
  showPassword = false;
  fieldErrors: { username?: string; password?: string } = {};

  constructor(
    private readonly authLoginApiService: AuthLoginApiService,
    private readonly sessionService: SessionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/chat';
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
    const username = this.form.username.trim();
    const password = this.form.password;

    if (!username) {
      this.fieldErrors.username = 'Ingresa tu usuario o correo.';
    } else if (this.isEmailLike(username) && !this.isValidEmail(username)) {
      this.fieldErrors.username = 'El correo no tiene un formato valido.';
    }

    if (!password) {
      this.fieldErrors.password = 'Ingresa tu contraseña.';
    } else if (password.length < 6) {
      this.fieldErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    return !this.fieldErrors.username && !this.fieldErrors.password;
  }

  onUsernameInput() {
    if (this.fieldErrors.username) this.fieldErrors.username = undefined;
    if (this.errorMessage) this.errorMessage = '';
  }

  onPasswordInput() {
    if (this.fieldErrors.password) this.fieldErrors.password = undefined;
    if (this.errorMessage) this.errorMessage = '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  login() {
    if (this.isLoading) return;
    if (!this.validateForm()) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authLoginApiService.login(this.form).subscribe({
      next: (session) => {
        this.sessionService.setSession({
          accessToken: session.access_token,
          user: session.user,
          expiresAt: Date.now() + session.expires_in * 1000,
        });
        void this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        const status = Number(error?.status ?? 0);
        this.errorMessage =
          status === 401 || status === 403
            ? 'Correo/usuario o contraseña incorrectos.'
            : error?.error?.error?.message || 'No se pudo iniciar sesión. Revisa tus credenciales.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  unlockAutofill() {
    if (!this.autofillLock) return;
    this.autofillLock = false;
  }
}

