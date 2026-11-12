
import {
  Component,
  input
} from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './page-header.html'
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input<string>('');
}
