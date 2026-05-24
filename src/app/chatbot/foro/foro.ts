import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ForoApiService, Post, Comment } from '../../service/foro/foro-api.service';
import { SessionService } from '../../service/auth/session.service';
import { SidebarToggleService } from '../../service/sidebar/sidebar-toggle.service';
import { SidebarComponent } from '../sidebar/sidebar';

@Component({
  selector: 'app-foro',
  templateUrl: './foro.html',
  styleUrl: './foro.css',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent]
})
export class ForoComponent implements OnInit {
  posts: Post[] = [];
  commentsByPost: { [postId: string]: Comment[] } = {};
  expandedComments: { [postId: string]: boolean } = {};
  isLoadingPosts = false;
  isLoadingComments: { [postId: string]: boolean } = {};
  
  newPostTitle = '';
  newPostContent = '';
  newCommentTexts: { [postId: string]: string } = {};

  currentUserUsername = 'demo';
  isAdmin = false;
  errorMessage = '';
  successMessage = '';

  // Diccionario de facultades y carreras obtenido del backend
  facultiesMap: { [key: string]: string[] } = {};
  facultyKeys: string[] = [];

  // Filtros de búsqueda
  selectedFilterFaculty = '';
  selectedFilterCareer = '';
  filterCareersList: string[] = [];

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
  }

  loadFaculties() {
    this.foroApiService.getFaculties().subscribe({
      next: (map) => {
        this.facultiesMap = map;
        this.facultyKeys = Object.keys(map);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading faculties:', err);
      }
    });
  }

  loadPosts() {
    this.isLoadingPosts = true;
    this.errorMessage = '';
    this.foroApiService.getPosts(this.selectedFilterCareer || undefined).subscribe({
      next: (posts) => {
        this.posts = posts;
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

  onFilterFacultyChange() {
    this.selectedFilterCareer = '';
    if (this.selectedFilterFaculty) {
      this.filterCareersList = this.facultiesMap[this.selectedFilterFaculty] || [];
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

    this.foroApiService.createPost(title, content, faculty, career).subscribe({
      next: (newPost) => {
        this.posts.unshift(newPost);
        this.newPostTitle = '';
        this.newPostContent = '';
        this.newPostFaculty = '';
        this.newPostCareer = '';
        this.formCareersList = [];
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

  createComment(postId: string) {
    const text = this.newCommentTexts[postId]?.trim();
    if (!text) return;

    this.foroApiService.createComment(postId, text).subscribe({
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
