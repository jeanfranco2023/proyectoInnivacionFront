import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { enviroment } from '../../../environments/enviroment';
import {
  ApiEnvelope,
  ClaimSharedPromptResponse,
  ChatDetailResponse,
  ChatSummaryResponse,
  DeleteChatResponse,
  SharePromptRequest,
  SharedPromptResponse,
  SendMessageRequest,
  SendMessageResponse,
  StartChatRequest,
  StartChatResponse,
  UpdateChatRequest,
} from '../../models/chat/chat-api.types';

@Injectable({ providedIn: 'root' })
export class ChatApiService {
  private readonly baseUrl = enviroment.apiBaseUrl;
  private readonly endpoints = enviroment.endpoints;
  private readonly chatsEndpoint =
    (enviroment.endpoints as Record<string, unknown>)['chats']?.toString() || '/chats';
  private readonly chatByIdEndpoint =
    ((enviroment.endpoints as Record<string, unknown>)['chatById'] as
      | ((chatId: string) => string)
      | undefined) || ((chatId: string) => `/chats/${chatId}`);

  constructor(private readonly http: HttpClient) {}

  listChats(userId: string): Observable<ChatSummaryResponse[]> {
    const url = `${this.baseUrl}${this.chatsEndpoint}`;
    console.log('🔗 HTTP GET:', url);
    console.log('📊 Params:', { user_id: userId });

    return this.http
      .get<ApiEnvelope<ChatSummaryResponse[]>>(url, {
        params: { user_id: userId },
      })
      .pipe(
        map((res) => {
          console.log('📨 Respuesta HTTP recibida:', res);
          return res.data || [];
        })
      );
  }

  getChat(chatId: string): Observable<ChatDetailResponse> {
    return this.http
      .get<ApiEnvelope<ChatDetailResponse>>(`${this.baseUrl}${this.chatByIdEndpoint(chatId)}`)
      .pipe(map((res) => res.data));
  }

  updateChat(chatId: string, payload: UpdateChatRequest): Observable<ChatDetailResponse> {
    const requestBody: UpdateChatRequest = {
      chat_id: chatId,
      title: payload.title,
    };

    return this.http
      .patch<ApiEnvelope<ChatDetailResponse>>(`${this.baseUrl}${this.chatByIdEndpoint(chatId)}`, requestBody)
      .pipe(map((res) => res.data));
  }

  deleteChat(chatId: string): Observable<DeleteChatResponse> {
    return this.http
      .delete<ApiEnvelope<DeleteChatResponse>>(`${this.baseUrl}${this.chatByIdEndpoint(chatId)}`)
      .pipe(map((res) => res.data));
  }

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

  sharePrompt(payload: SharePromptRequest): Observable<SharedPromptResponse> {
    return this.http
      .post<ApiEnvelope<SharedPromptResponse>>(`${this.baseUrl}${this.endpoints.promptsShare}`, payload)
      .pipe(map((res) => res.data));
  }

  claimSharedPrompt(shareToken: string): Observable<ClaimSharedPromptResponse> {
    return this.http
      .post<ApiEnvelope<ClaimSharedPromptResponse>>(
        `${this.baseUrl}/prompts/shared/${encodeURIComponent(shareToken)}/claim`,
        {},
      )
      .pipe(map((res) => res.data));
  }

  listSharedPrompts(): Observable<SharedPromptResponse[]> {
    return this.http
      .get<ApiEnvelope<SharedPromptResponse[]>>(`${this.baseUrl}${this.endpoints.promptsShared}`)
      .pipe(map((res) => res.data || []));
  }
}


