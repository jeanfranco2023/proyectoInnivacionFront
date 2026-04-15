import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ChatComponent {
  nombreUsuario: string = 'Seven';
  userInput: string = '';
  isListening: boolean = false;
  searchTerm: string = '';

  messages: { role: string, text: string, isFile?: boolean }[] = [];
  misChats: { titulo: string, favorito: boolean, historial: any[] }[] = [];

  // Inyectamos el ChangeDetectorRef para actualizar la vista en tiempo real
  constructor(private cdr: ChangeDetectorRef) {}

  get favoritos() {
    return this.misChats.filter(c => {
      const coincideFavorito = c.favorito;
      const coincideBusqueda =
        c.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.historial.some(m => m.text.toLowerCase().includes(this.searchTerm.toLowerCase()));

      return coincideFavorito && coincideBusqueda;
    });
  }

  get promptsGenerales() {
    return this.misChats.filter(c => {
      const coincideGeneral = !c.favorito;
      const coincideBusqueda =
        c.titulo.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        c.historial.some(m => m.text.toLowerCase().includes(this.searchTerm.toLowerCase()));

      return coincideGeneral && coincideBusqueda;
    });
  }

  // Función para bajar el scroll automáticamente
  private scrollToBottom() {
    setTimeout(() => {
      const chatContainer = document.querySelector('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    if (this.messages.length === 0) {
      const nuevoChat = {
        titulo: this.userInput.substring(0, 30) + (this.userInput.length > 30 ? '...' : ''),
        favorito: false,
        historial: this.messages
      };
      this.misChats.unshift(nuevoChat);
    }

    this.messages.push({ role: 'user', text: this.userInput });
    const promptActual = this.userInput;
    this.userInput = '';
    this.scrollToBottom();

    setTimeout(() => {
      this.messages.push({
        role: 'bot',
        text: 'Como tu mentor MentorCore, he analizado tu consulta sobre "' + promptActual + '".'
      });
      this.cdr.detectChanges(); // Forzamos a Angular a mostrar la respuesta
      this.scrollToBottom();
    }, 1000);
  }

  cargarChat(chat: any) {
    console.log("Cargando chat:", chat.titulo);
    this.messages = chat.historial;
    this.scrollToBottom();
  }

  marcarFavorito(event: Event, chat: any) {
    event.stopPropagation();
    chat.favorito = !chat.favorito;
  }

  resetChat() {
    this.messages = [];
    this.userInput = '';
  }

  dictar() {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Tu navegador no soporta el reconocimiento de voz. ¡Prueba con Chrome!");
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.continuous = false;
    recognition.interimResults = false;

    this.isListening = true;

    recognition.onresult = (event: any) => {
      const textoEscuchado = event.results[0][0].transcript;
      this.userInput = textoEscuchado;
      this.isListening = false;
      this.sendMessage();
    };

    recognition.onerror = () => {
      this.isListening = false;
    };

    recognition.onend = () => {
      this.isListening = false;
      this.cdr.detectChanges();
    };

    recognition.start();
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.messages.push({
        role: 'user',
        text: file.name,
        isFile: true 
      });
      this.scrollToBottom();

      setTimeout(() => {
        this.messages.push({
          role: 'bot',
          text: `He recibido tu archivo "${file.name}". Lo estoy analizando para darte la mejor mentoría.`
        });
        this.cdr.detectChanges(); // Forzamos la actualización para el archivo
        this.scrollToBottom();
      }, 1000);

      event.target.value = '';
    }
  }
}