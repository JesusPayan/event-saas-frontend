import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Component({standalone:true,template:`<section class="panel"><h1>Miembros de la empresa</h1>
@if(error()){<p role="alert" class="error">{{error()}}</p>}
<table><thead><tr><th>ID</th><th>Usuario</th><th>Rol</th><th>Estado</th></tr></thead><tbody>
@for(m of members();track m.id){<tr><td>{{m.id}}</td><td>{{m.user_id}}</td><td>{{m.role_id}}</td><td>{{m.status}}</td></tr>}
</tbody></table></section>`})
export class MembersComponent {
 private http=inject(HttpClient);members=signal<{id:number;user_id:number;role_id:number;status:string}[]>([]);error=signal('');
 constructor(){this.http.get<{items:{id:number;user_id:number;role_id:number;status:string}[]}>('/api/v1/memberships').subscribe({next:r=>this.members.set(r.items),error:()=>this.error.set('No se pudieron cargar los miembros.')});}
}
