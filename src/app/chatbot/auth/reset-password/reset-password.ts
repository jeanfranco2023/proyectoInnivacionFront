import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthApiService } from '../../../service/auth/auth-api.service';
import { SessionService } from '../../../service/auth/session.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
})
export class ResetPasswordComponent implements OnInit {
  @ViewChild('codeInput') codeInput?: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput?: ElementRef<HTMLInputElement>;

  email: string = '';
  code: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  step: 1 | 2 = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showErrorModal = false;
  showPassword = false;
  
  fieldErrors: { code?: string; newPassword?: string; confirmPassword?: string } = {};

  constructor(
    private readonly authApiService: AuthApiService,
    private readonly sessionService: SessionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.sessionService.isAuthenticated()) {
      void this.router.navigateByUrl('/chat');
      return;
    }

    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    if (!this.email) {
      void this.router.navigateByUrl('/forgot-password');
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onCodeInput() {
    if (this.fieldErrors.code) this.fieldErrors.code = undefined;
    this.clearAlerts();
  }

  onPasswordInput() {
    if (this.fieldErrors.newPassword) this.fieldErrors.newPassword = undefined;
    if (this.fieldErrors.confirmPassword) this.fieldErrors.confirmPassword = undefined;
    this.clearAlerts();
  }

  private clearAlerts() {
    if (this.errorMessage && !this.showErrorModal) this.errorMessage = '';
    this.successMessage = '';
  }

  dismissError() {
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.codeInput?.nativeElement?.focus();
    }, 0);
  }

  private validateCode(): boolean {
    this.fieldErrors = {};

    if (!this.code.trim()) {
      this.fieldErrors.code = 'Ingresa el código de 6 dígitos.';
    } else if (this.code.trim().length !== 6) {
      this.fieldErrors.code = 'El código debe ser de 6 dígitos.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  private validatePasswords(): boolean {
    this.fieldErrors = {};

    if (!this.newPassword) {
      this.fieldErrors.newPassword = 'Ingresa una nueva contraseña.';
    } else if (this.newPassword.length < 6) {
      this.fieldErrors.newPassword = 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (this.newPassword !== this.confirmPassword) {
      this.fieldErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }

    return Object.keys(this.fieldErrors).length === 0;
  }

  verifyCode() {
    if (this.isLoading) return;
    if (!this.validateCode()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    this.authApiService
      .verifyResetCode(this.email, this.code.trim())
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.step = 2;
          this.cdr.detectChanges();
          setTimeout(() => {
            this.passwordInput?.nativeElement?.focus();
          }, 0);
        },
        error: (error) => {
          this.errorMessage = error?.error?.error?.message || 'Código inválido o expirado. Revisa tu correo.';
          this.showErrorModal = true;
        },
      });
  }

  submitPassword() {
    if (this.isLoading) return;
    if (!this.validatePasswords()) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    this.authApiService
      .resetPassword(this.email, this.code.trim(), this.newPassword)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = '¡Contraseña actualizada! Redirigiendo...';
          this.cdr.detectChanges();
          setTimeout(() => {
            void this.router.navigate(['/login']);
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = error?.error?.error?.message || 'No se pudo restablecer la contraseña. Revisa el código.';
          this.showErrorModal = true;
        },
      });
  }
}
