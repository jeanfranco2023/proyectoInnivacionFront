import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionService } from '../../service/auth/session.service';
import { AuthApiService } from '../../service/auth/auth-api.service';
import { SidebarToggleService } from '../../service/sidebar/sidebar-toggle.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive]
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() misChats: any[] = [];
  @Input() activeChatId: string | null = null;
  @Input() activeChatMessages: any[] = [];
  @Input() isLoadingChats: boolean = false;
  @Input() searchTerm: string = '';
  @Output() searchTermChange = new EventEmitter<string>();

  @Output() onNewChat = new EventEmitter<void>();
  @Output() onSelectChat = new EventEmitter<any>();
  @Output() onRenameChat = new EventEmitter<any>();
  @Output() onDeleteChat = new EventEmitter<any>();
  @Output() onSelectInteraction = new EventEmitter<number>();

  mobileSidebarOpen = false;
  isUserMenuOpen = false;
  isDarkMode = false;
  nombreUsuario = 'Seven';
  isAdmin = false;
  profileImageUrl: string | null = null;
  private profileImageObjectUrl: string | null = null;
  private subscriptions = new Subscription();

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly sessionService: SessionService,
    private readonly authApiService: AuthApiService,
    private readonly sidebarToggleService: SidebarToggleService,
    private readonly router: Router
  ) {}

  ngOnInit() {
    // 1. Suscribirse a cambios en la sesión para el usuario y roles
    this.subscriptions.add(
      this.sessionService.session$.subscribe(session => {
        const user = session?.user;
        if (user) {
          this.nombreUsuario = user.display_name || 'Seven';
          this.isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');
          this.isDarkMode = !!user.isDark || document.documentElement.classList.contains('dark');
          document.documentElement.classList.toggle('dark', this.isDarkMode);
          this.loadProfileImageFromSession();
        } else {
          this.nombreUsuario = 'Seven';
          this.isAdmin = false;
          this.profileImageUrl = null;
        }
        this.cdr.detectChanges();
      })
    );

    // 2. Suscribirse al estado del sidebar toggle en móvil
    this.subscriptions.add(
      this.sidebarToggleService.mobileSidebarOpen$.subscribe(open => {
        this.mobileSidebarOpen = open;
        this.cdr.detectChanges();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.profileImageObjectUrl) {
      URL.revokeObjectURL(this.profileImageObjectUrl);
    }
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  closeSidebar() {
    this.sidebarToggleService.setOpen(false);
  }

  closeSidebarOnMobile() {
    if (globalThis.innerWidth < 1024) {
      this.sidebarToggleService.setOpen(false);
    }
  }

  toggleUserMenu(event?: Event) {
    event?.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeUserMenu();
  }

  onUserMenuAction(action: 'profile' | 'theme' | 'logout') {
    this.closeUserMenu();
    if (action === 'profile') {
      void this.router.navigateByUrl('/profile');
      this.closeSidebarOnMobile();
    } else if (action === 'theme') {
      this.toggleDarkMode();
    } else if (action === 'logout') {
      this.logout();
    }
  }

  private toggleDarkMode() {
    const nextMode = !this.isDarkMode;
    this.isDarkMode = nextMode;
    document.documentElement.classList.toggle('dark', nextMode);
    globalThis.localStorage?.setItem('chat-theme', nextMode ? 'dark' : 'light');

    const nextPreference = nextMode ? 'dark' : 'light';
    this.authApiService.updateThemePreference(nextPreference).subscribe({
      next: (user) => {
        this.sessionService.updateUser(user);
      },
      error: (err) => console.error('Error saving theme preference:', err)
    });
  }

  private logout() {
    if (this.profileImageObjectUrl) {
      URL.revokeObjectURL(this.profileImageObjectUrl);
      this.profileImageObjectUrl = null;
    }
    this.sessionService.clearSession();
    void this.router.navigateByUrl('/login');
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

  getWebChats(): any[] {
    return (this.misChats || []).filter(chat => chat.titulo !== 'Conversación de Telegram');
  }

  getTelegramChats(): any[] {
    return (this.misChats || []).filter(chat => chat.titulo === 'Conversación de Telegram');
  }

  getRecentInteractions(): Array<{ text: string, originalIndex: number, count: number }> {
    if (!this.activeChatMessages || this.activeChatMessages.length === 0) return [];
    
    // Filtrar los mensajes de tipo "usuario" que no sean archivos adjuntos
    const userInteractions = this.activeChatMessages
      .map((msg, index) => ({
        text: msg.text || '',
        role: msg.role,
        isFile: !!msg.isFile,
        originalIndex: index
      }))
      .filter(msg => msg.role === 'user' && !msg.isFile);
    
    // Mapear con conteo secuencial
    const mapped = userInteractions.map((item, idx) => {
      // Recortar texto largo de forma elegante para no sobrecargar el diseño lateral
      const cleanText = item.text.trim();
      const sliced = cleanText.length > 28 ? cleanText.substring(0, 28) + '...' : cleanText;
      return {
        text: sliced || 'Mensaje de texto',
        originalIndex: item.originalIndex,
        count: idx + 1
      };
    });
    
    // Retornar las últimas 4 interacciones
    return mapped.slice(-4);
  }
}
