import { bootstrapApplication } from '@angular/platform-browser';
import { inject, provideAppInitializer, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/services/auth.interceptor';
import { AuthService } from './app/services/auth.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    // Restaura la sesión guardada antes de evaluar los guards de las rutas.
    provideAppInitializer(() => inject(AuthService).restore())
  ]
}).catch(error => {
  console.error('Error al iniciar Angular:', error);
});