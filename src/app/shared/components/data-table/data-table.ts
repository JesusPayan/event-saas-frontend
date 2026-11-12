
import {
  Component,
  input
} from '@angular/core';

@Component({
  selector: 'app-data-table',
  standalone: true,
  templateUrl: './data-table.html'
})
export class DataTableComponent {
  readonly loading = input(false);
  readonly error = input('');
  readonly empty = input(false);

  readonly loadingMessage = input('Cargando registros...');
  readonly emptyTitle = input('No se encontraron registros');
  readonly emptyDescription = input(
    'No hay información disponible para mostrar.'
  );
}
