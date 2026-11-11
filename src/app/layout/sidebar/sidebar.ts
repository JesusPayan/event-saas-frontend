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
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent implements OnDestroy {

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly routerSubscription: Subscription;

  readonly inventoryOpen = signal(
    this.router.url.startsWith('/inventory')
  );

  readonly logisticsOpen = signal(
    this.router.url.startsWith('/logistics')
  );

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
      });
  }

  toggleInventory(): void {
    this.inventoryOpen.update(value => !value);
  }

  toggleLogistics(): void {
    this.logisticsOpen.update(value => !value);
  }

  ngOnDestroy(): void {
    this.routerSubscription.unsubscribe();
  }
}