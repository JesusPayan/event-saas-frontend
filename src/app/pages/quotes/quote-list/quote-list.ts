
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { QuotesService } from '../../../services/quotes.service';

interface Quote {
  id: number;
  status?: string;
  total?: number | string;
  created_at?: string;
  client_id?: number;
  event_id?: number;
}

interface QuotesResponse {
  items?: Quote[];
  quotes?: Quote[];
  total?: number;
  page?: number;
  per_page?: number;
}

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quote-list.html',
  styleUrl: './quote-list.css'
})
export class QuoteList implements OnInit {

  private readonly quotesService = inject(QuotesService);

  readonly quotes = signal<Quote[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly total = signal(0);
  readonly page = signal(1);
  readonly perPage = 20;

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    this.loading.set(true);
    this.error.set('');

    this.quotesService.getQuotes(
      this.page(),
      this.perPage
    ).subscribe({
      next: (response: unknown) => {
        const data = response as QuotesResponse;

        const items = Array.isArray(response)
          ? response as Quote[]
          : data.items ?? data.quotes ?? [];

        this.quotes.set(items);
        this.total.set(data.total ?? items.length);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);

        if (err.status === 401) {
          this.error.set('Sesión inválida o expirada.');
        } else if (err.status === 403) {
          this.error.set(
            'No tienes permisos para consultar cotizaciones.'
          );
        } else {
          this.error.set(
            `Error al consultar cotizaciones (${err.status}).`
          );
        }

        console.error('Error al consultar cotizaciones:', err);
      }
    });
  }

  nextPage(): void {
    if (this.page() * this.perPage < this.total()) {
      this.page.update(value => value + 1);
      this.loadQuotes();
    }
  }

  previousPage(): void {
    if (this.page() > 1) {
      this.page.update(value => value - 1);
      this.loadQuotes();
    }
  }
}
