
import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">E</span>
        <div>
          <strong>Eventos SaaS</strong>
          <small>Panel administrativo</small>
        </div>
      </div>

      <nav aria-label="Menú principal">

        <a routerLink="/dashboard"
           routerLinkActive="active">
          <span class="nav-icon">▦</span>
          Dashboard
        </a>

        @if (auth.hasPermission('clients.read')) {
          <a routerLink="/clients"
             routerLinkActive="active">
            <span class="nav-icon">♙</span>
            Clientes
          </a>
        }

        @if (auth.hasPermission('events.read')) {
          <a routerLink="/events"
             routerLinkActive="active"
             [routerLinkActiveOptions]="{ exact: true }">
            <span class="nav-icon">▣</span>
            Eventos
          </a>

          <a routerLink="/events/calendar"
             routerLinkActive="active">
            <span class="nav-icon">▦</span>
            Calendario
          </a>
        }
        <!-- ===================================== -->
<!-- SPRINT 5.2 - COTIZACIONES -->
<!-- ===================================== -->

@if (auth.hasPermission('quotes.read')) {

  <div class="menu-heading">
    GESTIÓN COMERCIAL
  </div>

  <a
    routerLink="/quotes"
    routerLinkActive="active"
    [routerLinkActiveOptions]="{ exact: true }">

    <span class="nav-icon">▧</span>
    Cotizaciones
  </a>

}

@if (auth.hasPermission('quotes.create')) {

  <a
    routerLink="/quotes/new"
    routerLinkActive="active">

    <span class="nav-icon">＋</span>
    Nueva cotización
  </a>

}

        @if (auth.hasPermission('inventory.read')) {
          <div class="menu-heading">GESTIÓN DE INVENTARIO</div>

          <button
            type="button"
            class="menu-toggle"
            [class.expanded]="inventoryOpen()"
            [attr.aria-expanded]="inventoryOpen()"
            aria-controls="inventory-submenu"
            (click)="toggleInventory()">

            <span class="nav-icon">▤</span>
            <span class="menu-label">Inventario</span>
            <span class="chevron">
              {{ inventoryOpen() ? '▾' : '▸' }}
            </span>
            
          </button>

          @if (inventoryOpen()) {
            <div id="inventory-submenu" class="submenu">

              <a routerLink="/inventory"
                 routerLinkActive="active"
                 [routerLinkActiveOptions]="{ exact: true }">
                <span class="nav-icon">▤</span>
                Artículos
              </a>

              <a routerLink="/inventory/categories"
                 routerLinkActive="active">
                <span class="nav-icon">▥</span>
                Categorías
              </a>

              <a routerLink="/inventory/operations"
                 routerLinkActive="active">
                <span class="nav-icon">⇄</span>
                Operaciones
              </a>

              <a routerLink="/inventory/incidents"
                 routerLinkActive="active">
                <span class="nav-icon">⚠</span>
                Incidencias
              </a>

              <a routerLink="/inventory/charges"
                 routerLinkActive="active">
                <span class="nav-icon">$</span>
                Cargos por daños
              </a>
              <a
              routerLink="/inventory/capacity"
              routerLinkActive="active">
              <span>⚠</span> Déficit y auditoría
            </a>
            <a routerLink="/inventory/replenishments">
              Reposiciones
            </a>
            <a routerLink="/inventory/capacity-alerts">
              Alertas de capacidad
            </a>
            

            </div>
          }
        }

      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      flex-shrink: 0;
      min-height: 100vh;
      background: #142238;
      color: #e5eaf3;
      padding: 22px 14px;
      box-sizing: border-box;
    }

    .brand {
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 8px 10px 30px;
    }

    .brand-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: #2563eb;
      font-size: 22px;
      font-weight: 800;
    }

    .brand strong,
    .brand small {
      display: block;
    }

    .brand small {
      color: #9caac0;
      font-size: 11px;
      margin-top: 4px;
    }

    nav {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    nav a,
    .menu-toggle {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 14px;
      border: none;
      border-radius: 9px;
      background: transparent;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 14px;
      text-align: left;
      cursor: pointer;
      box-sizing: border-box;
    }

    nav a:hover,
    .menu-toggle:hover {
      background: #243852;
      color: white;
    }

    nav a.active {
      background: #2563eb;
      color: white;
      font-weight: 600;
    }

    .menu-toggle.expanded {
      background: #1d304a;
      color: white;
    }

    .nav-icon {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      width: 18px;
      flex-shrink: 0;
      font-size: 17px;
    }

    .menu-label {
      flex: 1;
    }

    .chevron {
      font-size: 15px;
    }

    .menu-heading {
      padding: 24px 14px 8px;
      font-size: 10px;
      font-weight: 700;
      color: #8fa3bf;
      letter-spacing: 1px;
    }

    .submenu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-left: 12px;
      padding-left: 10px;
      border-left: 1px solid #344861;
    }

    .submenu a {
      padding: 10px 12px;
      font-size: 13px;
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        min-height: auto;
      }

      nav {
        flex-direction: column;
      }
    }
  `]
})
export class SidebarComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly inventoryOpen = signal(
    this.router.url.startsWith('/inventory')
  );

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe(event => {
        if (event.urlAfterRedirects.startsWith('/inventory')) {
          this.inventoryOpen.set(true);
        }
      });
  }

  toggleInventory(): void {
    this.inventoryOpen.update(value => !value);
  }
}
