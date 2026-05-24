import { Component, ChangeDetectorRef, HostListener, OnDestroy, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { distinctUntilChanged, firstValueFrom, map, Subscription } from 'rxjs';
import { marked } from 'marked';

import { ChatApiService } from '../../service/chat/chat-api.service';
import { AuthApiService } from '../../service/auth/auth-api.service';
import { SessionService } from '../../service/auth/session.service';
import { SidebarToggleService } from '../../service/sidebar/sidebar-toggle.service';
import { SidebarComponent } from '../sidebar/sidebar';

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
type SummaryExportFormat = 'pdf' | 'doc';

interface GeneratedSummary {
  chat_id: string | null;
  title: string;
  generated_at: string;
  introduction: string;
  topics: string[];
  analysis: string[];
  concepts: string[];
  conclusions: string[];
  recommendations: string[];
}

interface ExportReport {
  title: string;
  generatedAt: string;
  introduction: string;
  mlTopics: string[];
  analysis: string[];
  keyConcepts: string[];
  conclusions: string[];
  recommendations: string[];
}

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

interface TaxonomyRule {
  label: string;
  keywords: string[];
}

interface ReportTaxonomyConfig {
  conversationTopics: TaxonomyRule[];
  focusTopics: TaxonomyRule[];
  keyConceptDomains: TaxonomyRule[];
}

interface CareerTaxonomyProfile extends ReportTaxonomyConfig {
  displayName: string;
  aliases: string[];
}

interface ReportTaxonomyDataset {
  defaultCareerKey: string;
  careers: Record<string, CareerTaxonomyProfile>;
}

const DEFAULT_REPORT_TAXONOMY_DATASET: ReportTaxonomyDataset = {
  defaultCareerKey: 'general',
  careers: {
    general: {
      displayName: 'General multidisciplinario',
      aliases: ['general', 'multidisciplinario', 'sin carrera'],
      conversationTopics: [
        { label: 'metodologia de investigacion', keywords: ['investigacion', 'metodologia', 'hipotesis', 'variable', 'muestra', 'analisis', 'estadistica'] },
        { label: 'analisis y toma de decisiones', keywords: ['decision', 'criterio', 'prioridad', 'alternativa', 'estrategia', 'riesgo', 'evaluacion'] },
        { label: 'comunicacion academica', keywords: ['resumen', 'informe', 'argumento', 'redaccion', 'conclusion', 'ensayo'] },
      ],
      focusTopics: [
        { label: 'fundamentos conceptuales', keywords: ['concepto', 'definicion', 'fundamento', 'principio', 'teoria'] },
        { label: 'aplicacion practica', keywords: ['caso', 'ejemplo', 'aplicacion', 'proceso', 'implementacion'] },
        { label: 'evaluacion de resultados', keywords: ['resultado', 'indicador', 'medicion', 'evaluacion', 'mejora'] },
      ],
      keyConceptDomains: [
        { label: 'metodologia e investigacion', keywords: ['investigacion', 'metodologia', 'hipotesis', 'variable', 'muestra', 'analisis', 'estadistica'] },
        { label: 'planificacion y gestion', keywords: ['plan', 'objetivo', 'estrategia', 'prioridad', 'decision', 'riesgo'] },
        { label: 'comunicacion y sintesis', keywords: ['resumen', 'informe', 'conclusion', 'argumento', 'explicacion'] },
      ],
    },
    ingenieria_tecnologia: {
      displayName: 'Ingenieria y tecnologia',
      aliases: ['ingenieria', 'sistemas', 'software', 'informatica', 'tecnologia', 'computacion'],
      conversationTopics: [
        { label: 'arquitectura y desarrollo', keywords: ['arquitectura', 'modulo', 'api', 'backend', 'frontend', 'componente'] },
        { label: 'datos e inteligencia artificial', keywords: ['machine learning', 'modelo', 'entrenamiento', 'dataset', 'algoritmo', 'metricas'] },
        { label: 'calidad y operacion', keywords: ['error', 'validacion', 'prueba', 'rendimiento', 'despliegue', 'seguridad'] },
      ],
      focusTopics: [
        { label: 'diseno tecnico', keywords: ['diseno', 'arquitectura', 'patron', 'interfaz', 'estructura'] },
        { label: 'implementacion y pruebas', keywords: ['codigo', 'implementacion', 'pruebas', 'debug', 'refactor'] },
        { label: 'integracion y mantenimiento', keywords: ['integracion', 'endpoint', 'servicio', 'versionado', 'mantenimiento'] },
      ],
      keyConceptDomains: [
        { label: 'ingenieria de software', keywords: ['sistema', 'software', 'api', 'backend', 'frontend', 'arquitectura'] },
        { label: 'analitica y machine learning', keywords: ['machine learning', 'entrenamiento', 'clasificacion', 'regresion', 'feature', 'modelo'] },
        { label: 'calidad y seguridad', keywords: ['validacion', 'error', 'prueba', 'seguridad', 'autenticacion'] },
      ],
    },
    salud_ciencias_medicas: {
      displayName: 'Salud y ciencias medicas',
      aliases: ['salud', 'medicina', 'enfermeria', 'odontologia', 'farmacia', 'nutricion'],
      conversationTopics: [
        { label: 'atencion y diagnostico', keywords: ['paciente', 'diagnostico', 'sintoma', 'anamnesis', 'evaluacion clinica'] },
        { label: 'tratamiento y prevencion', keywords: ['tratamiento', 'terapia', 'prevencion', 'protocolo', 'seguimiento'] },
        { label: 'evidencia y bioetica', keywords: ['evidencia', 'guia clinica', 'bioetica', 'riesgo', 'beneficio'] },
      ],
      focusTopics: [
        { label: 'decision clinica', keywords: ['diagnostico', 'criterio clinico', 'pronostico', 'indicacion'] },
        { label: 'seguridad del paciente', keywords: ['seguridad', 'adverso', 'farmacovigilancia', 'protocolo'] },
        { label: 'salud publica', keywords: ['epidemiologia', 'prevencion', 'incidencia', 'poblacion'] },
      ],
      keyConceptDomains: [
        { label: 'diagnostico y evaluacion', keywords: ['diagnostico', 'sintoma', 'examen', 'evaluacion', 'criterio'] },
        { label: 'tratamiento y cuidado', keywords: ['tratamiento', 'terapia', 'cuidado', 'seguimiento', 'paciente'] },
        { label: 'epidemiologia y prevencion', keywords: ['epidemiologia', 'prevencion', 'factor de riesgo', 'incidencia'] },
      ],
    },
    derecho_normatividad: {
      displayName: 'Derecho y normatividad',
      aliases: ['derecho', 'juridico', 'abogacia', 'leyes', 'normatividad'],
      conversationTopics: [
        { label: 'analisis normativo', keywords: ['ley', 'norma', 'articulo', 'constitucion', 'codigo'] },
        { label: 'argumentacion juridica', keywords: ['argumentacion', 'interpretacion', 'principio', 'doctrina', 'tesis'] },
        { label: 'casuistica y jurisprudencia', keywords: ['caso', 'jurisprudencia', 'precedente', 'sentencia', 'fallo'] },
      ],
      focusTopics: [
        { label: 'jerarquia normativa', keywords: ['constitucion', 'ley', 'reglamento', 'jerarquia'] },
        { label: 'aplicacion al caso', keywords: ['hechos', 'supuesto', 'aplicacion', 'tipificacion'] },
        { label: 'sustento argumentativo', keywords: ['argumento', 'fundamento', 'criterio', 'conclusion juridica'] },
      ],
      keyConceptDomains: [
        { label: 'normativa y fuentes', keywords: ['norma', 'ley', 'constitucion', 'reglamento', 'fuente'] },
        { label: 'interpretacion juridica', keywords: ['interpretacion', 'principio', 'doctrina', 'argumentacion'] },
        { label: 'jurisprudencia y casos', keywords: ['jurisprudencia', 'precedente', 'sentencia', 'caso'] },
      ],
    },
  },
};

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrl: './chat.css',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
})
export class ChatComponent implements OnInit, OnDestroy {
  nombreUsuario: string = 'Seven';
  private currentUsername: string = 'demo';
  userInput: string = '';
  selectedProvider: AiProvider = 'gemini';
  selectedModel: string = 'gemini-1.5-flash';
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
  isExportMenuOpen: boolean = false;
  isExportingSummary: boolean = false;
  isSharingPrompt: boolean = false;
  shareRecipient: string = '';
  shareScope: ShareScope = 'prompt';
  shareDraftText: string = '';
  shareDraftTitle: string = '';
  shareStatusMessage: string = '';
  shareResultUrl: string = '';
  copiedMessageIndex: number | null = null;
  speakingMessageIndex: number | null = null;

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
  private copiedMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;
  activeChat: ChatItem | null = null;
  private readonly speechRate = 1.5;
  private readonly reportTaxonomyUrl: string = '/report-taxonomy.json';
  private reportTaxonomyDataset: ReportTaxonomyDataset = DEFAULT_REPORT_TAXONOMY_DATASET;
  private activeReportTaxonomy: ReportTaxonomyConfig = DEFAULT_REPORT_TAXONOMY_DATASET.careers[DEFAULT_REPORT_TAXONOMY_DATASET.defaultCareerKey];
  private activeCareerLabel: string = DEFAULT_REPORT_TAXONOMY_DATASET.careers[DEFAULT_REPORT_TAXONOMY_DATASET.defaultCareerKey].displayName;
  private currentCareer: string = '';
  profileImageUrl: string | null = null;
  private profileImageObjectUrl: string | null = null;
  private sessionSubscription: Subscription | null = null;
  private sidebarSubscription: Subscription | null = null;
  private lastLoadedChatsUser: string | null = null;
  private loadingChatId: string | null = null;
  private lastSummaryCacheKey: string | null = null;
  private lastSummaryCacheValue: GeneratedSummary | null = null;
  @ViewChild('messageTextarea') messageTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('chatMessagesContainer') chatMessagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('chatListContainer') chatListContainer?: ElementRef<HTMLDivElement>;

  readonly providerOptions: { value: AiProvider; label: string }[] = [
    { value: 'gemini', label: 'Gemini' }
  ];

  // Modelos predefinidos por proveedor
  modelOptionsByProvider: { [key in AiProvider]?: string[] } = {
    gemini: ['gemini-1.5-flash']
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
    public readonly sidebarToggleService: SidebarToggleService,
  ) {
    const currentUser = this.sessionService.getUser();
    this.nombreUsuario = currentUser?.display_name || 'Seven';
    this.currentUsername = currentUser?.username || 'demo';
    this.currentCareer = currentUser?.career || '';
    this.applyCareerScopedTaxonomy(this.currentCareer);

    const storedTheme = globalThis.localStorage?.getItem('chat-theme');
    let serverTheme: ThemePreference | null = null;
    if (currentUser?.is_dark === true) {
      serverTheme = 'dark';
    } else if (currentUser?.is_dark === false) {
      serverTheme = 'light';
    }
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
    const fallbackModel = provider === 'ollama' ? 'llama3.1' : 'gemini-2.5-flash';

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
    const currentUser = this.sessionService.getUser();
    const username = currentUser?.username || this.currentUsername;

    if (!username || username === 'demo') {
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
      const chats = await firstValueFrom(this.chatApiService.listChats(username));

      this.misChats = chats.map((chat) => this.mapChatSummary(chat));
      void this.preloadChatsDetails(this.misChats.slice(0, 6));
    } catch {
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

   openShareModal() {
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

  private buildChatShareHistory(): Array<{ role: 'user' | 'bot'; provider: string; model: string; content: string }> {
    return this.messages
      .filter((message) => !message.isFile)
      .map((message) => {
        const role: 'user' | 'bot' = message.role === 'user' ? 'user' : 'bot';
        return {
          role,
          provider: this.selectedProvider,
          model: this.selectedModel,
          content: message.text,
        };
      });
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
      this.invalidateSummaryCache();
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
    if (this.selectedProvider === 'ollama') return 'llama3.1';
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
      .filter(
        (chat) =>
          chat.titulo.toLowerCase().includes(search) ||
          chat.historial.some((m) => m.text.toLowerCase().includes(search)),
      )
      .map<PromptListItem>((chat) => ({
        kind: 'own',
        title: chat.titulo,
        subtitle: chat.favorito ? 'Favorito' : 'Prompt propio',
        preview: chat.historial
          .filter((m) => m.role === 'user')
          .at(-1)?.text || 'Sin contenido disponible',
        favorite: chat.favorito,
        chat,
      }));

    const shared = this.sharedPrompts
      .filter(
        (item) =>
          item.prompt.toLowerCase().includes(search) ||
          item.from_user.toLowerCase().includes(search) ||
          (item.source_chat_title || '').toLowerCase().includes(search),
      )
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
    this.sidebarToggleService.toggle();
  }

  closeSidebar() {
    this.sidebarToggleService.setOpen(false);
  }

  closeSidebarOnMobile() {
    if (globalThis.innerWidth < 1024) {
      this.sidebarToggleService.setOpen(false);
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

  toggleExportMenu(event?: Event) {
    event?.stopPropagation();
    this.isExportMenuOpen = !this.isExportMenuOpen;
  }

  closeExportMenu() {
    this.isExportMenuOpen = false;
  }

  async exportChatSummary(format: SummaryExportFormat) {
    if (this.isExportingSummary) return;
    this.isExportingSummary = true;

    try {
      // Preparar últimos N mensajes para enviar al backend
      const messagesToSend = this.prepareMessagesForSummary();
      if (messagesToSend.length === 0) {
        this.setMicStatus('No hay contenido suficiente para generar un resumen.', 'error');
        return;
      }

      const summaryCacheKey = this.buildSummaryCacheKey(messagesToSend);
      let summary: GeneratedSummary;

      if (this.lastSummaryCacheKey === summaryCacheKey && this.lastSummaryCacheValue) {
        summary = this.lastSummaryCacheValue;
      } else {
        summary = await firstValueFrom(
          this.chatApiService.generateSummary({
            chat_id: this.activeChat?.id || null,
            messages: messagesToSend,
            career: this.currentCareer || 'general',
            provider: this.selectedProvider,
            model: this.selectedModel,
            language: 'es',
            max_bot_messages: 10,
            max_total_messages: 20,
          })
        );
        this.lastSummaryCacheKey = summaryCacheKey;
        this.lastSummaryCacheValue = summary;
      }

      // Convertir respuesta a formato PDF/Doc
      const exportReport: ExportReport = {
        title: summary.title,
        generatedAt: summary.generated_at,
        introduction: summary.introduction,
        mlTopics: summary.topics,
        analysis: summary.analysis,
        keyConcepts: summary.concepts,
        conclusions: summary.conclusions,
        recommendations: summary.recommendations,
      };

      const safeBaseName = this.buildSafeFileName(exportReport.title);

      if (format === 'pdf') {
        await this.downloadSummaryAsPdf(exportReport, safeBaseName);
      } else {
        this.downloadSummaryAsDoc(exportReport, safeBaseName);
      }

      this.setMicStatus('Informe exportado correctamente.', 'success');
    } catch (error) {
      console.error('Error generating summary:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.setMicStatus(`Error al generar resumen: ${errorMsg}`, 'error');
    } finally {
      this.isExportingSummary = false;
      this.closeExportMenu();
      this.cdr.detectChanges();
    }
  }

  private prepareMessagesForSummary(): Array<{ role: 'user' | 'bot'; content: string }> {
    if (this.messages.length === 0) return [];

    // Filtrar mensajes de archivo y vacios
    const validMessages = this.messages.filter((msg) => !msg.isFile && msg.text?.trim());

    if (validMessages.length === 0) return [];

    const maxTotal = 20;
    const maxBot = 10;
    const maxCharsPerMessage = 1200;
    let botIncluded = 0;
    const collected: Array<{ role: 'user' | 'bot'; content: string }> = [];

    // Recolectar desde el final para priorizar contexto reciente.
    for (let i = validMessages.length - 1; i >= 0 && collected.length < maxTotal; i--) {
      const msg = validMessages[i];
      if (msg.role === 'bot' && botIncluded >= maxBot) {
        continue;
      }

      let content = (msg.text || '').trim();
      if (!content) continue;
      if (content.length > maxCharsPerMessage) {
        content = `${content.slice(0, maxCharsPerMessage)}...`;
      }

      collected.push({ role: msg.role, content });
      if (msg.role === 'bot') {
        botIncluded++;
      }
    }

    return collected.reverse();
  }

  private buildSummaryCacheKey(messages: Array<{ role: 'user' | 'bot'; content: string }>): string {
    return JSON.stringify({
      chatId: this.activeChat?.id || null,
      provider: this.selectedProvider,
      model: this.selectedModel,
      career: this.currentCareer || 'general',
      language: 'es',
      messages,
    });
  }

  private invalidateSummaryCache() {
    this.lastSummaryCacheKey = null;
    this.lastSummaryCacheValue = null;
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
    this.closeExportMenu();
    // Cerrar dropdown del agente si se hace clic fuera
    if (this.providerDropdownOpen) {
      this.providerDropdownOpen = false;
    }
    if (this.modelDropdownOpen) {
      this.modelDropdownOpen = false;
    }
  }

  onBotMarkdownClick(event: Event) {
    const copyCodeTrigger = this.findCodeCopyTrigger(event);
    if (copyCodeTrigger) {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      void this.copyCodeBlockFromButton(copyCodeTrigger);
      return;
    }

    const fallbackCodeText = this.findCodeTextFromHeaderClick(event);
    if (!fallbackCodeText) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    void this.copyCodeTextWithFeedback(fallbackCodeText);
  }

  private findCodeCopyTrigger(event: Event): HTMLElement | null {
    const codeCopySelector = '[data-action="copy-code"], .mc-code-copy-btn';

    const targetNode = event.target as Node | null;
    const targetElement = targetNode instanceof Element ? targetNode : targetNode?.parentElement;

    const fromTarget = targetElement?.closest(codeCopySelector);
    if (fromTarget instanceof HTMLElement) {
      const isInsideCodeBlock = !!fromTarget.closest('.mc-code-block');
      return isInsideCodeBlock ? fromTarget : null;
    }

    const path = event.composedPath?.() || [];
    for (const node of path) {
      if (!(node instanceof HTMLElement)) continue;
      const candidate = node.closest?.(codeCopySelector);
      if (candidate instanceof HTMLElement) {
        const isInsideCodeBlock = !!candidate.closest('.mc-code-block');
        if (isInsideCodeBlock) {
          return candidate;
        }
      }
    }

    return null;
  }

  private findCodeTextFromHeaderClick(event: Event): string | null {
    const targetNode = event.target as Node | null;
    const targetElement = targetNode instanceof Element ? targetNode : targetNode?.parentElement;
    if (!targetElement) return null;

    const header = targetElement.closest('.mc-code-header, div');
    if (!(header instanceof HTMLElement)) return null;

    const headerText = (header.textContent || '').toLowerCase();
    const copyIntent = headerText.includes('copiar') || headerText.includes('copy');
    if (!copyIntent) return null;

    const sameBlockPre = header.parentElement?.querySelector('pre code') as HTMLElement | null;
    if (sameBlockPre?.textContent?.trim()) {
      return sameBlockPre.textContent.trim();
    }

    const siblingPre = header.nextElementSibling?.matches('pre')
      ? (header.nextElementSibling.querySelector('code') as HTMLElement | null)
      : null;

    return siblingPre?.textContent?.trim() || null;
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
    this.closeExportMenu();
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

    const voiceMode = this.lastInputWasVoice;
    this.lastInputWasVoice = false;
    const promptActual = this.userInput.trim();

    this.ensureActiveChat(promptActual);
    this.moveActiveChatToBottom();
    this.scrollChatListToBottom();

    this.messages.push({ role: 'user', text: promptActual });
    this.invalidateSummaryCache();
    this.userInput = '';
    this.resetMessageTextareaHeight();
    this.scrollToBottom();

    const liveStreamEnabled = false;
    const streamingBotIndex = liveStreamEnabled ? this.createStreamingBotMessage() : null;
    let streamedReply = '';

    this.isSending = true;

    try {
      const activeModel = this.selectedModel.trim() || this.currentModelPlaceholder;
      this.selectedModel = activeModel;

      let botReply: string;
      if (this.activeChat?.id) {
        const previousChatId = this.activeChat.id;
        if (liveStreamEnabled) {
          try {
            botReply = await this.sendMessageToExistingChatStream(
              previousChatId,
              promptActual,
              activeModel,
              voiceMode,
              (chunk) => {
                streamedReply += chunk;
                if (streamingBotIndex !== null) {
                  this.updateStreamingBotMessage(streamingBotIndex, streamedReply);
                }
              },
            );
          } catch (error) {
            const streamStatus =
              error instanceof HttpErrorResponse
                ? error.status
                : typeof error === 'object' && error !== null && 'status' in error
                  ? Number((error as { status?: number }).status)
                  : null;

            if (
              streamStatus === 404 ||
              streamStatus === 405 ||
              streamStatus === 501 ||
              this.isRetryableGatewayError(error)
            ) {
              this.chatCache.delete(previousChatId);
              this.activeChat.id = null;
              this.setMicStatus(
                'El stream no estuvo disponible. Reintentando en modo estándar...',
                'info',
              );
              botReply = await this.startChatInBackend(promptActual, activeModel, voiceMode);
            } else {
              throw error;
            }
          }
        } else {
          try {
            botReply = await this.sendMessageToExistingChat(previousChatId, promptActual, activeModel, voiceMode);
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
            botReply = await this.startChatInBackend(promptActual, activeModel, voiceMode);
          }
        }
      } else {
        if (liveStreamEnabled) {
          try {
            botReply = await this.startChatInBackendStream(
              promptActual,
              activeModel,
              voiceMode,
              (chunk) => {
                streamedReply += chunk;
                if (streamingBotIndex !== null) {
                  this.updateStreamingBotMessage(streamingBotIndex, streamedReply);
                }
              },
            );
          } catch (error) {
            const streamStatus =
              error instanceof HttpErrorResponse
                ? error.status
                : typeof error === 'object' && error !== null && 'status' in error
                  ? Number((error as { status?: number }).status)
                  : null;

            if (streamStatus === 404 || streamStatus === 405 || streamStatus === 501) {
              this.setMicStatus('El stream no estuvo disponible. Reintentando en modo estándar...', 'info');
              botReply = await this.startChatInBackend(promptActual, activeModel, voiceMode);
            } else {
              throw error;
            }
          }
        } else {
          botReply = await this.startChatInBackend(promptActual, activeModel, voiceMode);
        }
      }

      if (streamingBotIndex !== null) {
        this.updateStreamingBotMessage(streamingBotIndex, botReply);
      } else {
        this.addBotMessage(botReply);
      }

      // La salida por voz se activa solo cuando el usuario pulsa el icono de escuchar.
    } catch (error) {
      const errorMessage = this.buildSendErrorMessage(error);
      if (streamingBotIndex !== null) {
        this.updateStreamingBotMessage(streamingBotIndex, errorMessage);
      } else {
        this.addBotMessage(errorMessage);
      }
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
    const upstreamDetailRaw =
      error instanceof HttpErrorResponse
        ? String(
            (error.error as { error?: { message?: string }; message?: string } | null)?.error?.message ||
              (error.error as { error?: { message?: string }; message?: string } | null)?.message ||
              ''
          ).trim()
        : '';

    const upstreamDetail =
      upstreamDetailRaw.length > 220
        ? `${upstreamDetailRaw.slice(0, 220).trim()}...`
        : upstreamDetailRaw;

    const status =
      error instanceof HttpErrorResponse
        ? error.status
        : typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status?: number }).status)
          : null;

    if (status !== null) {
      if (status === 502 || status === 503 || status === 504) {
        if (upstreamDetail) {
          return `El servicio de IA no esta disponible temporalmente (${status}). Detalle: ${upstreamDetail}`;
        }
        return 'El servicio de IA no esta disponible temporalmente (502/503/504). Intenta de nuevo en unos segundos.';
      }
      if (status === 404) {
        return 'Este chat ya no existe en el servidor. Crea un nuevo chat y vuelve a intentar.';
      }
      if (status === 422) {
        return 'El servidor rechazo el mensaje por validacion. Revisa modelo/agente e intenta nuevamente.';
      }
      if (status === 0) {
        return 'No hay conexion con el backend. Verifica internet o CORS del servidor.';
      }
    }

    if (upstreamDetail) {
      return `No pude obtener respuesta del backend. Detalle: ${upstreamDetail}`;
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
      this.invalidateSummaryCache();
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
      this.invalidateSummaryCache();
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
    this.invalidateSummaryCache();
    this.userInput = '';
    this.activeChat = null;
    this.selectedProvider = 'gemini';
    this.selectedModel = this.currentModelPlaceholder;
    this.isChatLoading = false;
    this.closeChatModal();
    this.resetMessageTextareaHeight();
    this.closeSidebarOnMobile();
  }

  openRenameModal(event: Event | null, chat: ChatItem) {
    event?.stopPropagation();
    if (!chat.id) return;
    this.chatModalMode = 'rename';
    this.chatModalTarget = chat;
    this.chatModalTitleDraft = chat.titulo;
  }

  openDeleteModal(event: Event | null, chat: ChatItem) {
    event?.stopPropagation();
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

  private async startChatInBackend(firstMessage: string, model: string, voiceMode = false): Promise<string> {
    const response = await firstValueFrom(
      this.chatApiService.startChat({
        user_id: this.currentUsername,
        message: firstMessage,
        provider: this.selectedProvider,
        model,
        title: this.activeChat?.titulo || 'Nuevo chat',
        language: 'es',
        voice_mode: voiceMode,
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

  private async startChatInBackendStream(
    firstMessage: string,
    model: string,
    voiceMode = false,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const result = await this.chatApiService.streamStartChat(
      {
        user_id: this.currentUsername,
        message: firstMessage,
        provider: this.selectedProvider,
        model,
        title: this.activeChat?.titulo || 'Nuevo chat',
        language: 'es',
        voice_mode: voiceMode,
      },
      onChunk,
    );

    if (this.activeChat) {
      this.activeChat.id = result.chatId || this.activeChat.id;
      this.activeChat.titulo = this.activeChat.titulo || 'Nuevo chat';
      this.activeChat.provider = this.selectedProvider;
      this.activeChat.model = model;
    }

    return result.text;
  }

  private async sendMessageToExistingChat(
    chatId: string,
    message: string,
    model: string,
    voiceMode = false,
  ): Promise<string> {
    const response = await firstValueFrom(
      this.chatApiService.sendMessage(chatId, {
        message,
        provider: this.selectedProvider,
        model,
        language: 'es',
        voice_mode: voiceMode,
      }),
    );

    if (this.activeChat) {
      this.activeChat.provider = this.selectedProvider;
      this.activeChat.model = model;
    }

    return response.response;
  }

  private async sendMessageToExistingChatStream(
    chatId: string,
    message: string,
    model: string,
    voiceMode = false,
    onChunk: (chunk: string) => void,
  ): Promise<string> {
    const text = await this.chatApiService.streamSendMessage(
      chatId,
      {
        message,
        provider: this.selectedProvider,
        model,
        language: 'es',
        voice_mode: voiceMode,
      },
      onChunk,
    );

    if (this.activeChat) {
      this.activeChat.provider = this.selectedProvider;
      this.activeChat.model = model;
    }

    return text;
  }

  private addBotMessage(rawText: string) {
    this.invalidateSummaryCache();
    this.messages.push({
      role: 'bot',
      text: rawText,
      html: this.formatBotContent(rawText),
    });
  }

  async copyBotResponse(message: ChatMessage, index: number) {
    const text = (message.text || '').trim();
    if (!text) return;

    try {
      await globalThis.navigator?.clipboard?.writeText(text);
      this.copiedMessageIndex = index;
      if (this.copiedMessageTimeoutId) {
        clearTimeout(this.copiedMessageTimeoutId);
      }
      this.copiedMessageTimeoutId = setTimeout(() => {
        this.copiedMessageIndex = null;
        this.copiedMessageTimeoutId = null;
        this.cdr.detectChanges();
      }, 1600);
      this.setMicStatus('Respuesta copiada al portapapeles.', 'success');
      this.cdr.detectChanges();
    } catch {
      this.setMicStatus('No se pudo copiar la respuesta.', 'error');
      this.cdr.detectChanges();
    }
  }

  toggleListenBotResponse(message: ChatMessage, index: number) {
    const text = (message.text || '').trim();
    if (!text) return;

    if (this.isSpeechPlaying && this.speakingMessageIndex === index) {
      this.stopBotSpeech();
      this.setMicStatus('Audio detenido.', 'info');
      this.cdr.detectChanges();
      return;
    }

    this.speakingMessageIndex = index;
    this.speakBotReply(text);
  }

  private createStreamingBotMessage() {
    this.messages.push({
      role: 'bot',
      text: '',
      html: '<p class="text-slate-400 dark:text-slate-500">Escribiendo...</p>',
    });
    return this.messages.length - 1;
  }

  private updateStreamingBotMessage(index: number, rawText: string) {
    const current = this.messages[index];
    if (!current) return;

    this.messages[index] = {
      ...current,
      role: 'bot',
      text: rawText,
      html: this.formatBotContent(rawText || ' '),
    };
    this.invalidateSummaryCache();
    this.cdr.detectChanges();
    this.scrollToBottom();
  }

  private formatBotContent(content: string): string {
    const normalizedContent = this.normalizeMarkdownForCode(content || '');

    const stepsAsBlocks = normalizedContent
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

    const styled = parsed
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

    return this.decorateCodeBlocks(styled);
  }

  private normalizeMarkdownForCode(content: string): string {
    const source = (content || '').replace(/\\n/g, '\n').trim();
    if (!source) return '';
    if (source.includes('```')) return source;

    const lines = source.split('\n');
    const codeLikeLines = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/^(const|let|var|function|class|def|import\s+|from\s+|if\s*\(|for\s*\(|while\s*\(|return\b|public\s+|private\s+|SELECT\b|INSERT\b|UPDATE\b|DELETE\b)/i.test(trimmed)) {
        return true;
      }
      return /[{};=<>]/.test(trimmed);
    }).length;

    if (codeLikeLines >= 3 && lines.length <= 60) {
      return `\`\`\`text\n${source}\n\`\`\``;
    }

    return source;
  }

  private decorateCodeBlocks(html: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild as HTMLElement | null;
    if (!root) return html;

    root.querySelectorAll('pre > code').forEach((codeElement) => {
      const pre = codeElement.parentElement as HTMLElement | null;
      if (!pre) return;

      const languageMatch = codeElement.className.match(/language-([a-z0-9+#.-]+)/i);
      const declaredLanguage = (languageMatch?.[1] || 'text').toLowerCase();
      const rawCode = codeElement.textContent || '';
      const highlighted = this.highlightCodeText(rawCode, declaredLanguage);
      codeElement.innerHTML = highlighted.html;

      const languageLabel = (highlighted.language || declaredLanguage || 'codigo').toLowerCase();

      const wrapper = doc.createElement('div');
      wrapper.className = 'mc-code-block';

      const header = doc.createElement('div');
      header.className = 'mc-code-header';

      const label = doc.createElement('span');
      label.className = 'mc-code-lang';
      label.textContent = languageLabel;

      const copyButton = doc.createElement('span');
      copyButton.className = 'mc-code-copy-btn';
      copyButton.setAttribute('data-action', 'copy-code');
      copyButton.setAttribute('role', 'button');
      copyButton.setAttribute('tabindex', '0');
      copyButton.innerHTML = '<span class="mc-code-copy-icon" aria-hidden="true">⧉</span><span>Copiar codigo</span>';
      copyButton.setAttribute('aria-label', 'Copiar bloque de codigo');

      header.appendChild(label);
      header.appendChild(copyButton);

      pre.classList.add('mc-code-pre');
      codeElement.classList.add('mc-code-content');

      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });

    return root.innerHTML;
  }

  private highlightCodeText(rawCode: string, languageHint: string): { html: string; language: string } {
    const escaped = this.escapeHtml(rawCode || '');
    const placeholders: string[] = [];

    const stash = (source: string, regexp: RegExp, className: string) =>
      source.replace(regexp, (match) => {
        const token = `@@TOK${placeholders.length}@@`;
        placeholders.push(`<span class="hljs-${className}">${match}</span>`);
        return token;
      });

    let html = escaped;
    html = stash(html, /\/\*[\s\S]*?\*\//g, 'comment');
    html = stash(html, /(^|\s)(#.*)$/gm, 'comment');
    html = stash(html, /(^|\s)(\/\/.*)$/gm, 'comment');
    html = stash(html, /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, 'string');

    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hljs-number">$1</span>');
    html = html.replace(
      /\b(const|let|var|function|class|return|if|else|for|while|switch|case|break|continue|try|catch|finally|new|import|from|export|default|async|await|public|private|protected|static|def|elif|pass|True|False|None|SELECT|INSERT|UPDATE|DELETE|WHERE|JOIN|ORDER|GROUP|BY|LIMIT)\b/g,
      '<span class="hljs-keyword">$1</span>',
    );

    html = html.replace(/@@TOK(\d+)@@/g, (_match: string, index: string) => placeholders[Number(index)] || '');
    return { html, language: languageHint || 'text' };
  }

  private escapeHtml(value: string): string {
    return (value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async copyCodeBlockFromButton(buttonElement: HTMLElement) {
    const button = buttonElement;
    const codeBlock = button.closest('.mc-code-block') as HTMLElement | null;
    const codeContent =
      (codeBlock?.querySelector('.mc-code-content') as HTMLElement | null) ||
      (codeBlock?.querySelector('pre code') as HTMLElement | null) ||
      (button.closest('.mc-code-header')?.nextElementSibling?.querySelector('code') as HTMLElement | null);
    const codeText = (codeContent?.textContent || '').trim();
    if (!codeText) return;

    const originalHtml = button.innerHTML || '<span class="mc-code-copy-icon" aria-hidden="true">⧉</span><span>Copiar codigo</span>';
    if (button instanceof HTMLButtonElement) {
      button.disabled = true;
    } else {
      button.setAttribute('aria-disabled', 'true');
    }
    button.innerHTML = '<span class="mc-code-copy-icon" aria-hidden="true">…</span><span>Copiando...</span>';

    try {
      await this.copyTextToClipboard(codeText);
      button.innerHTML = '<span class="mc-code-copy-icon" aria-hidden="true">✓</span><span>Copiado</span>';
      button.classList.add('is-copied');
      this.setMicStatus('Código copiado al portapapeles.', 'success');
    } catch {
      button.innerHTML = '<span class="mc-code-copy-icon" aria-hidden="true">!</span><span>Error</span>';
      this.setMicStatus('No se pudo copiar el bloque de código.', 'error');
    } finally {
      this.cdr.detectChanges();
      setTimeout(() => {
        if (button instanceof HTMLButtonElement) {
          button.disabled = false;
        } else {
          button.removeAttribute('aria-disabled');
        }
        button.innerHTML = originalHtml;
        button.classList.remove('is-copied');
      }, 1200);
    }
  }

  private async copyCodeTextWithFeedback(codeText: string) {
    if (!codeText.trim()) return;
    try {
      await this.copyTextToClipboard(codeText);
      this.setMicStatus('Código copiado al portapapeles.', 'success');
    } catch {
      this.setMicStatus('No se pudo copiar el bloque de código.', 'error');
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async copyTextToClipboard(text: string) {
    const nav = globalThis.navigator;
    if (globalThis.isSecureContext && nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return;
    }

    // Fallback legacy para navegadores sin Clipboard API disponible.
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.style.position = 'fixed';
    helper.style.left = '-9999px';
    helper.style.top = '0';
    helper.style.opacity = '0';
    helper.setAttribute('readonly', 'true');
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    helper.setSelectionRange(0, helper.value.length);

    const copied = document.execCommand('copy');
    document.body.removeChild(helper);
    if (!copied) {
      throw new Error('COPY_FAILED');
    }
  }

  private buildExecutiveReport(): ExportReport | null {
    const relevantMessages = this.messages.filter((message) => !message.isFile && !!message.text?.trim());
    if (relevantMessages.length === 0) return null;

    const cleanedTexts = relevantMessages
      .map((message) => this.stripMarkdownForExport(message.text || ''))
      .filter((text) => text.length > 0);

    if (cleanedTexts.length === 0) return null;

    const combined = cleanedTexts.join(' ');
    const insights = this.extractRankedInsights(relevantMessages);
    const topicLabels = this.detectConversationTopics(combined);
    const mlTopics = this.detectMlTopics(combined);
    const topTopics = topicLabels.slice(0, 3);
    const mainSubject = this.buildMainSubject(relevantMessages, topTopics);

    const analysis = insights
      .slice(0, 12)
      .map((item) => this.synthesizeAnalysisPoint(item.text))
      .filter((text) => !!text)
      .filter((text, index, all) => all.findIndex((candidate) => this.normalizeForDedup(candidate) === this.normalizeForDedup(text)) === index)
      .slice(0, 6);

    const recommendations = insights
      .filter((item) => item.isRecommendation)
      .slice(0, 10)
      .map((item) => this.synthesizeRecommendationPoint(item.text))
      .filter((text) => !!text)
      .filter((text, index, all) => all.findIndex((candidate) => this.normalizeForDedup(candidate) === this.normalizeForDedup(text)) === index)
      .slice(0, 5);

    const keyConcepts = this.extractKeyConceptsWithQuotes(relevantMessages).slice(0, 5);

    const title = this.activeChat?.titulo?.trim() || 'Conversacion sin titulo';
    const userMessages = relevantMessages.filter((message) => message.role === 'user').length;
    const botMessages = relevantMessages.filter((message) => message.role === 'bot').length;
    const objectiveHint = this.pickObjectiveHint(combined);
    const issueHint = this.pickIssueHint(combined);

    const introduction = [
      `Este informe resume de forma ejecutiva los temas trabajados en la conversacion sobre ${mainSubject}, dentro del enfoque de ${this.activeCareerLabel}.`,
      objectiveHint,
      `El analisis considera ${userMessages} intervenciones del usuario y ${botMessages} respuestas del asistente, priorizando acuerdos y conceptos de mayor impacto.`,
    ].join(' ');

    const conclusions = [
      mlTopics.length > 0
        ? `La conversacion abordo conceptos de machine learning con enfasis en ${mlTopics.slice(0, 2).join(' y ')}.`
        : `Se consolida una linea de trabajo centrada en ${mainSubject}, con foco en claridad conceptual y consistencia del enfoque.`,
      issueHint,
      `La conversacion deja una base suficiente para ejecutar mejoras priorizadas sin replicar pasos ya discutidos.`,
    ];

    return {
      title,
      generatedAt: new Date().toLocaleString('es-ES'),
      introduction,
      mlTopics: mlTopics.length > 0 ? mlTopics : topTopics,
      analysis: analysis.length > 0 ? analysis : ['No se detectaron puntos suficientes para elaborar el analisis.'],
      keyConcepts: keyConcepts.length > 0 ? keyConcepts : ['No se detectaron conceptos textuales suficientes en esta conversacion.'],
      conclusions,
      recommendations: recommendations.length > 0 ? recommendations : ['No se detectaron recomendaciones accionables en esta conversacion.'],
    };
  }

  private synthesizeAnalysisPoint(source: string): string {
    const text = source.toLowerCase();

    if (/(salud|medicina|enfermeria|diagnostico|paciente|tratamiento|farmacologia|epidemiologia)/i.test(text)) {
      return 'Se abordaron conceptos del area de salud, priorizando comprension de procesos, criterios de evaluacion y toma de decisiones informada.';
    }
    if (/(derecho|juridico|norma|ley|constitucion|contrato|jurisprudencia|penal|civil|laboral)/i.test(text)) {
      return 'Se trabajaron fundamentos juridicos con enfoque en interpretacion normativa y aplicacion de criterios argumentativos.';
    }
    if (/(educacion|pedagogia|didactica|curriculo|aprendizaje|evaluacion|docente|estudiante)/i.test(text)) {
      return 'Se analizaron elementos pedagogicos y didacticos para fortalecer la planificacion, la evaluacion y el logro de aprendizaje.';
    }
    if (/(economia|finanzas|contabilidad|marketing|administracion|empresa|costos|presupuesto|estrategia comercial)/i.test(text)) {
      return 'Se revisaron nociones de gestion y analisis economico para sustentar decisiones con mayor criterio tecnico y organizacional.';
    }
    if (/(psicologia|sociologia|historia|filosofia|comunicacion|literatura|investigacion|metodologia)/i.test(text)) {
      return 'Se consolidaron enfoques de ciencias sociales y humanidades, enfatizando interpretacion, contexto y rigor conceptual.';
    }
    if (/(machine learning|aprendizaje automatico|aprendizaje supervisado|aprendizaje no supervisado|clasificacion|regresion|feature|caracteristica|dataset|entrenamiento|overfitting|underfitting|precision|recall|f1|validacion cruzada)/i.test(text)) {
      return 'Se explicaron conceptos clave de machine learning, incluyendo preparacion de datos, seleccion de variables y criterios de evaluacion del modelo.';
    }
    if (/(clase|componente|servicio|interfaz|modulo)/i.test(text)) {
      return 'Se reviso la organizacion de componentes y servicios para mantener responsabilidades claras y facilitar mantenimiento.';
    }
    if (/(html|css|ui|interfaz|boton|menu|pantalla)/i.test(text)) {
      return 'Se priorizo la experiencia de usuario en la interfaz, asegurando interacciones mas claras y predecibles.';
    }
    if (/(pdf|doc|informe|export|descarga)/i.test(text)) {
      return 'Se definio un esquema de exportacion de informe orientado a revision ejecutiva y lectura rapida.';
    }
    if (/(error|falla|validacion|no funciona|bloqueo)/i.test(text)) {
      return 'Se identificaron riesgos operativos y se aplicaron criterios de validacion para reducir fallos en flujo productivo.';
    }
    if (/(api|backend|endpoint|integracion|guard|interceptor)/i.test(text)) {
      return 'Se evaluo la integracion con backend para sostener continuidad funcional y trazabilidad de operaciones.';
    }

    return this.buildGeneralAnalysisFromSource(source);
  }

  private buildGeneralAnalysisFromSource(source: string): string {
    const clean = source
      .replace(/\s+/g, ' ')
      .replace(/^[A-ZÁÉÍÓÚÑ][^\s]*\s+/, (match) => match)
      .trim();

    if (!clean) {
      return 'Se consolidaron definiciones clave para mantener coherencia en el desarrollo del tema.';
    }

    const normalized = /[.!?]$/.test(clean) ? clean : `${clean}.`;
    const lead = normalized.charAt(0).toLowerCase() + normalized.slice(1);
    return `Se abordo ${lead}`;
  }

  private synthesizeRecommendationPoint(source: string): string {
    const text = source.toLowerCase();

    if (/(salud|medicina|enfermeria|diagnostico|paciente|tratamiento|farmacologia|epidemiologia)/i.test(text)) {
      return 'Estructurar un plan de estudio o aplicacion con protocolos claros, criterios de evidencia y seguimiento de resultados en salud.';
    }
    if (/(derecho|juridico|norma|ley|constitucion|contrato|jurisprudencia|penal|civil|laboral)/i.test(text)) {
      return 'Organizar las fuentes normativas por jerarquia y complementar con casos para fortalecer la argumentacion juridica.';
    }
    if (/(educacion|pedagogia|didactica|curriculo|aprendizaje|evaluacion|docente|estudiante)/i.test(text)) {
      return 'Definir objetivos de aprendizaje, instrumentos de evaluacion y estrategias didacticas alineadas al contexto educativo.';
    }
    if (/(economia|finanzas|contabilidad|marketing|administracion|empresa|costos|presupuesto|estrategia comercial)/i.test(text)) {
      return 'Aplicar indicadores de seguimiento y comparacion de escenarios para mejorar decisiones de gestion y sostenibilidad.';
    }
    if (/(psicologia|sociologia|historia|filosofia|comunicacion|literatura|investigacion|metodologia)/i.test(text)) {
      return 'Fortalecer el marco teorico y la metodologia de analisis para sostener conclusiones con mayor solidez academica.';
    }
    if (/(machine learning|aprendizaje automatico|aprendizaje supervisado|aprendizaje no supervisado|clasificacion|regresion|feature|caracteristica|dataset|entrenamiento|overfitting|underfitting|precision|recall|f1|validacion cruzada)/i.test(text)) {
      return 'Definir un flujo de ML con datos de entrenamiento/validacion, metricas claras y control de sobreajuste para mejorar la calidad del modelo.';
    }
    if (/(clase|componente|servicio|interfaz|modulo)/i.test(text)) {
      return 'Definir y documentar responsabilidades por clase, componente y servicio para evitar acoplamiento innecesario.';
    }
    if (/(html|css|ui|interfaz|boton|menu|pantalla)/i.test(text)) {
      return 'Estandarizar criterios de interfaz para mantener consistencia visual y reducir friccion de uso.';
    }
    if (/(pdf|doc|informe|export|descarga)/i.test(text)) {
      return 'Validar periodicamente el formato de informe para asegurar que el contenido mantenga claridad y valor ejecutivo.';
    }
    if (/(error|falla|validacion|no funciona|bloqueo)/i.test(text)) {
      return 'Fortalecer validaciones preventivas y manejo de errores para mejorar estabilidad operativa.';
    }
    if (/(api|backend|endpoint|integracion|guard|interceptor)/i.test(text)) {
      return 'Reforzar contratos de integracion y monitoreo de endpoints para minimizar incidencias en produccion.';
    }

    return 'Mantener seguimiento de acuerdos tecnicos y funcionales para asegurar continuidad de implementacion.';
  }

  private extractRankedInsights(messages: ChatMessage[]): Array<{ text: string; score: number; isRecommendation: boolean }> {
    const recommendationRegex =
      /(recomienda|debe|conviene|sugerimos|aplicar|refactor|separar|extraer|renombrar|validar|optimizar|usar|migrar|actualizar|mejorar)/i;
    const technicalRegex =
      /(clase|componente|servicio|metodo|funcion|modulo|interfaz|html|css|typescript|angular|api|guard|interceptor|ruta|modelo|machine learning|aprendizaje automatico|clasificacion|regresion|dataset|feature|entrenamiento|validacion cruzada|precision|recall|f1|overfitting|underfitting)/i;
    const conceptualRegex =
      /(concepto|teoria|fundamento|principio|enfoque|estrategia|proceso|analisis|interpretacion|marco|modelo|metodologia|criterio|hipotesis|sesgo|varianza|generalizacion)/i;

    const candidates: Array<{ text: string; score: number; isRecommendation: boolean }> = [];

    messages.forEach((message) => {
      const cleaned = this.stripMarkdownForExport(message.text || '');
      if (!cleaned) return;

      const parts = cleaned
        .split(/(?<=[.!?])\s+|\n+/)
        .map((part) => this.toCoherentSentence(part))
        .filter((part) => !!part);

      parts.forEach((part) => {
        const isRecommendation = recommendationRegex.test(part);
        const technicalBoost = technicalRegex.test(part) ? 2 : 0;
        const conceptualBoost = conceptualRegex.test(part) ? 2 : 0;
        const roleBoost = message.role === 'user' ? 2 : 1;
        const recBoost = isRecommendation ? 3 : 0;
        const sizeBoost = part.length >= 45 && part.length <= 240 ? 1 : 0;
        const score = roleBoost + technicalBoost + conceptualBoost + recBoost + sizeBoost;

        candidates.push({ text: part, score, isRecommendation });
      });
    });

    const dedup = new Set<string>();
    return candidates
      .sort((a, b) => b.score - a.score)
      .filter((item) => {
        const normalized = this.normalizeForDedup(item.text);
        if (!normalized || dedup.has(normalized)) return false;
        dedup.add(normalized);
        return true;
      });
  }

  private toCoherentSentence(raw: string): string {
    const base = (raw || '')
      .replace(/^[-*\d.)\s]+/, '')
      .replace(/^\s*(y|pero|ademas|entonces|luego|tambien)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!base || base.length < 18) return '';
    if (/^(detalles clave consolidados|resumen general en lenguaje claro|proximo paso recomendado)$/i.test(base)) {
      return '';
    }

    const firstUpper = base.charAt(0).toUpperCase() + base.slice(1);
    const finalText = /[.!?]$/.test(firstUpper) ? firstUpper : `${firstUpper}.`;

    const words = finalText.split(' ').filter(Boolean).length;
    return words < 5 ? '' : finalText;
  }

  private detectConversationTopics(text: string): string[] {
    const topics = this.activeReportTaxonomy.conversationTopics.map((rule) => ({
      label: rule.label,
      score: this.hasKeywordMatch(text, rule.keywords) ? 1 : 0,
    }));

    const rankedTopics = topics.filter((item) => item.score > 0);
    rankedTopics.sort((a, b) => b.score - a.score);
    const sorted = rankedTopics.map((item) => item.label);

    return sorted.length > 0 ? sorted : ['mejoras funcionales del asistente'];
  }

  private detectMlTopics(text: string): string[] {
    return this.activeReportTaxonomy.focusTopics
      .filter((rule) => this.hasKeywordMatch(text, rule.keywords))
      .map((rule) => rule.label)
      .slice(0, 6);
  }

  private extractKeyConceptsWithQuotes(messages: ChatMessage[]): string[] {
    const domainRules = this.activeReportTaxonomy.keyConceptDomains;

    // Agrupa conceptos por dominio y cuenta ocurrencias
    const conceptsByDomain = new Map<string, Array<{ concept: string; score: number; occurrences: number }>>();

    messages.forEach((message) => {
      const cleaned = this.stripMarkdownForExport(message.text || '');
      if (!cleaned) return;

      const parts = cleaned
        .split(/(?<=[.!?])\s+|\n+/)
        .map((part) => part.trim())
        .filter((part) => part.length >= 20 && part.length <= 500);

      parts.forEach((part) => {
        const matchedDomains = domainRules
          .filter((rule) => this.hasKeywordMatch(part, rule.keywords))
          .map((rule) => rule.label);

        // Solo procesa si hay coincidencia con dominio; no fallback a fragmentos crudos
        if (matchedDomains.length === 0) return;

        matchedDomains.forEach((domainLabel) => {
          if (!conceptsByDomain.has(domainLabel)) {
            conceptsByDomain.set(domainLabel, []);
          }

          const domainConcepts = conceptsByDomain.get(domainLabel)!;
          const existing = domainConcepts.find((item) => this.normalizeForDedup(item.concept) === this.normalizeForDedup(domainLabel));
          if (existing) {
            existing.occurrences += 1;
            existing.score += message.role === 'user' ? 2 : 1;
          } else {
            domainConcepts.push({
              concept: domainLabel,
              score: message.role === 'user' ? 2 : 1,
              occurrences: 1,
            });
          }
        });
      });
    });

    // Consolida conceptos por dominio, sin fragmentos crudos
    const result: string[] = [];
    const processed = new Set<string>();

    conceptsByDomain.forEach((concepts, domainLabel) => {
      concepts.sort((a, b) => b.score - a.score || b.occurrences - a.occurrences);

      concepts.slice(0, 3).forEach((item) => {
        const normalized = this.normalizeForDedup(item.concept);
        if (processed.has(normalized)) return;
        processed.add(normalized);

        const conceptLine = `${item.concept} (${item.occurrences}x detectado)`;
        result.push(conceptLine);
      });
    });

    return result.slice(0, 8);
  }

  private inferConceptLabelFromSentence(sentence: string): string {
    const normalized = this.normalizeForDedup(sentence);
    if (!normalized) return '';

    const tokens = normalized
      .split(' ')
      .filter((token) => token.length >= 5)
      .filter((token) => !this.isStopWordForConcept(token));

    if (tokens.length === 0) return '';
    return tokens.slice(0, 2).join(' ');
  }

  private hasKeywordMatch(text: string, keywords: string[]): boolean {
    const normalizedText = this.normalizeForDedup(text);
    if (!normalizedText) return false;

    return keywords.some((keyword) => {
      const normalizedKeyword = this.normalizeForDedup(keyword);
      return !!normalizedKeyword && normalizedText.includes(normalizedKeyword);
    });
  }

  private parseTaxonomyRules(value: unknown): TaxonomyRule[] | null {
    if (!Array.isArray(value)) return null;

    const rules = value
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const rawLabel = (item as { label?: unknown }).label;
        const rawKeywords = (item as { keywords?: unknown }).keywords;
        if (typeof rawLabel !== 'string' || !Array.isArray(rawKeywords)) return null;

        const keywords = rawKeywords
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter((entry) => !!entry);

        if (!rawLabel.trim() || keywords.length === 0) return null;
        return { label: rawLabel.trim(), keywords };
      })
      .filter((entry): entry is TaxonomyRule => !!entry);

    return rules.length > 0 ? rules : null;
  }

  private parseTaxonomyProfile(value: unknown): CareerTaxonomyProfile | null {
    if (!value || typeof value !== 'object') return null;

    const record = value as Record<string, unknown>;
    const displayName = typeof record['displayName'] === 'string' ? record['displayName'].trim() : '';
    const aliasesRaw = Array.isArray(record['aliases']) ? record['aliases'] : [];
    const aliases = aliasesRaw
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter((entry) => !!entry);

    const conversationTopics = this.parseTaxonomyRules(record['conversationTopics']);
    const focusTopics = this.parseTaxonomyRules(record['focusTopics']);
    const keyConceptDomains = this.parseTaxonomyRules(record['keyConceptDomains']);

    if (!displayName || !conversationTopics || !focusTopics || !keyConceptDomains) return null;

    return {
      displayName,
      aliases,
      conversationTopics,
      focusTopics,
      keyConceptDomains,
    };
  }

  private normalizeReportTaxonomyDataset(payload: unknown): ReportTaxonomyDataset | null {
    // Compatibilidad con formato legacy (sin carreras): lo mapeamos a "general".
    const legacyConversation = this.parseTaxonomyRules((payload as Record<string, unknown>)?.['conversationTopics']);
    const legacyFocus = this.parseTaxonomyRules((payload as Record<string, unknown>)?.['focusTopics']);
    const legacyConcepts = this.parseTaxonomyRules((payload as Record<string, unknown>)?.['keyConceptDomains']);
    if (legacyConversation && legacyFocus && legacyConcepts) {
      return {
        defaultCareerKey: 'general',
        careers: {
          general: {
            displayName: 'General multidisciplinario',
            aliases: ['general', 'multidisciplinario'],
            conversationTopics: legacyConversation,
            focusTopics: legacyFocus,
            keyConceptDomains: legacyConcepts,
          },
        },
      };
    }

    if (!payload || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;
    const defaultCareerRaw = typeof record['defaultCareerKey'] === 'string' ? record['defaultCareerKey'].trim() : '';
    const careersRaw = record['careers'];
    if (!defaultCareerRaw || !careersRaw || typeof careersRaw !== 'object' || Array.isArray(careersRaw)) return null;

    const careers = Object.entries(careersRaw as Record<string, unknown>).reduce<Record<string, CareerTaxonomyProfile>>((acc, [careerKey, value]) => {
      const profile = this.parseTaxonomyProfile(value);
      if (!profile) return acc;

      const normalizedKey = this.normalizeForDedup(careerKey).replace(/\s+/g, '_');
      if (!normalizedKey) return acc;

      const aliases = profile.aliases.length > 0 ? profile.aliases : [careerKey, profile.displayName];
      acc[normalizedKey] = {
        ...profile,
        aliases,
      };
      return acc;
    }, {});

    const defaultCareerKey = this.normalizeForDedup(defaultCareerRaw).replace(/\s+/g, '_');
    if (!defaultCareerKey || !careers[defaultCareerKey]) return null;

    return {
      defaultCareerKey,
      careers,
    };
  }

  private resolveCareerProfile(careerRaw: string): CareerTaxonomyProfile {
    const normalizedCareer = this.normalizeForDedup(careerRaw);
    const defaultProfile =
      this.reportTaxonomyDataset.careers[this.reportTaxonomyDataset.defaultCareerKey] ||
      DEFAULT_REPORT_TAXONOMY_DATASET.careers[DEFAULT_REPORT_TAXONOMY_DATASET.defaultCareerKey];

    if (!normalizedCareer) return defaultProfile;

    for (const [careerKey, profile] of Object.entries(this.reportTaxonomyDataset.careers)) {
      const normalizedKey = this.normalizeForDedup(careerKey);
      if (normalizedKey === normalizedCareer) return profile;

      const matchesAlias = profile.aliases.some((alias) => {
        const normalizedAlias = this.normalizeForDedup(alias);
        return !!normalizedAlias && (
          normalizedCareer.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedCareer)
        );
      });

      if (matchesAlias) return profile;
    }

    return defaultProfile;
  }

  private applyCareerScopedTaxonomy(careerRaw: string) {
    const profile = this.resolveCareerProfile(careerRaw);
    this.activeReportTaxonomy = {
      conversationTopics: [...profile.conversationTopics],
      focusTopics: [...profile.focusTopics],
      keyConceptDomains: [...profile.keyConceptDomains],
    };
    this.activeCareerLabel = profile.displayName;
  }

  private async loadReportTaxonomyConfig() {
    try {
      const response = await fetch(this.reportTaxonomyUrl, { cache: 'no-cache' });
      if (!response.ok) return;

      const payload = await response.json();
      const normalized = this.normalizeReportTaxonomyDataset(payload);
      if (!normalized) return;

      this.reportTaxonomyDataset = normalized;
      this.applyCareerScopedTaxonomy(this.currentCareer);
    } catch {
      // Si falla la carga externa, se mantiene la configuracion local por defecto.
    }
  }

  private isStopWordForConcept(token: string): boolean {
    const stopWords = new Set([
      'sobre', 'desde', 'hacia', 'entre', 'porque', 'cuando', 'donde', 'como', 'hacer', 'puedes',
      'quiero', 'necesito', 'tiene', 'tener', 'seria', 'estas', 'estos', 'esta', 'este', 'tambien',
      'mismo', 'misma', 'muchos', 'muchas', 'detalle', 'detalles', 'texto', 'informe', 'resumen',
      'claro', 'formal', 'profesional', 'usuario', 'asistente', 'chat', 'chats', 'conversacion',
      'tema', 'temas', 'cosas', 'algo', 'algunas', 'varias', 'parte', 'partes',
    ]);
    return stopWords.has(token);
  }

  private truncateForConceptEvidence(value: string, maxLength = 170): string {
    const clean = (value || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= maxLength) return clean;
    return `${clean.slice(0, maxLength - 3).trim()}...`;
  }

  private pickObjectiveHint(text: string): string {
    const normalized = text.toLowerCase();
    if (/(salud|medicina|derecho|educacion|pedagogia|economia|finanzas|administracion|psicologia|sociologia|historia|filosofia|ingenieria|tecnologia|investigacion|metodologia)/i.test(normalized)) {
      return 'El objetivo principal fue aclarar conceptos disciplinares y criterios practicos aplicables al campo academico tratado.';
    }
    if (/(resumen|informe|entendible|lenguaje claro)/i.test(normalized)) {
      return 'El objetivo principal fue obtener un resultado de salida claro, breve y facil de entender.';
    }
    return 'El objetivo principal fue ordenar la informacion clave para facilitar su uso posterior.';
  }

  private pickIssueHint(text: string): string {
    const normalized = text.toLowerCase();
    if (/(error|no funciona|falla|problema|no aparece)/i.test(normalized)) {
      return 'Durante la conversacion se identificaron puntos de fallo y se enfocaron ajustes para mejorar la confiabilidad.';
    }
    if (/(investigacion|metodologia|criterio|evidencia|evaluacion|analisis|decision)/i.test(normalized)) {
      return 'Se identificaron criterios de analisis y evaluacion para mejorar la calidad de decisiones en el tema tratado.';
    }
    return 'Se consolidaron decisiones para evitar redundancia y priorizar informacion necesaria.';
  }

  private stripMarkdownForExport(text: string): string {
    return (text || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeForDedup(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildMainSubject(messages: ChatMessage[], fallbackTopics: string[]): string {
    const userCorpus = messages
      .filter((message) => message.role === 'user')
      .map((message) => this.stripMarkdownForExport(message.text || ''))
      .join(' ')
      .toLowerCase();

    const tokens = userCorpus
      .split(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 5);

    const stopWords = new Set([
      'sobre', 'desde', 'hacia', 'entre', 'porque', 'cuando', 'donde', 'como', 'hacer', 'puedes',
      'quiero', 'necesito', 'tiene', 'tener', 'seria', 'estas', 'estos', 'esta', 'este', 'tambien',
      'mismo', 'misma', 'muchos', 'muchas', 'detalle', 'detalles', 'texto', 'informe', 'resumen',
      'claro', 'formal', 'profesional', 'usuario', 'asistente', 'chat', 'chats', 'conversacion',
    ]);

    const counts = new Map<string, number>();
    tokens.forEach((token) => {
      if (stopWords.has(token)) return;
      counts.set(token, (counts.get(token) || 0) + 1);
    });

    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([token]) => token);

    if (top.length > 0) {
      return top.join(', ');
    }

    return fallbackTopics.length > 0 ? fallbackTopics.join(', ') : 'los temas principales tratados';
  }

  // ======================= EXPORTACION =======================
  private async downloadSummaryAsPdf(report: ExportReport, baseFileName: string) {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (required = 24) => {
      if (y + required <= pageHeight - margin) return;
      doc.addPage();
      y = margin;
    };

    const writeHeading = (text: string) => {
      ensureSpace(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(text, margin, y);
      y += 20;
    };

    const writeParagraph = (text: string, bullet = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const prefix = bullet ? '• ' : '';
      const lines = doc.splitTextToSize(`${prefix}${text}`, maxWidth);
      lines.forEach((line: string) => {
        ensureSpace(16);
        doc.text(line, margin, y);
        y += 15;
      });
      y += 2;
    };

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 78, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Informe Ejecutivo de Conversacion', margin, 35);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(report.title, margin, 56);

    doc.setTextColor(15, 23, 42);
    y = 102;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Fecha de generacion: ${report.generatedAt}`, margin, y);
    y += 24;

    writeHeading('1. Resumen general en lenguaje claro');
    writeParagraph(report.introduction);

    writeHeading('2. Topicos tecnicos detectados');
    report.mlTopics.forEach((item) => writeParagraph(item, true));

    writeHeading('3. Analisis de los puntos tratados');
    report.analysis.forEach((item) => writeParagraph(item, true));

    writeHeading('4. Conceptos clave detectados');
    report.keyConcepts.forEach((item) => writeParagraph(item, true));

    writeHeading('5. Conclusiones');
    report.conclusions.forEach((item) => writeParagraph(item, true));

    writeHeading('6. Recomendaciones');
    report.recommendations.forEach((item) => writeParagraph(item, true));

    const pdfBlob = doc.output('blob');
    this.downloadBlob(pdfBlob, `${baseFileName}.pdf`);
  }

  private downloadSummaryAsDoc(report: ExportReport, baseFileName: string) {
    const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 28px; line-height: 1.45; }
    .cover { background: #0f172a; color: #fff; border-radius: 12px; padding: 18px 20px; margin-bottom: 16px; }
    .meta { color: #475569; font-size: 12px; margin: 10px 0 18px; }
    h2 { margin: 0 0 8px; font-size: 20px; }
    h3 { margin: 20px 0 8px; font-size: 15px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
    section { margin-bottom: 10px; }
    p { margin: 0; }
    ul { margin: 6px 0 0 20px; }
    li { margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="cover">
    <h2>Informe Ejecutivo de Conversacion</h2>
    <p>${this.escapeHtml(report.title)}</p>
  </div>
  <p class="meta">Fecha de generacion: ${this.escapeHtml(report.generatedAt)}</p>

  <section>
    <h3>1. Introduccion</h3>
    <p>${this.escapeHtml(report.introduction)}</p>
  </section>

  <section>
    <h3>2. Topicos tecnicos detectados</h3>
    <ul>${report.mlTopics.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
  </section>

  <section>
    <h3>3. Analisis de los puntos tratados</h3>
    <ul>${report.analysis.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
  </section>

  <section>
    <h3>4. Conceptos clave detectados</h3>
    <ul>${report.keyConcepts.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
  </section>

  <section>
    <h3>5. Conclusiones</h3>
    <ul>${report.conclusions.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
  </section>

  <section>
    <h3>6. Recomendaciones</h3>
    <ul>${report.recommendations.map((item) => `<li>${this.escapeHtml(item)}</li>`).join('')}</ul>
  </section>
</body>
</html>`;

    const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
    this.downloadBlob(blob, `${baseFileName}.doc`);
  }

  private downloadBlob(blob: Blob, fileName: string) {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }

  private buildSafeFileName(raw: string): string {
    const normalized = (raw || 'resumen-chat')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-_\s]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 48)
      .replace(/^-+|-+$/g, '');

    return normalized || 'resumen-chat';
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
    this.speakingMessageIndex = null;
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

    const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim();

    const ensureSpeechPrefix = (text: string) => {
      return normalizeText(text);
    };

    const hasCodeBlocks = /```[\s\S]*?```/.test(source);
    const withoutCode = source.replace(/```[\s\S]*?```/g, ' ');

    try {
      const rendered = marked.parse(withoutCode, { gfm: true, breaks: true }) as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(rendered, 'text/html');
      const textContent = (doc.body.textContent || '')
        .replace(/\s+/g, ' ')
        .replace(/\s([,.;:!?])/g, '$1')
        .trim();

      const spokenText = ensureSpeechPrefix(textContent);
      if (!spokenText) return '';

      if (hasCodeBlocks) {
        return normalizeText(`${spokenText} Hay código mostrado en pantalla.`);
      }

      return spokenText;
    } catch {
      const fallbackText = source
        .replace(/```[\s\S]*?```/g, ' Código mostrado en pantalla. ')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/^\s{0,3}#{1,6}\s+/gm, '')
        .replace(/^\s*>\s?/gm, '')
        .replace(/[*_~]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      return ensureSpeechPrefix(fallbackText);
    }
  }

  private splitTextForSpeech(text: string, maxChunkLength = 260): string[] {
    const compact = (text || '').replace(/\s+/g, ' ').trim();
    if (!compact) return [];

    const chunks: string[] = [];
    const sentenceCandidates = compact
      .split(/(?<=[.!?;:])\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    const segments = sentenceCandidates.length > 0 ? sentenceCandidates : [compact];
    let current = '';

    const flushCurrent = () => {
      const clean = current.trim();
      if (clean) chunks.push(clean);
      current = '';
    };

    for (const segment of segments) {
      if (segment.length > maxChunkLength) {
        flushCurrent();
        let remaining = segment;
        while (remaining.length > maxChunkLength) {
          let splitPoint = remaining.lastIndexOf(' ', maxChunkLength);
          if (splitPoint <= 0) splitPoint = maxChunkLength;
          chunks.push(remaining.slice(0, splitPoint).trim());
          remaining = remaining.slice(splitPoint).trim();
        }
        if (remaining) current = remaining;
        continue;
      }

      const candidate = current ? `${current} ${segment}` : segment;
      if (candidate.length <= maxChunkLength) {
        current = candidate;
      } else {
        flushCurrent();
        current = segment;
      }
    }

    flushCurrent();
    return chunks;
  }

  private speakChunks(chunks: string[], index = 0) {
    const synthesis = globalThis.speechSynthesis;
    if (!synthesis || index >= chunks.length) {
      this.resetSpeechState();
      this.cdr.detectChanges();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunks[index]);
    utterance.lang = globalThis.navigator?.language || 'es-ES';
    utterance.rate = this.speechRate;
    utterance.pitch = 1;

    utterance.onstart = () => {
      this.isSpeechPlaying = true;
      this.isSpeechPaused = false;
      this.setMicStatus('Respuesta en audio activa.', 'info');
      this.cdr.detectChanges();
    };

    utterance.onend = () => {
      this.speakChunks(chunks, index + 1);
    };

    utterance.onerror = () => {
      this.resetSpeechState();
      this.setMicStatus('No se pudo reproducir el audio del bot.', 'error');
      this.cdr.detectChanges();
    };

    this.activeUtterance = utterance;
    synthesis.speak(utterance);
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

    const chunks = this.splitTextForSpeech(plainText);
    if (chunks.length === 0) {
      this.setMicStatus('No hay texto legible para reproducir en voz.', 'error');
      return;
    }

    this.speakChunks(chunks);
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
     this.sidebarSubscription = this.sidebarToggleService.mobileSidebarOpen$.subscribe(open => {
       this.mobileSidebarOpen = open;
       this.cdr.detectChanges();
     });
     this.onProviderChange();
     void this.loadReportTaxonomyConfig();

     // Actualizar currentUsername con el usuario de sesión
     const currentUser = this.sessionService.getUser();
     if (currentUser?.username) {
       this.currentUsername = currentUser.username;
     }
     this.currentCareer = currentUser?.career || '';
     this.applyCareerScopedTaxonomy(this.currentCareer);

     void this.loadSharedPrompts();

     const chatIdFromRoute = this.route.snapshot.queryParamMap.get('chatId');
     if (chatIdFromRoute) {
       void this.loadChatById(chatIdFromRoute);
     }

      this.sessionSubscription = this.sessionService.session$
        .pipe(
          map((session) => ({
            username: session?.user?.username ?? null,
            career: session?.user?.career ?? null,
          })),
          distinctUntilChanged(
            (prev, curr) => prev.username === curr.username && prev.career === curr.career,
          ),
        )
        .subscribe((sessionInfo) => {
       this.loadProfileImageFromSession();
        // Recargar chats solo cuando cambia el usuario autenticado
        if (sessionInfo.username) {
          this.currentUsername = sessionInfo.username;
          this.currentCareer = sessionInfo.career || '';
          this.applyCareerScopedTaxonomy(this.currentCareer);
          void this.loadChatsByUser();
          return;
       }
        this.currentCareer = '';
        this.applyCareerScopedTaxonomy('');
        this.misChats = [];
        this.lastLoadedChatsUser = null;
      });
   }

  ngOnDestroy() {
    if (this.sessionSubscription) {
      this.sessionSubscription.unsubscribe();
      this.sessionSubscription = null;
    }

    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
      this.sidebarSubscription = null;
    }

    if (this.profileImageObjectUrl) {
      URL.revokeObjectURL(this.profileImageObjectUrl);
      this.profileImageObjectUrl = null;
    }

    if (this.copiedMessageTimeoutId) {
      clearTimeout(this.copiedMessageTimeoutId);
      this.copiedMessageTimeoutId = null;
    }

    this.stopBotSpeech();
  }

  get sharePreviewText(): string {
    return this.buildChatShareText();
  }
}
