
// import { bootstrapApplication } from '@angular/platform-browser';
// import { provideRouter } from '@angular/router';
// import {
//   provideHttpClient,
//   withInterceptors
// } from '@angular/common/http';

// import { AppComponent } from './app/app.component';
// import { routes } from './app/app.routes';
// import { authInterceptor } from './app/core/auth.interceptor';

// bootstrapApplication(AppComponent, {
//   providers: [
//     provideRouter(routes),
//     provideHttpClient(
//       withInterceptors([authInterceptor])
//     )
//   ]
// }).catch(error => {
//   console.error('Error al iniciar Angular:', error);
// });

import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/services/auth.interceptor';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
})
.then(() => {
  console.log('SaaS Eventos iniciado correctamente');
})
.catch(error => {
  console.error('Error al iniciar Angular:', error);
});