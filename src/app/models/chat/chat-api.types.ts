export type AiProvider = 'gemini' | 'ollama';

export interface ApiEnvelope<T> {
  ok: boolean;
  data: T;
}

export interface ChatHistoryMessage {
  role: 'user' | 'model';
  provider: string;
  model: string;
  content: string;
}

export interface ChatSummaryResponse {
  id: string;
  user_id: string;
  title: string;
  history: ChatHistoryMessage[];
}

export interface ChatDetailResponse {
  id: string;
  user_id: string;
  title: string;
  history: ChatHistoryMessage[];
}

export interface UpdateChatRequest {
  chat_id?: string;
  title: string;
}

export interface DeleteChatResponse {
  deleted: boolean;
  chat_id: string;
}

export interface StartChatRequest {
  user_id: string;
  message: string;
  provider: AiProvider;
  model: string;
  title?: string;
  language?: string;
  voice_mode?: boolean;
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
  voice_mode?: boolean;
}

export interface SendMessageResponse {
  chat_id: string;
  provider: string;
  model: string;
  response: string;
}

export interface SharePromptRequest {
  to_user?: string | null;
  prompt: string;
  source_chat_id?: string | null;
  source_chat_title?: string | null;
  source_history?: Array<{
    role: 'user' | 'bot';
    provider: string;
    model: string;
    content: string;
  }> | null;
}

export interface SharedPromptResponse {
  id: string | null;
  from_user: string;
  to_user: string;
  prompt: string;
  share_token: string;
  share_url: string;
  source_chat_id?: string | null;
  source_chat_title?: string | null;
  created_at: string;
  source_history_count?: number;
}

export interface ClaimSharedPromptResponse {
  share_token: string;
  chat_id: string;
  chat_title: string;
  prompt: string;
  already_claimed: boolean;
}

