// import { Component, inject } from '@angular/core';
// import { RouterLink, RouterOutlet } from '@angular/router';
// import { AuthService } from './core/auth.service';
// @Component({selector:'app-root',standalone:true,imports:[RouterOutlet,RouterLink],template:`
// <header class="topbar"><a class="brand" routerLink="/dashboard">✦ Eventos SaaS</a><nav>
// @if(auth.authenticated()){<span>{{auth.tenant()?.name || 'Sin empresa seleccionada'}}</span><a routerLink="/tenants">Cambiar empresa</a><button class="outline" (click)="auth.logout()">Cerrar sesión</button>}
// @else{<a routerLink="/login">Ingresar</a><a routerLink="/register">Crear empresa</a>}
// </nav></header><main><router-outlet/></main>`})
// export class AppComponent {auth=inject(AuthService);}


// import { Component } from '@angular/core';
// import { RouterOutlet } from '@angular/router';

// @Component({
//   selector: 'app-root',
//   standalone: true,
//   imports: [RouterOutlet],
//   template: `
//     <h1>SaaS Eventos funcionando</h1>
//     <router-outlet></router-outlet>
//   `
// })
// export class AppComponent {}
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
  <div style="padding: 15px; background: #2563eb; color: white;">
      Angular SaaS Eventos iniciado correctamente
    </div>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {}