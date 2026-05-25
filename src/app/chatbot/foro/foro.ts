import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForoApiService, Post, Comment } from '../../service/foro/foro-api.service';
import { SessionService } from '../../service/auth/session.service';
import { SidebarToggleService } from '../../service/sidebar/sidebar-toggle.service';
import { SidebarComponent } from '../sidebar/sidebar';
import { enviroment } from '../../../environments/enviroment';

@Component({
  selector: 'app-foro',
  templateUrl: './foro.html',
  styleUrl: './foro.css',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent]
})
export class ForoComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  commentsByPost: { [postId: string]: Comment[] } = {};
  expandedComments: { [postId: string]: boolean } = {};
  isLoadingPosts = false;
  isLoadingComments: { [postId: string]: boolean } = {};
  
  newPostTitle = '';
  newPostContent = '';
  newPostFile: File | null = null;
  newPostFilePreviewUrl: string | null = null;
  newCommentTexts: { [postId: string]: string } = {};
  newCommentFiles: { [postId: string]: File | null } = {};

  currentUserUsername = 'demo';
  isAdmin = false;
  errorMessage = '';
  successMessage = '';
  private pollIntervalId: any = null;

  // Diccionario de facultades y carreras obtenido del backend
  facultiesMap: { [key: string]: string[] } = {};
  facultyKeys: string[] = [];

  // Filtros de búsqueda
  selectedFilterFaculty = '';
  selectedFilterCareer = '';
  filterCareersList: string[] = [];
  activeFilterFaculties: string[] = [];
  activeFilterCareersMap: { [key: string]: string[] } = {};

  // Formulario de nueva publicación
  newPostFaculty = '';
  newPostCareer = '';
  formCareersList: string[] = [];

  constructor(
    private readonly foroApiService: ForoApiService,
    private readonly sessionService: SessionService,
    private readonly sidebarToggleService: SidebarToggleService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const user = this.sessionService.getUser();
    if (user) {
      this.currentUserUsername = user.username || 'demo';
      this.isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');
    }
    this.loadFaculties();
    this.loadPosts();
    this.startPolling();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  startPolling() {
    this.stopPolling();
    this.pollIntervalId = setInterval(() => {
      this.pollPosts();
    }, 7000); // Polling cada 7 segundos para sincronización en tiempo real
  }

  stopPolling() {
    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = null;
    }
  }

  pollPosts() {
    this.foroApiService.getPosts(this.selectedFilterCareer || undefined).subscribe({
      next: (fetchedPosts) => {
        const fetchedIds = new Set(fetchedPosts.map(p => p.id));
        
        fetchedPosts.forEach((fetched) => {
          const local = this.posts.find(p => p.id === fetched.id);
          if (local) {
            local.likes = fetched.likes;
            local.likes_count = fetched.likes_count;
            local.is_liked = fetched.is_liked;
            local.is_pinned = fetched.is_pinned;
            local.comments_count = fetched.comments_count;
            local.title = fetched.title;
            local.content = fetched.content;
            local.file_url = fetched.file_url;
            local.file_name = fetched.file_name;
            local.author_display_name = fetched.author_display_name;
            local.author_username = fetched.author_username;
          } else {
            this.posts.push(fetched);
          }
        });

        this.posts.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        this.posts = this.posts.filter(p => fetchedIds.has(p.id));

        this.posts.forEach((post) => {
          if (this.expandedComments[post.id]) {
            this.silentLoadComments(post.id);
          }
        });

        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error silent polling posts:', err)
    });
  }

  silentLoadComments(postId: string) {
    this.foroApiService.getComments(postId).subscribe({
      next: (comments) => {
        this.commentsByPost[postId] = comments;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error silently loading comments:', err)
    });
  }

  getApiUrl(path: string | undefined): string {
    if (!path) return '';
    return `${enviroment.apiBaseUrl.trim()}${path}`;
  }

  isImage(url: string | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.png') || 
           lower.endsWith('.jpg') || 
           lower.endsWith('.jpeg') || 
           lower.endsWith('.webp') || 
           lower.endsWith('.gif');
  }

  isDocument(url: string | undefined): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.pdf') || 
           lower.endsWith('.doc') || 
           lower.endsWith('.docx');
  }

  loadFaculties() {
    this.foroApiService.getFaculties().subscribe({
      next: (map) => {
        this.facultiesMap = map;
        this.facultyKeys = Object.keys(map);
        this.setDefaultUserFacultyAndCareer();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading faculties:', err);
      }
    });
  }

  setDefaultUserFacultyAndCareer() {
    const user = this.sessionService.getUser();
    if (!user || !user.career) return;

    const userCareerNormalized = user.career.trim().toLowerCase();

    for (const faculty of this.facultyKeys) {
      const careers = this.facultiesMap[faculty] || [];
      const foundCareer = careers.find(
        (c) => c.trim().toLowerCase() === userCareerNormalized
      );

      if (foundCareer) {
        this.newPostFaculty = faculty;
        this.formCareersList = careers;
        this.newPostCareer = foundCareer;
        break;
      }
    }
  }

  loadPosts() {
    this.isLoadingPosts = true;
    this.errorMessage = '';
    this.foroApiService.getPosts(this.selectedFilterCareer || undefined).subscribe({
      next: (posts) => {
        this.posts = posts;
        
        // Si no hay filtros aplicados, deducimos las facultades y carreras con posts existentes
        if (!this.selectedFilterFaculty && !this.selectedFilterCareer) {
          this.calculateActiveFilters(posts);
        }

        this.isLoadingPosts = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading posts:', err);
        this.errorMessage = 'No se pudieron cargar las publicaciones del foro.';
        this.isLoadingPosts = false;
        this.cdr.detectChanges();
      }
    });
  }

  calculateActiveFilters(posts: any[]) {
    const facultiesSet = new Set<string>();
    const careersByFaculty: { [faculty: string]: Set<string> } = {};

    for (const post of posts) {
      const fac = post.faculty?.trim();
      const car = post.career?.trim();

      if (fac) {
        facultiesSet.add(fac);
        if (!careersByFaculty[fac]) {
          careersByFaculty[fac] = new Set<string>();
        }
        if (car) {
          careersByFaculty[fac].add(car);
        }
      }
    }

    this.activeFilterFaculties = Array.from(facultiesSet).sort();
    
    this.activeFilterCareersMap = {};
    for (const fac of Object.keys(careersByFaculty)) {
      this.activeFilterCareersMap[fac] = Array.from(careersByFaculty[fac]).sort();
    }
  }

  onFilterFacultyChange() {
    this.selectedFilterCareer = '';
    if (this.selectedFilterFaculty) {
      this.filterCareersList = this.activeFilterCareersMap[this.selectedFilterFaculty] || [];
    } else {
      this.filterCareersList = [];
    }
    this.loadPosts();
  }

  onFilterCareerChange() {
    this.loadPosts();
  }

  onFormFacultyChange() {
    this.newPostCareer = '';
    if (this.newPostFaculty) {
      this.formCareersList = this.facultiesMap[this.newPostFaculty] || [];
    } else {
      this.formCareersList = [];
    }
  }

  clearFilters() {
    this.selectedFilterFaculty = '';
    this.selectedFilterCareer = '';
    this.filterCareersList = [];
    this.loadPosts();
  }

  onPostFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.newPostFile = file;
      if (this.newPostFilePreviewUrl) {
        URL.revokeObjectURL(this.newPostFilePreviewUrl);
        this.newPostFilePreviewUrl = null;
      }
      if (file.type.startsWith('image/')) {
        this.newPostFilePreviewUrl = URL.createObjectURL(file);
      }
      this.cdr.detectChanges();
    }
    if (event.target) {
      event.target.value = '';
    }
  }

  removePostFile() {
    this.newPostFile = null;
    if (this.newPostFilePreviewUrl) {
      URL.revokeObjectURL(this.newPostFilePreviewUrl);
      this.newPostFilePreviewUrl = null;
    }
    this.cdr.detectChanges();
  }

  createPost() {
    const title = this.newPostTitle.trim();
    const content = this.newPostContent.trim();
    const faculty = this.newPostFaculty;
    const career = this.newPostCareer;

    if (!title || !content) {
      this.errorMessage = 'El título y el contenido son obligatorios.';
      return;
    }

    if (!faculty) {
      this.errorMessage = 'Debes seleccionar una facultad.';
      return;
    }

    if (!career) {
      this.errorMessage = 'Debes seleccionar una carrera profesional.';
      return;
    }

    this.foroApiService.createPost(title, content, faculty, career, this.newPostFile || undefined).subscribe({
      next: (newPost) => {
        this.posts.unshift(newPost);
        this.newPostTitle = '';
        this.newPostContent = '';
        if (this.newPostFilePreviewUrl) {
          URL.revokeObjectURL(this.newPostFilePreviewUrl);
          this.newPostFilePreviewUrl = null;
        }
        this.newPostFile = null;
        this.setDefaultUserFacultyAndCareer();
        this.successMessage = '¡Publicación creada exitosamente!';
        this.errorMessage = '';
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 3000);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error creating post:', err);
        this.errorMessage = 'No se pudo crear la publicación.';
        this.cdr.detectChanges();
      }
    });
  }

  toggleLike(post: Post) {
    this.foroApiService.toggleLike(post.id).subscribe({
      next: (updatedPost) => {
        post.likes = updatedPost.likes;
        post.likes_count = updatedPost.likes_count;
        post.is_liked = updatedPost.is_liked;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error toggling like:', err)
    });
  }

  togglePin(post: Post) {
    if (!this.isAdmin) return;
    this.foroApiService.togglePin(post.id).subscribe({
      next: (updatedPost) => {
        post.is_pinned = updatedPost.is_pinned;
        // Volver a listar posts para reorganizar el orden con el pin arriba
        this.loadPosts();
      },
      error: (err) => console.error('Error toggling pin:', err)
    });
  }

  deletePost(postId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta publicación?')) return;
    this.foroApiService.deletePost(postId).subscribe({
      next: (res) => {
        if (res.deleted) {
          this.posts = this.posts.filter((p) => p.id !== postId);
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error deleting post:', err)
    });
  }

  toggleComments(postId: string) {
    this.expandedComments[postId] = !this.expandedComments[postId];
    if (this.expandedComments[postId] && !this.commentsByPost[postId]) {
      this.loadComments(postId);
    }
  }

  loadComments(postId: string) {
    this.isLoadingComments[postId] = true;
    this.foroApiService.getComments(postId).subscribe({
      next: (comments) => {
        this.commentsByPost[postId] = comments;
        this.isLoadingComments[postId] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.isLoadingComments[postId] = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCommentFileSelected(event: any, postId: string) {
    const file = event.target.files[0];
    if (file) {
      this.newCommentFiles[postId] = file;
    }
  }

  createComment(postId: string) {
    const text = this.newCommentTexts[postId]?.trim();
    if (!text) return;
    
    const file = this.newCommentFiles[postId];

    this.foroApiService.createComment(postId, text, file || undefined).subscribe({
      next: (newComment) => {
        if (!this.commentsByPost[postId]) {
          this.commentsByPost[postId] = [];
        }
        this.commentsByPost[postId].push(newComment);
        // Incrementar contador de comentarios en la vista local
        const post = this.posts.find((p) => p.id === postId);
        if (post) {
          post.comments_count = (post.comments_count || 0) + 1;
        }
        this.newCommentTexts[postId] = '';
        this.newCommentFiles[postId] = null;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error creating comment:', err)
    });
  }

  deleteComment(postId: string, commentId: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este comentario?')) return;
    this.foroApiService.deleteComment(commentId).subscribe({
      next: (res) => {
        if (res.deleted) {
          if (this.commentsByPost[postId]) {
            this.commentsByPost[postId] = this.commentsByPost[postId].filter((c) => c.id !== commentId);
          }
          const post = this.posts.find((p) => p.id === postId);
          if (post) {
            post.comments_count = Math.max(0, (post.comments_count || 1) - 1);
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error deleting comment:', err)
    });
  }

  toggleSidebar() {
    this.sidebarToggleService.toggle();
  }

  canDeletePost(post: Post): boolean {
    return this.isAdmin || post.author_username === this.currentUserUsername;
  }

  canDeleteComment(comment: Comment): boolean {
    return this.isAdmin || comment.author_username === this.currentUserUsername;
  }
}
