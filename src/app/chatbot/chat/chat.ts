import { Component, ChangeDetectorRef, HostListener, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { distinctUntilChanged, firstValueFrom, map, Subscription } from 'rxjs';
import { marked } from 'marked';

import { ChatApiService } from '../../service/chat/chat-api.service';
import { AuthApiService } from '../../service/auth/auth-api.service';
import { SessionService } from '../../service/auth/session.service';
import {
  AiProvider,
  ChatDetailResponse,
  ChatSummaryResponse,
  SharedPromptResponse,
} from '../../models/chat/chat-api.types';
import { enviroment } from '../../../environments/enviroment';
import { ActivatedRoute, Router } from '@angular/router';

type ThemePreference = 'light' | 'dark';
type ShareScope = 'prompt' | 'chat' | 'custom';

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

interface PromptListItem {
  kind: 'own' | 'shared';
  title: string;
  subtitle: string;
  preview: string;
  favorite?: boolean;
  sharedFrom?: string;
  chat?: ChatItem;
  sharedPrompt?: SharedPromptResponse;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ChatComponent implements OnInit, OnDestroy {
  nombreUsuario: string = 'Seven';
  private currentUsername: string = 'demo';
  userInput: string = '';
  selectedProvider: AiProvider = 'gemini';
  selectedModel: string = 'gemini-2.5-flash';
  isSending: boolean = false;
  isListening: boolean = false;
  searchTerm: string = '';
  isDarkMode: boolean = false;
  themePreference: ThemePreference = 'light';
  micStatusMessage: string = '';
  micStatusType: 'info' | 'error' | 'success' = 'info';
  isSpeechPlaying: boolean = false;
  isSpeechPaused: boolean = false;
  isUserMenuOpen: boolean = false;
  isLoadingChats: boolean = false;
  isChatLoading: boolean = false;
  chatModalMode: 'rename' | 'delete' | null = null;
  chatModalTarget: ChatItem | null = null;
  chatModalTitleDraft: string = '';
  isChatModalSubmitting: boolean = false;
  private lastInputWasVoice: boolean = false;
  isLoadingSharedPrompts: boolean = false;
  isShareModalOpen: boolean = false;
  isSharingPrompt: boolean = false;
  shareRecipient: string = '';
  shareScope: ShareScope = 'prompt';
  shareDraftText: string = '';
  shareDraftTitle: string = '';
  shareStatusMessage: string = '';
  shareResultUrl: string = '';

  messages: ChatMessage[] = [];
  misChats: ChatItem[] = [];
  sharedPrompts: SharedPromptResponse[] = [];
  private readonly chatCache = new Map<string, ChatItem>();
  private recognition: any = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private readonly speechToTextEndpoint: string = `${enviroment.apiBaseUrl}${enviroment.endpoints.speechToText}`;
  private recognitionTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private activeChat: ChatItem | null = null;
  profileImageUrl: string | null = null;
  private profileImageObjectUrl: string | null = null;
  private sessionSubscription: Subscription | null = null;
  private lastLoadedChatsUser: string | null = null;
  private loadingChatId: string | null = null;
  @ViewChild('messageTextarea') messageTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatMessagesContainer') chatMessagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('chatListContainer') chatListContainer?: ElementRef<HTMLDivElement>;

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
    private readonly authApiService: AuthApiService,
    private readonly sessionService: SessionService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    const currentUser = this.sessionService.getUser();
    this.nombreUsuario = currentUser?.display_name || 'Seven';
    this.currentUsername = currentUser?.username || 'demo';

    const storedTheme = globalThis.localStorage?.getItem('chat-theme');
    const serverTheme: ThemePreference | null =
      currentUser?.is_dark === true ? 'dark' : currentUser?.is_dark === false ? 'light' : null;
    const initialTheme: ThemePreference =
      storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : serverTheme || this.normalizeThemePreference(currentUser?.theme_preference);

    this.themePreference = initialTheme;
    this.applyThemePreference(initialTheme, false);
    this.loadProfileImageFromSession();
  }

  private loadProfileImageFromSession() {
    const currentUser = this.sessionService.getUser();
    const profileRef = currentUser?.profile_image_url?.trim();

    if (!profileRef) {
      this.profileImageUrl = null;
      return;
    }

    if (profileRef.startsWith('http')) {
      this.profileImageUrl = profileRef;
      return;
    }

    this.authApiService.getProfileImageBlob(`${Date.now()}`).subscribe({
      next: (blob) => {
        if (this.profileImageObjectUrl) {
          URL.revokeObjectURL(this.profileImageObjectUrl);
        }
        this.profileImageObjectUrl = URL.createObjectURL(blob);
        this.profileImageUrl = this.profileImageObjectUrl;
        this.cdr.detectChanges();
      },
      error: () => {
        this.profileImageUrl = null;
      },
    });
  }

  private getSystemThemePreference(): 'light' | 'dark' {
    return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private normalizeThemePreference(preference?: string | null): ThemePreference {
    if (preference === 'dark' || preference === 'light') return preference;
    return this.getSystemThemePreference();
  }

  private applyThemePreference(preference: ThemePreference, persist = true) {
    this.themePreference = preference;
    this.isDarkMode = preference === 'dark';

    // Tailwind dark mode por clase en <html>
    document.documentElement.classList.toggle('dark', this.isDarkMode);

    if (persist) {
      globalThis.localStorage?.setItem('chat-theme', preference);
    }
  }

  private async persistThemePreference(preference: ThemePreference) {
    try {
      const updatedUser = await firstValueFrom(this.authApiService.updateThemePreference(preference));
      this.sessionService.updateUser(updatedUser);
    } catch {
      // Si falla la persistencia, se mantiene el cambio visual local.
    }
  }

  private toAiProvider(value: string | undefined): AiProvider {
    return value?.toLowerCase() === 'ollama' ? 'ollama' : 'gemini';
  }

  private mapChatSummary(chat: ChatSummaryResponse): ChatItem {
    return {
      id: chat.id ?? null,
      titulo: chat.title || 'Nuevo chat',
      favorito: false,
      historial: [],
      provider: 'gemini',
      model: 'gemini-2.5-flash',
    };
  }

  private mapChatDetail(chat: ChatDetailResponse, base?: ChatItem): ChatItem {
    const lastWithModel = [...(chat.history || [])]
      .reverse()
      .find((message) => !!message?.model?.trim());
    const provider = this.toAiProvider(lastWithModel?.provider || base?.provider);
    const fallbackModel = provider === 'ollama' ? 'llama3.2:1b' : 'gemini-2.5-flash';

    return {
      id: chat.id ?? base?.id ?? null,
      titulo: chat.title || base?.titulo || 'Nuevo chat',
      favorito: base?.favorito ?? false,
      provider,
      model: lastWithModel?.model || base?.model || fallbackModel,
      historial: (chat.history || []).map((message) => ({
        role: message.role === 'user' ? 'user' : 'bot',
        text: message.content,
      })),
    };
  }

  private async loadChatsByUser(force = false) {
    // Obtener el username actual de la sesión
    const currentUser = this.sessionService.getUser();
    const username = currentUser?.username || this.currentUsername;

    console.log('🔍 DEBUG - loadChatsByUser():');
    console.log('  - currentUser:', currentUser);
    console.log('  - username para buscar:', username);
    console.log('  - this.currentUsername:', this.currentUsername);

    if (!username || username === 'demo') {
      console.warn('⚠️ Username no válido para cargar chats:', username);
      this.misChats = [];
      this.lastLoadedChatsUser = null;
      return;
    }

    if (!force && (this.isLoadingChats || this.lastLoadedChatsUser === username)) {
      return;
    }

    this.isLoadingChats = true;
    this.lastLoadedChatsUser = username;

    try {
      console.log('📥 Cargando chats para usuario:', username);
      const chats = await firstValueFrom(this.chatApiService.listChats(username));
      console.log('✅ Respuesta del servidor:', chats);

      this.misChats = chats.map((chat) => this.mapChatSummary(chat));
      console.log('✅ Chats mapeados:', this.misChats);
      console.log('✅ Chats cargados:', this.misChats.length);
      void this.preloadChatsDetails(this.misChats.slice(0, 6));
    } catch (error) {
      console.error('❌ Error cargando chats:', error);
      this.setMicStatus('No se pudo cargar el listado de chats del usuario.', 'error');
      this.misChats = [];
      this.lastLoadedChatsUser = null;
    } finally {
      this.isLoadingChats = false;
      this.cdr.detectChanges();
    }
  }

  private async loadSharedPrompts() {
    this.isLoadingSharedPrompts = true;
    try {
      this.sharedPrompts = await firstValueFrom(this.chatApiService.listSharedPrompts());
    } catch {
      this.sharedPrompts = [];
    } finally {
      this.isLoadingSharedPrompts = false;
      this.cdr.detectChanges();
    }
   }

   openShareModal(scope: ShareScope = 'chat', message?: ChatMessage) {
    this.shareStatusMessage = '';
    this.shareResultUrl = '';
    this.shareRecipient = '';
    this.shareScope = 'chat';
    this.shareDraftTitle = this.activeChat?.titulo || 'Nuevo chat';
    this.shareDraftText = this.buildChatShareText();

    this.isShareModalOpen = true;
    this.cdr.detectChanges();
  }

  closeShareModal() {
    this.isShareModalOpen = false;
    this.isSharingPrompt = false;
    this.shareRecipient = '';
    this.shareScope = 'prompt';
    this.shareDraftText = '';
    this.shareDraftTitle = '';
    this.shareStatusMessage = '';
  }

  onShareScopeChange(scope: ShareScope) {
    this.shareScope = scope;

    if (scope === 'chat') {
      this.shareDraftText = this.buildChatShareText();
    } else if (scope === 'custom' && !this.shareDraftText.trim()) {
      this.shareDraftText = '';
    }

    this.cdr.detectChanges();
  }

  private buildChatShareText(): string {
    const title = this.activeChat?.titulo?.trim() || 'Nuevo chat';
    const messages = this.messages
      .filter((message) => !message.isFile)
      .slice(-8)
      .map((message) => `${message.role === 'user' ? 'Usuario' : 'MentorCore'}: ${message.text}`)
      .join('\n\n');

    return [`Chat: ${title}`, messages ? `\n${messages}` : '', '\n— Compartido desde MentorCore'].join('');
  }

  private buildChatShareHistory() {
    return this.messages
      .filter((message) => !message.isFile)
      .map((message) => ({
        role: (message.role === 'user' ? 'user' : 'bot') as 'user' | 'bot',
        provider: this.selectedProvider,
        model: this.selectedModel,
        content: message.text,
      }));
  }

  private buildSharePayload(): {
    to_user?: string | null;
    prompt: string;
    source_chat_id?: string | null;
    source_chat_title?: string | null;
    source_history?: Array<{ role: 'user' | 'bot'; provider: string; model: string; content: string }>;
  } {
    const prompt = this.buildChatShareText();

    return {
      to_user: null,
      prompt,
      source_chat_id: this.activeChat?.id,
      source_chat_title: this.activeChat?.titulo,
      source_history: this.buildChatShareHistory(),
    };
  }

  submitShare() {
    if (this.isSharingPrompt) return;

    const payload = this.buildSharePayload();
    if (!payload.prompt.trim()) {
      this.shareStatusMessage = 'El contenido a compartir no puede ir vacío.';
      return;
    }

    this.isSharingPrompt = true;
    this.shareStatusMessage = '';

    this.chatApiService.sharePrompt(payload).subscribe({
      next: (result) => {
        this.shareResultUrl = `${globalThis.location?.origin || ''}${result.share_url}`;
        this.shareStatusMessage = result.source_history_count && result.source_history_count > 1
          ? 'Enlace generado para compartir chat completo.'
          : 'Enlace generado para compartir.';
        void this.loadSharedPrompts();
        this.cdr.detectChanges();
      },
      error: () => {
        this.shareStatusMessage = 'No se pudo compartir. Revisa el usuario destino.';
        this.isSharingPrompt = false;
        this.cdr.detectChanges();
      },
    });
  }

  async copyShareLink() {
    if (!this.shareResultUrl) return;
    try {
      await globalThis.navigator?.clipboard?.writeText(this.shareResultUrl);
      this.shareStatusMessage = 'Enlace copiado al portapapeles.';
      this.cdr.detectChanges();
    } catch {
      this.shareStatusMessage = 'No se pudo copiar el enlace, selecciónalo manualmente.';
      this.cdr.detectChanges();
    }
  }

  useSharedPrompt(shared: SharedPromptResponse) {
    const prompt = shared.prompt?.trim();
    if (!prompt) return;
    this.userInput = prompt;
    this.closeSidebarOnMobile();
    this.cdr.detectChanges();
  }

  private async loadChatById(chatId: string) {
    try {
      const detail = await firstValueFrom(this.chatApiService.getChat(chatId));
      const mapped = this.mapChatDetail(detail);
      this.activeChat = mapped;
      this.selectedProvider = mapped.provider;
      this.selectedModel = mapped.model;
      this.messages = mapped.historial.map((message) =>
        message.role === 'bot' ? { ...message, html: this.formatBotContent(message.text) } : message,
      );
      this.cdr.detectChanges();
      this.scrollToBottom();
    } catch {
      this.setMicStatus('No se pudo abrir el chat compartido.', 'error');
    }
  }

  private upsertChat(chat: ChatItem) {
    const idx = this.misChats.findIndex((item) => item.id && item.id === chat.id);
    if (idx === -1) {
      this.misChats.unshift(chat);
      return;
    }
    this.misChats[idx] = chat;
    if (chat.id) {
      this.chatCache.set(chat.id, chat);
    }
  }

  private async preloadChatsDetails(chats: ChatItem[]) {
    const tasks = chats
      .filter((chat) => !!chat.id)
      .map(async (chat) => {
        if (!chat.id || this.chatCache.has(chat.id)) return;
        try {
          const detail = await firstValueFrom(this.chatApiService.getChat(chat.id));
          const mapped = this.mapChatDetail(detail, chat);
          this.chatCache.set(chat.id, mapped);
        } catch {
          // precarga silenciosa
        }
      });

    await Promise.allSettled(tasks);
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

  get promptUnifiedList(): PromptListItem[] {
    const search = this.searchTerm.toLowerCase();

    const ownChats = this.misChats
      .filter((chat) => {
        const coincideBusqueda =
          chat.titulo.toLowerCase().includes(search) ||
          chat.historial.some((m) => m.text.toLowerCase().includes(search));
        return coincideBusqueda;
      })
      .map<PromptListItem>((chat) => ({
        kind: 'own',
        title: chat.titulo,
        subtitle: chat.favorito ? 'Favorito' : 'Prompt propio',
        preview: chat.historial
          .filter((m) => m.role === 'user')
          .slice(-1)[0]?.text || 'Sin contenido disponible',
        favorite: chat.favorito,
        chat,
      }));

    const shared = this.sharedPrompts
      .filter((item) => {
        const coincideBusqueda =
          item.prompt.toLowerCase().includes(search) ||
          item.from_user.toLowerCase().includes(search) ||
          (item.source_chat_title || '').toLowerCase().includes(search);
        return coincideBusqueda;
      })
      .map<PromptListItem>((item) => ({
        kind: 'shared',
        title: item.source_chat_title || `Compartido por @${item.from_user}`,
        subtitle: `Compartido por @${item.from_user}`,
        preview: item.prompt,
        sharedFrom: item.from_user,
        sharedPrompt: item,
      }));

    return [...ownChats, ...shared].slice(0, 12);
  }

  openPromptItem(item: PromptListItem) {
    if (item.kind === 'own' && item.chat) {
      this.cargarChat(item.chat);
      this.closeSidebarOnMobile();
      return;
    }

    if (item.kind === 'shared' && item.sharedPrompt) {
      this.useSharedPrompt(item.sharedPrompt);
    }
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
    const nextPreference: ThemePreference = this.isDarkMode ? 'light' : 'dark';
    this.applyThemePreference(nextPreference);
    void this.persistThemePreference(nextPreference);
  }

  toggleUserMenu(event?: Event) {
    event?.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  private async navigateSafely(url: string) {
    try {
      const navigated = await this.router.navigateByUrl(url);
      if (!navigated) {
        globalThis.location?.assign(url);
      }
    } catch {
      // Fallback para navegadores/extensiones que interceptan history.pushState.
      globalThis.location?.assign(url);
    }
  }

  onUserMenuAction(action: 'profile' | 'settings' | 'theme' | 'logout') {
    if (action === 'profile') {
      void this.navigateSafely('/profile');
      this.closeSidebarOnMobile();
    }
    if (action === 'settings') {
      void this.navigateSafely('/profile');
      this.closeSidebarOnMobile();
    }
    if (action === 'theme') {
      this.toggleDarkMode();
    }
    if (action === 'logout') {
      this.logout();
    }
    this.closeUserMenu();
  }

  logout() {
    if (this.profileImageObjectUrl) {
      URL.revokeObjectURL(this.profileImageObjectUrl);
      this.profileImageObjectUrl = null;
    }
    this.sessionService.clearSession();
    void this.navigateSafely('/login');
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
    if (this.isShareModalOpen) {
      this.closeShareModal();
      return;
    }
    if (this.chatModalMode) {
      this.closeChatModal();
      return;
    }
    this.closeUserMenu();
    this.providerDropdownOpen = false;
    this.modelDropdownOpen = false;
  }

  // ======================= LÓGICA PRINCIPAL =======================
  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = this.chatMessagesContainer?.nativeElement;
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  private scrollChatListToBottom() {
    setTimeout(() => {
      const listContainer = this.chatListContainer?.nativeElement;
      if (!listContainer) return;
      listContainer.scrollTop = listContainer.scrollHeight;
    }, 80);
  }

  private moveActiveChatToBottom() {
    const active = this.activeChat;
    if (!active) return;

    const index = this.misChats.findIndex((item) => {
      if (active.id && item.id) return item.id === active.id;
      return item === active;
    });

    if (index === -1) {
      this.misChats.push(active);
      return;
    }

    const [chat] = this.misChats.splice(index, 1);
    this.misChats.push(chat);
  }

  async sendMessage() {
    if (!this.userInput.trim() || this.isSending) return;

    const shouldReplyWithAudio = this.lastInputWasVoice;
    this.lastInputWasVoice = false;
    const promptActual = this.userInput.trim();

    this.ensureActiveChat(promptActual);
    this.moveActiveChatToBottom();
    this.scrollChatListToBottom();

    this.messages.push({ role: 'user', text: promptActual });
    this.userInput = '';
    this.resetMessageTextareaHeight();
    this.scrollToBottom();

    this.isSending = true;

    try {
      const activeModel = this.selectedModel.trim() || this.currentModelPlaceholder;
      this.selectedModel = activeModel;

      let botReply: string;
      if (this.activeChat?.id) {
        const previousChatId = this.activeChat.id;
        try {
          botReply = await this.sendMessageToExistingChat(previousChatId, promptActual, activeModel);
        } catch (error) {
          if (!this.isRetryableGatewayError(error)) {
            throw error;
          }

          this.chatCache.delete(previousChatId);
          this.activeChat.id = null;
          this.setMicStatus(
            'El servidor no pudo continuar este chat. Reintentando en una nueva conversación...',
            'info',
          );
          botReply = await this.startChatInBackend(promptActual, activeModel);
        }
      } else {
        botReply = await this.startChatInBackend(promptActual, activeModel);
      }

      this.addBotMessage(botReply);

      if (shouldReplyWithAudio) {
        this.speakBotReply(botReply);
      }
    } catch (error) {
      this.addBotMessage(this.buildSendErrorMessage(error));
      this.setMicStatus('Error al conectar con el backend de chat.', 'error');
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
      this.scrollToBottom();
    }
  }

  private isRetryableGatewayError(error: unknown): boolean {
    return (
      error instanceof HttpErrorResponse &&
      (error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504)
    );
  }

  private buildSendErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 502 || error.status === 503 || error.status === 504) {
        return 'El servicio de IA no esta disponible temporalmente (502/503/504). Intenta de nuevo en unos segundos.';
      }
      if (error.status === 404) {
        return 'Este chat ya no existe en el servidor. Crea un nuevo chat y vuelve a intentar.';
      }
      if (error.status === 422) {
        return 'El servidor rechazo el mensaje por validacion. Revisa modelo/agente e intenta nuevamente.';
      }
      if (error.status === 0) {
        return 'No hay conexion con el backend. Verifica internet o CORS del servidor.';
      }
    }

    return 'No pude obtener respuesta del backend. Verifica que el API este activo y la URL en enviroment.ts.';
  }

  async cargarChat(chat: ChatItem) {
    if (!chat.id) {
      this.activeChat = chat;
      this.selectedProvider = chat.provider;
      this.selectedModel = chat.model;
      return;
    }

    const cached = this.chatCache.get(chat.id);
    if (cached) {
      this.activeChat = cached;
      this.selectedProvider = cached.provider;
      this.selectedModel = cached.model;
      this.messages = cached.historial.map((message) =>
        message.role === 'bot' ? { ...message, html: this.formatBotContent(message.text) } : message,
      );
      this.closeSidebarOnMobile();
      this.scrollToBottom();
      return;
    }

    if (this.loadingChatId === chat.id) {
      return;
    }

    this.loadingChatId = chat.id;
    this.isChatLoading = true;
    this.activeChat = chat;
    this.selectedProvider = chat.provider;
    this.selectedModel = chat.model;
    this.messages = [
      { role: 'bot', text: 'Cargando conversación...' },
    ];
    this.scrollToBottom();

    try {
      const detail = await firstValueFrom(this.chatApiService.getChat(chat.id));
      const updated = this.mapChatDetail(detail, chat);
      this.upsertChat(updated);
      this.activeChat = updated;
      this.messages = updated.historial.map((message) =>
        message.role === 'bot' ? { ...message, html: this.formatBotContent(message.text) } : message,
      );
      this.selectedProvider = updated.provider;
      this.selectedModel = updated.model;
    } catch {
      this.setMicStatus('No se pudo cargar el detalle del chat seleccionado.', 'error');
      this.messages = [];
    } finally {
      this.isChatLoading = false;
      this.loadingChatId = null;
      if (this.activeChat?.id) {
        this.chatCache.set(this.activeChat.id, this.activeChat);
      }
    }

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
    this.isChatLoading = false;
    this.closeChatModal();
    this.resetMessageTextareaHeight();
    this.closeSidebarOnMobile();
  }

  openRenameModal(event: Event, chat: ChatItem) {
    event.stopPropagation();
    if (!chat.id) return;
    this.chatModalMode = 'rename';
    this.chatModalTarget = chat;
    this.chatModalTitleDraft = chat.titulo;
  }

  openDeleteModal(event: Event, chat: ChatItem) {
    event.stopPropagation();
    if (!chat.id) return;
    this.chatModalMode = 'delete';
    this.chatModalTarget = chat;
    this.chatModalTitleDraft = chat.titulo;
  }

  closeChatModal() {
    this.chatModalMode = null;
    this.chatModalTarget = null;
    this.chatModalTitleDraft = '';
    this.isChatModalSubmitting = false;
  }

  async confirmChatModalAction() {
    if (!this.chatModalMode || !this.chatModalTarget?.id || this.isChatModalSubmitting) return;

    this.isChatModalSubmitting = true;

    if (this.chatModalMode === 'rename') {
      await this.confirmRenameChat(this.chatModalTarget);
      return;
    }

    await this.confirmDeleteChat(this.chatModalTarget);
  }

  onChatModalKeydown(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key !== 'Enter') return;
    keyboardEvent.preventDefault();
    void this.confirmChatModalAction();
  }

  private async confirmRenameChat(chat: ChatItem) {
    const title = this.chatModalTitleDraft.trim();
    if (!chat.id || !title) {
      this.closeChatModal();
      return;
    }

    try {
      const updated = await firstValueFrom(this.chatApiService.updateChat(chat.id, { title }));
      const updatedChat = this.mapChatDetail(updated, chat);
      this.upsertChat(updatedChat);

      if (this.activeChat?.id === updatedChat.id) {
        this.activeChat.titulo = updatedChat.titulo;
      }
    } catch {
      this.setMicStatus('No se pudo actualizar el nombre del chat.', 'error');
    } finally {
      this.closeChatModal();
      this.cdr.detectChanges();
    }
  }

  private async confirmDeleteChat(chat: ChatItem) {
    if (!chat.id) {
      this.closeChatModal();
      return;
    }

    try {
      const deleted = await firstValueFrom(this.chatApiService.deleteChat(chat.id));
      if (!deleted.deleted) return;

      this.misChats = this.misChats.filter((item) => item.id !== chat.id);
      if (this.activeChat?.id === chat.id) {
        this.resetChat();
      }
    } catch {
      this.setMicStatus('No se pudo eliminar el chat.', 'error');
    } finally {
      this.closeChatModal();
      this.cdr.detectChanges();
    }
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
    this.misChats.push(nuevoChat);
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

  toggleSpeechPause() {
    const synthesis = globalThis.speechSynthesis;
    if (!synthesis || !this.activeUtterance || !this.isSpeechPlaying) return;

    if (this.isSpeechPaused) {
      synthesis.resume();
      this.isSpeechPaused = false;
      this.setMicStatus('Audio reanudado.', 'info');
    } else {
      synthesis.pause();
      this.isSpeechPaused = true;
      this.setMicStatus('Audio en pausa.', 'info');
    }

    this.cdr.detectChanges();
  }

  private resetSpeechState() {
    this.activeUtterance = null;
    this.isSpeechPlaying = false;
    this.isSpeechPaused = false;
  }

  private stopBotSpeech() {
    const synthesis = globalThis.speechSynthesis;
    if (synthesis && (synthesis.speaking || synthesis.pending || synthesis.paused)) {
      synthesis.cancel();
    }
    this.resetSpeechState();
  }

  private toPlainTextForSpeech(markdownText: string): string {
    const source = (markdownText || '').trim();
    if (!source) return '';

    try {
      const rendered = marked.parse(source, { gfm: true, breaks: true }) as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(rendered, 'text/html');
      return (doc.body.textContent || '')
        .replace(/\s+/g, ' ')
        .replace(/\s([,.;:!?])/g, '$1')
        .trim();
    } catch {
      return source
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+[.)]\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/[*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  private speakBotReply(text: string) {
    const synthesis = globalThis.speechSynthesis;
    if (!synthesis) {
      this.setMicStatus('Tu navegador no soporta salida de voz del bot.', 'error');
      return;
    }

    const plainText = this.toPlainTextForSpeech(text);
    if (!plainText) {
      this.setMicStatus('No hay texto legible para reproducir en voz.', 'error');
      return;
    }

    this.stopBotSpeech();

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = globalThis.navigator?.language || 'es-ES';
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.isSpeechPlaying = true;
      this.isSpeechPaused = false;
      this.setMicStatus('Respuesta en audio activa.', 'info');
      this.cdr.detectChanges();
    };

    utterance.onend = () => {
      this.resetSpeechState();
      this.cdr.detectChanges();
    };

    utterance.onerror = () => {
      this.resetSpeechState();
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
     this.onProviderChange();

     // Actualizar currentUsername con el usuario de sesión
     const currentUser = this.sessionService.getUser();
     if (currentUser?.username) {
       this.currentUsername = currentUser.username;
     }

     void this.loadSharedPrompts();

     const chatIdFromRoute = this.route.snapshot.queryParamMap.get('chatId');
     if (chatIdFromRoute) {
       void this.loadChatById(chatIdFromRoute);
     }

      this.sessionSubscription = this.sessionService.session$
        .pipe(
          map((session) => session?.user?.username ?? null),
          distinctUntilChanged(),
        )
        .subscribe((username) => {
       this.loadProfileImageFromSession();
        // Recargar chats solo cuando cambia el usuario autenticado
        if (username) {
          this.currentUsername = username;
          void this.loadChatsByUser();
          return;
       }
        this.misChats = [];
        this.lastLoadedChatsUser = null;
      });
   }

  ngOnDestroy() {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
      this.sessionSubscription = null;
    }

    if (this.profileImageObjectUrl) {
      URL.revokeObjectURL(this.profileImageObjectUrl);
      this.profileImageObjectUrl = null;
    }

    this.stopBotSpeech();
  }

  get sharePreviewText(): string {
    return this.buildChatShareText();
  }
}
