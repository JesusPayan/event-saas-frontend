
import {
  Component,
  input
} from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.html'
})
export class EmptyStateComponent {
  readonly title = input<string>('No hay registros');
  readonly description = input<string>(
    'No se encontraron resultados.'
  );
}
