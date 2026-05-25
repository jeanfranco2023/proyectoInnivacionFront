import { Routes } from '@angular/router';
import { ChatComponent } from './chatbot/chat/chat';
import { LoginComponent } from './chatbot/auth/login/login';
import { RegisterComponent } from './chatbot/auth/register/register';
import { VerifyEmailComponent } from './chatbot/auth/verify-email/verify-email';
import { ForgotPasswordComponent } from './chatbot/auth/forgot-password/forgot-password';
import { ResetPasswordComponent } from './chatbot/auth/reset-password/reset-password';
import { ProfileComponent } from './chatbot/profile/profile';
import { SharedLinkComponent } from './chatbot/shared-link/shared-link';
import { ForoComponent } from './chatbot/foro/foro';
import { DashboardComponent } from './chatbot/dashboard/dashboard';
import { authenticatedGuard } from './guard/authenticated.guard';
import { guestOnlyGuard } from './guard/guest-only.guard';
import { adminGuard } from './guard/admin.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'chat' },
  { path: 'login', component: LoginComponent, canActivate: [guestOnlyGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestOnlyGuard] },
  { path: 'verify-email', component: VerifyEmailComponent, canActivate: [guestOnlyGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestOnlyGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestOnlyGuard] },
  { path: 'shared/:token', component: SharedLinkComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authenticatedGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authenticatedGuard] },
  { path: 'foro', component: ForoComponent, canActivate: [authenticatedGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authenticatedGuard, adminGuard] },
  { path: '**', redirectTo: 'chat' }
];
