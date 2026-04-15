import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { provideAnimations } from '@angular/platform-browser/animations';

// Si el error persiste con appConfig, prueba pasar un objeto vacío o solo los providers necesarios
bootstrapApplication(App, {
  providers: [
    provideAnimations()
  ]
}).catch((err) => console.error(err));