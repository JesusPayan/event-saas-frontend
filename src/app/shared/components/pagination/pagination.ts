
import {
  Component,
  computed,
  input,
  output
} from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  templateUrl: './pagination.html'
})
export class PaginationComponent {
  readonly page = input(1);
  readonly pageSize = input(20);
  readonly total = input(0);
  readonly loading = input(false);

  readonly pageChange = output<number>();

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / this.pageSize()))
  );

  readonly startItem = computed(() => {
    if (this.total() === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly endItem = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total())
  );

  readonly canPrevious = computed(() =>
    !this.loading() && this.page() > 1
  );

  readonly canNext = computed(() =>
    !this.loading() && this.page() < this.totalPages()
  );

  previous(): void {
    if (this.canPrevious()) {
      this.pageChange.emit(this.page() - 1);
    }
  }

  next(): void {
    if (this.canNext()) {
      this.pageChange.emit(this.page() + 1);
    }
  }
}
