import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
@Component({standalone:true,templateUrl:'./members.component.html'})
export class MembersComponent {
 private http=inject(HttpClient);members=signal<{id:number;user_id:number;role_id:number;status:string}[]>([]);error=signal('');
 constructor(){this.http.get<{items:{id:number;user_id:number;role_id:number;status:string}[]}>('/api/v1/memberships').subscribe({next:r=>this.members.set(r.items),error:()=>this.error.set('No se pudieron cargar los miembros.')});}
}
