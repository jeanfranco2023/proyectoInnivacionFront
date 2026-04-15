import { Component } from '@angular/core';
import { ChatComponent } from './chatbot/chat/chat';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  standalone: true,
  imports: [ChatComponent]
})
export class App {}