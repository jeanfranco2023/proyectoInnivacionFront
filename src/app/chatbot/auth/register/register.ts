import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthRegisterApiService } from '../../../service/auth/auth-register.api.service';
import { RegisterRequest } from '../../../models/auth/auth-register.types';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  form: RegisterRequest = {
    username: '',
    password: '',
    display_name: '',
    career: '',
  };

  isLoading = false;
  errorMessage = '';
  successMessage = '';

  readonly careerOptions = [
    'Ingenieria de Sistemas',
    'Ingenieria Industrial',
    'Ingenieria Civil',
    'Medicina',
    'Derecho',
    'Administracion',
  ];

  constructor(
    private readonly authRegisterApiService: AuthRegisterApiService,
    private readonly router: Router,
  ) {}

  register() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authRegisterApiService.register(this.form).subscribe({
      next: () => {
        this.successMessage = 'Cuenta creada correctamente. Ahora inicia sesión.';
        setTimeout(() => {
          void this.router.navigate(['/login']);
        }, 900);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.error?.message || 'No se pudo registrar la cuenta. Revisa los datos.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}

