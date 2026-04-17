import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { enviroment } from '../../../environments/enviroment';
import { LoginRequest, LoginResponse } from '../../models/auth/auth.types';
import { ApiEnvelope } from '../../models/chat/chat-api.types';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;
  private readonly authThemeEndpoint =
    (enviroment.endpoints as Record<string, unknown>)['authTheme']?.toString() || '/auth/me/theme';
  private readonly authPreferencesEndpoint =
    (enviroment.endpoints as Record<string, unknown>)['authPreferences']?.toString() || '/auth/me/preferences';
  private readonly authProfileImageEndpoint =
    (enviroment.endpoints as Record<string, unknown>)['authProfileImage']?.toString() || '/auth/me/profile-image';

  constructor(private readonly http: HttpClient) {}

  login(payload: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<ApiEnvelope<LoginResponse>>(`${this.baseUrl}${enviroment.endpoints.authLogin}`, payload)
      .pipe(map((res) => res.data));
  }

  updateThemePreference(themePreference: 'light' | 'dark') {
    return this.http
      .patch<ApiEnvelope<LoginResponse['user']>>(`${this.baseUrl}${this.authThemeEndpoint}`, {
        theme_preference: themePreference,
      })
      .pipe(map((res) => res.data));
  }

  updateProfilePreferences(payload: { is_dark?: boolean; profile_image_url?: string | null }) {
    return this.http
      .patch<ApiEnvelope<LoginResponse['user']>>(`${this.baseUrl}${this.authPreferencesEndpoint}`, payload)
      .pipe(map((res) => res.data));
  }

  uploadProfileImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .put<ApiEnvelope<LoginResponse['user']>>(`${this.baseUrl}${this.authProfileImageEndpoint}`, formData)
      .pipe(map((res) => res.data));
  }

  deleteProfileImage() {
    return this.http
      .delete<ApiEnvelope<LoginResponse['user']>>(`${this.baseUrl}${this.authProfileImageEndpoint}`)
      .pipe(map((res) => res.data));
  }

  getProfileImageBlob(cacheBuster?: string): Observable<Blob> {
    const token = cacheBuster || `${Date.now()}`;
    return this.http.get(`${this.baseUrl}${this.authProfileImageEndpoint}?t=${encodeURIComponent(token)}`, {
      responseType: 'blob',
    });
  }
}
