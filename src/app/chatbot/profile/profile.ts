import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthUser } from '../../models/auth/auth-user.types';
import { AuthApiService } from '../../service/auth/auth-api.service';
import { SessionService } from '../../service/auth/session.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe],
  templateUrl: './profile.html',
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: AuthUser | null = null;
  sessionExpiry: number | null = null;
  private selectedImageFile: File | null = null;
  isSaving = false;
  saveMessage = '';
  private profileImageObjectUrl: string | null = null;

  constructor(
    private readonly authApiService: AuthApiService,
    private readonly sessionService: SessionService,
    private readonly router: Router,
  ) {}

  ngOnInit() {
    if (!this.sessionService.isAuthenticated()) {
      void this.router.navigate(['/login']);
      return;
    }

    this.user = this.sessionService.getUser();
    this.sessionExpiry = this.sessionService.session?.expiresAt ?? null;
    this.refreshProfileImageFromServer();
  }

  ngOnDestroy() {
    if (this.profileImageObjectUrl) {
      URL.revokeObjectURL(this.profileImageObjectUrl);
      this.profileImageObjectUrl = null;
    }
  }

  private refreshProfileImageFromServer() {
    if (!this.user?.profile_image_url) {
      if (this.profileImageObjectUrl) {
        URL.revokeObjectURL(this.profileImageObjectUrl);
        this.profileImageObjectUrl = null;
      }
      return;
    }

    // Si viene URL absoluta legacy, se usa directamente.
    if (this.user.profile_image_url.startsWith('http')) {
      this.profileImageObjectUrl = this.user.profile_image_url;
      return;
    }

    this.authApiService.getProfileImageBlob(`${Date.now()}`).subscribe({
      next: (blob) => {
        if (this.profileImageObjectUrl && this.profileImageObjectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(this.profileImageObjectUrl);
        }
        this.profileImageObjectUrl = URL.createObjectURL(blob);
      },
    });
  }

  openImagePicker(fileInput: HTMLInputElement) {
    fileInput.click();
  }

  onProfileImageSelected(event: Event) {
    const target = event.target as HTMLInputElement | null;
    const file = target?.files?.[0] || null;
    this.selectedImageFile = file;

    if (target) {
      target.value = '';
    }

    if (file) {
      this.uploadProfileImage();
    }
  }

  uploadProfileImage() {
    if (!this.selectedImageFile || this.isSaving) return;

    this.isSaving = true;
    this.saveMessage = '';

    this.authApiService.uploadProfileImage(this.selectedImageFile).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.sessionService.updateUser(updatedUser);
        this.selectedImageFile = null;
        this.refreshProfileImageFromServer();
        this.saveMessage = 'Imagen de perfil actualizada.';
      },
      error: () => {
        this.saveMessage = 'No se pudo subir la imagen. Usa una imagen válida y liviana.';
      },
      complete: () => {
        this.isSaving = false;
      },
    });
  }

  removeProfileImage() {
    if (this.isSaving) return;

    this.isSaving = true;
    this.saveMessage = '';

    this.authApiService.deleteProfileImage().subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.sessionService.updateUser(updatedUser);
        this.refreshProfileImageFromServer();
        this.saveMessage = 'Imagen de perfil eliminada.';
      },
      error: () => {
        this.saveMessage = 'No se pudo eliminar la imagen.';
      },
      complete: () => {
        this.isSaving = false;
      },
    });
  }

  get displayName(): string {
    return this.user?.display_name?.trim() || 'No definido';
  }

  get username(): string {
    return this.user?.username?.trim() || 'No definido';
  }

  get career(): string {
    return this.user?.career?.trim() || 'No definido';
  }

  get rolesText(): string {
    const roles = this.user?.roles ?? [];
    return roles.length > 0 ? roles.join(', ') : 'No definido';
  }

  get roleList(): string[] {
    return this.user?.roles?.length ? this.user.roles : [];
  }

  get initials(): string {
    const parts = this.displayName
      .split(' ')
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  get sessionStatus(): string {
    if (!this.sessionExpiry) return 'No disponible';

    const diffMs = this.sessionExpiry - Date.now();
    if (diffMs <= 0) return 'Expirada';

    const totalMinutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours <= 0) return `Activa (${minutes} min restantes)`;
    return `Activa (${hours} h ${minutes} min restantes)`;
  }

  get themePreference(): string {
    return this.user?.theme_preference || 'system';
  }

  get profileImageUrl(): string | null {
    const value = this.profileImageObjectUrl?.trim();
    return value || null;
  }
}
