import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { enviroment } from '../../../environments/enviroment';
import {
  ApiEnvelope,
  SendMessageRequest,
  SendMessageResponse,
  StartChatRequest,
  StartChatResponse,
} from '../../models/chat/chat-api.types';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;
  private readonly endpoints = enviroment.endpoints;

  constructor(private readonly http: HttpClient) {}

  startChat(payload: StartChatRequest): Observable<StartChatResponse> {
    return this.http
      .post<ApiEnvelope<StartChatResponse>>(`${this.baseUrl}${this.endpoints.chatStart}`, payload)
      .pipe(map((res) => res.data));
  }

  sendMessage(chatId: string, payload: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http
      .post<ApiEnvelope<SendMessageResponse>>(`${this.baseUrl}${this.endpoints.chatMessages(chatId)}`, payload)
      .pipe(map((res) => res.data));
  }
}


