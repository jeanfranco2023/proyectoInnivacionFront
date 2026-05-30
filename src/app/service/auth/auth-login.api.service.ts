import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { enviroment } from '../../../environments/enviroment';
import { LoginRequest, LoginResponse } from '../../models/auth/auth-login.types';
import { ApiEnvelope } from '../../models/chat/chat-api.types';

@Injectable({ providedIn: 'root' })
export class AuthLoginApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiEnvelope<LoginResponse>>(`${this.baseUrl}${enviroment.endpoints.authLogin}`, payload)
      .pipe(map((res) => res.data));
  }
}
