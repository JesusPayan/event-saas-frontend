
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent
  ],
  template: `
    <div class="admin-layout">
      <app-sidebar></app-sidebar>

      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .admin-layout {
      display: flex;
      min-height: 100vh;
      background: #f4f6fa;
    }

    .admin-content {
      flex: 1;
      min-width: 0;
      padding: 24px;
    }
  `]
})
export class AdminLayoutComponent {}
