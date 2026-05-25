import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthRegisterApiService } from '../../../service/auth/auth-register.api.service';
import { RegisterRequest } from '../../../models/auth/auth-register.types';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
})
export class RegisterComponent {
  form: RegisterRequest = {
    username: '',
    password: '',
    display_name: '',
    career: '',
    email: '',
    phone_number: '',
  };

  isLoading = false;
  errorMessage = '';
  successMessage = '';
  autofillLock = true;
  selectedFaculty = '';

  readonly facultyCareerMap: Record<string, string[]> = {
  "Ingeniería": [
    "Ingeniería de Sistemas",
    "Ingeniería Informática",
    "Ingeniería de Software",
    "Ingeniería Industrial",
    "Ingeniería Civil",
    "Ingeniería Mecánica",
    "Ingeniería Eléctrica",
    "Ingeniería Electrónica",
    "Ingeniería Mecatrónica",
    "Ingeniería Automotriz",
    "Ingeniería Aeronáutica",
    "Ingeniería Ambiental",
    "Ingeniería Sanitaria",
    "Ingeniería Química",
    "Ingeniería Metalúrgica",
    "Ingeniería de Minas",
    "Ingeniería Geológica",
    "Ingeniería Geográfica",
    "Ingeniería Agrícola",
    "Ingeniería Agroindustrial",
    "Ingeniería Forestal",
    "Ingeniería Pesquera",
    "Ingeniería Acuícola",
    "Ingeniería de Telecomunicaciones",
    "Ingeniería Biomédica",
    "Ingeniería de Transportes",
    "Ingeniería de Materiales",
    "Ingeniería de Seguridad y Salud en el Trabajo"
  ],
    "Ciencias de la Salud": [
      "Medicina Humana",
      "Enfermería",
      "Psicología",
      "Obstetricia",
      "Odontología",
      "Farmacia y Bioquímica",
      "Bioquímica",
      "Nutrición",
      "Tecnología Médica (Laboratorio, Terapia Física, Radiología, Terapia del Lenguaje)",
      "Terapia Física y Rehabilitación",
      "Terapia Ocupacional",
      "Optometría",
      "Medicina Veterinaria",
      "Salud Pública",
      "Epidemiología",
      "Administración en Salud"
  ],
    "Ciencias Empresariales": [
      "Administración de Empresas",
      "Contabilidad",
      "Economía",
      "Finanzas",
      "Marketing",
      "Negocios Internacionales",
      "Administración Bancaria y Financiera",
      "Gestión de Recursos Humanos",
      "Administración Turística",
      "Hotelería",
      "Gastronomía"
  ],
  "Ciencias Humanas y Sociales": [
    "Derecho",
    "Comunicación Social",
    "Periodismo",
    "Publicidad",
    "Ciencias de la Comunicación",
    "Relaciones Públicas",
    "Sociología",
    "Antropología",
    "Arqueología",
    "Historia",
    "Filosofía",
    "Psicología Social",
    "Trabajo Social",
    "Ciencia Política",
    "Gobierno y Relaciones Internacionales",
    "Educación Inicial",
    "Educación Primaria",
    "Educación Secundaria (Especialidades: Matemáticas, Lengua, Ciencias Sociales, etc.)",
    "Educación Física",
    "Lingüística",
    "Literatura",
    "Traducción e Interpretación",
    "Turismo y Guiado"
  ],
  "Arquitectura y Urbanismo": [
    "Arquitectura",
    "Urbanismo",
    "Arquitectura de Interiores",
    "Diseño Urbano y Paisajismo"
  ],
  "Arte y Diseño": [
    "Arte",
    "Artes Plásticas",
    "Diseño Gráfico",
    "Diseño Industrial",
    "Diseño de Modas",
    "Diseño de Joyería",
    "Música",
    "Artes Escénicas",
    "Teatro",
    "Danza",
    "Cine y Televisión",
    "Fotografía"
  ],
  "Ciencias Naturales y Exactas": [
    "Biología",
    "Microbiología",
    "Biotecnología",
    "Genética",
    "Química",
    "Física",
    "Matemática",
    "Estadística",
    "Astronomía",
    "Geografía",
    "Geología"
  ],
  "Ciencias Agropecuarias": [
    "Agronomía",
    "Ingeniería Agrónoma",
    "Zootecnia",
    "Medicina Veterinaria",
    "Ciencia Animal",
    "Agroforestería",
    "Industrias Alimentarias"
  ],
  "Ciencias Ambientales": [
    "Ingeniería Ambiental",
    "Gestión Ambiental",
    "Ecología",
    "Recursos Naturales Renovables",
    "Gestión de Riesgos y Desastres"
  ],
  "Ciencias Militares y Policiales": [
    "Ciencias Militares",
    "Ciencias Policiales",
    "Administración Policial",
    "Ingeniería Militar"
  ],
  };

  get facultyOptions(): string[] {
    return Object.keys(this.facultyCareerMap);
  }

  get filteredCareerOptions(): string[] {
    return this.selectedFaculty ? this.facultyCareerMap[this.selectedFaculty] || [] : [];
  }

  constructor(
    private readonly authRegisterApiService: AuthRegisterApiService,
    private readonly router: Router,
  ) {}

  register() {
    this.isLoading = true;
    this.errorMessage = '';

    // Validar correo con expresión regular robusta
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!this.form.email || !emailRegex.test(this.form.email.trim())) {
      this.errorMessage = 'El correo electrónico ingresado no es válido.';
      this.isLoading = false;
      return;
    }

    // Derivar automáticamente el nombre de usuario único a partir del correo electrónico
    if (this.form.email) {
      this.form.username = this.form.email.trim().toLowerCase();
    }

    this.authRegisterApiService.register(this.form).subscribe({
      next: () => {
        this.successMessage = 'Cuenta creada. Se ha enviado un código de verificación a tu correo.';
        const targetUsername = this.form.username;
        setTimeout(() => {
          void this.router.navigate(['/verify-email'], { queryParams: { username: targetUsername } });
        }, 1500);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.error?.message || 'No se pudo registrar la cuenta. Revisa los datos.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  unlockAutofill() {
    if (!this.autofillLock) return;
    this.autofillLock = false;
  }

  onFacultyChange() {
    // Facultad solo filtra UI; si cambia, se reinicia la carrera para evitar inconsistencias.
    this.form.career = '';
  }
}

