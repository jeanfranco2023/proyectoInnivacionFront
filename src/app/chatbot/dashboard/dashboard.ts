import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardApiService, DashboardStats, DashboardUser } from '../../service/dashboard/dashboard-api.service';
import { SessionService } from '../../service/auth/session.service';
import { SidebarToggleService } from '../../service/sidebar/sidebar-toggle.service';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  users: DashboardUser[] = [];
  filteredUsers: DashboardUser[] = [];
  searchTerm = '';
  
  isLoadingStats = false;
  isLoadingUsers = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly dashboardApiService: DashboardApiService,
    private readonly sessionService: SessionService,
    private readonly sidebarToggleService: SidebarToggleService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadStats();
    this.loadUsers();
  }

  loadStats() {
    this.isLoadingStats = true;
    this.dashboardApiService.getStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.errorMessage = 'No se pudieron cargar las estadísticas del sistema.';
        this.isLoadingStats = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadUsers() {
    this.isLoadingUsers = true;
    this.dashboardApiService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filterUsers();
        this.isLoadingUsers = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading dashboard users:', err);
        this.errorMessage = 'No se pudo cargar la lista de usuarios.';
        this.isLoadingUsers = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterUsers() {
    const search = this.searchTerm.trim().toLowerCase();
    if (!search) {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(
        (u) =>
          u.username.toLowerCase().includes(search) ||
          (u.display_name && u.display_name.toLowerCase().includes(search)) ||
          (u.career && u.career.toLowerCase().includes(search))
      );
    }
    this.cdr.detectChanges();
  }

  toggleRole(user: DashboardUser) {
    const isCurrentlyAdmin = user.roles.includes('admin');
    const newRoles = isCurrentlyAdmin ? ['user'] : ['user', 'admin'];
    const confirmMsg = isCurrentlyAdmin
      ? `¿Estás seguro de que deseas degradar a @${user.username} a usuario regular?`
      : `¿Estás seguro de que deseas promover a @${user.username} a administrador?`;

    if (!confirm(confirmMsg)) return;

    this.dashboardApiService.updateUserRole(user.username, newRoles).subscribe({
      next: (res) => {
        user.roles = res.roles;
        this.successMessage = `Rol actualizado con éxito para @${user.username}`;
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating user role:', err);
        this.errorMessage = 'No se pudo actualizar el rol del usuario.';
        this.cdr.detectChanges();
      }
    });
  }

  deleteUser(user: DashboardUser) {
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR permanentemente la cuenta de @${user.username}? Esta acción no se puede deshacer.`)) {
      return;
    }

    this.dashboardApiService.deleteUser(user.username).subscribe({
      next: (res) => {
        if (res.deleted) {
          this.users = this.users.filter((u) => u.username !== user.username);
          this.filterUsers();
          this.successMessage = `Usuario @${user.username} eliminado correctamente.`;
          setTimeout(() => {
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 3000);
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.errorMessage = 'No se pudo eliminar el usuario.';
        this.cdr.detectChanges();
      }
    });
  }

  toggleSidebar() {
    this.sidebarToggleService.toggle();
  }
}
