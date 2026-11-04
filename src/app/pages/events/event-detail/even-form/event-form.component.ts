
import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  Subject,
  of,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  finalize,
  takeUntil,
  catchError
} from 'rxjs';

import { EventsService } from '../../../../services/events.service';
import { ClientsService} from '../../../../services/clients.service';

import { EventPayload } from '../../../../models/event.model';
// import { Client } from '../../../models/client.model';
import { Client } from '../../../../models/client.model';
@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.css'
})
export class EventFormComponent implements OnInit, OnDestroy {

  private readonly eventsService = inject(EventsService);
  private readonly clientsService = inject(ClientsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly destroy$ = new Subject<void>();
  private readonly clientSearch$ = new Subject<string>();

  readonly editing = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly clients = signal<Client[]>([]);
  readonly clientsLoading = signal(false);
  readonly clientSearch = signal('');
  readonly clientDropdownOpen = signal(false);
  readonly selectedClient = signal<Client | null>(null);

  private eventId: number | null = null;
  private searchRequestId = 0;

  startLocal = '';
  endLocal = '';

  model: EventPayload = {
    client_id: 0,
    name: '',
    event_type: 'wedding',
    description: '',
    starts_at: '',
    ends_at: '',
    location: '',
    estimated_guests: null
  };

  ngOnInit(): void {
    this.configureClientSearch();
    this.searchClients('');

    const id = this.route.snapshot.paramMap.get('id');

    if (!id) return;

    const parsed = Number(id);

    if (!Number.isSafeInteger(parsed) || parsed <= 0) {
      this.error.set('Identificador de evento inválido.');
      return;
    }

    this.eventId = parsed;
    this.editing.set(true);
    this.loading.set(true);

    this.eventsService.getById(parsed)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: event => {
          if (['completed', 'cancelled'].includes(event.status)) {
            void this.router.navigate(['/events', event.id]);
            return;
          }

          this.model = {
            client_id: event.client_id,
            name: event.name,
            event_type: event.event_type,
            description: event.description,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            location: event.location,
            estimated_guests: event.estimated_guests
          };

          this.startLocal = this.toLocalInput(event.starts_at);
          this.endLocal = this.toLocalInput(event.ends_at);

          this.loadSelectedClient(event.client_id);
        },
        error: () => {
          this.error.set('No se pudo cargar el evento.');
        }
      });
  }

  private configureClientSearch(): void {
    this.clientSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(search => {
          this.clientsLoading.set(true);

          return this.clientsService.getAll(
            1,
            search,
            'active'
          ).pipe(
            catchError(() => {
              this.error.set(
                'No se pudieron consultar los clientes.'
              );
              return of({
                items: [],
                total: 0,
                page: 1,
                per_page: 20
              });
            }),
            finalize(() => this.clientsLoading.set(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe(response => {
        this.clients.set(response.items);
      });
  }

  searchClients(search: string): void {
    this.clientSearch$.next(search);
  }

  onClientSearch(value: string): void {
    this.clientSearch.set(value);
    this.clientDropdownOpen.set(true);
    this.selectedClient.set(null);
    this.model.client_id = 0;

    this.searchClients(value);
  }

  clientLabel(client: Client): string {
    if (client.client_type === 'business') {
      return client.business_name?.trim()
        || client.first_name.trim()
        || `Cliente #${client.id}`;
    }

    return [
      client.first_name,
      client.last_name
    ]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  selectClient(client: Client): void {
    this.selectedClient.set(client);
    this.model.client_id = client.id;
    this.clientSearch.set(this.clientLabel(client));
    this.clientDropdownOpen.set(false);
  }

  clearClient(): void {
    this.selectedClient.set(null);
    this.model.client_id = 0;
    this.clientSearch.set('');
    this.clientDropdownOpen.set(true);
    this.searchClients('');
  }

  private loadSelectedClient(clientId: number): void {
    this.clientsService.getById(clientId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: client => {
          this.selectedClient.set(client);
          this.clientSearch.set(this.clientLabel(client));
        },
        error: () => {
          this.error.set(
            'No se pudo cargar el cliente asociado al evento.'
          );
        }
      });
  }

  private toLocalInput(iso: string): string {
    const date = new Date(iso);

    const local = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return local.toISOString().slice(0, 16);
  }

  save(): void {
    if (this.saving() || this.loading()) return;

    this.error.set('');

    if (!this.selectedClient() || !this.model.client_id) {
      this.error.set('Selecciona un cliente válido.');
      return;
    }

    if (!this.model.name.trim()) {
      this.error.set('El nombre del evento es obligatorio.');
      return;
    }

    const start = new Date(this.startLocal);
    const end = new Date(this.endLocal);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      this.error.set(
        'La fecha de finalización debe ser posterior al inicio.'
      );
      return;
    }

    const payload: EventPayload = {
      ...this.model,
      starts_at: start.toISOString(),
      ends_at: end.toISOString()
    };

    this.saving.set(true);

    const request$ =
      this.editing() && this.eventId !== null
        ? this.eventsService.update(this.eventId, payload)
        : this.eventsService.create(payload);

    request$
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: event => {
          void this.router.navigate(['/events', event.id]);
        },
        error: err => {
          this.error.set(
            err.status === 409
              ? 'El evento no puede modificarse en su estado actual.'
              : err.status === 403
                ? 'No tienes permisos para guardar eventos.'
                : 'No se pudo guardar el evento.'
          );
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
