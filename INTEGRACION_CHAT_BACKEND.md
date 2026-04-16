# Integracion Chat Front-Back

## Base URL
- Archivo principal: `src/environments/enviroment.ts`
- Variable: `apiBaseUrl`
- Valor local: `http://127.0.0.1:8000`

## Endpoints usados por el front
- Generados desde `enviroment.endpoints`:
  - `chatStart` -> `POST /chats/start`
  - `chatMessages(chatId)` -> `POST /chats/{chat_id}/messages`
  - `speechToText` -> `POST /api/speech-to-text`
- `POST /chats/start`
  - Uso: crear chat y responder el primer mensaje.
  - Body:
    - `user_id: string`
    - `message: string`
    - `provider: "gemini" | "ollama"`
    - `model: string`
    - `title?: string`
- `POST /chats/{chat_id}/messages`
  - Uso: enviar mensajes a chat existente.
  - Body:
    - `message: string`
    - `provider: "gemini" | "ollama"`
    - `model: string`

## Servicios Angular
- Archivo: `src/app/service/chat-api.service.ts`
- Metodos:
  - `startChat(payload)` -> usa `apiBaseUrl + endpoints.chatStart`
  - `sendMessage(chatId, payload)` -> usa `apiBaseUrl + endpoints.chatMessages(chatId)`

## Componente conectado
- Archivo: `src/app/chatbot/chat/chat.ts`
- Flujo:
  1. Usuario elige proveedor (`gemini` o `ollama`) y modelo en UI.
  2. Primer mensaje: crea chat con `startChat`.
  3. Siguientes mensajes: usa `sendMessage` con `chat_id`.

## CORS backend
- Archivo: `proyectoInnovacion/main.py`
- Habilitado para:
  - `http://localhost:4200`
  - `http://127.0.0.1:4200`


