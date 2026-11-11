
import { Routes } from '@angular/router';

import {
  authGuard,
  tenantGuard,
  permissionGuard
} from './services/auth.guard';

import { AdminLayoutComponent } from './layout/sidebar/admin-layout.component';

import { ClientsComponent } from './pages/clients/clients.component';
import { ClientFormComponent } from './pages/clients/client-form.component';
import { ClientDetailComponent } from './pages/clients/client-detail.component';

import { EventsComponent } from './pages/events/events.component';
import { EventFormComponent } from './pages/events/event-detail/even-form/event-form.component';
import { EventDetailComponent } from './pages/events/event-detail/event-detail.component';
import { EventCalendarComponent } from './pages/events/event-calendar.component';

import { InventoryComponent } from './pages/inventory/inventory.component';
import { InventoryFormComponent } from './pages/inventory/inventory-form.component';
import { InventoryCategoriesComponent } from './pages/inventory/inventory-categories.component';
import {QuoteList} from './pages/quotes/quote-list/quote-list';
import {QuoteForm} from './pages/quotes/quote-form/quote-form';
import {QuoteDetail} from './pages/quotes/quote-detail/quote-detail';
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login-component/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/registrer-component/register.component')
        .then(m => m.RegisterComponent)
  },
  {
    path: 'tenants',
    loadComponent: () =>
      import('./pages/tenants-component/tenants.component')
        .then(m => m.TenantsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'forbidden',
    loadComponent: () =>
      import('./pages/forbidden-component/forbidden.component')
        .then(m => m.ForbiddenComponent),
    canActivate: [authGuard]
  },

  // =====================================
  // LAYOUT ADMINISTRATIVO
  // =====================================
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard, tenantGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-component/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'members',
        loadComponent: () =>
          import('./pages/members-component/members.component')
            .then(m => m.MembersComponent),
        canActivate: [permissionGuard('members.read')]
      },

      // =====================================
      // CLIENTES
      // =====================================
      {
        path: 'clients',
        component: ClientsComponent,
        canActivate: [permissionGuard('clients.read')]
      },
      {
        path: 'clients/new',
        component: ClientFormComponent,
        canActivate: [permissionGuard('clients.create')]
      },
      {
        path: 'clients/:id/edit',
        component: ClientFormComponent,
        canActivate: [permissionGuard('clients.update')]
      },
      {
        path: 'clients/:id',
        component: ClientDetailComponent,
        canActivate: [permissionGuard('clients.read')]
      },

      // =====================================
      // EVENTOS
      // =====================================
      {
        path: 'events',
        component: EventsComponent,
        canActivate: [permissionGuard('events.read')]
      },
      {
        path: 'events/new',
        component: EventFormComponent,
        canActivate: [permissionGuard('events.create')]
      },
      {
        path: 'events/calendar',
        component: EventCalendarComponent,
        canActivate: [permissionGuard('events.read')]
      },
      {
        path: 'events/:id/edit',
        component: EventFormComponent,
        canActivate: [permissionGuard('events.update')]
      },
      {
        path: 'events/:id',
        component: EventDetailComponent,
        canActivate: [permissionGuard('events.read')]
      },

      // =====================================
      // SPRINT 5.2 - COTIZACIONES
      // =====================================
     
// =====================================
// SPRINT 5.2 - COTIZACIONES
// =====================================

{
  path: 'quotes',
  loadComponent: () =>
    import('./pages/quotes/quote-list/quote-list')
      .then(m => m.QuoteList),
  canActivate: [
    permissionGuard('quotes.read')
  ]
},

{
  path: 'quotes/new',
  loadComponent: () =>
    import('./pages/quotes/quote-form/quote-form')
      .then(m => m.QuoteForm),
  canActivate: [
    permissionGuard('quotes.create')
  ]
},

{
  path: 'quotes/:id',
  loadComponent: () =>
    import('./pages/quotes/quote-detail/quote-detail')
      .then(m => m.QuoteDetail),
  canActivate: [
    permissionGuard('quotes.read')
  ]
},

     
      // =====================================
      // INVENTARIO
      // =====================================
      {
        path: 'inventory',
        component: InventoryComponent,
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/new',
        component: InventoryFormComponent,
        canActivate: [permissionGuard('inventory.create')]
      },
      {
        path: 'inventory/categories',
        component: InventoryCategoriesComponent,
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/operations',
        loadComponent: () =>
          import('./pages/inventory/inventory-operations/inventory-operations.component')
            .then(m => m.InventoryOperationsComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/incidents',
        loadComponent: () =>
          import('./pages/inventory/inventory-incidents/inventory-incidents.component')
            .then(m => m.InventoryIncidentsComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/charges',
        loadComponent: () =>
          import('./pages/inventory/inventory-charges/inventory-charges.component')
            .then(m => m.InventoryChargesComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/capacity',
        loadComponent: () =>
          import('./pages/inventory/inventory-capacity/inventory-capacity.component')
            .then(m => m.InventoryCapacityComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/replenishments',
        loadComponent: () =>
          import('./pages/inventory-replenishments/inventory-replenishments.component')
            .then(m => m.InventoryReplenishmentsComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/capacity-alerts',
        loadComponent: () =>
          import('./pages/inventory-capacity-alerts/inventory-capacity-alerts.component')
            .then(m => m.InventoryCapacityAlertsComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      
      // =====================================
      // REPORTES DE INVENTARIO
      // =====================================
      {
  path: 'inventory/reports',
  loadComponent: () =>
    import(
      './pages/inventory/inventory-reports/inventory-reports.component'
    ).then(m => m.InventoryReportsComponent),
  canActivate: [
    permissionGuard('inventory.read')
  ]
},
// =====================================
// INV-50-03 - LOGÍSTICA
// =====================================
{
  path: 'logistics',
  loadComponent: () =>
    import('./pages/logistics/logistics-list.component/logistics-list.component')
      .then(m => m.LogisticsListComponent),
  canActivate: [permissionGuard('inventory.read')]
},
{
  path: 'logistics/new',
  loadComponent: () =>
    import('./pages/logistics/logistics-create.component/logistics-create.component')
      .then(m => m.LogisticsCreateComponent),
  canActivate: [permissionGuard('inventory.create')]
},
{
  path: 'logistics/:id',
  loadComponent: () =>
    import('./pages/logistics/logistics-detail.component/logistics-detail.component')
      .then(m => m.LogisticsDetailComponent),
  canActivate: [permissionGuard('inventory.read')]
},

      // =====================================
      // EDITAR ARTICULO
      // =====================================
      {
        path: 'inventory/:id/edit',
        component: InventoryFormComponent,
        canActivate: [
          permissionGuard('inventory.update')
        ]
      }

    ] // Fin de children de AdminLayoutComponent
  }, // Fin de AdminLayoutComponent

  // =====================================
  // RUTA NO ENCONTRADA
  // =====================================

  {
  path: 'quotes/:id',
  loadComponent: () =>
    import('./pages/quotes/quote-detail/quote-detail')
      .then(m => m.QuoteDetail)
},
{
  path: 'sign/:token',
  loadComponent: () =>
    import('./pages/contract-signing/contract-signing.component')
      .then(m => m.ContractSigningComponent),
},
  {
    path: '**',
    redirectTo: 'login'
  }
];
