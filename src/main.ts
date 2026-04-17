import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

function renderFatalError(message: string) {
  const host = document.body;
  if (!host) return;

  const existing = document.getElementById('fatal-runtime-error');
  if (existing) {
    existing.textContent = message;
    return;
  }

  const panel = document.createElement('pre');
  panel.id = 'fatal-runtime-error';
  panel.style.whiteSpace = 'pre-wrap';
  panel.style.margin = '24px';
  panel.style.padding = '16px';
  panel.style.borderRadius = '12px';
  panel.style.background = '#fee2e2';
  panel.style.color = '#991b1b';
  panel.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, monospace';
  panel.textContent = message;
  host.appendChild(panel);
}

window.addEventListener('error', (event) => {
  const text = event.error?.stack || event.message || 'Runtime error desconocido.';
  renderFatalError(`Error de ejecucion:\n${text}`);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = (event.reason && (event.reason.stack || event.reason.message)) || `${event.reason}`;
  renderFatalError(`Promesa no manejada:\n${reason}`);
});

bootstrapApplication(App, appConfig).catch((err) => {
  const text = err?.stack || err?.message || `${err}`;
  renderFatalError(`Fallo al iniciar Angular:\n${text}`);
  console.error(err);
});
