import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth.service';
@Component({standalone:true,imports:[FormsModule,RouterLink],template:`
<section class="auth-card"><h1>Registrar empresa</h1><p>Crea tu espacio de trabajo.</p>
<form (ngSubmit)="submit()">
<label>Nombre de la empresa<input name="company" [(ngModel)]="company" required minlength="3"></label>
<label>Identificador (letras, números y guiones)<input name="slug" [(ngModel)]="slug" required pattern="[a-z0-9-]{3,100}"></label>
<label>Correo del propietario<input name="email" type="email" [(ngModel)]="email" required></label>
<label>Contraseña (mínimo 12 caracteres)<input name="password" type="password" [(ngModel)]="password" required minlength="12"></label>
@if(error()){<p role="alert" class="error">{{error()}}</p>}
@if(success()){<p role="status" class="success">Empresa creada. Ya puedes iniciar sesión.</p>}
<button type="submit" [disabled]="busy()">{{busy()?'Registrando…':'Crear empresa'}}</button>
</form><p><a routerLink="/login">Volver al inicio de sesión</a></p></section>`})
export class RegisterComponent {
 private auth=inject(AuthService);company='';slug='';email='';password='';busy=signal(false);error=signal('');success=signal(false);
 submit(){this.busy.set(true);this.error.set('');this.auth.register(this.email,this.password,this.company,this.slug).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>this.success.set(true),error:()=>this.error.set('No fue posible crear la empresa. Comprueba los datos o utiliza otro correo/identificador.')});}
}
