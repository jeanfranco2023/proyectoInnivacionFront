import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthSession, AuthUser } from '../../models/auth/auth-user.types';

const STORAGE_KEY = 'mentorcore-session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.readSession());
  readonly session$ = this.sessionSubject.asObservable();

  get session(): AuthSession | null {
    return this.sessionSubject.value;
  }

  getToken(): string | null {
    const session = this.getValidSession();
    return session?.accessToken ?? null;
  }

  getUser(): AuthUser | null {
    return this.getValidSession()?.user ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.getValidSession();
  }

  setSession(session: AuthSession) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  clearSession() {
    sessionStorage.removeItem(STORAGE_KEY);
    this.sessionSubject.next(null);
  }

  private getValidSession(): AuthSession | null {
    const current = this.sessionSubject.value ?? this.readSession();
    if (!current) return null;
    if (current.expiresAt <= Date.now()) {
      this.clearSession();
      return null;
    }
    return current;
  }

  private readSession(): AuthSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      if (!parsed?.accessToken || !parsed?.user || !parsed?.expiresAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }
}

