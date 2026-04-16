import { Routes } from '@angular/router';
import { ChatComponent } from './chatbot/chat/chat';
import { LoginComponent } from './chatbot/auth/login/login';
import { RegisterComponent } from './chatbot/auth/register/register';
import { authenticatedGuard } from './guard/authenticated.guard';
import { guestOnlyGuard } from './guard/guest-only.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  { path: 'login', component: LoginComponent, canActivate: [guestOnlyGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestOnlyGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [authenticatedGuard] },
  { path: '**', redirectTo: 'chat' }
];
