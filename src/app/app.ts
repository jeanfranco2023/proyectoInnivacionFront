import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { SessionService } from './service/auth/session.service';
import { AuthApiService } from './service/auth/auth-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [RouterOutlet]
})
export class App implements OnInit, OnDestroy {
  private syncSubscription?: Subscription;

  constructor(
    private readonly sessionService: SessionService,
    private readonly authApiService: AuthApiService
  ) {}

  ngOnInit() {
    this.sessionService.session$.subscribe(session => {
      const user = session?.user;
      if (user) {
        const isDark = user.isDark || globalThis.localStorage?.getItem('chat-theme') === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
      } else {
        const isDark = globalThis.localStorage?.getItem('chat-theme') === 'dark';
        document.documentElement.classList.toggle('dark', isDark);
      }
    });

    // 1. Ejecutar sincronización al inicio
    this.syncProfile();

    // 2. Sincronizar periódicamente en segundo plano cada 15 segundos
    this.syncSubscription = interval(15000).subscribe(() => {
      this.syncProfile();
    });
  }

  ngOnDestroy() {
    this.syncSubscription?.unsubscribe();
  }

  private syncProfile() {
    if (this.sessionService.isAuthenticated()) {
      this.authApiService.getMe().subscribe({
        next: (user) => {
          if (user) {
            this.sessionService.updateUser(user);
          }
        },
        error: () => {
          // Si falla, el interceptor manejará el deslogueo de forma segura.
        }
      });
    }
  }
}
