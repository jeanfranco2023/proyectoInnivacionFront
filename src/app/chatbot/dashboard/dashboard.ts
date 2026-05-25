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
  
  // Paginación de Usuarios
  currentPage = 1;
  pageSize = 8;
  
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
    this.currentPage = 1; // Reiniciar a la primera página al buscar
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

  // ======================= METRICAS DE DECISIÓN =======================
  get careerStats() {
    if (this.users.length === 0) return [];
    const careerCounts: Record<string, number> = {};
    this.users.forEach((u) => {
      const rawCareer = u.career || 'Sin Carrera';
      let careerName = rawCareer;
      if (rawCareer === 'ingenieria_tecnologia') careerName = 'Ingeniería y Tecnología';
      else if (rawCareer === 'salud_ciencias_medicas') careerName = 'Salud y Ciencias Médicas';
      else if (rawCareer === 'derecho_normatividad') careerName = 'Derecho y Normatividad';
      else if (rawCareer === 'general') careerName = 'General Multidisciplinario';
      
      careerCounts[careerName] = (careerCounts[careerName] || 0) + 1;
    });

    const total = this.users.length;
    const colors = [
      'bg-blue-500 dark:bg-sky-500',
      'bg-emerald-500 dark:bg-emerald-400',
      'bg-violet-500 dark:bg-violet-400',
      'bg-amber-500 dark:bg-amber-400',
      'bg-rose-500 dark:bg-rose-400'
    ];

    return Object.entries(careerCounts)
      .map(([name, count], index) => ({
        name,
        count,
        percentage: Math.round((count / total) * 100),
        colorClass: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);
  }

  get systemKpis() {
    const total = this.users.length;
    if (total === 0) {
      return {
        avgChats: 0,
        activeForumRate: 0,
        totalAdmins: 0
      };
    }

    const totalChats = this.users.reduce((acc, u) => acc + (u.chats_count || 0), 0);
    const activeForumUsers = this.users.filter(u => (u.posts_count || 0) > 0 || (u.comments_count || 0) > 0).length;

    return {
      avgChats: parseFloat((totalChats / total).toFixed(1)),
      activeForumRate: Math.round((activeForumUsers / total) * 100),
      totalAdmins: this.users.filter(u => u.roles.includes('admin')).length
    };
  }

  // ======================= LÓGICA DE PAGINACIÓN =======================
  get paginatedUsers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.filteredUsers.length / this.pageSize);
  }

  get paginationPages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.detectChanges();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.detectChanges();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.detectChanges();
    }
  }
}

