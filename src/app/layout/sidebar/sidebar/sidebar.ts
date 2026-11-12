
import {
  Component,
  inject,
  signal,
  OnDestroy
} from '@angular/core';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  NavigationEnd
} from '@angular/router';

import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  CalendarDays,
  Calendar,
  FileText,
  FilePlus2,
  FileSignature,
  Package,
  Truck,
  ChevronDown,
  ChevronRight,
  Boxes,
  Tags,
  ClipboardList,
  AlertTriangle,
  Wallet,
  BarChart3,
  PackagePlus,
  Bell,
  ChartColumnIncreasing,
  Plus
} from 'lucide-angular';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnDestroy {

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly routerSubscription: Subscription;

  readonly icons = {
    dashboard: LayoutDashboard,
    clients: Users,
    events: CalendarDays,
    calendar: Calendar,
    quotes: FileText,
    newQuote: FilePlus2,
    contracts: FileSignature,
    inventory: Package,
    logistics: Truck,
    down: ChevronDown,
    right: ChevronRight,
    items: Boxes,
    categories: Tags,
    operations: ClipboardList,
    incidents: AlertTriangle,
    charges: Wallet,
    capacity: BarChart3,
    replenishments: PackagePlus,
    alerts: Bell,
    reports: ChartColumnIncreasing,
    plus: Plus
  };

  readonly inventoryOpen = signal(
    this.router.url.startsWith('/inventory')
  );

  readonly logisticsOpen = signal(
    this.router.url.startsWith('/logistics')
  );

  readonly mobileOpen = signal(false);

  constructor() {
    this.routerSubscription = this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd
        )
      )
      .subscribe(event => {
        const url = event.urlAfterRedirects;

        if (url.startsWith('/inventory')) {
          this.inventoryOpen.set(true);
        }

        if (url.startsWith('/logistics')) {
          this.logisticsOpen.set(true);
        }

        this.mobileOpen.set(false);
      });
  }

  toggleInventory(): void {
    this.inventoryOpen.update(value => !value);
  }

  toggleLogistics(): void {
    this.logisticsOpen.update(value => !value);
  }

  toggleMobile(): void {
    this.mobileOpen.update(value => !value);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }
}
