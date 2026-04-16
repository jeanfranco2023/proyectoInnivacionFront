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
}

