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
    username: 'demo',
    password: 'demo123',
  };

  isLoading = false;
  errorMessage = '';
  private returnUrl = '/chat';

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

  login() {
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
        this.errorMessage =
          error?.error?.error?.message || 'No se pudo iniciar sesión. Revisa tus credenciales.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }
}

