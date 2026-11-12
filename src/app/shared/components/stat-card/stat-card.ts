
import {
  Component,
  input
} from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.html'
})
export class StatCardComponent {
  readonly title = input.required<string>();
  readonly value = input.required<number | string>();
  readonly description = input<string>('');
  readonly variant = input<'default' | 'primary' | 'success'>('default');
}
