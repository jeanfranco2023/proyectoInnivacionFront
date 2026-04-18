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

  private unwrapData<T>(payload: ApiEnvelope<T> | T | null | undefined): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }
    return payload as T;
  }

  listChats(userId: string): Observable<ChatSummaryResponse[]> {
    const url = `${this.baseUrl}${this.chatsEndpoint}`;

    return this.http
      .get<ApiEnvelope<ChatSummaryResponse[]> | ChatSummaryResponse[]>(url, {
        params: {
          user_id: userId,
          username: userId,
        },
      })
      .pipe(
        map((res) => {
          const data = this.unwrapData<ChatSummaryResponse[]>(res);
          return Array.isArray(data) ? data : [];
        })
      );
  }

  getChat(chatId: string): Observable<ChatDetailResponse> {
    return this.http
      .get<ApiEnvelope<ChatDetailResponse> | ChatDetailResponse>(`${this.baseUrl}${this.chatByIdEndpoint(chatId)}`)
      .pipe(map((res) => this.unwrapData<ChatDetailResponse>(res)));
  }

  updateChat(chatId: string, payload: UpdateChatRequest): Observable<ChatDetailResponse> {
    const requestBody: UpdateChatRequest = {
      chat_id: chatId,
      title: payload.title,
    };

    return this.http
      .patch<ApiEnvelope<ChatDetailResponse> | ChatDetailResponse>(`${this.baseUrl}${this.chatByIdEndpoint(chatId)}`, requestBody)
      .pipe(map((res) => this.unwrapData<ChatDetailResponse>(res)));
  }

  deleteChat(chatId: string): Observable<DeleteChatResponse> {
    return this.http
      .delete<ApiEnvelope<DeleteChatResponse> | DeleteChatResponse>(`${this.baseUrl}${this.chatByIdEndpoint(chatId)}`)
      .pipe(map((res) => this.unwrapData<DeleteChatResponse>(res)));
  }

  startChat(payload: StartChatRequest): Observable<StartChatResponse> {
    return this.http
      .post<ApiEnvelope<StartChatResponse> | StartChatResponse>(`${this.baseUrl}${this.endpoints.chatStart}`, payload)
      .pipe(map((res) => this.unwrapData<StartChatResponse>(res)));
  }

  sendMessage(chatId: string, payload: SendMessageRequest): Observable<SendMessageResponse> {
    return this.http
      .post<ApiEnvelope<SendMessageResponse> | SendMessageResponse>(`${this.baseUrl}${this.endpoints.chatMessages(chatId)}`, payload)
      .pipe(map((res) => this.unwrapData<SendMessageResponse>(res)));
  }

  sharePrompt(payload: SharePromptRequest): Observable<SharedPromptResponse> {
    return this.http
      .post<ApiEnvelope<SharedPromptResponse> | SharedPromptResponse>(`${this.baseUrl}${this.endpoints.promptsShare}`, payload)
      .pipe(map((res) => this.unwrapData<SharedPromptResponse>(res)));
  }

  claimSharedPrompt(shareToken: string): Observable<ClaimSharedPromptResponse> {
    return this.http
      .post<ApiEnvelope<ClaimSharedPromptResponse> | ClaimSharedPromptResponse>(
        `${this.baseUrl}/prompts/shared/${encodeURIComponent(shareToken)}/claim`,
        {},
      )
      .pipe(map((res) => this.unwrapData<ClaimSharedPromptResponse>(res)));
  }

  listSharedPrompts(): Observable<SharedPromptResponse[]> {
    return this.http
      .get<ApiEnvelope<SharedPromptResponse[]> | SharedPromptResponse[]>(`${this.baseUrl}${this.endpoints.promptsShared}`)
      .pipe(map((res) => {
        const data = this.unwrapData<SharedPromptResponse[]>(res);
        return Array.isArray(data) ? data : [];
      }));
  }
}


