import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
@Component({standalone:true,imports:[FormsModule,RouterLink],templateUrl: './register.component.html'})
export class RegisterComponent {
 private auth=inject(AuthService);company='';slug='';email='';password='';busy=signal(false);error=signal('');success=signal(false);
 submit(){this.busy.set(true);this.error.set('');this.auth.register(this.email,this.password,this.company,this.slug).pipe(finalize(()=>this.busy.set(false))).subscribe({next:()=>this.success.set(true),error:()=>this.error.set('No fue posible crear la empresa. Comprueba los datos o utiliza otro correo/identificador.')});}
}
