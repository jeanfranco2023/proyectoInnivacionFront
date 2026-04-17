import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SessionService } from '../../service/auth/session.service';
import { ChatApiService } from '../../service/chat/chat-api.service';

@Component({
  selector: 'app-shared-link',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shared-link.html',
})
export class SharedLinkComponent implements OnInit {
  isLoading = true;
  statusMessage = 'Validando enlace compartido...';
  isError = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly sessionService: SessionService,
    private readonly chatApiService: ChatApiService,
  ) {}

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token') || '';
    if (!token) {
      this.fail('Enlace inválido.');
      return;
    }

    if (!this.sessionService.isAuthenticated()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/shared/${encodeURIComponent(token)}` },
      });
      return;
    }

    this.chatApiService.claimSharedPrompt(token).subscribe({
      next: (result) => {
        this.statusMessage = result.already_claimed
          ? 'Este enlace ya estaba importado. Abriendo tu chat.'
          : 'Prompt importado correctamente en tu cuenta.';
        this.isLoading = false;
        setTimeout(() => {
          void this.router.navigate(['/chat'], {
            queryParams: { chatId: result.chat_id },
          });
        }, 700);
      },
      error: (error) => {
        this.fail(error?.error?.error?.message || 'No se pudo importar el prompt compartido.');
      },
    });
  }

  private fail(message: string) {
    this.statusMessage = message;
    this.isError = true;
    this.isLoading = false;
  }
}


