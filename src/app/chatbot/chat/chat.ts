import { Component, ChangeDetectorRef, HostListener, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { marked } from 'marked';

import { ChatApiService } from '../../service/chat/chat-api.service';
import { SessionService } from '../../service/auth/session.service';
import { AiProvider } from '../../models/chat/chat-api.types';
import { enviroment } from '../../../environments/enviroment';
import { Router } from '@angular/router';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
  html?: string;
  isFile?: boolean;
}

interface ChatItem {
  id: string | null;
  titulo: string;
  favorito: boolean;
  historial: ChatMessage[];
  provider: AiProvider;
  model: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ChatComponent implements OnInit {
  nombreUsuario: string = 'Seven';
  private readonly currentUsername: string = 'demo';
  userInput: string = '';
  selectedProvider: AiProvider = 'gemini';
  selectedModel: string = 'gemini-2.5-flash';
  isSending: boolean = false;
  isListening: boolean = false;
  searchTerm: string = '';
  isDarkMode: boolean = false;
  micStatusMessage: string = '';
  micStatusType: 'info' | 'error' | 'success' = 'info';
  isUserMenuOpen: boolean = false;
  private lastInputWasVoice: boolean = false;

  messages: ChatMessage[] = [];
  misChats: ChatItem[] = [];
  private recognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private readonly speechToTextEndpoint: string = `${enviroment.apiBaseUrl}${enviroment.endpoints.speechToText}`;
  private recognitionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private activeChat: ChatItem | null = null;
  @ViewChild('messageTextarea') messageTextarea?: ElementRef<HTMLTextAreaElement>;

  readonly providerOptions: { value: AiProvider; label: string }[] = [
    { value: 'gemini', label: 'Gemini' },
    { value: 'ollama', label: 'Ollama' },
  ];

  // Modelos predefinidos por proveedor
  modelOptionsByProvider: { [key in AiProvider]?: string[] } = {
    gemini: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    ollama: ['llama3.2:1b'],
  };

  // Dropdown del agente
  providerDropdownOpen: boolean = false;
  modelDropdownOpen: boolean = false;

  // Control del sidebar responsive
  mobileSidebarOpen: boolean = false;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly chatApiService: ChatApiService,
    private readonly sessionService: SessionService,
    private readonly router: Router,
  ) {
    this.isDarkMode = globalThis.localStorage?.getItem('chat-theme') === 'dark';
    const currentUser = this.sessionService.getUser();
    this.nombreUsuario = currentUser?.display_name || 'Seven';
    this.currentUsername = currentUser?.username || 'demo';
  }

  get currentModelPlaceholder(): string {
    if (this.selectedProvider === 'gemini') return 'gemini-2.5-flash';
    if (this.selectedProvider === 'ollama') return 'llama3.2:1b';
    return 'modelo';
  }

  getModelOptions(): string[] {
    return this.modelOptionsByProvider[this.selectedProvider] || [];
  }

  onProviderChange() {
    const options = this.getModelOptions();
    if (options.length > 0) {
      this.selectedModel = options[0];
    } else {
      this.selectedModel = this.currentModelPlaceholder;
    }
    this.modelDropdownOpen = false;
    if (this.activeChat) {
      this.activeChat.provider = this.selectedProvider;
      this.activeChat.model = this.selectedModel;
    }
  }

  selectProvider(provider: AiProvider) {
    this.selectedProvider = provider;
    this.providerDropdownOpen = false;
    this.onProviderChange();
  }

  toggleProviderDropdown() {
    this.modelDropdownOpen = false;
    this.providerDropdownOpen = !this.providerDropdownOpen;
  }

  selectModel(model: string) {
    this.selectedModel = model;
    this.modelDropdownOpen = false;
    if (this.activeChat) {
      this.activeChat.model = model;
    }
  }

  toggleModelDropdown() {
    if (this.getModelOptions().length === 0) return;
    this.providerDropdownOpen = false;
    this.modelDropdownOpen = !this.modelDropdownOpen;
  }

  // ======================= GETTERS =======================
  get favoritos() {
    return this.misChats.filter((c) => {
      const coincideFavorito = c.favorito;
      const coincideBusqueda =
        c.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.historial.some((m) => m.text.toLowerCase().includes(this.searchTerm.toLowerCase()));
      return coincideFavorito && coincideBusqueda;
    });
  }

  get promptsGenerales() {
    return this.misChats.filter((c) => {
      const coincideGeneral = !c.favorito;
      const coincideBusqueda =
        c.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.historial.some((m) => m.text.toLowerCase().includes(this.searchTerm.toLowerCase()));
      return coincideGeneral && coincideBusqueda;
    });
  }

  // ======================= MÉTODOS RESPONSIVE =======================
  toggleSidebar() {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
  }

  closeSidebar() {
    this.mobileSidebarOpen = false;
  }

  closeSidebarOnMobile() {
    if (globalThis.innerWidth < 1024) {
      this.mobileSidebarOpen = false;
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    globalThis.localStorage?.setItem('chat-theme', this.isDarkMode ? 'dark' : 'light');
  }

  toggleUserMenu(event?: Event) {
    event?.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  onUserMenuAction(action: 'profile' | 'settings' | 'theme' | 'logout') {
    if (action === 'theme') {
      this.toggleDarkMode();
    }
    if (action === 'logout') {
      this.logout();
    }
    this.closeUserMenu();
  }

  logout() {
    this.sessionService.clearSession();
    void this.router.navigate(['/login']);
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeUserMenu();
    // Cerrar dropdown del agente si se hace clic fuera
    if (this.providerDropdownOpen) {
      this.providerDropdownOpen = false;
    }
    if (this.modelDropdownOpen) {
      this.modelDropdownOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePress() {
    this.closeUserMenu();
    this.providerDropdownOpen = false;
    this.modelDropdownOpen = false;
  }

  // ======================= LÓGICA PRINCIPAL =======================
  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.isSending) return;

    const shouldReplyWithAudio = this.lastInputWasVoice;
    this.lastInputWasVoice = false;
    const promptActual = this.userInput.trim();

    this.ensureActiveChat(promptActual);

    this.messages.push({ role: 'user', text: promptActual });
    this.userInput = '';
    this.resetMessageTextareaHeight();
    this.scrollToBottom();

    this.isSending = true;

    try {
      const activeModel = this.selectedModel.trim() || this.currentModelPlaceholder;
      this.selectedModel = activeModel;

      const botReply = this.activeChat?.id
        ? await this.sendMessageToExistingChat(this.activeChat.id, promptActual, activeModel)
        : await this.startChatInBackend(promptActual, activeModel);

      this.addBotMessage(botReply);

      if (shouldReplyWithAudio) {
        this.speakBotReply(botReply);
      }
    } catch {
      this.addBotMessage(
        'No pude obtener respuesta del backend. Verifica que el API este corriendo y la URL en environments.',
      );
      this.setMicStatus('Error al conectar con el backend de chat.', 'error');
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  cargarChat(chat: ChatItem) {
    console.log('Cargando chat:', chat.titulo);
    this.activeChat = chat;
    this.messages = chat.historial.map((message) =>
      message.role === 'bot'
        ? { ...message, html: this.formatBotContent(message.text) }
        : message,
    );
    chat.historial = this.messages;
    this.selectedProvider = chat.provider;
    this.selectedModel = chat.model;
    this.scrollToBottom();
    this.closeSidebarOnMobile();
  }

  marcarFavorito(event: Event, chat: ChatItem) {
    event.stopPropagation();
    chat.favorito = !chat.favorito;
  }

  resetChat() {
    this.messages = [];
    this.userInput = '';
    this.activeChat = null;
    this.selectedProvider = 'gemini';
    this.selectedModel = this.currentModelPlaceholder;
    this.resetMessageTextareaHeight();
    this.closeSidebarOnMobile();
  }

  onMessageEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.shiftKey) return;
    keyboardEvent.preventDefault();
    void this.sendMessage();
  }

  autoResizeMessage(event: Event) {
    const target = event.target as HTMLTextAreaElement | null;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 140)}px`;
  }

  private resetMessageTextareaHeight() {
    if (this.messageTextarea?.nativeElement) {
      this.messageTextarea.nativeElement.style.height = 'auto';
    }
  }

  private ensureActiveChat(firstMessage: string) {
    if (this.activeChat) return;

    const nuevoChat: ChatItem = {
      id: null,
      titulo: firstMessage.substring(0, 30) + (firstMessage.length > 30 ? '...' : ''),
      favorito: false,
      historial: this.messages,
      provider: this.selectedProvider,
      model: this.selectedModel.trim() || this.currentModelPlaceholder,
    };

    this.activeChat = nuevoChat;
    this.misChats.unshift(nuevoChat);
  }

  private async startChatInBackend(firstMessage: string, model: string): Promise<string> {
    const response = await firstValueFrom(
      this.chatApiService.startChat({
        user_id: this.currentUsername,
        message: firstMessage,
        provider: this.selectedProvider,
        model,
        title: this.activeChat?.titulo || 'Nuevo chat',
        language: 'es',
      }),
    );

    if (this.activeChat) {
      this.activeChat.id = response.chat_id;
      this.activeChat.titulo = response.title;
      this.activeChat.provider = this.selectedProvider;
      this.activeChat.model = model;
    }

    return response.response;
  }

  private async sendMessageToExistingChat(
    chatId: string,
    message: string,
    model: string,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.chatApiService.sendMessage(chatId, {
        message,
        provider: this.selectedProvider,
        model,
        language: 'es',
      }),
    );

    if (this.activeChat) {
      this.activeChat.provider = this.selectedProvider;
      this.activeChat.model = model;
    }

    return response.response;
  }

  private addBotMessage(rawText: string) {
    this.messages.push({
      role: 'bot',
      text: rawText,
      html: this.formatBotContent(rawText),
    });
  }

  private formatBotContent(content: string): string {
    const stepsAsBlocks = (content || '')
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (/^(?:\d+[.)]\s*)?Paso\s+\d+\s*[:.-]?.*$/i.test(trimmed)) {
          return `> ${trimmed}`;
        }
        return line;
      })
      .join('\n');

    const parsed = marked.parse(stepsAsBlocks, {
      breaks: true,
      gfm: true,
    }) as string;

    return parsed
      .replaceAll('<h1>', '<h1 class="text-lg sm:text-xl font-bold mt-2 mb-2">')
      .replaceAll('<h2>', '<h2 class="text-base sm:text-lg font-semibold mt-2 mb-2">')
      .replaceAll('<h3>', '<h3 class="text-sm sm:text-base font-semibold mt-2 mb-1">')
      .replaceAll('<p>', '<p class="leading-relaxed mb-2">')
      .replaceAll('<ul>', '<ul class="list-disc pl-5 space-y-1 my-2">')
      .replaceAll('<ol>', '<ol class="list-decimal pl-5 space-y-1 my-2">')
      .replaceAll('<pre>', '<pre class="bg-slate-900 text-slate-100 rounded-xl p-3 my-2 overflow-x-auto text-sm">')
      .replaceAll('<code>', '<code class="bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-slate-100 rounded px-1 py-0.5 text-[0.9em]">')
      .replaceAll('<blockquote>', '<blockquote class="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-400 rounded-r-xl px-3 py-2 my-2">')
      .replaceAll('<a ', '<a class="text-blue-600 dark:text-blue-300 underline break-all" target="_blank" rel="noopener noreferrer" ');
  }

  private setMicStatus(message: string, type: 'info' | 'error' | 'success' = 'info') {
    this.micStatusMessage = message;
    this.micStatusType = type;
  }

  private clearRecognitionResources() {
    if (this.recognitionTimeoutId) {
      clearTimeout(this.recognitionTimeoutId);
      this.recognitionTimeoutId = null;
    }
    this.recognition = null;
  }

  private stopRecognition() {
    if (this.recognition) {
      this.recognition.stop();
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private getBrowserName(): string {
    const ua = globalThis.navigator?.userAgent ?? '';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('OPR/') || ua.includes('Opera')) return 'Opera';
    if (ua.includes('Firefox/')) return 'Firefox';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/')) return 'Safari';
    return 'tu navegador';
  }

  private applyTranscript(transcript: string) {
    const cleanTranscript = transcript.trim();
    if (!cleanTranscript) return;

    this.userInput = cleanTranscript;
    this.lastInputWasVoice = true;
    this.setMicStatus('Texto reconocido correctamente.', 'success');
    this.sendMessage();
    this.cdr.detectChanges();
  }

  private speakBotReply(text: string) {
    const synthesis = globalThis.speechSynthesis;
    if (!synthesis) {
      this.setMicStatus('Tu navegador no soporta salida de voz del bot.', 'error');
      return;
    }

    if (synthesis.speaking) {
      synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = globalThis.navigator?.language || 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.setMicStatus('Respuesta en audio activa.', 'info');
      this.cdr.detectChanges();
    };

    utterance.onend = () => {
      this.activeUtterance = null;
      this.cdr.detectChanges();
    };

    utterance.onerror = () => {
      this.activeUtterance = null;
      this.setMicStatus('No se pudo reproducir el audio del bot.', 'error');
      this.cdr.detectChanges();
    };

    this.activeUtterance = utterance;
    synthesis.speak(utterance);
  }

  private async transcribeWithBackend(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');
    formData.append('lang', globalThis.navigator?.language || 'es-ES');

    const response = await fetch(this.speechToTextEndpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const payload = await response.json();
    return (payload?.text ?? '').toString();
  }

  private async startRecorderFallback() {
    if (!globalThis.navigator?.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      this.setMicStatus(
        `No hay soporte de dictado nativo en ${this.getBrowserName()} y tampoco MediaRecorder.`,
        'error',
      );
      return;
    }

    try {
      const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];

      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        this.isListening = false;

        try {
          const audioBlob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });
          if (audioBlob.size === 0) {
            this.setMicStatus(
              'No se capturo audio. Intenta hablar mas cerca del microfono.',
              'error',
            );
            return;
          }

          this.setMicStatus('Transcribiendo audio en servidor...', 'info');
          const text = await this.transcribeWithBackend(audioBlob);

          if (!text.trim()) {
            this.setMicStatus('No se pudo extraer texto del audio.', 'error');
            return;
          }

          this.applyTranscript(text);
        } catch {
          this.setMicStatus(
            'No pude transcribir por fallback. Configura el endpoint /api/speech-to-text para compatibilidad total.',
            'error',
          );
        } finally {
          this.mediaRecorder = null;
          this.recordedChunks = [];
          this.cdr.detectChanges();
        }
      };

      this.mediaRecorder.start();
      this.isListening = true;
      this.setMicStatus('Grabando audio... pulsa microfono para detener y transcribir.', 'info');
      this.cdr.detectChanges();
    } catch {
      this.setMicStatus('No se pudo iniciar la grabacion de audio en este navegador.', 'error');
    }
  }

  private async hasMicrophonePermission(): Promise<boolean> {
    try {
      const permissionsApi = (globalThis.navigator as any)?.permissions;
      if (permissionsApi?.query) {
        const result = await permissionsApi.query({ name: 'microphone' as PermissionName });
        if (result.state === 'denied') {
          return false;
        }
      }
    } catch {
      // Algunos navegadores no exponen permisos de microfono por Permissions API.
    }

    if (globalThis.navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  async dictar() {
    if (this.isListening) {
      this.stopRecognition();
      this.isListening = false;
      this.setMicStatus('Dictado detenido por el usuario.', 'info');
      this.cdr.detectChanges();
      return;
    }

    if (!globalThis.isSecureContext) {
      this.setMicStatus(
        'El dictado de voz requiere HTTPS o localhost en cualquier navegador.',
        'error',
      );
      return;
    }

    // Compatibilidad Chrome/Edge/Safari (webkitSpeechRecognition) + implementación estandar.
    const SpeechRecognitionCtor =
      (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      this.setMicStatus(
        'Tu navegador no soporta reconocimiento nativo. Activando fallback...',
        'info',
      );
      await this.startRecorderFallback();
      return;
    }

    const hasPermission = await this.hasMicrophonePermission();
    if (!hasPermission) {
      this.setMicStatus(
        'No hay permiso de microfono. Habilitalo en el candado del sitio y configuracion del navegador.',
        'error',
      );
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    let finalTranscript = '';

    recognition.lang = globalThis.navigator?.language || 'es-ES';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    this.isListening = true;
    this.setMicStatus('Escuchando... habla ahora.', 'info');
    this.recognition = recognition;

    recognition.onresult = (event: any) => {
      let recognizedText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript?.trim() ?? '';
        recognizedText += ` ${transcript}`;
      }

      const previewText = recognizedText.trim();
      if (previewText) {
        finalTranscript = previewText;
        this.userInput = previewText;
        this.setMicStatus('Audio detectado. Procesando texto...', 'info');
      }
      this.cdr.detectChanges();
    };

    recognition.onerror = (event: any) => {
      const errorCode = event?.error;
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        this.setMicStatus('Permiso de micrófono denegado. Debes habilitarlo para dictar.', 'error');
      } else if (errorCode === 'audio-capture') {
        this.setMicStatus('No se detecta micrófono disponible en este dispositivo.', 'error');
      } else if (errorCode === 'no-speech') {
        this.setMicStatus('No detecté voz. Acércate al micrófono e inténtalo otra vez.', 'error');
      } else if (errorCode === 'network') {
        this.setMicStatus(
          'Fallo de red del servicio de voz nativo. Activando fallback portable...',
          'info',
        );
        this.isListening = false;
        this.clearRecognitionResources();
        this.cdr.detectChanges();
        void this.startRecorderFallback();
        return;
      } else if (errorCode !== 'aborted') {
        this.setMicStatus('No pude procesar el audio. Intenta nuevamente.', 'error');
      }

      this.isListening = false;
      this.clearRecognitionResources();
      this.cdr.detectChanges();
    };

    recognition.onend = () => {
      const cleanTranscript = finalTranscript.trim();

      this.isListening = false;
      if (cleanTranscript) {
        this.applyTranscript(cleanTranscript);
      } else if (this.micStatusType !== 'error') {
        this.setMicStatus('No hubo audio suficiente para transcribir.', 'error');
      }

      this.clearRecognitionResources();
      this.cdr.detectChanges();
    };

    try {
      recognition.start();
      this.recognitionTimeoutId = setTimeout(() => {
        if (this.isListening) {
          this.stopRecognition();
        }
      }, 12000);
    } catch {
      this.isListening = false;
      this.clearRecognitionResources();
      this.setMicStatus(
        'No pude iniciar el dictado nativo. Activando fallback portable...',
        'info',
      );
      this.cdr.detectChanges();
      await this.startRecorderFallback();
    }
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.messages.push({
        role: 'user',
        text: file.name,
        isFile: true,
      });
      this.scrollToBottom();

      setTimeout(() => {
        this.addBotMessage(
          `He recibido tu archivo "${file.name}". Lo estoy analizando para darte la mejor mentoría.`,
        );
        this.cdr.detectChanges();
        this.scrollToBottom();
      }, 1000);

      event.target.value = '';
    }
  }

  ngOnInit() {
    // Cargar tema oscuro si estaba guardado
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    }
    this.onProviderChange();
  }
}
