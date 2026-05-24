import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { enviroment } from '../../../environments/enviroment';
import { ApiEnvelope } from '../../models/chat/chat-api.types';

export interface SystemInfo {
  mongo_status: string;
  python_version: string;
  os_platform: string;
  db_name: string;
}

export interface ActivityItem {
  type: 'user_registered' | 'new_post' | 'new_comment';
  username: string;
  display_name: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_posts: number;
  total_comments: number;
  total_chats: number;
  recent_activity: ActivityItem[];
  system_info: SystemInfo;
}

export interface DashboardUser {
  username: string;
  display_name: string;
  career: string;
  roles: string[];
  profile_image_url: string | null;
  created_at: string | null;
  chats_count: number;
  posts_count: number;
  comments_count: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http
      .get<ApiEnvelope<DashboardStats>>(`${this.baseUrl}/admin/dashboard/stats`)
      .pipe(map((res) => res.data));
  }

  getUsers(): Observable<DashboardUser[]> {
    return this.http
      .get<ApiEnvelope<DashboardUser[]>>(`${this.baseUrl}/admin/dashboard/users`)
      .pipe(map((res) => res.data));
  }

  updateUserRole(username: string, roles: string[]): Observable<{ username: string; roles: string[] }> {
    return this.http
      .post<ApiEnvelope<{ username: string; roles: string[] }>>(
        `${this.baseUrl}/admin/dashboard/users/${username}/role`,
        { roles }
      )
      .pipe(map((res) => res.data));
  }

  deleteUser(username: string): Observable<{ deleted: boolean; username: string }> {
    return this.http
      .delete<ApiEnvelope<{ deleted: boolean; username: string }>>(
        `${this.baseUrl}/admin/dashboard/users/${username}`
      )
      .pipe(map((res) => res.data));
  }
}
