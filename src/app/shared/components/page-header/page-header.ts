
import {
  Component,
  input
} from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.html',
  // Elemento de bloque: respeta el espaciado vertical (space-y-*) del contenedor.
  host: { class: 'block' }
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
