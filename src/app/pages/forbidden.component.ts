import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({standalone:true,imports:[RouterLink],template:`<section class="panel"><h1>Acceso denegado</h1><p>No tienes permiso para consultar este recurso.</p><a routerLink="/dashboard">Volver al panel</a></section>`})
export class ForbiddenComponent {}
