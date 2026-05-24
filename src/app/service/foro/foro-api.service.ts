import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { enviroment } from '../../../environments/enviroment';
import { ApiEnvelope } from '../../models/chat/chat-api.types';

export interface Post {
  id: string;
  title: string;
  content: string;
  author_username: string;
  author_display_name: string;
  created_at: string;
  likes: string[];
  is_pinned: boolean;
  comments_count: number;
  likes_count: number;
  is_liked: boolean;
  faculty?: string;
  career?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  content: string;
  author_username: string;
  author_display_name: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ForoApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  getFaculties(): Observable<{ [key: string]: string[] }> {
    return this.http
      .get<ApiEnvelope<{ [key: string]: string[] }>>(`${this.baseUrl}/forum/faculties`)
      .pipe(map((res) => res.data));
  }

  getPosts(career?: string): Observable<Post[]> {
    let url = `${this.baseUrl}/forum/posts`;
    if (career) {
      url += `?career=${encodeURIComponent(career)}`;
    }
    return this.http
      .get<ApiEnvelope<Post[]>>(url)
      .pipe(map((res) => res.data));
  }

  createPost(title: string, content: string, faculty: string, career: string): Observable<Post> {
    return this.http
      .post<ApiEnvelope<Post>>(`${this.baseUrl}/forum/posts`, { title, content, faculty, career })
      .pipe(map((res) => res.data));
  }

  toggleLike(postId: string): Observable<Post> {
    return this.http
      .post<ApiEnvelope<Post>>(`${this.baseUrl}/forum/posts/${postId}/like`, {})
      .pipe(map((res) => res.data));
  }

  togglePin(postId: string): Observable<Post> {
    return this.http
      .post<ApiEnvelope<Post>>(`${this.baseUrl}/forum/posts/${postId}/pin`, {})
      .pipe(map((res) => res.data));
  }

  deletePost(postId: string): Observable<{ deleted: boolean }> {
    return this.http
      .delete<ApiEnvelope<{ deleted: boolean }>>(`${this.baseUrl}/forum/posts/${postId}`)
      .pipe(map((res) => res.data));
  }

  getComments(postId: string): Observable<Comment[]> {
    return this.http
      .get<ApiEnvelope<Comment[]>>(`${this.baseUrl}/forum/posts/${postId}/comments`)
      .pipe(map((res) => res.data));
  }

  createComment(postId: string, content: string): Observable<Comment> {
    return this.http
      .post<ApiEnvelope<Comment>>(`${this.baseUrl}/forum/posts/${postId}/comments`, { content })
      .pipe(map((res) => res.data));
  }

  deleteComment(commentId: string): Observable<{ deleted: boolean }> {
    return this.http
      .delete<ApiEnvelope<{ deleted: boolean }>>(`${this.baseUrl}/forum/comments/${commentId}`)
      .pipe(map((res) => res.data));
  }
}
