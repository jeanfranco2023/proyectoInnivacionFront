import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { enviroment } from '../../../environments/enviroment';
import { SessionService } from '../auth/session.service';
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

  constructor(
    private readonly http: HttpClient,
    private readonly sessionService: SessionService,
  ) {}

  private unwrapData<T>(payload: ApiEnvelope<T> | T | null | undefined): T {
    if (payload && typeof payload === 'object' && 'data' in payload) {
      return payload.data;
    }
    return payload as T;
  }

  private buildFetchHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/plain',
    };
    const token = this.sessionService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async streamTextResponse(
    url: string,
    payload: unknown,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildFetchHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(
        errorText || `El servidor respondió con HTTP ${response.status}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return this.consumeStreamBody(response, onChunk);
  }

  private async consumeStreamBody(
    response: Response,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    if (!response.body) {
      const text = await response.text();
      if (text) onChunk(text);
      return text;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        fullText += chunk;
        onChunk(chunk);
      }
    }

    const tail = decoder.decode();
    if (tail) {
      fullText += tail;
      onChunk(tail);
    }

    return fullText;
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

  streamSendMessage(
    chatId: string,
    payload: SendMessageRequest,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    return this.streamTextResponse(
      `${this.baseUrl}${this.endpoints.chatMessages(chatId)}/stream`,
      payload,
      onChunk,
    );
  }

  async streamStartChat(
    payload: StartChatRequest,
    onChunk: (chunk: string) => void,
  ): Promise<{ text: string; chatId: string | null }> {
    const response = await fetch(`${this.baseUrl}${this.endpoints.chatStart}/stream`, {
      method: 'POST',
      headers: this.buildFetchHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(
        errorText || `El servidor respondió con HTTP ${response.status}`,
      ) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    const chatId = response.headers.get('x-chat-id');
    const text = await this.consumeStreamBody(response, onChunk);
    return { text, chatId };
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

  generateSummary(payload: {
    chat_id: string | null;
    messages: Array<{ role: 'user' | 'bot'; content: string }>;

    career: string;
    provider: string;
    model: string;
    language?: string;
    max_bot_messages?: number;
    max_total_messages?: number;
  }): Observable<{
    chat_id: string | null;
    title: string;
    generated_at: string;
    introduction: string;
    topics: string[];
    analysis: string[];
    concepts: string[];
    conclusions: string[];
    recommendations: string[];
  }> {
    return this.http
      .post<any>(`${this.baseUrl}/chats/summary`, payload)
      .pipe(
        map((res) => {
          const data = this.unwrapData(res);
          return {
            chat_id: data.chat_id,
            title: data.title || 'Resumen sin título',
            generated_at: data.generated_at,
            introduction: data.introduction || '',
            topics: Array.isArray(data.topics) ? data.topics : [],
            analysis: Array.isArray(data.analysis) ? data.analysis : [],
            concepts: Array.isArray(data.concepts) ? data.concepts : [],
            conclusions: Array.isArray(data.conclusions) ? data.conclusions : [],
            recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
          };
        })
      );
  }
}

