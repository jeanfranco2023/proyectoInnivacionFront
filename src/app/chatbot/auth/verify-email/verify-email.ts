import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { take } from 'rxjs/operators';

import { AuthRegisterApiService } from '../../../service/auth/auth-register.api.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './verify-email.html',
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  username = '';
  code = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  resendCooldown = 0;
  private timerSubscription?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authRegisterApiService: AuthRegisterApiService,
  ) {}

  ngOnInit() {
    this.username = this.route.snapshot.queryParamMap.get('username') || '';
    if (!this.username) {
      this.errorMessage = 'No se proporcionó un usuario para verificar.';
    }
  }

  ngOnDestroy() {
    this.timerSubscription?.unsubscribe();
  }

  verify() {
    if (!this.username) {
      this.errorMessage = 'Falta el nombre de usuario.';
      return;
    }
    const cleanCode = this.code.trim();
    if (!cleanCode) {
      this.errorMessage = 'Ingresa el código de 6 dígitos.';
      return;
    }
    if (cleanCode.length !== 6 || isNaN(Number(cleanCode))) {
      this.errorMessage = 'El código debe tener exactamente 6 dígitos numéricos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authRegisterApiService.verifyEmail(this.username, cleanCode).subscribe({
      next: () => {
        this.successMessage = '¡Correo verificado con éxito! Redirigiendo a iniciar sesión...';
        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 1800);
      },
      error: (err) => {
        this.errorMessage = err?.error?.error?.message || 'El código ingresado es incorrecto o ya expiró.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  resendCode() {
    if (this.resendCooldown > 0 || this.isLoading) return;

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authRegisterApiService.resendCode(this.username).subscribe({
      next: () => {
        this.successMessage = 'Se ha enviado un nuevo código a tu correo electrónico registrado.';
        this.startCooldown();
      },
      error: (err) => {
        this.errorMessage = err?.error?.error?.message || 'No se pudo reenviar el código. Inténtalo más tarde.';
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private startCooldown() {
    this.resendCooldown = 60;
    this.timerSubscription?.unsubscribe();
    this.timerSubscription = interval(1000)
      .pipe(take(60))
      .subscribe({
        next: () => {
          this.resendCooldown--;
        },
        complete: () => {
          this.resendCooldown = 0;
        },
      });
  }
}
