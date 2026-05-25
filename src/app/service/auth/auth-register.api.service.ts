import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { enviroment } from '../../../environments/enviroment';
import { RegisterRequest, RegisterResponse } from '../../models/auth/auth-register.types';
import { ApiEnvelope } from '../../models/chat/chat-api.types';

@Injectable({ providedIn: 'root' })
export class AuthRegisterApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  register(payload: RegisterRequest): Observable<RegisterResponse> {
    return this.http
      .post<ApiEnvelope<RegisterResponse>>(`${this.baseUrl}${enviroment.endpoints.authRegister}`, payload)
      .pipe(map((res) => res.data));
  }

  verifyEmail(username: string, code: string): Observable<{ verified: boolean }> {
    return this.http
      .post<ApiEnvelope<{ verified: boolean }>>(`${this.baseUrl}/auth/verify-email`, { username, code })
      .pipe(map((res) => res.data));
  }

  resendCode(username: string): Observable<{ sent: boolean }> {
    return this.http
      .post<ApiEnvelope<{ sent: boolean }>>(`${this.baseUrl}/auth/resend-code`, { username })
      .pipe(map((res) => res.data));
  }
}

