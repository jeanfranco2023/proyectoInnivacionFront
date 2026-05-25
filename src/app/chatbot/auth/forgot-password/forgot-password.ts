import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthApiService } from '../../../service/auth/auth-api.service';
import { SessionService } from '../../../service/auth/session.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
})
export class ForgotPasswordComponent implements OnInit {
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  email: string = '';
  isLoading = false;
  errorMessage = '';
  showErrorModal = false;
  fieldError = '';

  constructor(
    private readonly authApiService: AuthApiService,
    private readonly sessionService: SessionService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.sessionService.isAuthenticated()) {
      void this.router.navigateByUrl('/chat');
    }
  }

  private isEmailLike(value: string): boolean {
    return value.includes('@');
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  onEmailInput() {
    this.fieldError = '';
    if (this.errorMessage && !this.showErrorModal) this.errorMessage = '';
  }

  dismissError() {
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.emailInput?.nativeElement?.focus();
    }, 0);
  }

  submit() {
    if (this.isLoading) return;
    
    const emailStr = this.email.trim();
    if (!emailStr) {
      this.fieldError = 'Ingresa tu correo o usuario.';
      return;
    }
    if (this.isEmailLike(emailStr) && !this.isValidEmail(emailStr)) {
      this.fieldError = 'El correo no tiene un formato valido.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.showErrorModal = false;
    this.cdr.detectChanges();

    this.authApiService
      .forgotPassword(emailStr)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: () => {
          // El correo se envió, redirigir a reset-password con el correo en la URL
          void this.router.navigate(['/reset-password'], { queryParams: { email: emailStr } });
        },
        error: (error) => {
          this.errorMessage = error?.error?.error?.message || 'No se pudo procesar la solicitud. Intenta más tarde.';
          this.showErrorModal = true;
        },
      });
  }
}
