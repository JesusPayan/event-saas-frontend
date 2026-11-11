import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({standalone:true, imports:[FormsModule, RouterLink], templateUrl:'./login.component.html'})
export class LoginComponent {
  private auth=inject(AuthService); private router=inject(Router);
  email='';password='';
  busy=signal(false);
  error=signal('');
  
//   submit(){
//     this.busy.set(true);
//   //   this.error.set('');this.auth.login(this.email,this.password).pipe(
//   //   switchMap(()=>this.auth.loadMe()),finalize(()=>this.busy.set(false))
//   // ).subscribe({next:()=>void this.router.navigateByUrl('/tenants'),error:(err: HttpErrorResponse)=>this.error.set(err.error.message || 'No se pudo iniciar sesión. Revisa tus credenciales.')});}
//   error: (err: HttpErrorResponse) => {
//   console.error('Error de autenticación:', err);

//   if (err.status === 404) {
//     this.error.set('No se encontró el endpoint de autenticación.');
//   } else if (err.status === 401) {
//     this.error.set('Correo o contraseña incorrectos.');
//   } else if (err.status === 0) {
//     this.error.set('No se pudo conectar con el servidor.');
//   } else {
//     this.error.set(`Error del servidor (${err.status}).`);
//   }
// }
// }

submit() {
  console.log('1. Iniciando submit()');

  this.busy.set(true);
  this.error.set('');

  console.log('2. Ejecutando AuthService.login()');

  this.auth.login(this.email, this.password).pipe(
    switchMap(response => {
      console.log('3. Login HTTP exitoso');
      return this.auth.loadMe();
    }),
    finalize(() => {
      console.log('5. Finalizando petición');
      this.busy.set(false);
    })
  ).subscribe({
    next: () => {
      console.log('4. Usuario autenticado');
      // void this.router.navigateByUrl('/tenants');
      void this.router.navigate(['/events']);
    },
    error: err => {
      console.error('ERROR DE AUTENTICACIÓN:', err);
      this.error.set(
        `Error HTTP ${err.status ?? 'desconocido'}: ${
          err.error?.message ?? err.message ?? 'Error de conexión'
        }`
      );
    }
  });
}
}
