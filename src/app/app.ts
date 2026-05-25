import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionService } from './service/auth/session.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [RouterOutlet]
})
export class App implements OnInit {
  constructor(private readonly sessionService: SessionService) {}

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
  }
}
