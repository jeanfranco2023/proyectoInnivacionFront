export type AiProvider = 'gemini' | 'ollama';

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
}

export interface StartChatRequest {
  user_id: string;
  message: string;
  provider: AiProvider;
  model: string;
  title?: string;
  language?: string;
}

export interface StartChatResponse {
  chat_id: string;
  title: string;
  provider: string;
  model: string;
  response: string;
}

export interface SendMessageRequest {
  message: string;
  provider: AiProvider;
  model: string;
  language?: string;
}

export interface SendMessageResponse {
  chat_id: string;
  provider: string;
  model: string;
  response: string;
}

