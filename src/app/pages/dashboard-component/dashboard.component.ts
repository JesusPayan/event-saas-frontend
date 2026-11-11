import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
@Component({standalone:true,imports:[RouterLink],templateUrl:'./dashboard.component.html'})
export class DashboardComponent {
    auth=inject(AuthService);
  ngOnInit(): void {
    this.auth.debugAuth();
  }
}
