
import { Routes } from '@angular/router';

import {
  authGuard,
  tenantGuard,
  permissionGuard,
  landingGuard,
  platformGuard
} from './services/auth.guard';

import { AdminLayoutComponent } from './layout/sidebar/admin-layout/admin-layout.component';




export const routes: Routes = [
  // =====================================
  // SITIO COMERCIAL (público). Con sesión iniciada, '/' lleva al panel.
  // =====================================
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'privacidad',
    data: { doc: 'privacy' },
    loadComponent: () => import('./pages/legal/legal-page.component').then(m => m.LegalPageComponent)
  },
  {
    path: 'terminos',
    data: { doc: 'terms' },
    loadComponent: () => import('./pages/legal/legal-page.component').then(m => m.LegalPageComponent)
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
  // PANEL DE PLATAFORMA (alcance global: no requiere elegir empresa)
  // =====================================
  {
    path: 'platform',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'organizations' },
      {
        path: 'organizations',
        loadComponent: () => import('./pages/platform/platform-organizations/platform-organizations.component')
          .then(m => m.PlatformOrganizationsComponent),
        canActivate: [platformGuard('platform.orgs.manage')]
      },
      {
        path: 'roles',
        loadComponent: () => import('./pages/platform/platform-roles/platform-roles.component')
          .then(m => m.PlatformRolesComponent),
        canActivate: [platformGuard('platform.roles.manage_admins', 'platform.roles.manage_promoters')]
      },
      {
        path: 'categories',
        loadComponent: () => import('./pages/platform/platform-categories/platform-categories.component')
          .then(m => m.PlatformCategoriesComponent),
        canActivate: [platformGuard('platform.catalog.manage')]
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/platform/platform-audit/platform-audit.component')
          .then(m => m.PlatformAuditComponent),
        canActivate: [platformGuard('platform.audit.read')]
      },
      {
        path: 'prices',
        loadComponent: () =>
          import('./pages/billing/billing-admin-prices/billing-admin-prices.component')
            .then(m => m.BillingAdminPricesComponent),
        canActivate: [platformGuard('platform.plans.manage')]
      },
      {
        path: 'subscriptions',
        loadComponent: () =>
          import('./pages/billing/billing-admin-subscriptions/billing-admin-subscriptions.component')
            .then(m => m.BillingAdminSubscriptionsComponent),
        canActivate: [platformGuard('platform.billing.operate')]
      },
    ]
  },
  {
    path: 'promoter',
    component: AdminLayoutComponent,
    canActivate: [authGuard, platformGuard('promoter.referrals')],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/platform/promoter-dashboard/promoter-dashboard.component')
          .then(m => m.PromoterDashboardComponent)
      },
    ]
  },
  {
    path: 'platform-invite',
    loadComponent: () => import('./pages/platform/platform-invite/platform-invite.component')
      .then(m => m.PlatformInviteComponent)
  },

  // =====================================
  // LAYOUT ADMINISTRATIVO
  // =====================================
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [authGuard, tenantGuard],
    children: [
      // CAT-01: catálogo de productos y servicios
      {
        path: 'catalog',
        loadComponent: () => import('./pages/catalog/catalog-list/catalog-list.component')
          .then(m => m.CatalogListComponent),
        canActivate: [permissionGuard('catalog.read')]
      },
      {
        path: 'catalog/new',
        loadComponent: () => import('./pages/catalog/catalog-offer-form/catalog-offer-form.component')
          .then(m => m.CatalogOfferFormComponent),
        canActivate: [permissionGuard('catalog.manage')]
      },
      {
        path: 'catalog/:id/edit',
        loadComponent: () => import('./pages/catalog/catalog-offer-form/catalog-offer-form.component')
          .then(m => m.CatalogOfferFormComponent),
        canActivate: [permissionGuard('catalog.manage')]
      },
      {
        path: 'providers',
        loadComponent: () => import('./pages/catalog/providers/providers.component')
          .then(m => m.ProvidersComponent),
        canActivate: [permissionGuard('catalog.read')]
      },
      {
        path: 'network/requests',
        loadComponent: () => import('./pages/catalog/network-requests/network-requests.component')
          .then(m => m.NetworkRequestsComponent),
        canActivate: [permissionGuard('catalog.read')]
      },
      {
        path: 'provider/items',
        loadComponent: () => import('./pages/catalog/provider-items/provider-items.component')
          .then(m => m.ProviderItemsComponent),
        canActivate: [permissionGuard('provider.items')]
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-component/dashboard.component')
            .then(m => m.DashboardComponent)
      },
      {
        path: 'company/receipt-settings',
        loadComponent: () => 
          import('./pages/company-settings/company-receipt-settings.component')
        .then(m => m.CompanyReceiptSettingsComponent),
        canActivate: [permissionGuard('contracts.read')]
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
        loadComponent: () => import('./pages/clients/clients-component/clients.component').then(m => m.ClientsComponent),
        canActivate: [permissionGuard('clients.read')]
      },
      {
        path: 'clients/new',
        loadComponent: () => import('./pages/clients/client-form/client-form.component').then(m => m.ClientFormComponent),
        canActivate: [permissionGuard('clients.create')]
      },
      {
        path: 'clients/:id/edit',
        loadComponent: () => import('./pages/clients/client-form/client-form.component').then(m => m.ClientFormComponent),
        canActivate: [permissionGuard('clients.update')]
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./pages/clients/client-detail/client-detail.component').then(m => m.ClientDetailComponent),
        canActivate: [permissionGuard('clients.read')]
      },

      // =====================================
      // EVENTOS
      // =====================================
      {
        path: 'events',
        loadComponent: () => import('./pages/events/event-list/events.component').then(m => m.EventsComponent),
        canActivate: [permissionGuard('events.read')]
      },
      {
        path: 'events/new',
        loadComponent: () => import('./pages/events/event-detail/even-form/event-form.component').then(m => m.EventFormComponent),
        canActivate: [permissionGuard('events.create')]
      },
      {
        path: 'events/calendar',
        loadComponent: () => import('./pages/events/event-calendar/event-calendar.component').then(m => m.EventCalendarComponent),
        canActivate: [permissionGuard('events.read')]
      },
      {
        path: 'events/:id/edit',
        loadComponent: () => import('./pages/events/event-detail/even-form/event-form.component').then(m => m.EventFormComponent),
        canActivate: [permissionGuard('events.update')]
      },
      {
        path: 'events/:id',
        loadComponent: () => import('./pages/events/event-detail/event-detail.component').then(m => m.EventDetailComponent),
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
        loadComponent: () => import('./pages/inventory/inventory.component').then(m => m.InventoryComponent),
        canActivate: [permissionGuard('inventory.read')]
      },
      {
        path: 'inventory/new',
        loadComponent: () => import('./pages/inventory/inventory-form.component').then(m => m.InventoryFormComponent),
        canActivate: [permissionGuard('inventory.create')]
      },
      {
        path: 'inventory/categories',
        loadComponent: () => import('./pages/inventory/inventory-categories.component').then(m => m.InventoryCategoriesComponent),
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
  path: 'inventory/dashboard',
  loadComponent: () =>
    import('./pages/inventory/inventory-dashboard/inventory-dashboard.component')
      .then(m => m.InventoryDashboardComponent),
  canActivate: [permissionGuard('inventory.read')]
},
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
        loadComponent: () => import('./pages/inventory/inventory-form.component').then(m => m.InventoryFormComponent),
        canActivate: [
          permissionGuard('inventory.update')
        ]
      },
{
  path: 'contracts',
  canActivate: [
    permissionGuard('contracts.read')
  ],
  children: [
    {
      path: '',
      pathMatch: 'full',
      loadComponent: () =>
        import(
          './pages/contracts/contracts-list.component'
        ).then(m => m.ContractsListComponent)
    },
    {
      path: ':id/signatures',
      loadComponent: () =>
        import(
          './pages/contract-signatures/contract-signatures.component'
        ).then(m => m.ContractSignaturesComponent)
    },
    {
  path: ':id/payments',
  loadComponent: () =>
    import('./pages/contract-payments/contract-payments.component')
      .then(m => m.ContractPaymentsComponent),
  canActivate: [permissionGuard('contracts.read')]
}
  ]
},

      // =====================================
      // BILL-03 - PLANES Y SUSCRIPCIONES (tenant)
      // =====================================
      {
        path: 'billing/plans',
        loadComponent: () =>
          import('./pages/billing/billing-plans/billing-plans.component')
            .then(m => m.BillingPlansComponent),
        canActivate: [permissionGuard('tenant.read')]
      },
      {
        path: 'billing/subscription',
        loadComponent: () =>
          import('./pages/billing/billing-subscription/billing-subscription.component')
            .then(m => m.BillingSubscriptionComponent),
        canActivate: [permissionGuard('tenant.read')]
      },
      {
        path: 'billing/return',
        loadComponent: () =>
          import('./pages/billing/billing-return/billing-return.component')
            .then(m => m.BillingReturnComponent),
        canActivate: [permissionGuard('tenant.read')]
      },

      {
        path: 'billing/admin/prices',
        pathMatch: 'full',
        redirectTo: '/platform/prices'
      }

    ] // Fin de children de AdminLayoutComponent
  }, // Fin de AdminLayoutComponent

  // =====================================
  // FIRMA PÚBLICA DE CONTRATOS
  // =====================================
  {
    path: 'sign/:token',
    loadComponent: () =>
      import('./pages/contract-signing/contract-signing.component')
        .then(m => m.ContractSigningComponent)
  },

  // =====================================
  // CUENTA: RECUPERACIÓN E INVITACIONES (públicas; el token viaja en el #fragmento)
  // =====================================
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/password-forgot/password-forgot.component').then(m => m.PasswordForgotComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/password-reset/password-reset.component').then(m => m.PasswordResetComponent)
  },
  {
    path: 'invite',
    loadComponent: () => import('./pages/invite-accept/invite-accept.component').then(m => m.InviteAcceptComponent)
  },

  // =====================================
  // RUTA NO ENCONTRADA
  // =====================================
  {
    path: '**',
    redirectTo: 'login'
  }
];
